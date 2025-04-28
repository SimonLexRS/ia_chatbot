<?php
// Archivo ofuscado - No modificar
if(!defined('ZBX_PROTECT')){define('ZBX_PROTECT',true);}
if(!ZBX_PROTECT){header('HTTP/1.1 403 Forbidden');exit;}

// Entorno de producción: no mostrar errores
ini_set('display_errors', 0);
error_reporting(0);

// Iniciar sesión
session_start();

// Función de sanitización ofuscada
function _s7n($i){return is_string($i)?htmlspecialchars($i,ENT_QUOTES,'UTF-8'):(is_array($i)?array_map('_s7n',$i):$i);}

// Encabezados seguros
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header("Content-Security-Policy: default-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self'; style-src 'self';");
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

// Rate limiting ofuscado
$_l1=!isset($_SESSION['_t0'])?true:(time()-$_SESSION['_t0'])>60;
if($_l1){$_SESSION['_t0']=time();$_SESSION['_c0']=1;}
else{$_SESSION['_c0']++;if($_SESSION['_c0']>10){http_response_code(429);echo json_encode(['error'=>true,'message'=>base64_decode('RGVtYXNpYWRhcyBwZXRpY2lvbmVzLiBQb3IgZmF2b3IsIGVzcGVyYSB1biBtaW51dG8gZSBpbnRlbnRhIGRlIG51ZXZvLg==')]);exit;}}

