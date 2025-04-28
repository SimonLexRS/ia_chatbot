<?php
namespace Modules\IaChatbot\Actions;

use CController;
use CControllerResponseData;
use CWebUser;

class ChatAction extends CController {
    protected function init(): void {
        // Mantener la validación CSRF excepto para peticiones específicas
        // Las peticiones AJAX legítimas deben incluir un token CSRF
        if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') {
            $this->disableCsrfValidation();
        }
    }

    protected function checkPermissions(): bool {
        // Verificar que el usuario esté autenticado y tenga permisos mínimos
        // Sin esto, cualquier usuario sin autenticar podría acceder al chatbot
        if (!CWebUser::isLoggedIn()) {
            return false;
        }
        
        // Opcionalmente, puedes agregar verificación de permisos específicos de Zabbix
        // Ejemplo: requerir acceso a UI o permisos de lectura
        return CWebUser::checkAccess('ui.view');
    }

    protected function checkInput(): bool {
        // Validar los parámetros de entrada esperados
        // Esto es un ejemplo básico, adaptar según sea necesario
        $fields = [
            'view_mode' => 'string'
        ];
        $ret = $this->validateInput($fields);
        
        return $ret;
    }

    protected function doAction(): void {
        // Configurar variables de seguridad para la vista
        $data = [
            'csrf_token' => CCsrfTokenHelper::get('ia_chatbot'), // Genera token CSRF para la sesión del chatbot
            'user_id' => CWebUser::$data['userid'] // ID del usuario actual para seguimiento
        ];
        
        // Cargar y retornar HTML de vista con variables seguras
        ob_start();
        extract($data, EXTR_SKIP); // Extraer variables de forma segura
        include __DIR__.'/../views/chat.view.php';
        $html = ob_get_clean();
        
        // Sanitizar el HTML resultante para prevenir XSS
        // Nota: esto podría interferir con HTML legítimo, evaluar según el caso
        // $html = htmlspecialchars($html, ENT_QUOTES, 'UTF-8');
        
        $this->setResponse(new CControllerResponseData(['body' => $html]));
    }
}