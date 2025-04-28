// Este archivo gestiona la funcionalidad del chatbot de IA para Zabbix

document.addEventListener('DOMContentLoaded', function() {
    // Asegurar que marked está disponible globalmente
    if (typeof window.marked === 'undefined' && typeof marked !== 'undefined') {
        window.marked = marked;
    }

    // Inicializar marked con opciones óptimas para el chatbot
    if (typeof window.marked !== 'undefined') {
        window.marked.setOptions({
            renderer: new marked.Renderer(),
            highlight: function(code, language) {
                return code;
            },
            pedantic: false,
            gfm: true,
            breaks: true,
            sanitize: false,
            smartLists: true,
            smartypants: false,
            xhtml: false
        });
    }
    
    // Asegurar que el banner promocional sea visible
    const promoBanner = document.querySelector('.ia-promo-banner');
    if (promoBanner) {
        promoBanner.style.display = 'block';
        promoBanner.style.opacity = '1';
        promoBanner.style.visibility = 'visible';
    }
    
    // Configurar botón de cierre del banner
    const closeBtn = document.querySelector('.promo-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            const promoBanner = document.querySelector('.ia-promo-banner');
            if (promoBanner) {
                promoBanner.style.display = 'none';
                localStorage.setItem('ia_promo_banner_closed', 'true');
            }
        });
    }
    
    // Toggle chat visibility when main menu 'Chatbot IA' is clicked, persist visibility
    document.addEventListener('click', function(e) {
        if (e.target.matches("a[href*='ia_chatbot.chat']")) {
            e.preventDefault();
            const cnt = document.getElementById('ia-chatbot-container');
            cnt.classList.toggle('hidden');
            const visible = !cnt.classList.contains('hidden');
            localStorage.setItem('ia_chatbot_visible', visible);
        }
    });

    // Utility function to convert Markdown to HTML - OPTIMIZADA
    function renderMarkdown(text) {
        try {
            // Asegurar que el texto es una cadena válida
            if (typeof text !== 'string') {
                console.error('renderMarkdown: received non-string input:', text);
                return String(text).replace(/\n/g, '<br>');
            }

            // Verificar si marked está disponible globalmente
            const markedLib = window.marked || marked;
            
            if (typeof markedLib !== 'undefined') {
                try {
                    // Configurar opciones de marked para mejorar el renderizado
                    const markedOptions = {
                        gfm: true,
                        breaks: true,
                        pedantic: false,
                        smartLists: true,
                        smartypants: true,
                        xhtml: false,
                        headerIds: false
                    };
                    
                    // Usar la versión correcta según la API disponible
                    let renderedHtml;
                    if (typeof markedLib.parse === 'function') {
                        renderedHtml = markedLib.parse(text, markedOptions);
                    } else if (typeof markedLib === 'function') {
                        renderedHtml = markedLib(text, markedOptions);
                    } else if (typeof markedLib.marked === 'function') {
                        renderedHtml = markedLib.marked(text, markedOptions);
                    } else {
                        console.warn('Marked library detected but method not found, using fallback');
                        return text.replace(/\n/g, '<br>');
                    }

                    // Mejorar el formato de tablas
                    renderedHtml = renderedHtml.replace(
                        /<table>/g, 
                        '<div class="table-container"><table>'
                    ).replace(
                        /<\/table>/g, 
                        '</table></div>'
                    );

                    return renderedHtml;
                } catch (markdownError) {
                    console.error('Error applying marked library:', markdownError);
                    // Continuar con el fallback
                }
            } else {
                console.warn('marked library not available, using fallback');
            }
            
            // Fallback mejorado si marked no está disponible o falló
            // Este fallback es limitado pero maneja más elementos Markdown
            return text
                .replace(/\n\n/g, '</p><p>')
                .replace(/\n/g, '<br>')
                // Código inline y bloques de código
                .replace(/`{3}([^`]+)`{3}/g, '<pre><code>$1</code></pre>')
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                // Formatos de texto
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                // Encabezados
                .replace(/### (.+)/g, '<h3>$1</h3>')
                .replace(/## (.+)/g, '<h2>$1</h2>')
                .replace(/# (.+)/g, '<h1>$1</h1>')
                // Listas no ordenadas básicas
                .replace(/^\s*[\-\*]\s+(.+)/gm, '<li>$1</li>')
                // Enlaces simples
                .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        } catch (error) {
            console.error('Error rendering markdown:', error);
            return text.replace(/\n/g, '<br>');
        }
    }

    // Función para escapar HTML y mostrar raw en chat
    function escapeHTML(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // Función para manejar la selección en los dropdowns
    function handleSelectChange(selectElement) {
        const selectedValue = selectElement.value;
        const messageContainer = selectElement.closest('.message-container');
        
        // Obtener el ID de la conversación a partir del atributo data
        const conversationId = messageContainer.getAttribute('data-conversation-id');
        
        // Añadir la selección como un nuevo mensaje del usuario
        const selectedText = selectElement.options[selectElement.selectedIndex].text;
        addUserMessage(`Seleccionado: ${selectedText}`);
        
        // Desactivar el select después de la selección
        selectElement.disabled = true;
        
        // Añadir clase visual para mostrar que fue seleccionado
        const selectContainer = selectElement.parentElement;
        const preselectedDiv = document.createElement('div');
        preselectedDiv.className = 'ia-chatbot-preselected';
        preselectedDiv.textContent = `Seleccionado: ${selectedText}`;
        selectContainer.appendChild(preselectedDiv);
        
        // Enviar la selección al servidor
        sendHostSelectionToServer(selectedValue, conversationId);
    }

    // Función para enviar la selección del host al servidor
    function sendHostSelectionToServer(hostId, conversationId) {
        const formData = new FormData();
        formData.append('host_id', hostId);
        formData.append('conversation_id', conversationId);
        
        fetch('index.php?action=module.ia_chatbot.chat.message', {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Mostrar respuesta del chatbot tras la selección
                addBotMessage(data.message, data.conversation_id);
                updateSuggestions(data.suggestions || []);
            } else {
                console.error('Error al procesar la selección:', data.message);
                addSystemMessage('Error al procesar tu selección. Por favor, inténtalo de nuevo.');
            }
        })
        .catch(error => {
            console.error('Error en la petición:', error);
            addSystemMessage('Error de conexión. Por favor, verifica tu conexión a internet.');
        });
    }

    // Función para crear dinámicamente un selector de hosts
    function createHostSelector(hosts, conversationId) {
        const selectContainer = document.createElement('div');
        selectContainer.className = 'ia-chatbot-select-container';
        
        const select = document.createElement('select');
        select.className = 'ia-chatbot-select';
        
        // Opción por defecto
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.text = 'Selecciona un host...';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        select.appendChild(defaultOption);
        
        // Añadir opciones de hosts
        hosts.forEach(host => {
            const option = document.createElement('option');
            option.value = host.hostid;
            option.text = host.name;
            select.appendChild(option);
        });
        
        // Añadir evento change
        select.addEventListener('change', function() {
            handleSelectChange(this);
        });
        
        selectContainer.appendChild(select);
        return selectContainer;
    }

    // Floating chat window
    const historyKey = 'ia_chatbot_history';
    let history = JSON.parse(localStorage.getItem(historyKey) || '[]');
    // Load window state: minimized, maximized or expanded; default maximized
    const state = localStorage.getItem('ia_chatbot_state') || 'maximized';
    // Container with state class and persisted visibility
    const visible = localStorage.getItem('ia_chatbot_visible') === 'true';
    const $container = $('<div/>', {id: 'ia-chatbot-container'})
        .addClass(state)
        .toggleClass('hidden', !visible);
    // Header: left area with logo and text, right area with controls
    const $header = $('<div/>', {id: 'ia-chatbot-header'}).append(
        '<div id="ia-chatbot-header-left">' +
            '<img id="ia-chatbot-logo-img" src="modules/ia_chatbot/assets/img/Zabbix IA Logo.png">' +
        '</div>' +
        '<div id="ia-chatbot-controls">' +
            '<button id="ia-chatbot-toggle" type="button" title="Maximizar"><img id="ia-chatbot-toggle-img" src="modules/ia_chatbot/assets/img/Maximizar-icon.png" alt="Maximizar"></button>' +
            '<button id="ia-chatbot-expand" type="button" title="Expandir"><img id="ia-chatbot-expand-img" src="modules/ia_chatbot/assets/img/Expandir-icon.png" alt="Expandir"></button>' +
            '<button id="ia-chatbot-theme-toggle" type="button" title="Cambiar tema">🌓</button>' +
            '<button id="ia-chatbot-config" type="button" title="Configurar API Key"><span style="font-size:1.2em;">⚙️</span></button>' +
            '<button id="ia-chatbot-close" type="button" title="Cerrar">✖</button>' +
        '</div>'
    );
    const $toggleBtn = $header.find('#ia-chatbot-toggle img');
    const $expandBtn = $header.find('#ia-chatbot-expand img');
    // Set initial header view based on state
    const $logoText = $header.find('#ia-chatbot-logo-text');
    const $logoImg = $header.find('#ia-chatbot-logo-img');
    if (state === 'minimized') {
        // minimized: show maximize only
        $toggleBtn.attr('src', 'modules/ia_chatbot/assets/img/Maximizar-icon.png').attr('alt', 'Maximizar');
        $('#ia-chatbot-toggle').attr('title', 'Maximizar');
        $header.find('#ia-chatbot-toggle').show();
        $header.find('#ia-chatbot-expand').hide();
    }
    else if (state === 'maximized') {
        // maximized: show minimize and expand
        $toggleBtn.attr('src', 'modules/ia_chatbot/assets/img/Minimizar-icon.png').attr('alt', 'Minimizar');
        $('#ia-chatbot-toggle').attr('title', 'Minimizar');
        $header.find('#ia-chatbot-toggle').show();
        $header.find('#ia-chatbot-expand').show();
    }
    else if (state === 'expanded') {
        // expanded: show minimize only
        $toggleBtn.attr('src', 'modules/ia_chatbot/assets/img/Minimizar-icon.png').attr('alt', 'Minimizar');
        $('#ia-chatbot-toggle').attr('title', 'Minimizar');
        $header.find('#ia-chatbot-toggle').show();
        $header.find('#ia-chatbot-expand').hide();
    }

    const $body = $('<div/>', {id: 'ia-chatbot-body'});
    const $msgs = $('<div/>', {id: 'ia-chatbot-messages'});
    const $inputArea = $('<div/>', {id: 'ia-chatbot-input-area'}).append(
        '<input id="ia-chatbot-input" placeholder="Escribe tu mensaje..." />'
    ).append(
        '<button id="ia-chatbot-send" type="button">Enviar</button> '
    ).append(
        '<button id="ia-chatbot-clear" type="button" title="Borrar conversación">Borrar</button>'
    );
    // Attribution footer below input area
    const $footer = $('<div/>', {id: 'ia-chatbot-footer'}).text(
        'Zabbix IA puede cometer errores. Comprueba la información importante.'
    );
    $body.append($msgs, $inputArea, $footer);
    $container.append($header, $body);
    $('body').append($container);

    // Load previous history
    history.forEach(entry => {
        const cls = entry.sender === 'user' ? 'user-message' : 'bot-message';
        // Renderizar mensajes del bot con Markdown
        const content = entry.sender === 'bot' ? renderMarkdown(entry.text) : escapeHTML(entry.text);
        $msgs.append(`<div class="${cls}">${content}</div>`);
    });
    
    // Si hay mensajes, hacer scroll hasta el último
    if (history.length > 0) {
        setTimeout(() => {
            $msgs.scrollTop($msgs[0].scrollHeight);
        }, 100);
    }

    // Show or hide body based on initial state
    if (state === 'minimized') {
        $body.hide();
    } else {
        $body.show();
    }

    // Theme toggle: apply saved theme or default
    const savedTheme = localStorage.getItem('ia_chatbot_theme') || 'light';
    if (savedTheme === 'dark') {
        $container.addClass('dark-mode');
    }
    // Update theme toggle button icon based on current theme
    function updateThemeIcon(theme) {
        $('#ia-chatbot-theme-toggle').text(theme === 'dark' ? '🌞' : '🌙');
    }
    updateThemeIcon(savedTheme);

    // Theme toggle click handler
    $('#ia-chatbot-theme-toggle').on('click', function() {
        const current = $container.hasClass('dark-mode') ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        $container.toggleClass('dark-mode', next === 'dark');
        localStorage.setItem('ia_chatbot_theme', next);
        updateThemeIcon(next);
    });

    // Toggle maximize/minimize: swap image src
    $('#ia-chatbot-toggle').on('click', function(e) {
        e.preventDefault();
        // Determine new state: if expanded or minimized, go to maximized; else go to minimized
        let newState;
        if ($container.hasClass('expanded') || $container.hasClass('minimized')) {
            newState = 'maximized';
        }
        else {
            newState = 'minimized';
        }
        $container.removeClass('minimized maximized expanded').addClass(newState);
        // Swap toggle button image
        const $img = $('#ia-chatbot-toggle-img');
        if (newState === 'minimized') {
            // show maximize icon
            $img.attr('src', 'modules/ia_chatbot/assets/img/Maximizar-icon.png').attr('alt', 'Maximizar');
            $('#ia-chatbot-toggle').attr('title', 'Maximizar');
            $header.find('#ia-chatbot-expand').hide();
        }
        else if (newState === 'maximized') {
            // show minimize icon and expand button
            $img.attr('src', 'modules/ia_chatbot/assets/img/Minimizar-icon.png').attr('alt', 'Minimizar');
            $('#ia-chatbot-toggle').attr('title', 'Minimizar');
            $header.find('#ia-chatbot-expand').show();
        }
        localStorage.setItem('ia_chatbot_state', newState);
        // Show or hide chat body accordingly
        if (newState === 'minimized') {
            $body.hide();
        } else {
            $body.show();
        }

        // Logo display unchanged for minimize/maximize
    });

    // Expand/Contract full screen handler
    $('#ia-chatbot-expand').on('click', function(e) {
        e.preventDefault();
        const isExpanded = $container.hasClass('expanded');
        const newState = isExpanded ? 'maximized' : 'expanded';
        $container.removeClass('minimized maximized expanded').addClass(newState);
        // hide/show toggle
        $header.find('#ia-chatbot-toggle').toggle(newState !== 'expanded');
        // Update expand icon
        // Expand button always expand icon
        $expandBtn.attr('src', 'modules/ia_chatbot/assets/img/Expandir-icon.png').attr('alt', 'Expandir');
        $('#ia-chatbot-expand').attr('title', 'Expandir');
        localStorage.setItem('ia_chatbot_state', newState);

        // Ensure chat body is visible in expanded modes
        $body.show();

        // For expanded, we only have minimize button
        if (newState === 'expanded') {
            $header.find('#ia-chatbot-toggle').show();
            $header.find('#ia-chatbot-expand').hide();
        } else {
            $header.find('#ia-chatbot-toggle').show();
            $header.find('#ia-chatbot-expand').show();
        }
    });

    // Close button handler: hide chat window
    $(document).on('click', '#ia-chatbot-close', function(e) {
        e.preventDefault();
        $container.addClass('hidden');
        localStorage.setItem('ia_chatbot_visible', false);
    });

    // Function to create and show the config modal
    function showConfigModal() {
        // Remove existing modal if any
        $('#ia-chatbot-config-modal-overlay').remove();

        // Cargar configuraciones guardadas o usar valores predeterminados
        const defaultApiKey = '';  // Nunca establecer una clave predeterminada
        let apiKey = sessionStorage.getItem('ia_chatbot_api_key') || localStorage.getItem('ia_chatbot_api_key') || defaultApiKey;
        const hasApiKey = apiKey ? true : false;
        
        // Solo guardamos los últimos 4 caracteres para mostrar, nunca incluimos la clave completa en el DOM
        const lastFourChars = hasApiKey ? apiKey.slice(-4) : '';
        const maskedApiKey = hasApiKey ? 'sk-...' + lastFourChars : '';
        
        // En lugar de guardar la clave completa en el DOM, la inyectamos solo cuando se va a hacer una petición
        // Limpiamos la referencia completa
        apiKey = null;

        // Recuperar configuraciones avanzadas o usar valores predeterminados
        const model = localStorage.getItem('ia_chatbot_model') || 'gpt-3.5-turbo';
        const temperature = localStorage.getItem('ia_chatbot_temperature') || '0.7';
        const maxTokens = localStorage.getItem('ia_chatbot_max_tokens') || '800';
        const systemPrompt = localStorage.getItem('ia_chatbot_system_prompt') || 
            'Eres un asistente de Zabbix experto en monitoreo y alertas. Ayuda al usuario con sus consultas relacionadas con Zabbix de manera clara y concisa.';

        // Detectar si estamos en modo oscuro para aplicarlo al modal
        const isDarkMode = $('#ia-chatbot-container').hasClass('dark-mode');
        
        const modalHtml = `
            <div id="ia-chatbot-config-modal-overlay" class="${isDarkMode ? 'dark-mode' : ''}">
                <div id="ia-chatbot-config-modal" style="max-height: 700px; height: auto; overflow-y: auto; padding-bottom: 45px;">
                    <h2>Configuración de Zabbix IA</h2>
                    
                    <!-- Tabs Navigation -->
                    <div class="ia-chatbot-tabs">
                        <button class="ia-chatbot-tab-btn active" data-tab="basic">Básica</button>
                        <button class="ia-chatbot-tab-btn" data-tab="advanced">Avanzada</button>
                        <button class="ia-chatbot-tab-btn upgrade-tab-btn" data-tab="upgrade" style="background-color: rgba(41, 128, 185, 0.1); color: #2980b9; font-weight: bold;">Actualizar a PRO</button>
                        <button class="ia-chatbot-tab-btn" data-tab="about">Acerca de</button>
                    </div>
                    
                    <!-- Tab Content -->
                    <div class="ia-chatbot-tab-content">
                        <!-- Basic Tab -->
                        <div id="basic-tab" class="ia-chatbot-tab-pane active">
                            <p>Introduce tu API Key de OpenAI. Se almacenará de forma segura en tu navegador.</p>
                            <div class="form-group">
                                <label for="ia-chatbot-api-key-input">API Key:</label>
                                <div class="input-with-button">
                                    <input type="password" id="ia-chatbot-api-key-input" value="" placeholder="sk-...">
                                </div>
                            </div>
                            <div id="ia-chatbot-api-key-display">${maskedApiKey}</div>
                            <p class="help-text">La clave API se almacena de forma segura y nunca se muestra completa por seguridad.</p>
                            
                            <div class="form-group">
                                <label for="ia-chatbot-model-select">Modelo de IA:</label>
                                <select id="ia-chatbot-model-select" class="form-control">
                                    <option value="gpt-3.5-turbo" ${model === 'gpt-3.5-turbo' ? 'selected' : ''}>GPT-3.5 Turbo (Rápido)</option>
                                    <option value="gpt-4o" ${model === 'gpt-4o' ? 'selected' : ''}>GPT-4o (Alto rendimiento)</option>
                                    <option value="gpt-4-turbo" ${model === 'gpt-4-turbo' ? 'selected' : ''}>GPT-4 Turbo</option>
                                </select>
                            </div>
                        </div>
                        
                        <!-- Advanced Tab -->
                        <div id="advanced-tab" class="ia-chatbot-tab-pane">
                            <div class="form-group">
                                <label for="ia-chatbot-temperature-range">Temperatura: <span id="temperature-value">${temperature}</span></label>
                                <input type="range" id="ia-chatbot-temperature-range" min="0" max="1" step="0.1" value="${temperature}" class="form-control">
                                <div class="range-labels">
                                    <span>Preciso</span>
                                    <span style="float: right;">Creativo</span>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="ia-chatbot-max-tokens">Longitud máxima:</label>
                                <select id="ia-chatbot-max-tokens" class="form-control">
                                    <option value="256" ${maxTokens === '256' ? 'selected' : ''}>Corta</option>
                                    <option value="512" ${maxTokens === '512' ? 'selected' : ''}>Media</option>
                                    <option value="800" ${maxTokens === '800' ? 'selected' : ''}>Normal</option>
                                    <option value="1500" ${maxTokens === '1500' ? 'selected' : ''}>Larga</option>
                                    <option value="3000" ${maxTokens === '3000' ? 'selected' : ''}>Muy larga</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="ia-chatbot-system-prompt">Instrucción del sistema:</label>
                                <textarea id="ia-chatbot-system-prompt" class="form-control" rows="4">${systemPrompt}</textarea>
                                <p class="help-text">Define cómo actúa la IA. Para restablecer al valor predeterminado, deja en blanco.</p>
                            </div>
                        </div>
                        
                        <!-- Upgrade Tab - NEW -->
                        <div id="upgrade-tab" class="ia-chatbot-tab-pane">
                            <div class="upgrade-content" style="text-align: center; padding: 10px 5px; max-height: 420px; position: relative;">
                                
                                <!-- Free Version Panel -->
                                <div class="version-panel" style="background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #6c757d; padding: 12px; margin-bottom: 10px; text-align: left; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                        <h4 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 500; color: #6c757d;">Versión GRATUITA</h4>
                                        <span style="background: #6c757d; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500;">Actual</span>
                                    </div>
                                    <ul style="margin: 0 0 10px 0; padding-left: 20px; font-size: 12px; line-height: 1.4; color: #333;">
                                        <li>Chat con IA básico</li>
                                        <li>Integración nativa con Zabbix</li>
                                        <li>Markdown en respuestas</li>
                                        <li>Historial básico</li>
                                        <li>Interfaz personalizable</li>
                                    </ul>
                                </div>
                                
                                <!-- PRO Version Panel -->
                                <div class="version-panel" style="background-color: #e6f7ff; border-radius: 8px; border-left: 4px solid #2980b9; padding: 12px; margin-bottom: 10px; text-align: left; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                        <h4 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 500; color: #2980b9;">Versión PRO</h4>
                                        <span style="background: #2980b9; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500;">$149/año</span>
                                    </div>
                                    <ul style="margin: 0 0 10px 0; padding-left: 20px; font-size: 12px; line-height: 1.4; color: #333;">
                                        <li>Análisis inteligente de problemas en tiempo real</li>
                                        <li>Acceso profundo a datos de hosts y métricas</li>
                                        <li>Recomendaciones personalizadas de monitoreo</li>
                                        <li>Integración con IA local sin dependencia externa</li>
                                        <li>Soporte técnico prioritario</li>
                                        <li>Actualizaciones garantizadas</li>
                                    </ul>
                                    <div style="text-align: right;">
                                        <a href="https://elitech-solutions.com/pro" target="_blank" class="upgrade-btn pro-btn" style="display: inline-block; background: #2980b9; color: white; padding: 6px 15px; text-decoration: none; border-radius: 20px; font-size: 13px; font-weight: 500; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">Adquirir PRO</a>
                                    </div>
                                </div>
                                
                                <!-- Enterprise Version Panel -->
                                <div class="version-panel" style="background-color: #e3f2fd; border-radius: 8px; border-left: 4px solid #1a5276; padding: 12px; margin-bottom: 10px; text-align: left; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                        <h4 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 500; color: #1a5276;">Versión ENTERPRISE</h4>
                                        <span style="background: #1a5276; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500;">Consultar</span>
                                    </div>
                                    <ul style="margin: 0 0 10px 0; padding-left: 20px; font-size: 12px; line-height: 1.4; color: #333;">
                                        <li>Respuesta automatizada a incidentes</li>
                                        <li>Despliegue On-Premise sin conexión</li>
                                        <li>Entrenamiento personalizado del modelo</li>
                                        <li>Integración con sistemas de ITSM</li>
                                        <li>Conector con plataformas de Machine Learning</li>
                                        <li>Soporte técnico 24/7</li>
                                    </ul>
                                    <div style="text-align: right;">
                                        <a href="https://elitech-solutions.com/enterprise" target="_blank" class="upgrade-btn enterprise-btn" style="display: inline-block; background: #1a5276; color: white; padding: 6px 15px; text-decoration: none; border-radius: 20px; font-size: 13px; font-weight: 500; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">Solicitar Info</a>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Estilos sin animaciones -->
                            <style>
                                #upgrade-tab .upgrade-btn:hover {
                                    opacity: 0.9;
                                    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                                }
                                
                                #upgrade-tab .version-panel:hover {
                                    box-shadow: 0 3px 6px rgba(0,0,0,0.12);
                                }
                                
                                #upgrade-tab .contact-info a:hover {
                                    color: #1a5276;
                                }
                            </style>
                        </div>

                        <!-- About Tab -->
                        <div id="about-tab" class="ia-chatbot-tab-pane">
                            <div class="about-content">
                                <h3>Zabbix IA</h3>
                                <p>Versión 1.1</p>
                                <p>Este módulo integra la potencia de los modelos de lenguaje de OpenAI con Zabbix, proporcionando asistencia inteligente para consultas relacionadas con monitoreo y alertas.</p>
                                <p>Para obtener una API Key de OpenAI, visita: <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com</a></p>
                                
                                <div class="about-company">
                                    <h4>Desarrollado por:</h4>
                                    <p>Elitech Solutions</p>
                                    <p>Desarrollador: Simón Alex Rodriguez <a href="https://www.linkedin.com/in/srodriguezxs/" target="_blank"><i class="fa fa-linkedin-square"></i></a></p>
                                    <p>Web: <a href="https://elitech-solutions.com" target="_blank">elitech-solutions.com</a></p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="ia-chatbot-modal-footer" style="text-align: center;">
                                <button type="button" id="ia-chatbot-config-save" class="btn-primary" style="margin-right: 20px;">Guardar</button>
                                <button type="button" id="ia-chatbot-config-cancel" class="btn-secondary">Cancelar</button>
                                
                                <!-- Links de contacto ahora en el footer -->
                                <div style="margin-top: 10px; font-size: 11px; color: #666; display: flex; justify-content: center; flex-wrap: wrap;">
                                    <a href="mailto:ventas@elitech-solutions.com" style="color: #2980b9; text-decoration: none; margin: 0 10px;">ventas@elitech-solutions.com</a>
                                    <a href="https://elitech-solutions.com" target="_blank" style="color: #2980b9; text-decoration: none; margin: 0 10px;">elitech-solutions.com</a>
                                </div>
                            </div>
                </div>
            </div>
        `;
        $('body').append(modalHtml);

        // Tab switching functionality
        $('.ia-chatbot-tab-btn').on('click', function() {
            const tabId = $(this).data('tab');
            
            // Update active tab button
            $('.ia-chatbot-tab-btn').removeClass('active');
            $(this).addClass('active');
            
            // Show selected tab content
            $('.ia-chatbot-tab-pane').removeClass('active');
            $(`#${tabId}-tab`).addClass('active');
        });
        
        // Update temperature value display as slider moves
        $('#ia-chatbot-temperature-range').on('input', function() {
            $('#temperature-value').text($(this).val());
        });

        // Event listener for save button
        $('#ia-chatbot-config-save').on('click', function() {
            // Guardar API Key solo si se ingresó una nueva
            const newApiKey = $('#ia-chatbot-api-key-input').val().trim();
            if (newApiKey) {
                localStorage.setItem('ia_chatbot_api_key', newApiKey);
            }
            // No borrar la API key existente si el campo está vacío
            
            // Guardar configuración avanzada
            localStorage.setItem('ia_chatbot_model', $('#ia-chatbot-model-select').val());
            localStorage.setItem('ia_chatbot_temperature', $('#ia-chatbot-temperature-range').val());
            localStorage.setItem('ia_chatbot_max_tokens', $('#ia-chatbot-max-tokens').val());
            
            // Guardar system prompt (o restaurar por defecto si está vacío)
            const systemPrompt = $('#ia-chatbot-system-prompt').val().trim();
            if (systemPrompt) {
                localStorage.setItem('ia_chatbot_system_prompt', systemPrompt);
            } else {
                const defaultPrompt = 'Eres un asistente de Zabbix experto en monitoreo y alertas. Ayuda al usuario con sus consultas relacionadas con Zabbix de manera clara y concisa.';
                localStorage.setItem('ia_chatbot_system_prompt', defaultPrompt);
            }
            
            alert('Configuración guardada correctamente.');
            $('#ia-chatbot-config-modal-overlay').remove();
        });

        // Event listener for cancel button
        $('#ia-chatbot-config-cancel').on('click', function() {
            $('#ia-chatbot-config-modal-overlay').remove();
        });
        
        // Aplicar listeners para sincronizar el estado de dark mode con el contenedor principal
        // Esto asegura que si se cambia el tema mientras el modal está abierto, éste también cambie
        $('#ia-chatbot-theme-toggle').on('click', function() {
            if ($('#ia-chatbot-config-modal-overlay').length) {
                const isDarkMode = $('#ia-chatbot-container').hasClass('dark-mode');
                $('#ia-chatbot-config-modal-overlay').toggleClass('dark-mode', isDarkMode);
            }
        });
    }

    // Bind config button to show modal
    $(document).on('click', '#ia-chatbot-config', function(e) {
        e.preventDefault();
        showConfigModal();
    });

    // Variables para gestionar estado de la conversación
    let isProcessingMessage = false;
    const showTypingIndicator = function() {
        const $typingIndicator = $('<div class="bot-message typing-indicator"><span>Pensando</span><span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></div>');
        $msgs.append($typingIndicator);
        $msgs.scrollTop($msgs[0].scrollHeight);
        
        return $typingIndicator;
    };
    
    const removeTypingIndicator = function($indicator) {
        if ($indicator) {
            $indicator.remove();
        }
    };

    // Añadir esta función a las funciones existentes para procesar el contenido del mensaje
    function processMessageContent(content) {
        // Si el contenido es un objeto con hosts, crear un selector
        if (typeof content === 'object' && content.type === 'host_selector' && Array.isArray(content.hosts)) {
            return createHostSelector(content.hosts, content.conversation_id);
        }
        
        // De lo contrario, manejar como texto normal con soporte para markdown
        return renderMarkdown(content);
    }

    // Modificar la función addBotMessage para GARANTIZAR formateo inmediato
    function addBotMessage(message, conversationId) {
        const messageContainer = document.createElement('div');
        messageContainer.className = 'message-container bot-container';
        if (conversationId) {
            messageContainer.setAttribute('data-conversation-id', conversationId);
        }
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message bot-message';
        
        // Asegurar el procesamiento Markdown inmediato
        const processedContent = typeof message === 'string' 
            ? renderMarkdown(message)
            : processMessageContent(message);
        
        if (typeof processedContent === 'string') {
            messageContent.innerHTML = processedContent;
            
            // Aplicar formatos CSS específicos para markdown
            Array.from(messageContent.querySelectorAll('pre code')).forEach(block => {
                block.classList.add('markdown-code');
            });
            
            Array.from(messageContent.querySelectorAll('table')).forEach(table => {
                const wrapper = document.createElement('div');
                wrapper.className = 'table-container';
                table.parentNode.insertBefore(wrapper, table);
                wrapper.appendChild(table);
            });
        } else {
            messageContent.appendChild(processedContent);
        }
        
        messageContainer.appendChild(messageContent);
        
        $msgs.append(messageContainer);
        $msgs.scrollTop($msgs[0].scrollHeight);
        
        // Forzar repintado del DOM para que se apliquen los estilos
        setTimeout(() => {
            messageContent.style.opacity = '0.99';
            setTimeout(() => {
                messageContent.style.opacity = '1';
            }, 10);
        }, 10);
    }

    // Send handler - modificado para usar el nuevo controlador de mensajes
    $('#ia-chatbot-send').on('click', async function() {
        if (isProcessingMessage) return;
        
        const msg = $('#ia-chatbot-input').val().trim();
        if (!msg) return;

        // Asegurarse de que no hay credenciales predeterminadas
        const defaultApiKey = '';  // Nunca establecer una clave predeterminada
        let apiKey = sessionStorage.getItem('ia_chatbot_api_key') || localStorage.getItem('ia_chatbot_api_key') || defaultApiKey;

        // Si no hay API key, solicitar configuración
        if (!apiKey) {
            alert('Por favor configura tu API Key usando el botón de configuración ⚙️');
            return;
        }
        
        // Asegurarse de que las opciones de API no tienen valores hardcodeados sensibles
        const allowedModels = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4o', 'gpt-4-turbo'];
        const model = localStorage.getItem('ia_chatbot_model') || 'gpt-3.5-turbo';
        const temperature = localStorage.getItem('ia_chatbot_temperature') || '0.7';
        const maxTokens = localStorage.getItem('ia_chatbot_max_tokens') || '800';
        const systemPrompt = localStorage.getItem('ia_chatbot_system_prompt') || 
            'Eres un asistente para el sistema de monitorización Zabbix. Ayuda a los usuarios con consultas sobre Zabbix, monitoreo de sistemas y problemas de infraestructura. Formatea tus respuestas con Markdown para mejor legibilidad.';
        
        // Deshabilitar entrada mientras se procesa
        isProcessingMessage = true;
        $('#ia-chatbot-input').prop('disabled', true);
        $('#ia-chatbot-send').prop('disabled', true);
        
        // Agregar mensaje del usuario con sanitización de HTML para prevenir XSS
        $msgs.append('<div class="user-message">' + escapeHTML(msg) + '</div>');
        history.push({sender:'user', text:msg});
        localStorage.setItem(historyKey, JSON.stringify(history));
        $('#ia-chatbot-input').val('');
        
        // Mostrar indicador de escritura
        const $typingIndicator = showTypingIndicator();
        
        try {
            const apiUrl = `${window.location.origin}/modules/ia_chatbot/debug.php`;
            // Construir payload con parámetros y contexto completo
            const requestBody = {
                api_key: apiKey,
                model: model,
                temperature: parseFloat(temperature),
                max_tokens: parseInt(maxTokens),
                system_prompt: systemPrompt,
                history: history,
                message: msg
            };
            
            // Evitar logging de datos sensibles, solo mostrar información mínima
            console.log('IA Chatbot - Enviando solicitud al servidor');
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(requestBody)
            });

            console.log('IA Chatbot - HTTP status:', response.status);
            
            // Eliminar apiKey de la memoria del navegador después de usarla
            apiKey = null;
            requestBody.api_key = null;

            const raw = await response.text(); // Always get raw text first

            // Detect HTML login page (session expired or not logged in)
            if (typeof raw === 'string' && raw.trim().startsWith('<')) {
                const loginError = 'Debes iniciar sesión en Zabbix antes de usar el chatbot.';
                console.error('IA Chatbot - Respuesta HTML detectada en lugar de JSON (¿página de login?)');
                // Remove typing indicator
                removeTypingIndicator($typingIndicator);
                // Show error in chat
                $msgs.append(`<div class="bot-message error">${escapeHTML(loginError)}</div>`);
                history.push({sender: 'bot', text: loginError});
                localStorage.setItem(historyKey, JSON.stringify(history));
                // Re-enable input
                isProcessingMessage = false;
                $('#ia-chatbot-input').prop('disabled', false);
                $('#ia-chatbot-send').prop('disabled', false);
                return;
            }

            removeTypingIndicator($typingIndicator);

            let data;
            try {
                data = JSON.parse(raw);
                
                // Validar estructura del objeto
                if (!data || typeof data !== 'object') {
                    throw new Error('Respuesta con formato incorrecto');
                }
            } catch (e) {
                console.error('IA Chatbot - Error al analizar JSON:', e);
                const errorMsg = `Respuesta inválida del servidor (HTTP ${response.status}). El servidor no devolvió JSON válido.`;
                $msgs.append(`<div class="bot-message error">${escapeHTML(errorMsg)}</div>`);
                history.push({sender:'bot', text: errorMsg});
                localStorage.setItem(historyKey, JSON.stringify(history));
                return;
            }

            // Verificar y mapear la respuesta (el backend podría usar 'response' o 'message')
            const responseText = data.message || data.response;
            
            // Verifica específicamente el caso de HTTP 200 pero con errores
            if (!response.ok || data.error || !responseText) {
                // Si tenemos un código 200 pero hay algún error, mostrarlo de forma más descriptiva
                let errorMsg;
                if (response.status === 200 && !responseText) {
                    errorMsg = 'Respuesta vacía del servidor con código HTTP 200. Verifica la configuración de la API.';
                    console.error('IA Chatbot - Respuesta vacía con HTTP 200');
                } else {
                    errorMsg = responseText || `Error de red o del servidor (HTTP ${response.status})`;
                    console.error('IA Chatbot - Error del servidor');
                }
                
                $msgs.append(`<div class="bot-message error">Lo siento, ocurrió un error: ${escapeHTML(errorMsg)}</div>`);
                history.push({sender:'bot', text: `Lo siento, ocurrió un error: ${errorMsg}`});
                localStorage.setItem(historyKey, JSON.stringify(history));
                return;
            }

            // --- Success path ---
            console.log('IA Chatbot - Respuesta recibida correctamente');
            
            try {
                // Sanitizar la respuesta antes de aplicar markdown (enfoque de defensa en profundidad)
                const sanitizedResponseText = DOMPurify ? DOMPurify.sanitize(responseText) : responseText;
                
                // Procesar la respuesta con markdown mejorado
                const formattedReply = renderMarkdown(sanitizedResponseText);
                
                // Crear el elemento del mensaje con el enfoque más robusto
                const $botMessage = $('<div></div>');
                $botMessage.addClass('bot-message');
                $botMessage.html(formattedReply);
                
                // Aplicar correcciones para mejor visualización
                $botMessage.find('p:empty, div:empty').remove();
                
                // Si hay listas, asegurar que se muestren correctamente
                $botMessage.find('ul, ol').css({
                    'display': 'block',
                    'width': '100%',
                    'padding-left': '20px',
                    'margin': '10px 0'
                });
                
                $botMessage.find('li').css({
                    'display': 'list-item',
                    'margin-bottom': '6px'
                });
                
                // Asegurar que los párrafos y textos tengan formato adecuado
                $botMessage.find('p, div, span').css({
                    'white-space': 'normal',
                    'word-wrap': 'break-word',
                    'overflow-wrap': 'break-word',
                    'margin-bottom': '10px',
                    'line-height': '1.6'
                });
                
                // Añadir al contenedor de mensajes
                $msgs.append($botMessage);
                
                // Guardar en el historial
                history.push({sender:'bot', text: responseText}); 
                localStorage.setItem(historyKey, JSON.stringify(history));

                // Hacer scroll para mostrar el mensaje nuevo
                setTimeout(() => {
                    $msgs.scrollTop($msgs[0].scrollHeight);
                }, 50);
                
                // Scroll adicional después de que las imágenes se carguen (si hay)
                setTimeout(() => {
                    $msgs.scrollTop($msgs[0].scrollHeight);
                }, 500);
            } catch (displayError) {
                console.error('Error al mostrar la respuesta:', displayError);
                
                // Modo de emergencia: mostrar el texto plano si falla el renderizado
                const $fallbackMessage = $('<div class="bot-message"></div>');
                $fallbackMessage.text(responseText);
                $msgs.append($fallbackMessage);
                
                history.push({sender:'bot', text: responseText});
                localStorage.setItem(historyKey, JSON.stringify(history));
                
                setTimeout(() => {
                    $msgs.scrollTop($msgs[0].scrollHeight);
                }, 50);
            }

        } catch (error) { // Catch fetch errors AND errors thrown from the try block
            console.error('Error en la comunicación con el chatbot:', error);

            // Display the error message directly, with sanitization
            const displayError = error.message || 'Error desconocido durante la comunicación.';

            $msgs.append(`<div class="bot-message error">Lo siento, ocurrió un error: ${escapeHTML(displayError)}</div>`);
            history.push({sender:'bot', text:`Lo siento, ocurrió un error: ${displayError}`}); // Store the error message
            localStorage.setItem(historyKey, JSON.stringify(history));

        } finally {
            // Habilitar entrada nuevamente
            isProcessingMessage = false;
            $('#ia-chatbot-input').prop('disabled', false);
            $('#ia-chatbot-send').prop('disabled', false);
            $('#ia-chatbot-input').focus();
            $msgs.scrollTop($msgs[0].scrollHeight);
        }
    });

    // Handler para borrar el chat
    $(document).on('click', '#ia-chatbot-clear', function(e) {
        e.preventDefault();
        console.log('IA Chatbot: limpiando conversación');
        // Resetear historial local y eliminar de storage
        history = [];
        localStorage.removeItem(historyKey);
        // Limpiar mensajes en pantalla
        $msgs.empty();
        // Limpiar historial server-side
        const apiUrl = `${window.location.origin}/modules/ia_chatbot/debug.php`;
        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ clear: true })
        })
        .then(response => response.json())
        .then(data => console.log('Historial server-side eliminado', data))
        .catch(error => console.error('Error al eliminar historial server-side', error));
        // Reenfocar input
        $('#ia-chatbot-input').focus();
    });

    // Send on Enter key
    $('#ia-chatbot-input').on('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            $('#ia-chatbot-send').click();
        }
    });

    // Gestión del banner promocional
    setupPromoBanner();
});