try {
    // Variables protegidas
    $_u0 = base64_decode('aHR0cHM6Ly9hcGkub3BlbmFpLmNvbS92MS9jaGF0L2NvbXBsZXRpb25z');
    $_m1 = 1024 * 1024;
    
    // Validación de tamaño
    if (isset($_SERVER['CONTENT_LENGTH']) && $_SERVER['CONTENT_LENGTH'] > $_m1) {
        throw new Exception(base64_decode('UGF5bG9hZCBkZW1hc2lhZG8gZ3JhbmRl'));
    }
    
    // Lectura de datos
    $_r0 = file_get_contents('php://input');
    $_i0 = json_decode($_r0, true) ?: [];

    // Historial
    if (!isset($_SESSION['_h0'])) {
        $_SESSION['_h0'] = [];
    }
    
    // Sanitizar historial
    $_SESSION['_h0'] = array_values(array_filter(
        $_SESSION['_h0'],
        function($_e0) {
            return (isset($_e0['role'], $_e0['content']) && 
                    in_array($_e0['role'], ['user', 'assistant'], true) && 
                    is_string($_e0['content'])) ||
                   (isset($_e0['sender'], $_e0['text']) && 
                    in_array($_e0['sender'], ['user', 'bot', 'assistant'], true) && 
                    is_string($_e0['text']));
        }
    ));
    
    // Normalizar formato
    foreach ($_SESSION['_h0'] as &$_e0) {
        if (isset($_e0['sender'], $_e0['text'])) {
            $_r1 = $_e0['sender'] === 'user' ? 'user' : 'assistant';
            $_e0 = ['role' => $_r1, 'content' => _s7n($_e0['text'])];
        } elseif (isset($_e0['role'], $_e0['content'])) {
            $_e0['content'] = _s7n($_e0['content']);
        }
    }
    unset($_e0);

    // Limpiar historial si se solicita
    if (!empty($_i0['clear'])) {
        $_SESSION['_h0'] = [];
        echo json_encode(['error' => false, 'message' => base64_decode('SGlzdG9yaWFsIGVsaW1pbmFkbw==')]);
        exit;
    }

    // Validar API Key
    if (empty($_i0['api_key']) || !preg_match('/^sk-[a-zA-Z0-9_\-]{10,}$/', $_i0['api_key'])) {
        header('HTTP/1.1 400 Bad Request');
        echo json_encode(['error' => true, 'message' => base64_decode('QVBJIEtleSBubyBwcm9wb3JjaW9uYWRhIG8gY29uIGZvcm1hdG8gaW52w6FsaWRv')]);
        exit;
    }
    $_k0 = $_i0['api_key'];

    // Validar mensaje
    if (empty($_i0['message'])) {
        header('HTTP/1.1 400 Bad Request');
        echo json_encode(['error' => true, 'message' => base64_decode('TWVuc2FqZSBubyBwcm9wb3JjaW9uYWRv')]);
        exit;
    }
    
    // Sanitizar mensaje
    $_m0 = _s7n($_i0['message']);
    if (strlen($_m0) > 4000) {
        $_m0 = substr($_m0, 0, 4000);
    }

    // Validar parámetros
    $_a0 = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4o', 'gpt-4-turbo'];
    $_md = isset($_i0['model']) && in_array($_i0['model'], $_a0) ? $_i0['model'] : 'gpt-3.5-turbo';
    $_t0 = isset($_i0['temperature']) && is_numeric($_i0['temperature']) && $_i0['temperature'] >= 0 && $_i0['temperature'] <= 1
        ? floatval($_i0['temperature']) : 0.7;
    $_mx = isset($_i0['max_tokens']) && is_numeric($_i0['max_tokens']) && $_i0['max_tokens'] > 0 && $_i0['max_tokens'] <= 4000
        ? intval($_i0['max_tokens']) : 800;
    $_sp = isset($_i0['system_prompt']) && is_string($_i0['system_prompt']) 
        ? _s7n($_i0['system_prompt'])
        : base64_decode('RXJlcyB1biBhc2lzdGVudGUgcGFyYSBlbCBzaXN0ZW1hIGRlIG1vbml0b3JizemFjOzbiBaYWJiaXguIE1hbnTDqW4gZWwgY29udGV4dG8gZGUgbGEgY29udmVyc2FjacOzbiBiYXNhZGEgZW4gaW50ZXJjYW1iaW9zIHByZXZpb3Mu');

    // Preparar mensajes
    $_ms = [['role' => 'system', 'content' => $_sp]];
    foreach ($_SESSION['_h0'] as $_e0) {
        if (isset($_e0['role'], $_e0['content'])) {
            $_ms[] = ['role' => $_e0['role'], 'content' => $_e0['content']];
        }
    }
    $_ms[] = ['role' => 'user', 'content' => $_m0];

    // Preparar payload
    $_py = json_encode([
        'model' => $_md,
        'messages' => $_ms,
        'temperature' => $_t0,
        'max_tokens' => $_mx
    ]);

    // Configurar cURL con seguridad
    $_ch = curl_init($_u0);
    curl_setopt_array($_ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $_py,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $_k0
        ],
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_TIMEOUT => 60,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_FORBID_REUSE => true,
        CURLOPT_FRESH_CONNECT => true,
        CURLOPT_MAXREDIRS => 3,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
        CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTPS
    ]);

    // Ejecutar petición
    $_rs = curl_exec($_ch);
    $_st = curl_getinfo($_ch, CURLINFO_HTTP_CODE);
    $_er = curl_error($_ch);
    $_en = curl_errno($_ch);
    curl_close($_ch);

    // Errores SSL
    if ($_en == CURLE_SSL_CACERT || $_en == CURLE_SSL_PEER_CERTIFICATE) {
        throw new Exception(base64_decode('RXJyb3IgZGUgdmVyaWZpY2FjacOzbiBTU0wuIFBvciBmYXZvciwgY29tcHJ1ZWJlIGxvcyBjZXJ0aWZpY2Fkb3MgZGVsIHNlcnZpZG9yLg=='));
    }

    // Errores cURL
    if ($_er) {
        throw new Exception(base64_decode('RXJyb3IgZGUgY29uZXhpw7NuOiA=') . $_er);
    }

    // Respuesta vacía
    if (empty($_rs)) {
        throw new Exception(base64_decode('Tm8gc2UgcmVjaWJpw7MgcmVzcHVlc3RhIGRlIE9wZW5BSQ=='));
    }

    // Error HTTP
    if ($_st < 200 || $_st >= 300) {
        throw new Exception(base64_decode('RXJyb3IgZW4gbGEgc29saWNpdHVkIEhUVFA6IA==') . $_st);
    }

    // Decodificar respuesta
    $_dt = json_decode($_rs, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception(base64_decode('RXJyb3IgYWwgZGVjb2RpZmljYXIgbGEgcmVzcHVlc3RhIEpTT046IA==') . json_last_error_msg());
    }

    // Errores OpenAI
    if (isset($_dt['error'])) {
        throw new Exception(base64_decode('RXJyb3IgZGUgT3BlbkFJOiA=') . ($_dt['error']['message'] ?? base64_decode('RXJyb3IgZGVzY29ub2NpZG8=')));
    }

    // Extraer respuesta
    if (!isset($_dt['choices'][0]['message']['content'])) {
        throw new Exception(base64_decode('Rm9ybWF0byBkZSByZXNwdWVzdGEgaW5lc3BlcmFkbw=='));
    }
    $_rp = $_dt['choices'][0]['message']['content'];
    
    // Validar longitud
    if (strlen($_rp) > 16384) {
        $_rp = substr($_rp, 0, 16384) . "\n\n" . base64_decode('W1Jlc3B1ZXN0YSB0cnVuY2FkYSBwb3Igc2VyIGRlbWFzaWFkbyBsYXJnYV0=');
    }
    
    // Detectar contenido malicioso
    $_mp = [
        '/<script\b[^>]*>/i',
        '/javascript:/i',
        '/onclick=/i',
        '/data:text\/html/i',
        '/eval\s*\(/i'
    ];
    
    foreach ($_mp as $_pt) {
        if (preg_match($_pt, $_rp)) {
            $_rp = htmlspecialchars($_rp, ENT_QUOTES, 'UTF-8');
            error_log(base64_decode('SUEgQ2hhdGJvdDogUG9zaWJsZSBjb250ZW5pZG8gbWFsaWNpb3NvIGRldGVjdGFkbyBlbiByZXNwdWVzdGEgZGUgT3BlbkFJ'));
            break;
        }
    }

    // Guardar conversación
    $_SESSION['_h0'][] = ['role' => 'user', 'content' => $_m0];
    $_SESSION['_h0'][] = ['role' => 'assistant', 'content' => $_rp];

    // Limitar historial
    if (count($_SESSION['_h0']) > 20) {
        $_SESSION['_h0'] = array_slice($_SESSION['_h0'], -20);
    }

    // Devolver respuesta
    echo json_encode([
        'error' => false,
        'message' => $_rp
    ]);

} catch (Exception $_ex) {
    // Registrar error
    error_log(base64_decode('SUEgQ2hhdGJvdCBEZWJ1ZyBFcnJvcjog') . $_ex->getMessage());
    
    // Devolver error
    echo json_encode([
        'error' => true,
        'message' => base64_decode('RXJyb3I6IA==') . $_ex->getMessage()
    ]);
}