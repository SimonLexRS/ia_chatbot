# Zabbix IA

Un asistente virtual avanzado basado en inteligencia artificial para Zabbix que utiliza la API de OpenAI para proporcionar soporte y ayuda contextual a los usuarios. Este módulo permite interactuar con un chatbot inteligente directamente desde la interfaz de Zabbix para obtener respuestas sobre monitoreo, alertas y administración del sistema.

## Versiones Disponibles

| Característica | Versión Gratuita | Versión PRO | Versión Enterprise |
|----------------|------------------|-------------|-------------------|
| Chat con IA básico | ✅ | ✅ | ✅ |
| Integración nativa con Zabbix | ✅ | ✅ | ✅ |
| Markdown en respuestas | ✅ | ✅ | ✅ |
| Historial básico | ✅ | ✅ | ✅ |
| Personalización avanzada | ❌ | ✅ | ✅ |
| Integración profunda con hosts | ❌ | ✅ | ✅ |
| Análisis de problemas inteligente | ❌ | ✅ | ✅ |
| Respuesta automatizada a incidentes | ❌ | ❌ | ✅ |
| Soporte técnico prioritario | ❌ | ✅ | ✅ |
| Entrenamiento personalizado | ❌ | ❌ | ✅ |
| Despliegue On-Premise sin conexión | ❌ | ❌ | ✅ |
| Multi-lenguaje avanzado | ❌ | ✅ | ✅ |
| Dashboard de análisis de uso | ❌ | ✅ | ✅ |
| Actualizaciones garantizadas | ❌ | ✅ | ✅ |

**[🚀 Adquiera la versión PRO ahora](https://elitech-solutions.com/pro)** | **[🌟 Conozca las ventajas Enterprise](https://elitech-solutions.com/enterprise)**

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
   gh repo clone SimonLexRS/ia_chatbot
   ```

   O si descargó el ZIP:

   ```bash
   cd /usr/share/zabbix/ui/modules/
   unzip ia_chatbot.zip -d .
   ```

   **¿Interesado en la versión PRO o Enterprise?** [Contacte con nuestro equipo comercial](https://elitech-solutions.com/contacto) para obtener instrucciones de instalación específicas y claves de licencia.

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
   - IMPORTANTE: Nunca comparta su API Key ni la incluya en código público

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
- Almacenamiento seguro de la API Key en el navegador del usuario (encriptada localmente)
- Verificación de autenticación de usuarios
- Detección de contenido potencialmente malicioso
- No se almacenan API Keys en el servidor o en el repositorio
- Ninguna credencial o API Key está incluida en el código fuente

### Consideraciones importantes para la seguridad

- Las claves API de OpenAI son secretas y valiosas. Nunca deben compartirse.
- Este módulo no incluye ninguna clave API predeterminada y cada usuario debe configurar la suya.
- La clave API se almacena solo en el navegador local del usuario y nunca se transfiere al servidor excepto durante las llamadas API.
- Recomendamos configurar permisos de API con restricciones en OpenAI para limitar el uso.
- Si va a contribuir al proyecto, asegúrese de no incluir credenciales o configuraciones locales en sus pull requests.

## Demos
Expandido
![image](https://github.com/user-attachments/assets/9bd3fd54-9bc4-4d53-8371-99917fdff01a)

Maximizado

![image](https://github.com/user-attachments/assets/4a24877c-7623-4ae8-aa0a-5761a99f3402)

Configuraciones

![image](https://github.com/user-attachments/assets/3769f0e4-a2ba-4a63-b1d0-edf2d4496201)


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

Desarrollado por [Simon Rodriguez](https://github.com/SimonLexRS)

---

Si tiene alguna pregunta o necesita soporte, no dude en abrir un issue en el repositorio de GitHub o contactar directamente al autor.