/**
 * Configura el comportamiento del banner promocional
 */
function setupPromoBanner() {
    const promoBanner = document.querySelector('.ia-promo-banner');
    const closeBtn = document.querySelector('.promo-close-btn');
    
    // Comprobar si el usuario ya cerró el banner anteriormente
    const bannerClosed = localStorage.getItem('ia_promo_banner_closed');
    
    if (bannerClosed) {
        promoBanner.style.display = 'none';
    }
    
    // Evento para cerrar el banner
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            promoBanner.style.display = 'none';
            localStorage.setItem('ia_promo_banner_closed', 'true');
            
            // Guardar la fecha para mostrar de nuevo después de 7 días
            const now = new Date();
            localStorage.setItem('ia_promo_banner_closed_date', now.toISOString());
        });
    }
    
    // Verificar si han pasado 7 días desde que se cerró para volver a mostrar
    const closedDate = localStorage.getItem('ia_promo_banner_closed_date');
    if (closedDate) {
        const lastClosed = new Date(closedDate);
        const now = new Date();
        const diffTime = Math.abs(now - lastClosed);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 7) {
            localStorage.removeItem('ia_promo_banner_closed');
            localStorage.removeItem('ia_promo_banner_closed_date');
            promoBanner.style.display = 'block';
        }
    }
    
    // Añadir enlaces de promoción a respuestas seleccionadas
    addPromoMessageListeners();
}

