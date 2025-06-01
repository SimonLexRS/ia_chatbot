<?php
// Archivo de depuración para el chatbot
// Simular el comportamiento del controlador directamente

// Entorno de producción: no mostrar errores en pantalla
ini_set('display_errors', 0);
error_reporting(0);

// Iniciar sesión al principio
session_start();

// Función de sanitización de entradas
function sanitizeInput($input) {
    if (is_string($input)) {
        return htmlspecialchars($input, ENT_QUOTES, 'UTF-8');
    } elseif (is_array($input)) {
        return array_map('sanitizeInput', $input);
    }
    return $input;
}

// Encabezados seguros
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
// Añadir Content Security Policy para prevenir XSS
header("Content-Security-Policy: default-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self'; style-src 'self';");
// Prevenir clickjacking
header('X-Frame-Options: DENY');
// Prevenir MIME sniffing
header('X-Content-Type-Options: nosniff');
// Cache control
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

try {
    // Leer entrada JSON y decodificar con límite de tamaño para prevenir ataques de DoS
    $maxPostSize = 1024 * 1024; // 1MB
    if (isset($_SERVER['CONTENT_LENGTH']) && $_SERVER['CONTENT_LENGTH'] > $maxPostSize) {
        throw new Exception("Payload demasiado grande");
    }
    
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true) ?: [];
    
    // Verificar si la solicitud es para listar modelos de Ollama
    if (isset($input['action']) && $input['action'] === 'list_models') {
        // Extraer los datos necesarios
        $server = isset($input['ollama_server']) ? $input['ollama_server'] : '192.168.19.10';
        $port = isset($input['ollama_port']) ? $input['ollama_port'] : '11434';
        
        // Validar IP y puerto
        if (!filter_var($server, FILTER_VALIDATE_IP) && !filter_var($server, FILTER_VALIDATE_DOMAIN)) {
            throw new Exception("Dirección de servidor Ollama inválida");
        }
        
        if (!filter_var($port, FILTER_VALIDATE_INT) || $port < 1 || $port > 65535) {
            throw new Exception("Puerto Ollama inválido");
        }
        
        // URL para la API de Ollama
        $ollama_api_url = "http://{$server}:{$port}/api/tags";
        
        // Configurar cURL para la petición a Ollama
        $ch = curl_init($ollama_api_url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json'
            ],
            CURLOPT_TIMEOUT => 30,              // Aumentado de 10 a 30 segundos
            CURLOPT_CONNECTTIMEOUT => 15,       // Aumentado de 5 a 15 segundos
            CURLOPT_TCP_KEEPALIVE => 1,
            CURLOPT_TCP_KEEPIDLE => 30,
            CURLOPT_VERBOSE => true,
            CURLOPT_FAILONERROR => false
        ]);
        
        // Capturar información detallada para depuración
        $verbose = fopen('php://temp', 'w+');
        curl_setopt($ch, CURLOPT_STDERR, $verbose);
        
        // Ejecutar la petición
        $response = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        $errno = curl_errno($ch);
        curl_close($ch);
        
        // Registrar información detallada en caso de error
        if ($error) {
            // Leer la información detallada del error
            rewind($verbose);
            $verboseLog = stream_get_contents($verbose);
            fclose($verbose);
            
            // Registrar en el log del servidor para facilitar depuración
            error_log("Error al listar modelos de Ollama [IP: $server, Puerto: $port]: $error (Errno: $errno)");
            error_log("Detalles de la conexión: " . $verboseLog);
            
            throw new Exception("Error de conexión con Ollama: $error. Verifica la conectividad entre el servidor Zabbix y el servidor Ollama.");
        }
        
        // Verificar código de estado HTTP
        if ($status < 200 || $status >= 300) {
            throw new Exception("Error en la solicitud HTTP a Ollama: " . $status);
        }
        
        // Decodificar la respuesta JSON con verificación de errores
        $data = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("Error al decodificar la respuesta JSON de Ollama: " . json_last_error_msg());
        }
        
        // Si la API devuelve 'models', usarla directamente
        if (isset($data['models'])) {
            echo json_encode([
                'error' => false,
                'models' => $data['models']
            ]);
            exit;
        } 
        
        // Si no hay 'models' pero sí hay 'data', intentar procesarla
        else if (isset($data['data']) && is_array($data['data'])) {
            $models = [];
            foreach ($data['data'] as $model) {
                if (is_array($model) && isset($model['name'])) {
                    $models[] = [
                        'name' => $model['name'],
                        'model' => $model['model'] ?? $model['name']
                    ];
                } else if (is_string($model)) {
                    $models[] = [
                        'name' => $model,
                        'model' => $model
                    ];
                }
            }
            
            echo json_encode([
                'error' => false,
                'models' => $models
            ]);
            exit;
        }
        
        // Si llegamos aquí, no pudimos procesar la respuesta de Ollama
        throw new Exception("Formato de respuesta inesperado de Ollama");
    }
    
    // Proxy para comunicación con Ollama
    else if (isset($input['provider']) && $input['provider'] === 'ollama') {
        // Extraer los datos necesarios
        $server = isset($input['ollama_server']) ? $input['ollama_server'] : '192.168.19.10';
        $port = isset($input['ollama_port']) ? $input['ollama_port'] : '11434';
        $ollamaModel = isset($input['model']) ? $input['model'] : 'llama3';
        
        // Validar IP y puerto
        if (!filter_var($server, FILTER_VALIDATE_IP) && !filter_var($server, FILTER_VALIDATE_DOMAIN)) {
            throw new Exception("Dirección de servidor Ollama inválida");
        }
        
        if (!filter_var($port, FILTER_VALIDATE_INT) || $port < 1 || $port > 65535) {
            throw new Exception("Puerto Ollama inválido");
        }
        
        // *** CAMBIO IMPORTANTE: Usar el endpoint correcto para /api/generate ***
        // Verificar la URL correcta basada en la versión de Ollama
        $ollama_api_url = "http://{$server}:{$port}/api/generate";

        // Agregar debug para verificar la URL que estamos usando
        error_log("Usando URL de Ollama: $ollama_api_url");
        
        // Construir el mensaje completo a partir del historial y el mensaje actual
        $fullPrompt = "";
        
        // Añadir sistema (como indicación inicial)
        $systemPrompt = isset($input['system_prompt']) ? $input['system_prompt'] : 'Eres un asistente para el sistema de monitorización Zabbix.';
        $fullPrompt .= "Instrucciones del sistema: " . $systemPrompt . "\n\n";
        
        // Añadir historial previo para dar contexto, pero limitado para mayor velocidad
        if (isset($input['history']) && is_array($input['history'])) {
            // Usar un historial mucho más reducido para mejorar el rendimiento, 
            // especialmente con modelos grandes como deepseek
            $max_history_items = isset($input['fast_mode']) && $input['fast_mode'] ? 2 : 4;
            $limitedHistory = array_slice($input['history'], -($max_history_items * 2));
            
            // Verificar si el modelo es deepseek para aplicar optimizaciones adicionales
            $is_deepseek = (stripos($ollamaModel, 'deepseek') !== false);
            
            // Con modelos deepseek limitamos aún más por su alta demanda de recursos
            if ($is_deepseek) {
                $limitedHistory = array_slice($limitedHistory, -2); // Solo último intercambio para deepseek
            }
            
            foreach ($limitedHistory as $entry) {
                if (isset($entry['sender'], $entry['text'])) {
                    // Formato más compacto para reducir tokens
                    if ($entry['sender'] === 'user') {
                        $fullPrompt .= "U: " . $entry['text'] . "\n";
                    } else if ($entry['sender'] === 'bot') {
                        $fullPrompt .= "A: " . $entry['text'] . "\n";
                    }
                }
            }
        }
        
        // Añadir mensaje actual con formato optimizado
        if (isset($input['message'])) {
            // Verificar si es deepseek para usar un formato aún más conciso
            if ($is_deepseek) {
                $fullPrompt .= "U: " . $input['message'] . "\nA:";
            } else {
                $fullPrompt .= "Usuario: " . $input['message'] . "\n\nAsistente:";
            }
        } else {
            throw new Exception("Mensaje no proporcionado");
        }
        
        // Valores por defecto para parámetros opcionales
        $temperature = isset($input['temperature']) && is_numeric($input['temperature']) ? (float)$input['temperature'] : 0.7;
        $max_tokens = isset($input['max_tokens']) && is_numeric($input['max_tokens']) ? (int)$input['max_tokens'] : 800;
        
        // Crear un payload simplificado exactamente como el que funciona con curl
        // Detectar si estamos usando el modelo deepseek para optimizaciones específicas
        $is_deepseek = (stripos($ollamaModel, 'deepseek') !== false);
        
        // Configurar parámetros optimizados según el modelo
        $ollamaPayload = json_encode([
            'model' => $ollamaModel,
            'prompt' => $fullPrompt,
            'stream' => false,
            // Reducir creatividad para mejorar velocidad
            'temperature' => $is_deepseek ? 0.5 : $temperature,
            // Reducir tokens de salida para modelos grandes
            'num_predict' => $is_deepseek ? min(400, $max_tokens) : $max_tokens,
            // Parámetros de rendimiento específicos para deepseek
            'num_ctx' => 2048,         // Contexto reducido para mejor rendimiento
            'num_thread' => 12,        // Aumentar hilos para paralelización
            'num_gpu' => 1,            // Usar GPU si está disponible
            'top_k' => 20,             // Valor más bajo para mayor velocidad
            'top_p' => 0.7,            // Valor más bajo para respuestas más determinísticas
            'stop' => ["Usuario:", "U:"], // Detener la generación en ciertos tokens
            'mirostat' => 1,          // Usar mirostat para controlar mejor la longitud
            'mirostat_eta' => 0.8,     // Configuración de mirostat para estabilidad
            'mirostat_tau' => 5.0      // Valor tau para mirostat
        ]);
        
        // Registrar en el log información para depuración
        error_log("Iniciando petición a Ollama (generate) - Modelo: $ollamaModel");
        error_log("URL: $ollama_api_url");
        
        // Implementar varios intentos con configuraciones diferentes
        $maxRetries = 2;
        $attempt = 0;
        $success = false;
        
        while ($attempt <= $maxRetries && !$success) {
            // Configurar cURL para la petición a Ollama con configuraciones ajustadas según el intento
            $ch = curl_init($ollama_api_url);
            $timeout = 180 + ($attempt * 60); // Aumentar timeout en cada intento
            
            // Modificar payload para mejorar rendimiento en intentos adicionales
            if ($attempt > 0) {
                // Decodificar y modificar opciones
                $payloadArr = json_decode($ollamaPayload, true);
                // Reducir complejidad para el segundo intento
                if ($attempt == 1) {
                    $payloadArr['num_predict'] = min($max_tokens, 400); // Reducir longitud máxima
                    $payloadArr['temperature'] = 0.5; // Reducir creatividad
                }
                // Configuraciones más agresivas para el tercer intento
                else if ($attempt == 2) {
                    $payloadArr['num_predict'] = 200; // Respuesta muy corta
                    $payloadArr['temperature'] = 0.2; // Muy determinística
                    // Simplificar el prompt si es muy largo
                    if (strlen($payloadArr['prompt']) > 1000) {
                        // Extraer solo la última parte del prompt
                        $parts = explode("Usuario:", $payloadArr['prompt']);
                        if (count($parts) > 1) {
                            $lastPart = array_pop($parts);
                            $payloadArr['prompt'] = "Usuario:" . $lastPart;
                        }
                    }
                }
                $ollamaPayload = json_encode($payloadArr);
            }
            
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $ollamaPayload,
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json'
                ],
                CURLOPT_TIMEOUT => $timeout,
                CURLOPT_CONNECTTIMEOUT => 30,
                CURLOPT_TCP_KEEPALIVE => 1,
                CURLOPT_TCP_KEEPIDLE => 60,
                CURLOPT_VERBOSE => true,
                CURLOPT_FAILONERROR => false
            ]);
            
            // Capturar información detallada para depuración
            $verbose = fopen('php://temp', 'w+');
            curl_setopt($ch, CURLOPT_STDERR, $verbose);
            
            // Registrar en log el intento actual
            error_log("Ollama - Intento $attempt con timeout $timeout segundos");
            
            // Ejecutar la petición
            $response = curl_exec($ch);
            $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            $errno = curl_errno($ch);
            $info = curl_getinfo($ch);
            curl_close($ch);
            
            // Si hay respuesta válida, marcar como exitoso
            if (!$error && $response) {
                $success = true;
                error_log("Ollama - Intento $attempt exitoso - Tiempo: " . $info['total_time'] . "s");
                error_log("Respuesta recibida de longitud: " . strlen($response));
                break;
            }
            
            // Registrar información de depuración en caso de error
            if ($error) {
                // Leer la información detallada del error
                rewind($verbose);
                $verboseLog = stream_get_contents($verbose);
                fclose($verbose);
                
                // Registrar en el log del servidor para facilitar depuración
                error_log("Ollama - Intento $attempt fallido - Error: $error (Errno: $errno)");
                error_log("Intentando con URL: $ollama_api_url");
                error_log("Payload: " . json_encode(['model' => $ollamaModel, 'prompt_length' => strlen($fullPrompt)]));
                
                if ($errno == 28) { // CURLE_OPERATION_TIMEDOUT
                    error_log("Ollama - Timeout detectado, reintentando con configuración simplificada");
                    $attempt++;
                    continue;
                } else {
                    // Para otros errores, no reintentar
                    error_log("Ollama - Error no recuperable");
                    throw new Exception("Error de conexión con Ollama: $error (Code: $errno). Verifica que el servidor esté en ejecución y sea accesible desde el servidor Zabbix.");
                }
            }
            
            $attempt++;
        }
        
        // Si todos los intentos fallaron, mostrar mensaje específico
        if (!$success) {
            throw new Exception("El modelo está tardando demasiado en responder después de múltiples intentos. Intenta con un mensaje más corto o un modelo más pequeño.");
        }
        
        // Verificar código de estado HTTP
        if ($status < 200 || $status >= 300) {
            throw new Exception("Error en la solicitud HTTP a Ollama: " . $status);
        }
        
        // Decodificar la respuesta JSON con verificación de errores
        $data = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("Error al decodificar la respuesta JSON de Ollama: " . json_last_error_msg());
        }
        
        // Extraer la respuesta del formato de /api/generate
        // La respuesta está en el campo 'response' en lugar de 'message.content'
        $reply = isset($data['response']) ? $data['response'] : null;
        
        // Verificar si hay un payload vacío o un timeout de servidor
        if (empty($data) || empty($reply)) {
            // Si llegamos a este punto pero no hay respuesta, es probable que el modelo
            // esté tomando demasiado tiempo para generar una respuesta
            throw new Exception("El modelo está tardando demasiado en responder. Intenta con un mensaje más corto o un modelo más pequeño.");
        }
        
        // Devolver la respuesta en el formato esperado por el frontend
        echo json_encode([
            'error' => false,
            'message' => $reply
        ]);
        exit;
    }
    
    // Si llegamos a este punto, se trata de una solicitud para OpenAI
    
    // Definir la URL de la API de OpenAI
    $openai_api_url = 'https://api.openai.com/v1/chat/completions';
    
    // Preparar historial
    if (!isset($_SESSION['ia_chatbot_history'])) {
        $_SESSION['ia_chatbot_history'] = [];
    }
    
    // Sanitizar el historial: conservar solo arrays con formato válido
    $_SESSION['ia_chatbot_history'] = array_values(array_filter(
        $_SESSION['ia_chatbot_history'],
        function($entry) {
            // Formato nuevo: role + content
            if (isset($entry['role'], $entry['content'])
                && in_array($entry['role'], ['user', 'assistant'], true)
                && is_string($entry['content'])) {
                return true;
            }
            // Formato antiguo: sender + text
            if (isset($entry['sender'], $entry['text'])
                && in_array($entry['sender'], ['user', 'bot', 'assistant'], true)
                && is_string($entry['text'])) {
                return true;
            }
            return false;
        }
    ));
    
    // Mapear formato antiguo a nuevo dentro de la variable sanitized
    foreach ($_SESSION['ia_chatbot_history'] as &$entry) {
        if (isset($entry['sender'], $entry['text'])) {
            $role = $entry['sender'] === 'user' ? 'user' : 'assistant';
            $entry = ['role' => $role, 'content' => sanitizeInput($entry['text'])];
        }
        // En el caso nuevo, mantener role y content pero sanitizar el contenido
        elseif (isset($entry['role'], $entry['content'])) {
            $entry['content'] = sanitizeInput($entry['content']);
        }
    }
    unset($entry);

    // Si se solicita limpiar historial
    if (!empty($input['clear'])) {
        $_SESSION['ia_chatbot_history'] = [];
        echo json_encode(['error' => false, 'message' => 'Historial eliminado']);
        exit;
    }

    // Validar API Key con formato menos estricto
    // Solo verificamos que comience con "sk-" y tenga una longitud razonable
    if (empty($input['api_key']) || !preg_match('/^sk-[a-zA-Z0-9_\-]{10,}$/', $input['api_key'])) {
        header('HTTP/1.1 400 Bad Request');
        echo json_encode(['error' => true, 'message' => 'API Key no proporcionada o con formato inválido']);
        exit;
    }
    $openai_api_key = $input['api_key'];

    // Validar mensaje
    if (empty($input['message'])) {
        header('HTTP/1.1 400 Bad Request');
        echo json_encode(['error' => true, 'message' => 'Mensaje no proporcionado']);
        exit;
    }
    
    // Sanitizar mensaje y limitar longitud
    $message = sanitizeInput($input['message']);
    if (strlen($message) > 4000) {
        $message = substr($message, 0, 4000); // Limitar longitud para prevenir abusos
    }

    // Validación de parámetros con valores permitidos
    $allowedModels = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4o', 'gpt-4-turbo'];
    $model = isset($input['model']) && in_array($input['model'], $allowedModels) 
        ? $input['model'] 
        : 'gpt-3.5-turbo';
        
    $temperature = isset($input['temperature']) && is_numeric($input['temperature']) && $input['temperature'] >= 0 && $input['temperature'] <= 1
        ? floatval($input['temperature']) 
        : 0.7;
        
    $max_tokens = isset($input['max_tokens']) && is_numeric($input['max_tokens']) && $input['max_tokens'] > 0 && $input['max_tokens'] <= 4000
        ? intval($input['max_tokens']) 
        : 800;
        
    $system_prompt = isset($input['system_prompt']) && is_string($input['system_prompt']) 
        ? sanitizeInput($input['system_prompt'])
        : 'Eres un asistente para el sistema de monitorización Zabbix. Mantén el contexto de la conversación basada en intercambios previos.';

    // Construir array de mensajes para OpenAI: sistema + historial en sesión + mensaje actual
    $messages = [['role' => 'system', 'content' => $system_prompt]];
    foreach ($_SESSION['ia_chatbot_history'] as $entry) {
        if (isset($entry['role'], $entry['content'])) {
            $messages[] = ['role' => $entry['role'], 'content' => $entry['content']];
        }
    }
    // Añadir mensaje actual
    $messages[] = ['role' => 'user', 'content' => $message];

    // Preparar el payload con contexto completo
    $payload = json_encode([
        'model' => $model,
        'messages' => $messages,
        'temperature' => $temperature,
        'max_tokens' => $max_tokens
    ]);

    // Configurar cURL con opciones de seguridad mejoradas
    $ch = curl_init($openai_api_url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $openai_api_key
        ],
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_TIMEOUT => 60,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_FORBID_REUSE => true,
        CURLOPT_FRESH_CONNECT => true,
        // Configurar redireccionamiento seguro (máximo 3 redirecciones, solo https)
        CURLOPT_MAXREDIRS => 3,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
        CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTPS
    ]);

    // Ejecutar la petición
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    $errno = curl_errno($ch);
    curl_close($ch);

    // Manejo específico para errores SSL
    if ($errno == CURLE_SSL_CACERT || $errno == CURLE_SSL_PEER_CERTIFICATE) {
        throw new Exception("Error de verificación SSL. Por favor, compruebe los certificados del servidor.");
    }

    // Verificar errores de cURL
    if ($error) {
        throw new Exception("Error de conexión: " . $error);
    }

    // Verificar respuesta vacía
    if (empty($response)) {
        throw new Exception("No se recibió respuesta de OpenAI");
    }

    // Verificar código de estado HTTP
    if ($status < 200 || $status >= 300) {
        throw new Exception("Error en la solicitud HTTP: " . $status);
    }

    // Decodificar la respuesta JSON con verificación de errores
    $data = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Error al decodificar la respuesta JSON: " . json_last_error_msg());
    }

    // Verificar errores de OpenAI
    if (isset($data['error'])) {
        throw new Exception("Error de OpenAI: " . ($data['error']['message'] ?? 'Error desconocido'));
    }

    // Extraer el mensaje de la respuesta
    if (!isset($data['choices'][0]['message']['content'])) {
        throw new Exception("Formato de respuesta inesperado");
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
            $reply = htmlspecialchars($reply, ENT_QUOTES, 'UTF-8');
            error_log('IA Chatbot: Posible contenido malicioso detectado en respuesta de OpenAI');
            break;
        }
    }

    // Guardar intercambio en la sesión
    $_SESSION['ia_chatbot_history'][] = ['role' => 'user', 'content' => $message];
    $_SESSION['ia_chatbot_history'][] = ['role' => 'assistant', 'content' => $reply];

    // Limitar el tamaño del historial para prevenir saturación de memoria
    if (count($_SESSION['ia_chatbot_history']) > 20) {
        // Mantener solo los últimos 20 mensajes
        $_SESSION['ia_chatbot_history'] = array_slice($_SESSION['ia_chatbot_history'], -20);
    }

    // Devolver la respuesta en el formato esperado por el frontend
    echo json_encode([
        'error' => false,
        'message' => $reply
    ]);

} catch (Exception $e) {
    // Registrar error sin información sensible
    error_log('IA Chatbot Debug Error: ' . $e->getMessage());
    
    // Devolver error en formato coherente, sin exponer detalles técnicos
    echo json_encode([
        'error' => true,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}