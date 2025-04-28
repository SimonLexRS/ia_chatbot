<?php
// View for IA Chatbot full-screen
// Placeholder element, JS will render full-screen chat UI
?>
<!-- Banner promocional -->
<div class="ia-promo-banner" style="display: block; position: fixed; top: 70px; left: 0; right: 0; text-align: center; background: linear-gradient(135deg, #2980b9, #1a5276); color: #fff; z-index: 10000; padding: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
    <div class="promo-content" style="display: flex; align-items: center; justify-content: center; flex-wrap: wrap; max-width: 1200px; margin: 0 auto;">
        <span class="version-tag" style="background-color: rgba(255,255,255,0.2); padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-right: 15px;">VERSIÓN GRATUITA</span>
        <p style="margin: 5px 15px 5px 0; font-size: 14px;">Está utilizando la versión gratuita de Zabbix IA. <a href="https://elitech-solutions.com/pro" target="_blank" style="color: #fff; font-weight: bold; text-decoration: underline;">¡Actualice a PRO/Enterprise</a> para acceder a análisis avanzado de problemas, integración profunda con hosts y más!</p>
        <button class="promo-close-btn" style="background: transparent; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0 5px; line-height: 1;">×</button>
    </div>
</div>

<div class="chat-widget-container">
    <!-- Contenedor principal -->
    <div class="chat-widget">
        <!-- Cabecera -->
        <div class="chat-header">
            <div class="chat-title-container">
                <img src="modules/ia_chatbot/assets/img/Zabbix IA Logo.png" alt="Zabbix IA" class="chat-logo">
                <h3 class="chat-title">Zabbix IA</h3>
            </div>
            <div class="chat-controls">
                <button class="settings-btn" title="<?= _('Configuración') ?>">⚙️</button>
                <button class="minimize-btn" title="<?= _('Minimizar') ?>">
                    <img src="modules/ia_chatbot/assets/img/Minimizar-icon.png" alt="Minimizar" class="icon">
                </button>
                <button class="maximize-btn" title="<?= _('Maximizar') ?>">
                    <img src="modules/ia_chatbot/assets/img/Maximizar-icon.png" alt="Maximizar" class="icon">
                </button>
                <button class="expand-btn" title="<?= _('Expandir') ?>">
                    <img src="modules/ia_chatbot/assets/img/Expandir-icon.png" alt="Expandir" class="icon">
                </button>
            </div>
        </div>

        <!-- Cuerpo del chat -->
        <div class="chat-body">
            <div class="message-container">
                <div class="message bot-message">
                    <div class="message-content">
                        <p>¡Hola! Soy el asistente de Zabbix. ¿En qué puedo ayudarte hoy?</p>
                        <p>Puedes preguntarme sobre:</p>
                        <ul>
                            <li>Consultas sobre configuración de Zabbix</li>
                            <li>Solución a problemas comunes</li>
                            <li>Mejores prácticas de monitoreo</li>
                            <li>Explicación de alertas y eventos</li>
                        </ul>
                        <p><small>Estoy usando la <strong>versión gratuita</strong> con funcionalidades limitadas. <a href="https://elitech-solutions.com/pro" target="_blank" class="upgrade-link">Actualizar a PRO ↗</a></small></p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Pie del chat -->
        <div class="chat-footer">
            <div class="input-container">
                <input type="text" class="chat-input" placeholder="Escribe un mensaje...">
                <button class="send-btn">Enviar</button>
            </div>
        </div>
    </div>

    <!-- Modal de configuración -->
    <div class="settings-modal">
        <div class="modal-content">
            <span class="close-btn">&times;</span>
            <h2>Configuración del Chatbot</h2>
            <form>
                <label for="bot-name">Nombre del Bot:</label>
                <input type="text" id="bot-name" name="bot-name" value="Zabbix IA">
                <label for="bot-language">Idioma:</label>
                <select id="bot-language" name="bot-language">
                    <option value="es">Español</option>
                    <option value="en">English</option>
                </select>
                <input type="submit" value="Guardar">
            </form>
        </div>
    </div>
</div>
<?php
return true;
?>