/**
 * Añade promociones sutiles a las respuestas del bot
 */
function addPromoMessageListeners() {
    // Contador de mensajes para mostrar promoción cada cierto número de interacciones
    let messageCounter = 0;
    
    // Modificar el comportamiento de envío de mensajes para incluir promociones
    const originalSendMessage = window.sendMessage || function() {};
    
    window.sendMessage = function(message) {
        // Llamar a la función original
        originalSendMessage(message);
        
        // Incrementar contador
        messageCounter++;
        
        // Mostrar promoción cada 5 mensajes
        if (messageCounter % 5 === 0) {
            setTimeout(function() {
                appendPromoMessage();
            }, 1000);
        }
    };
}

/**
 * Añade un mensaje promocional sutil después de ciertas respuestas
 */
function appendPromoMessage() {
    const messageContainer = document.querySelector('.message-container');
    if (!messageContainer) return;
    
    const promoMessages = [
        "¿Sabías que la versión PRO permite analizar problemas en tiempo real? <a href='https://zabbix-ia.com/pro' target='_blank' class='upgrade-link'>Conocer más</a>",
        "Optimiza tu monitoreo con acceso a todos los hosts desde la versión PRO. <a href='https://zabbix-ia.com/pro' target='_blank' class='upgrade-link'>Actualizar ahora</a>",
        "Las empresas mejoran su tiempo de respuesta un 47% con la versión Enterprise. <a href='https://zabbix-ia.com/enterprise' target='_blank' class='upgrade-link'>Descubrir cómo</a>",
        "Configura respuestas automáticas a incidentes con la versión Enterprise. <a href='https://zabbix-ia.com/enterprise' target='_blank' class='upgrade-link'>Ver detalles</a>"
    ];
    
    // Seleccionar un mensaje aleatorio
    const randomMessage = promoMessages[Math.floor(Math.random() * promoMessages.length)];
    
    // Crear elemento de mensaje
    const promoDiv = document.createElement('div');
    promoDiv.className = 'message bot-message promo-message';
    promoDiv.innerHTML = `
        <div class="message-content">
            <p><small><i>${randomMessage}</i></small></p>
        </div>
    `;
    
    // Añadir estilo más sutil
    promoDiv.style.opacity = '0.85';
    promoDiv.style.fontSize = '0.9em';
    promoDiv.style.maxWidth = '80%';
    
    // Añadir al contenedor con animación
    messageContainer.appendChild(promoDiv);
    
    // Animar entrada
    setTimeout(() => {
        promoDiv.style.animation = 'fadeIn 0.5s ease-in-out';
    }, 100);
}
