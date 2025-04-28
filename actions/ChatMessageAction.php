<?php
namespace Modules\IaChatbot\Actions;

use CController;
use CControllerResponseData;
use CWebUser;

class ChatMessageAction extends CController {
    protected function init(): void {
        // Habilitar validación CSRF para peticiones no-AJAX
        // Solo desactivar para peticiones AJAX legítimas y autenticadas
        if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && 
            strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest' &&
            CWebUser::isLoggedIn()) {
            $this->disableCsrfValidation();
        }
    }

    protected function checkPermissions(): bool {
        // Verificar que el usuario esté autenticado
        if (!CWebUser::isLoggedIn()) {
            return false;
        }
        
        // Verificar que el usuario tenga permisos para acceder a la UI de Zabbix
        return CWebUser::checkAccess('ui.view');
    }

    protected function checkInput(): bool {
        // Definir los campos esperados y sus tipos para validación
        $fields = [
            'message' => 'string',
            'host_id' => 'int32',
            'conversation_id' => 'string',
            'api_key' => 'string'
        ];
        
        // Al menos uno de estos campos debe estar presente
        $ret = $this->validateInput($fields) && 
               ($this->hasInput('message') || $this->hasInput('host_id'));
        
        // Registrar intentos fallidos de validación para detección de posibles ataques
        if (!$ret) {
            $user_id = CWebUser::isLoggedIn() ? CWebUser::$data['userid'] : 'no-auth';
            error_log("IA Chatbot: Validación de entrada fallida para usuario $user_id - " . 
                      json_encode($_REQUEST));
        }
        
        return $ret;
    }

    protected function doAction(): void {
        // Implementar rate limiting básico para prevenir ataques de fuerza bruta
        if (!isset($_SESSION['ia_chatbot_last_action'])) {
            $_SESSION['ia_chatbot_last_action'] = time();
            $_SESSION['ia_chatbot_action_count'] = 1;
        } else {
            $elapsed = time() - $_SESSION['ia_chatbot_last_action'];
            
            // Reiniciar contador si ha pasado más de 1 minuto
            if ($elapsed > 60) {
                $_SESSION['ia_chatbot_action_count'] = 1;
                $_SESSION['ia_chatbot_last_action'] = time();
            } else {
                // Incrementar contador
                $_SESSION['ia_chatbot_action_count']++;
                
                // Limitar a 10 peticiones por minuto
                if ($_SESSION['ia_chatbot_action_count'] > 10) {
                    $this->setResponse(new CControllerResponseData([
                        'error' => true,
                        'message' => 'Demasiadas peticiones. Por favor, espera un minuto e intenta de nuevo.',
                        'response' => 'Demasiadas peticiones. Por favor, espera un minuto e intenta de nuevo.'
                    ]));
                    return;
                }
            }
        }

        // Check if this is a host selection request
        if ($this->hasInput('host_id')) {
            $hostId = $this->getInput('host_id', '');
            $conversationId = $this->getInput('conversation_id', '');
            
            // Process host selection
            $this->processHostSelection($hostId, $conversationId);
            return;
        }
        
        $message = $this->getInput('message', '');
        
        // Sanitizar el mensaje para prevenir inyecciones
        $message = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
        
        // Limitar longitud del mensaje para prevenir abusos
        if (strlen($message) > 4000) {
            $message = substr($message, 0, 4000);
        }
        
        // Verificar que el mensaje no esté vacío
        if (empty($message)) {
            $this->setResponse(new CControllerResponseData([
                'error' => true,
                'message' => 'El mensaje no puede estar vacío',
                'response' => 'El mensaje no puede estar vacío'
            ]));
            return;
        }
        
        try {
            // Obtener API Key desde el frontend y validarla
            $apiKey = $this->getInput('api_key', '');
            
            // Validación menos estricta para la API Key
            if (empty($apiKey) || !preg_match('/^sk-[a-zA-Z0-9_\-]{10,}$/', $apiKey)) {
                $this->setResponse(new CControllerResponseData([
                    'error' => true,
                    'message' => 'API Key de OpenAI no proporcionada o inválida. Configúrala correctamente en el chat.',
                    'response' => 'API Key de OpenAI no proporcionada o inválida.'
                ]));
                return;
            }

            // Usar servidor y puerto de Zabbix desde configuración global
            global $ZBX_SERVER, $ZBX_SERVER_PORT;
            
            // Reducir logs sensibles - solo registrar información mínima
            error_log("IA Chatbot: Procesando solicitud de chat");

            // Opciones y configuración para comunicación con OpenAI
            $url = 'https://api.openai.com/v1/chat/completions';

            // Validación de parámetros adicionales con valores permitidos
            $allowedModels = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4o', 'gpt-4-turbo'];
            $model = $this->hasInput('model') && in_array($this->getInput('model'), $allowedModels) 
                ? $this->getInput('model') 
                : 'gpt-3.5-turbo';
                
            $temperature = $this->hasInput('temperature') && is_numeric($this->getInput('temperature')) 
                    && $this->getInput('temperature') >= 0 && $this->getInput('temperature') <= 1
                ? floatval($this->getInput('temperature')) 
                : 0.7;
                
            $max_tokens = $this->hasInput('max_tokens') && is_numeric($this->getInput('max_tokens')) 
                    && $this->getInput('max_tokens') > 0 && $this->getInput('max_tokens') <= 4000
                ? intval($this->getInput('max_tokens')) 
                : 800;

            // Crear payload con el formato correcto para la API más reciente
            $payload = [
                'model' => $model,
                'messages' => [
                    ['role' => 'system', 'content' => 'Eres un asistente de Zabbix experto en monitoreo y alertas. Ayuda al usuario con sus consultas relacionadas con Zabbix de manera clara y concisa.'],
                    ['role' => 'user', 'content' => $message]
                ],
                'temperature' => $temperature,
                'max_tokens' => $max_tokens
            ];

            // Convertir a JSON
            $jsonPayload = json_encode($payload);
            if ($jsonPayload === false) {
                throw new \Exception('Error al codificar payload JSON: ' . json_last_error_msg());
            }
            
            // Inicializar cURL con configuración segura
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    'Authorization: Bearer ' . $apiKey
                ],
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $jsonPayload,
                CURLOPT_SSL_VERIFYPEER => true,  // Habilitar verificación SSL
                CURLOPT_SSL_VERIFYHOST => 2,     // Verificar el hostname del certificado
                CURLOPT_TIMEOUT => 60,
                CURLOPT_CONNECTTIMEOUT => 10,    // Timeout de conexión más bajo
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
                // Configurar redireccionamiento seguro (máximo 3 redirecciones, solo https)
                CURLOPT_MAXREDIRS => 3,
                CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
                CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTPS
            ]);
            
            // Ejecutar la petición
            $result = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            $curlErrno = curl_errno($ch);
            curl_close($ch);

            // Manejar errores específicos de SSL
            if ($curlErrno == CURLE_SSL_CACERT || $curlErrno == CURLE_SSL_PEER_CERTIFICATE) {
                error_log('IA Chatbot: Error de verificación SSL - ' . $error);
                $this->setResponse(new CControllerResponseData([
                    'error' => true,
                    'message' => 'Error de seguridad en la conexión. No se pudo verificar el certificado SSL.',
                    'response' => 'Error de seguridad en la conexión. Por favor, contacta al administrador.'
                ]));
                return;
            }

            if ($error) {
                $this->setResponse(new CControllerResponseData([
                    'error' => true,
                    'message' => 'Error de conexión: ' . $error
                ]));
                return;
            }
            
            if ($httpCode < 200 || $httpCode >= 300) {
                $this->setResponse(new CControllerResponseData([
                    'error' => true,
                    'message' => 'Error HTTP ' . $httpCode . ': ' . $result
                ]));
                return;
            }
            
            // Decodificar la respuesta JSON con validación
            $data = json_decode($result, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new \Exception('Error al decodificar respuesta JSON: ' . json_last_error_msg());
            }
            
            if (isset($data['error'])) {
                $this->setResponse(new CControllerResponseData([
                    'error' => true,
                    'message' => 'Error de OpenAI: ' . $data['error']['message']
                ]));
                return;
            }
            
            if (!isset($data['choices'][0]['message']['content'])) {
                $this->setResponse(new CControllerResponseData([
                    'error' => true,
                    'message' => 'Respuesta inesperada de OpenAI'
                ]));
                return;
            }
            
            $reply = $data['choices'][0]['message']['content'];
            
            // Validación adicional del contenido de la respuesta
            if (strlen($reply) > 16384) { // Limitar respuestas muy largas
                $reply = substr($reply, 0, 16384) . "\n\n[Respuesta truncada por ser demasiado larga]";
            }
            
            // Detección de posible contenido malicioso en la respuesta
            $maliciousPatterns = [
                '/<script\b[^>]*>/i',
                '/javascript:/i',
                '/onclick=/i',
                '/data:text\/html/i',
                '/eval\s*\(/i'
            ];
            
            foreach ($maliciousPatterns as $pattern) {
                if (preg_match($pattern, $reply)) {
                    // Si se detecta contenido potencialmente malicioso, sanitizamos toda la respuesta
                    $reply = htmlspecialchars($reply, ENT_QUOTES, 'UTF-8');
                    error_log('IA Chatbot: Posible contenido malicioso detectado en respuesta de OpenAI');
                    break;
                }
            }
            
            // Sanitizar la respuesta para prevenir XSS, pero preservar formato Markdown limitado
            $reply = htmlspecialchars($reply, ENT_NOQUOTES, 'UTF-8');
            // Permitir solo un conjunto limitado de etiquetas para Markdown
            $reply = str_replace('&lt;br&gt;', '<br>', $reply);
            $reply = str_replace(['&lt;b&gt;', '&lt;/b&gt;'], ['<b>', '</b>'], $reply);
            $reply = str_replace(['&lt;i&gt;', '&lt;/i&gt;'], ['<i>', '</i>'], $reply);
            $reply = str_replace(['&lt;code&gt;', '&lt;/code&gt;'], ['<code>', '</code>'], $reply);
            
            $this->setResponse(new CControllerResponseData([
                'error' => false,
                'message' => $reply,
                'response' => $reply
            ]));
            
        } catch (\Exception $e) {
            // Registrar el error sin incluir detalles sensibles
            error_log('IA Chatbot: Error - ' . $e->getMessage());
            
            // Devolver error al frontend
            $this->setResponse(new CControllerResponseData([
                'error' => true,
                'message' => 'Error del servidor: ' . $e->getMessage(),
                'response' => 'Error del servidor. Por favor, intenta de nuevo más tarde.'
            ]));
        }
    }
    
    /**
     * Process a host selection from the user
     * 
     * @param string $hostId The selected host ID
     * @param string $conversationId The conversation ID
     */
    protected function processHostSelection($hostId, $conversationId): void {
        try {
            // Validar y sanitizar las entradas
            $hostId = filter_var($hostId, FILTER_VALIDATE_INT);
            if ($hostId === false) {
                throw new \Exception('ID de host inválido.');
            }
            
            $conversationId = htmlspecialchars($conversationId, ENT_QUOTES, 'UTF-8');
            
            // Get host details using Zabbix API
            require_once __DIR__ . '/../includes/ZabbixAPI.php';
            $api = new \Modules\IaChatbot\ZabbixAPI();
            
            // Get API Key from input (sent by frontend)
            $apiKey = $this->getInput('api_key', '');
            
            // Validar la API Key con formato menos estricto
            if (empty($apiKey) || !preg_match('/^sk-[a-zA-Z0-9_\-]{10,}$/', $apiKey)) {
                throw new \Exception('API Key de OpenAI no proporcionada o inválida.');
            }
            
            // Get host details
            $host = $api->getHostById($hostId);
            
            if (!$host) {
                throw new \Exception('No se pudo obtener información del host seleccionado.');
            }
            
            // Sanitizar los datos recibidos del API
            $hostName = htmlspecialchars($host['name'], ENT_QUOTES, 'UTF-8');
            $hostStatus = (int)$host['status'] === 0 ? 'Habilitado' : 'Deshabilitado';
            
            // Get some basic information about the host to provide context
            $hostDetails = "Información del host:\n";
            $hostDetails .= "- Nombre: {$hostName}\n";
            $hostDetails .= "- Status: {$hostStatus}\n";
            
            // Get some recent problems for this host if available
            $problems = $api->getProblemsForHost($hostId);
            
            $problemsInfo = "";
            if (!empty($problems)) {
                $problemsInfo = "\n\nProblemas recientes:\n";
                foreach ($problems as $index => $problem) {
                    if ($index >= 5) break; // Limit to 5 problems
                    
                    // Sanitizar cada problema
                    $problemName = htmlspecialchars($problem['name'], ENT_QUOTES, 'UTF-8');
                    $problemSeverity = htmlspecialchars($problem['severity'], ENT_QUOTES, 'UTF-8');
                    
                    $problemsInfo .= "- {$problemName} (Severidad: {$problemSeverity})\n";
                }
            } else {
                $problemsInfo = "\n\nNo hay problemas activos para este host.";
            }
            
            // Combine information
            $responseMessage = "He obtenido información para el host seleccionado.\n\n" . $hostDetails . $problemsInfo . "\n\n¿Qué información específica te gustaría saber sobre este host?";
            
            // Send response back to frontend
            $this->setResponse(new CControllerResponseData([
                'success' => true,
                'message' => $responseMessage,
                'conversation_id' => $conversationId
            ]));
            
        } catch (\Exception $e) {
            // Log sin incluir datos sensibles
            error_log('IA Chatbot: Error processing host selection - ' . $e->getMessage());
            
            $this->setResponse(new CControllerResponseData([
                'success' => false,
                'message' => 'Error al procesar la selección del host: ' . $e->getMessage(),
                'conversation_id' => $conversationId
            ]));
        }
    }
}