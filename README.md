# IA Chatbot para Zabbix

Un módulo de asistente virtual basado en IA para Zabbix que utiliza la API de OpenAI para proporcionar soporte y ayuda contextual a los usuarios. Este módulo permite interactuar con un chatbot inteligente directamente desde la interfaz de Zabbix para obtener respuestas sobre monitoreo, alertas y administración del sistema.

## Actualizaciones
- Mejoras en la integracion con OpenAI y OLLAMA
- Seleccion dinamica de modelos de LLM
- Mejoras en la estabilidad y rendimiento

## Características

- Integración nativa con la interfaz de Zabbix
- Respuestas contextuales sobre monitoreo y alertas
- Soporte para Markdown en las respuestas
- Personalización del modelo de IA y parámetros
- Integración con el API de Zabbix para obtener información de hosts y problemas
- Historial de conversaciones persistente
- Seguridad mejorada con validación de entradas y sanitización
- Opciones avanzadas de configuración

## Requisitos

- Zabbix 6.0 o superior
- PHP 7.4 o superior con extensiones:
  - curl
  - json
  - session
- Acceso a la API de OpenAI (requiere una API Key)
- Permisos para instalar módulos en Zabbix

## Instalación

1. **Descargar el módulo**

   Clone el repositorio o descargue el archivo ZIP y extraiga el contenido en la carpeta `modules` de Zabbix:

   ```bash
   cd /usr/share/zabbix/ui/modules/
   git clone https://github.com/tu-usuario/ia_chatbot.git
   ```

   O si descargó el ZIP:

   ```bash
   cd /usr/share/zabbix/ui/modules/
   unzip ia_chatbot.zip -d .
   ```

2. **Configurar permisos**

   Asegúrese de que el usuario del servidor web (normalmente www-data, apache o nginx) tenga permisos para leer el módulo:

   ```bash
   chown -R www-data:www-data ia_chatbot/
   ```

3. **Habilitar el módulo en Zabbix**

   - Inicie sesión en la interfaz web de Zabbix como administrador
   - Vaya a: Administración → Módulos
   - Busque "IA Chatbot" en la lista de módulos
   - Haga clic en el botón "Habilitar"

4. **Obtener una API Key de OpenAI**

   - Regístrese o inicie sesión en [OpenAI Platform](https://platform.openai.com/)
   - Vaya a la sección de [API Keys](https://platform.openai.com/api-keys)
   - Cree una nueva API Key y copie el valor

5. **Configurar el módulo**

   - Una vez habilitado el módulo, aparecerá un ícono de chat en la interfaz de Zabbix
   - Haga clic en el ícono para abrir el chat
   - Haga clic en el ícono de configuración (⚙️) dentro del chat
   - Introduzca su API Key de OpenAI y configure las opciones adicionales si lo desea
   - Guarde la configuración

## Uso

1. **Acceder al chatbot**

   - El ícono del chatbot aparecerá en la esquina inferior derecha de la interfaz de Zabbix
   - Haga clic en el ícono para abrir la ventana de chat

2. **Realizar consultas**

   Ejemplos de preguntas que puede hacer:

   - "¿Cómo configuro un trigger en Zabbix?"
   - "¿Qué significa el error 'no data received'?"
   - "Muéstrame cómo crear un dashboard"
   - "¿Cómo puedo monitorear MySQL con Zabbix?"

3. **Seleccionar hosts para contexto**

   Si el chatbot lo solicita, puede seleccionar un host específico para obtener información contextual sobre ese equipo, como problemas activos.

4. **Configuración avanzada**

   Para cambiar el modelo de IA, temperatura u otros parámetros:
   - Abra el chat
   - Haga clic en ⚙️ (configuración)
   - Vaya a la pestaña "Avanzada"
   - Ajuste los parámetros según sus necesidades

## Seguridad

Este módulo implementa múltiples capas de seguridad:

- Validación estricta de entradas para prevenir ataques de inyección
- Sanitización de respuestas para prevenir XSS
- Verificación SSL en las comunicaciones con OpenAI
- Rate limiting para prevenir abusos
- Almacenamiento seguro de la API Key en el navegador del usuario
- Verificación de autenticación de usuarios
- Detección de contenido potencialmente malicioso

## Solución de problemas

### El chatbot no aparece en la interfaz

- Verifique que el módulo esté habilitado en Administración → Módulos
- Compruebe los logs de error de su servidor web
- Asegúrese de que la carpeta `/modules/ia_chatbot` tenga los permisos correctos

### Error de API Key inválida

- Asegúrese de haber ingresado correctamente la API Key de OpenAI
- Verifique que su API Key tenga saldo disponible
- Compruebe que su API Key tenga los permisos necesarios para acceder a los modelos GPT

### Problemas de conexión con OpenAI

- Verifique que su servidor tenga acceso a Internet
- Compruebe que el firewall no esté bloqueando las conexiones salientes a api.openai.com
- Revise los logs de PHP para más información sobre errores de conexión

## Contribuciones

Las contribuciones son bienvenidas. Por favor, siéntase libre de enviar pull requests o reportar problemas en el repositorio de GitHub.

## Licencia

Este módulo se distribuye bajo la licencia [MIT](LICENSE).

## Autor

Desarrollado por [Tu Nombre](https://github.com/tu-usuario)

---

Si tiene alguna pregunta o necesita soporte, no dude en abrir un issue en el repositorio de GitHub o contactar directamente al autor.
