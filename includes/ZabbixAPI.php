<?php
namespace Modules\IaChatbot\Includes;

/**
 * Clase para interactuar con la API de Zabbix
 */
class ZabbixAPI {
    private $api_url;
    private $auth_token;
    private $last_error;
    private $version;

    /**
     * Constructor
     * 
     * @param string $api_url URL de la API de Zabbix
     */
    // Utilizar siempre variables globales de Zabbix en lugar de hardcodear
    public function __construct($api_url = null) {
        // Si no se proporciona URL, usar la misma instancia de Zabbix
        if ($api_url === null) {
            global $ZBX_SERVER, $ZBX_SERVER_PORT;
            $protocol = (defined('ZBX_HTTPS_ENTRY') && ZBX_HTTPS_ENTRY) ? 'https' : 'http';
            $this->api_url = $protocol . '://' . $ZBX_SERVER . ':' . $ZBX_SERVER_PORT . '/api_jsonrpc.php';
        } else {
            $this->api_url = $api_url;
        }
    }

    /**
     * Login a la API de Zabbix usando las credenciales
     * 
     * @param string $username Nombre de usuario
     * @param string $password Contraseña
     * @return bool Verdadero si login es exitoso, falso en caso contrario
     */
    public function login($username, $password) {
        $params = [
            'user' => $username,
            'password' => $password
        ];

        $response = $this->callAPI('user.login', $params);
        
        if (isset($response['result'])) {
            $this->auth_token = $response['result'];
            
            // Obtener versión de la API para compatibilidad
            $this->version = $this->getVersion();
            return true;
        }
        
        $this->last_error = isset($response['error']) 
            ? $response['error']['message'] . ': ' . $response['error']['data']
            : 'Error desconocido durante login';
            
        return false;
    }

    /**
     * Login a la API de Zabbix usando el token de autenticación
     * 
     * @param string $auth_token Token de autenticación válido
     * @return bool Verdadero si el token es válido
     */
    public function setAuthToken($auth_token) {
        $this->auth_token = $auth_token;
        
        // Verificar si el token es válido obteniendo la versión
        $this->version = $this->getVersion();
        return !empty($this->version);
    }

    /**
     * Obtener la versión de la API de Zabbix
     * 
     * @return string Versión de la API o null si hay error
     */
    public function getVersion() {
        $response = $this->callAPI('apiinfo.version', []);
        return isset($response['result']) ? $response['result'] : null;
    }

    /**
     * Obtener el último error producido
     * 
     * @return string Mensaje de error
     */
    public function getLastError() {
        return $this->last_error;
    }

    /**
     * Llamar a cualquier método de la API de Zabbix
     * 
     * @param string $method Nombre del método API (ej: 'host.get')
     * @param array $params Parámetros para el método
     * @return array Respuesta de la API o null si hay error
     */
    public function callAPI($method, $params) {
        // Preparar el request
        $id = mt_rand(1, 100000);
        $request = [
            'jsonrpc' => '2.0',
            'method' => $method,
            'params' => $params,
            'id' => $id
        ];

        // Agregar token de autenticación si existe y no es un método de login o versión
        if ($this->auth_token && $method !== 'user.login' && $method !== 'apiinfo.version') {
            $request['auth'] = $this->auth_token;
        }

        // Configurar cURL
        $ch = curl_init($this->api_url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => 'POST',
            CURLOPT_HTTPHEADER => ['Content-Type: application/json-rpc'],
            CURLOPT_POSTFIELDS => json_encode($request),
            CURLOPT_SSL_VERIFYPEER => false, 
            CURLOPT_SSL_VERIFYHOST => false
        ]);

        // Ejecutar la petición y procesar la respuesta
        $result = curl_exec($ch);
        
        if ($result === false) {
            $this->last_error = 'Error cURL: ' . curl_error($ch);
            curl_close($ch);
            return null;
        }
        
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($http_code != 200) {
            $this->last_error = "Error HTTP $http_code";
            return null;
        }
        
        $response = json_decode($result, true);
        
        if (isset($response['error'])) {
            $this->last_error = $response['error']['message'] . ': ' . $response['error']['data'];
        }
        
        return $response;
    }

    /**
     * Obtener hosts con filtrado opcional
     * 
     * @param array $params Parámetros para el filtrado
     * @return array Lista de hosts o null si hay error
     */
    public function getHosts($params = []) {
        $default_params = [
            'output' => ['hostid', 'host', 'name', 'status', 'maintenance_status'],
            'sortfield' => 'name',
            'selectInterfaces' => ['interfaceid', 'ip', 'dns', 'port', 'type', 'useip', 'main']
        ];
        
        $params = array_merge($default_params, $params);
        $response = $this->callAPI('host.get', $params);
        
        return isset($response['result']) ? $response['result'] : null;
    }

    /**
     * Obtener un host específico por su ID
     * 
     * @param string $hostid ID del host a obtener
     * @return array Información del host o null si hay error
     */
    public function getHostById($hostid) {
        $params = [
            'output' => ['hostid', 'host', 'name', 'status', 'maintenance_status'],
            'hostids' => $hostid,
            'selectInterfaces' => ['interfaceid', 'ip', 'dns', 'port', 'type', 'useip', 'main']
        ];
        
        $response = $this->callAPI('host.get', $params);
        
        if (isset($response['result']) && !empty($response['result'])) {
            return $response['result'][0];
        }
        
        return null;
    }

    /**
     * Obtener grupos de hosts
     * 
     * @param array $params Parámetros para el filtrado
     * @return array Lista de grupos de hosts o null si hay error
     */
    public function getHostGroups($params = []) {
        $default_params = [
            'output' => ['groupid', 'name'],
            'sortfield' => 'name'
        ];
        
        $params = array_merge($default_params, $params);
        $response = $this->callAPI('hostgroup.get', $params);
        
        return isset($response['result']) ? $response['result'] : null;
    }

    /**
     * Obtener ítems (métricas) con filtrado opcional
     * 
     * @param array $params Parámetros para el filtrado
     * @return array Lista de ítems o null si hay error
     */
    public function getItems($params = []) {
        $default_params = [
            'output' => ['itemid', 'hostid', 'name', 'key_', 'value_type', 'units', 'lastvalue', 'lastclock'],
            'sortfield' => 'name',
            'selectHosts' => ['hostid', 'host', 'name']
        ];
        
        $params = array_merge($default_params, $params);
        $response = $this->callAPI('item.get', $params);
        
        return isset($response['result']) ? $response['result'] : null;
    }

    /**
     * Obtener problemas actuales con filtrado opcional
     * 
     * @param array $params Parámetros para el filtrado
     * @return array Lista de problemas o null si hay error
     */
    public function getProblems($params = []) {
        $default_params = [
            'output' => ['eventid', 'objectid', 'name', 'clock', 'severity', 'r_eventid'],
            'sortfield' => ['clock', 'eventid'],
            'sortorder' => 'DESC',
            'selectHosts' => ['hostid', 'host', 'name'],
            'recent' => true
        ];
        
        $params = array_merge($default_params, $params);
        $response = $this->callAPI('problem.get', $params);
        
        return isset($response['result']) ? $response['result'] : null;
    }

    /**
     * Obtener problemas para un host específico
     * 
     * @param string $hostid ID del host para el cual obtener problemas
     * @param array $additional_params Parámetros adicionales para el filtrado
     * @return array Lista de problemas o null si hay error
     */
    public function getProblemsForHost($hostid, $additional_params = []) {
        $params = [
            'output' => ['eventid', 'objectid', 'name', 'clock', 'severity', 'r_eventid'],
            'hostids' => [$hostid],
            'sortfield' => ['clock', 'eventid'],
            'sortorder' => 'DESC',
            'recent' => true
        ];
        
        // Fusionar parámetros adicionales
        $params = array_merge($params, $additional_params);
        
        $response = $this->callAPI('problem.get', $params);
        
        return isset($response['result']) ? $response['result'] : null;
    }

    /**
     * Obtener datos históricos de un ítem
     * 
     * @param array $params Parámetros para el filtrado
     * @return array Datos históricos o null si hay error
     */
    public function getHistory($params = []) {
        $default_params = [
            'output' => 'extend',
            'sortfield' => 'clock',
            'sortorder' => 'DESC',
            'limit' => 100
        ];
        
        $params = array_merge($default_params, $params);
        $response = $this->callAPI('history.get', $params);
        
        return isset($response['result']) ? $response['result'] : null;
    }

    /**
     * Obtener datos de tendencias de un ítem
     * 
     * @param array $params Parámetros para el filtrado
     * @return array Datos de tendencias o null si hay error
     */
    public function getTrends($params = []) {
        $default_params = [
            'output' => 'extend',
            'sortfield' => 'clock',
            'sortorder' => 'DESC',
            'limit' => 100
        ];
        
        $params = array_merge($default_params, $params);
        $response = $this->callAPI('trend.get', $params);
        
        return isset($response['result']) ? $response['result'] : null;
    }

    /**
     * Obtener gráficas con filtrado opcional
     * 
     * @param array $params Parámetros para el filtrado
     * @return array Lista de gráficas o null si hay error
     */
    public function getGraphs($params = []) {
        $default_params = [
            'output' => ['graphid', 'name', 'width', 'height', 'graphtype'],
            'sortfield' => 'name',
            'selectHosts' => ['hostid', 'host', 'name']
        ];
        
        $params = array_merge($default_params, $params);
        $response = $this->callAPI('graph.get', $params);
        
        return isset($response['result']) ? $response['result'] : null;
    }

    /**
     * Obtener la URL de una gráfica para mostrarla
     * 
     * @param string $graphid ID de la gráfica
     * @param int $width Ancho de la gráfica
     * @param int $height Alto de la gráfica
     * @param int $period Periodo en segundos (3600 = 1 hora)
     * @return string URL de la gráfica
     */
    public function getGraphURL($graphid, $width = 800, $height = 200, $period = 3600) {
        global $ZBX_SERVER, $ZBX_SERVER_PORT;
        
        $protocol = (defined('ZBX_HTTPS_ENTRY') && ZBX_HTTPS_ENTRY) ? 'https' : 'http';
        $base_url = $protocol . '://' . $ZBX_SERVER . ':' . $ZBX_SERVER_PORT;
        
        // Construir URL para la imagen de la gráfica
        $url = $base_url . '/chart.php?';
        $url .= 'graphid=' . urlencode($graphid);
        $url .= '&width=' . urlencode($width);
        $url .= '&height=' . urlencode($height);
        $url .= '&period=' . urlencode($period);
        
        // Si tenemos un token de autenticación, incluirlo
        if ($this->auth_token) {
            $url .= '&sid=' . urlencode($this->auth_token);
        }
        
        return $url;
    }

    /**
     * Crear URL para una gráfica personalizada a partir de datos históricos
     * 
     * @param array $items Array de itemids a mostrar en la gráfica
     * @param int $width Ancho de la gráfica
     * @param int $height Alto de la gráfica
     * @param int $period Periodo en segundos (3600 = 1 hora)
     * @return string URL de la gráfica
     */
    public function getCustomGraphURL($items, $width = 800, $height = 200, $period = 3600) {
        global $ZBX_SERVER, $ZBX_SERVER_PORT;
        
        $protocol = (defined('ZBX_HTTPS_ENTRY') && ZBX_HTTPS_ENTRY) ? 'https' : 'http';
        $base_url = $protocol . '://' . $ZBX_SERVER . ':' . $ZBX_SERVER_PORT;
        
        // Construir URL para la imagen de la gráfica
        $url = $base_url . '/chart.php?';
        
        // Agregar todos los itemids
        if (is_array($items)) {
            foreach ($items as $i => $itemid) {
                $url .= '&itemids[' . $i . ']=' . urlencode($itemid);
            }
        } else {
            $url .= '&itemids[0]=' . urlencode($items);
        }
        
        $url .= '&width=' . urlencode($width);
        $url .= '&height=' . urlencode($height);
        $url .= '&period=' . urlencode($period);
        
        // Si tenemos un token de autenticación, incluirlo
        if ($this->auth_token) {
            $url .= '&sid=' . urlencode($this->auth_token);
        }
        
        return $url;
    }

    /**
     * Obtener triggers (alertas) con filtrado opcional
     * 
     * @param array $params Parámetros para el filtrado
     * @return array Lista de triggers o null si hay error
     */
    public function getTriggers($params = []) {
        $default_params = [
            'output' => ['triggerid', 'description', 'priority', 'status', 'value', 'lastchange'],
            'sortfield' => 'lastchange',
            'sortorder' => 'DESC',
            'selectHosts' => ['hostid', 'host', 'name']
        ];
        
        $params = array_merge($default_params, $params);
        $response = $this->callAPI('trigger.get', $params);
        
        return isset($response['result']) ? $response['result'] : null;
    }
    
    /**
     * Obtener eventos con filtrado opcional
     * 
     * @param array $params Parámetros para el filtrado
     * @return array Lista de eventos o null si hay error
     */
    public function getEvents($params = []) {
        $default_params = [
            'output' => 'extend',
            'sortfield' => ['clock', 'eventid'],
            'sortorder' => 'DESC',
            'limit' => 50,
            'selectHosts' => ['hostid', 'host', 'name']
        ];
        
        $params = array_merge($default_params, $params);
        $response = $this->callAPI('event.get', $params);
        
        return isset($response['result']) ? $response['result'] : null;
    }
    
    /**
     * Obtener dashboards con filtrado opcional
     * 
     * @param array $params Parámetros para el filtrado
     * @return array Lista de dashboards o null si hay error
     */
    public function getDashboards($params = []) {
        $default_params = [
            'output' => ['dashboardid', 'name'],
            'sortfield' => 'name'
        ];
        
        $params = array_merge($default_params, $params);
        $response = $this->callAPI('dashboard.get', $params);
        
        return isset($response['result']) ? $response['result'] : null;
    }
    
    /**
     * Obtener servicios ITSM con filtrado opcional
     * 
     * @param array $params Parámetros para el filtrado
     * @return array Lista de servicios o null si hay error
     */
    public function getServices($params = []) {
        $default_params = [
            'output' => ['serviceid', 'name', 'status'],
            'sortfield' => 'name'
        ];
        
        $params = array_merge($default_params, $params);
        $response = $this->callAPI('service.get', $params);
        
        return isset($response['result']) ? $response['result'] : null;
    }
}