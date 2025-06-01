;(function($) {
    $(function() {
        // Toggle chat visibility when main menu 'Chatbot IA' is clicked, persist visibility
        $(document).on('click', "a[href*='ia_chatbot.chat']", function(e) {
            e.preventDefault();
            const $cnt = $('#ia-chatbot-container');
            $cnt.toggleClass('hidden');
            const visible = !$cnt.hasClass('hidden');
            localStorage.setItem('ia_chatbot_visible', visible);
        });

        // Utility function to convert Markdown to HTML
        function renderMarkdown(text) {
            try {
                // Asegurar que el texto es una cadena válida
                if (typeof text !== 'string') {
                    console.error('renderMarkdown: received non-string input:', text);
                    return String(text).replace(/\n/g, '<br>');
                }

                // Verificar si marked está disponible
                if (typeof window.marked !== 'undefined') {
                    try {
                        // Configurar opciones de marked para mejorar el renderizado de tablas
                        const markedOptions = {
                            gfm: true, // GitHub Flavored Markdown
                            breaks: true,
                            pedantic: false,
                            smartLists: true,
                            smartypants: true,
                            xhtml: true,
                            headerIds: false // Evita IDs en los encabezados para prevenir colisiones
                        };
                        
                        // Usar la versión correcta según la API disponible
                        let renderedHtml;
                        if (typeof marked.parse === 'function') {
                            renderedHtml = marked.parse(text, markedOptions);
                        } else if (typeof marked === 'function') {
                            renderedHtml = marked(text, markedOptions);
                        } else if (typeof marked.marked === 'function') {
                            renderedHtml = marked.marked(text, markedOptions);
                        } else {
                            console.warn('marked exists but recognized method not found');
                            throw new Error('marked method not found');
                        }

                        // Mejorar el formato de tablas añadiendo div wrapper para mejor scroll horizontal
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
                        // Continuar con el fallback si hay error
                    }
                } else {
                    console.warn('marked library not available, using fallback');
                }
                
                // Fallback mejorado si marked no está disponible o falló
                // Este fallback es limitado pero maneja más elementos Markdown
                text = text
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
                
                // Envolver en párrafos si no comienza con una etiqueta HTML
                if (!/^<\w+/.test(text)) {
                    text = '<p>' + text + '</p>';
                }
                
                // Simplificar múltiples <br> consecutivos
                text = text.replace(/<br>\s*<br>/g, '<br>');
                
                return text;
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

        // Función para obtener modelos disponibles de Ollama
        async function getOllamaModels(serverIp, port) {
            try {
                const ollamaServerIp = serverIp || localStorage.getItem('ollama_server_ip') || '192.168.19.10';
                const ollamaPort = port || localStorage.getItem('ollama_server_port') || '11434';
                
                console.log(`Consultando modelos Ollama en ${ollamaServerIp}:${ollamaPort}`);
                
                // Crear una URL de proxy para evitar problemas de CORS
                // Usamos el módulo existente para hacer la petición a través del servidor Zabbix
                const apiUrl = `${window.location.origin}/modules/ia_chatbot/debug.php`;
                
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify({ 
                        action: 'list_models',
                        ollama_server: ollamaServerIp,
                        ollama_port: ollamaPort
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`Error de red: ${response.status}`);
                }
                
                const responseData = await response.json();
                console.log('Respuesta del servidor para modelos Ollama:', responseData);
                
                // Si hay error en la respuesta, lanzar excepción
                if (responseData.error) {
                    throw new Error(responseData.error);
                }
                
                // Si tenemos datos correctos, procesar los modelos
                if (responseData.models && Array.isArray(responseData.models)) {
                    // Convertir el formato al esperado por nuestro selector
                    return responseData.models.map(model => ({
                        name: model.name || model.model,
                        id: model.model || model.name
                    }));
                } else {
                    throw new Error('Formato de respuesta inesperado');
                }
            } catch (error) {
                console.error('Error al obtener modelos de Ollama:', error);
                // Devolver un mensaje más descriptivo en caso de error
                return [
                    { name: `Error de conexión: ${error.message}`, id: '' }
                ];
            }
        }
        
        // Función para actualizar el selector de modelos de Ollama
        async function updateOllamaModelSelector(serverIp, port) {
            try {
                const models = await getOllamaModels(serverIp, port);
                const currentModel = localStorage.getItem('ia_chatbot_ollama_model') || '';
                
                // Limpiar selector actual
                const selector = $('#ia-chatbot-ollama-model-select');
                selector.empty();
                
                // Añadir modelos al selector
                if (models && models.length > 0) {
                    models.forEach(model => {
                        const modelName = model.name || model.id || '';
                        if (modelName) {
                            const option = $('<option></option>')
                                .attr('value', modelName)
                                .text(modelName)
                                .prop('selected', modelName === currentModel);
                            
                            selector.append(option);
                        }
                    });
                    
                    // Si no hay modelo seleccionado, seleccionar el primero
                    if (!currentModel && models.length > 0) {
                        localStorage.setItem('ia_chatbot_ollama_model', models[0].name || models[0].id);
                    }
                } else {
                    // Si no hay modelos, añadir mensaje
                    selector.append($('<option></option>')
                        .attr('value', '')
                        .text('No hay modelos disponibles')
                        .prop('disabled', true)
                        .prop('selected', true));
                }
            } catch (error) {
                console.error('Error actualizando selector de modelos:', error);
                
                // Mostrar mensaje de error en el selector
                const selector = $('#ia-chatbot-ollama-model-select');
                selector.empty();
                selector.append($('<option></option>')
                    .attr('value', '')
                    .text('Error al obtener modelos')
                    .prop('disabled', true)
                    .prop('selected', true));
            }
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
            const defaultApiKey = '';  // Valor inicial vacío, no mostraremos más una API key por defecto
            let currentApiKey = localStorage.getItem('ia_chatbot_api_key') || defaultApiKey;
            const hasApiKey = currentApiKey ? true : false;
            
            // Solo guardamos los últimos 4 caracteres para mostrar, nunca incluimos la clave completa en el DOM
            const lastFourChars = hasApiKey ? currentApiKey.slice(-4) : '';
            const maskedApiKey = hasApiKey ? 'sk-...' + lastFourChars : '';
            
            // En lugar de guardar la clave completa en el DOM, la inyectamos solo cuando se va a hacer una petición
            // Limpiamos la referencia completa
            currentApiKey = null;

            // Recuperar configuraciones avanzadas o usar valores predeterminados
            const currentProvider = localStorage.getItem('ia_chatbot_provider') || 'openai';
            const currentModel = localStorage.getItem('ia_chatbot_model') || 'gpt-3.5-turbo';
            const currentOllamaModel = localStorage.getItem('ia_chatbot_ollama_model') || 'llama3';
            const currentOllamaServerIp = localStorage.getItem('ollama_server_ip') || '192.168.19.10';
            const currentOllamaPort = localStorage.getItem('ollama_server_port') || '11434';
            const currentTemperature = localStorage.getItem('ia_chatbot_temperature') || '0.7';
            const currentMaxTokens = localStorage.getItem('ia_chatbot_max_tokens') || '800';
            const currentSystemPrompt = localStorage.getItem('ia_chatbot_system_prompt') || 
                'Eres un asistente de Zabbix experto en monitoreo y alertas. Ayuda al usuario con sus consultas relacionadas con Zabbix de manera clara y concisa.';

            // Detectar si estamos en modo oscuro para aplicarlo al modal
            const isDarkMode = $('#ia-chatbot-container').hasClass('dark-mode');
            
            const modalHtml = `
                <div id="ia-chatbot-config-modal-overlay" class="${isDarkMode ? 'dark-mode' : ''}">
                    <div id="ia-chatbot-config-modal">
                        <h2>Configuración de IA Chatbot</h2>
                        
                        <!-- Tabs Navigation -->
                        <div class="ia-chatbot-tabs">
                            <button class="ia-chatbot-tab-btn active" data-tab="basic">Básica</button>
                            <button class="ia-chatbot-tab-btn" data-tab="advanced">Avanzada</button>
                            <button class="ia-chatbot-tab-btn" data-tab="about">Acerca de</button>
                        </div>
                        
                        <!-- Tab Content -->
                        <div class="ia-chatbot-tab-content">
                            <!-- Basic Tab -->
                            <div id="basic-tab" class="ia-chatbot-tab-pane active">
                                <div class="form-group">
                                    <label for="ia-chatbot-provider-select">Proveedor de IA:</label>
                                    <select id="ia-chatbot-provider-select" class="form-control">
                                        <option value="openai" ${currentProvider === 'openai' ? 'selected' : ''}>OpenAI</option>
                                        <option value="ollama" ${currentProvider === 'ollama' ? 'selected' : ''}>Ollama (Local)</option>
                                    </select>
                                </div>
                                
                                <!-- OpenAI Settings -->
                                <div id="openai-settings" style="${currentProvider === 'openai' ? '' : 'display: none;'}">
                                    <p>Introduce tu API Key de OpenAI. Se almacenará de forma segura en tu navegador.</p>
                                    <div class="form-group">
                                        <label for="ia-chatbot-api-key-input">API Key OpenAI:</label>
                                        <div class="input-with-button">
                                            <input type="password" id="ia-chatbot-api-key-input" value="" placeholder="sk-...">
                                        </div>
                                    </div>
                                    <div id="ia-chatbot-api-key-display">${maskedApiKey}</div>
                                    <p class="help-text">La clave API se almacena de forma segura y nunca se muestra completa por seguridad.</p>
                                    
                                    <div class="form-group">
                                        <label for="ia-chatbot-model-select">Modelo de OpenAI:</label>
                                        <select id="ia-chatbot-model-select" class="form-control">
                                            <option value="gpt-3.5-turbo" ${currentModel === 'gpt-3.5-turbo' ? 'selected' : ''}>GPT-3.5 Turbo (Rápido)</option>
                                            <option value="gpt-4o" ${currentModel === 'gpt-4o' ? 'selected' : ''}>GPT-4o (Alto rendimiento)</option>
                                            <option value="gpt-4-turbo" ${currentModel === 'gpt-4-turbo' ? 'selected' : ''}>GPT-4 Turbo</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <!-- Ollama Settings -->
                                <div id="ollama-settings" style="${currentProvider === 'ollama' ? '' : 'display: none;'}">
                                    <p>Configura la conexión con el servidor local de Ollama.</p>
                                    <div class="form-group">
                                        <label for="ollama-server-ip">Servidor Ollama:</label>
                                        <input type="text" id="ollama-server-ip" class="form-control" placeholder="192.168.19.10" value="${currentOllamaServerIp}">
                                        <p class="help-text">Dirección IP del servidor donde se ejecuta Ollama</p>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label for="ollama-server-port">Puerto:</label>
                                        <input type="text" id="ollama-server-port" class="form-control" placeholder="11434" value="${currentOllamaPort}">
                                        <p class="help-text">Puerto del servidor Ollama (por defecto: 11434)</p>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label for="ia-chatbot-ollama-model-select">Modelo de Ollama:</label>
                                        <select id="ia-chatbot-ollama-model-select" class="form-control">
                                            <option value="llama3" ${currentOllamaModel === 'llama3' ? 'selected' : ''}>Llama 3</option>
                                            <option value="llama2" ${currentOllamaModel === 'llama2' ? 'selected' : ''}>Llama 2</option>
                                            <option value="mistral" ${currentOllamaModel === 'mistral' ? 'selected' : ''}>Mistral</option>
                                            <option value="phi3" ${currentOllamaModel === 'phi3' ? 'selected' : ''}>Phi-3</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Advanced Tab -->
                            <div id="advanced-tab" class="ia-chatbot-tab-pane">
                                <div class="form-group">
                                    <label for="ia-chatbot-temperature-range">Temperatura: <span id="temperature-value">${currentTemperature}</span></label>
                                    <input type="range" id="ia-chatbot-temperature-range" min="0" max="1" step="0.1" value="${currentTemperature}" class="form-control">
                                    <div class="range-labels">
                                        <span>Preciso</span>
                                        <span style="float: right;">Creativo</span>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="ia-chatbot-max-tokens">Longitud máxima:</label>
                                    <select id="ia-chatbot-max-tokens" class="form-control">
                                        <option value="256" ${currentMaxTokens === '256' ? 'selected' : ''}>Corta</option>
                                        <option value="512" ${currentMaxTokens === '512' ? 'selected' : ''}>Media</option>
                                        <option value="800" ${currentMaxTokens === '800' ? 'selected' : ''}>Normal</option>
                                        <option value="1500" ${currentMaxTokens === '1500' ? 'selected' : ''}>Larga</option>
                                        <option value="3000" ${currentMaxTokens === '3000' ? 'selected' : ''}>Muy larga</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label for="ia-chatbot-system-prompt">Instrucción del sistema:</label>
                                    <textarea id="ia-chatbot-system-prompt" class="form-control" rows="4">${currentSystemPrompt}</textarea>
                                    <p class="help-text">Define cómo actúa la IA. Para restablecer al valor predeterminado, deja en blanco.</p>
                                </div>
                            </div>
                            
                            <!-- About Tab -->
                            <div id="about-tab" class="ia-chatbot-tab-pane">
                                <div class="about-content">
                                    <h3>Zabbix IA</h3>
                                    <p>Versión 1.2</p>
                                    <p>Este módulo integra la potencia de los modelos de lenguaje con Zabbix, proporcionando asistencia inteligente para consultas relacionadas con monitoreo y alertas.</p>
                                    <p>Soporta tanto OpenAI como Ollama para modelos de IA locales.</p>
                                    <p>Para obtener una API Key de OpenAI, visita: <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com</a></p>
                                    
                                    <div class="about-company">
                                        <h4>Desarrollado por:</h4>
                                        <p>Elitech Solutions</p>
                                        <p>Desarrollador: Simón Alex Rodriguez <a href="https://www.linkedin.com/in/srodriguezxs/" target="_blank"><i class="fa fa-linkedin-square"></i></a></p>
                                        <p>Web: <a href="https://www.elitech-solutions.com" target="_blank">www.elitech-solutions.com</a></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="ia-chatbot-modal-footer" style="text-align: center;">
                            <button type="button" id="ia-chatbot-config-save" class="btn-primary" style="margin-right: 20px;">Guardar</button>
                            <button type="button" id="ia-chatbot-config-cancel" class="btn-secondary">Cancelar</button>
                        </div>
                    </div>
                </div>
            `;
            $('body').append(modalHtml);

            // Toggle between OpenAI and Ollama settings based on provider selection
            $('#ia-chatbot-provider-select').on('change', function() {
                const provider = $(this).val();
                if (provider === 'openai') {
                    $('#openai-settings').show();
                    $('#ollama-settings').hide();
                } else if (provider === 'ollama') {
                    $('#openai-settings').hide();
                    $('#ollama-settings').show();
                    
                    // Cargar modelos disponibles de Ollama al seleccionar este proveedor
                    updateOllamaModelSelector();
                }
            });
            
            // Actualizar modelos de Ollama cuando cambia la IP del servidor
            $('#ollama-server-ip').on('blur', function() {
                // Solo actualizar si el valor ha cambiado
                const newIp = $(this).val().trim();
                const port = $('#ollama-server-port').val().trim();
                const currentIp = localStorage.getItem('ollama_server_ip');
                
                if (newIp && newIp !== currentIp) {
                    updateOllamaModelSelector(newIp, port);
                }
            });
            
            // Actualizar modelos cuando cambia el puerto
            $('#ollama-server-port').on('blur', function() {
                const ip = $('#ollama-server-ip').val().trim();
                const newPort = $(this).val().trim();
                const currentPort = localStorage.getItem('ollama_server_port');
                
                if (newPort && newPort !== currentPort) {
                    updateOllamaModelSelector(ip, newPort);
                }
            });
            
            // Cargar modelos disponibles de Ollama si es el proveedor seleccionado
            if (currentProvider === 'ollama') {
                // Pequeño retraso para asegurar que el DOM esté listo
                setTimeout(() => {
                    updateOllamaModelSelector();
                }, 100);
            }
            
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
                // Guardar el proveedor de IA seleccionado
                const provider = $('#ia-chatbot-provider-select').val();
                localStorage.setItem('ia_chatbot_provider', provider);
                
                // Guardar configuración de OpenAI
                if (provider === 'openai') {
                    // Guardar API Key solo si se ingresó una nueva
                    const newApiKey = $('#ia-chatbot-api-key-input').val().trim();
                    if (newApiKey) {
                        localStorage.setItem('ia_chatbot_api_key', newApiKey);
                    }
                    // Guardar modelo seleccionado
                    localStorage.setItem('ia_chatbot_model', $('#ia-chatbot-model-select').val());
                }
                
                // Guardar configuración de Ollama
                if (provider === 'ollama') {
                    const ollamaServerIp = $('#ollama-server-ip').val().trim();
                    if (ollamaServerIp) {
                        localStorage.setItem('ollama_server_ip', ollamaServerIp);
                    }
                    
                    const ollamaPort = $('#ollama-server-port').val().trim();
                    if (ollamaPort) {
                        localStorage.setItem('ollama_server_port', ollamaPort);
                    }
                    
                    localStorage.setItem('ia_chatbot_ollama_model', $('#ia-chatbot-ollama-model-select').val());
                }
                
                // Guardar configuración avanzada común
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

        // Modificar la función addBotMessage para usar processMessageContent
        function addBotMessage(message, conversationId) {
            const messageContainer = document.createElement('div');
            messageContainer.className = 'message-container bot-container';
            messageContainer.setAttribute('data-conversation-id', conversationId);
            
            const avatar = document.createElement('div');
            avatar.className = 'avatar bot-avatar';
            
            const messageContent = document.createElement('div');
            messageContent.className = 'message bot-message';
            
            // Procesar el contenido del mensaje (puede ser texto o un elemento interactivo)
            const processedContent = typeof message === 'string' 
                ? renderMarkdown(message)
                : processMessageContent(message);
            
            if (typeof processedContent === 'string') {
                messageContent.innerHTML = processedContent;
            } else {
                messageContent.appendChild(processedContent);
            }
            
            messageContainer.appendChild(avatar);
            messageContainer.appendChild(messageContent);
            
            $msgs.append(messageContainer);
            $msgs.scrollTop($msgs[0].scrollHeight);
        }

        // Send handler - modificado para usar el nuevo controlador de mensajes
        $('#ia-chatbot-send').on('click', async function() {
            if (isProcessingMessage) return;
            
            const msg = $('#ia-chatbot-input').val().trim();
            if (!msg) return;

            // Leer API Key de ChatGPT y validar con mayor seguridad
            const defaultApiKey = '';  // Eliminamos la API key predeterminada por seguridad
            let apiKey = sessionStorage.getItem('ia_chatbot_api_key') || localStorage.getItem('ia_chatbot_api_key') || defaultApiKey;
            
            // Si no hay API key, solicitar configuración
            if (!apiKey) {
                alert('Por favor configura tu API Key usando el botón de configuración ⚙️');
                return;
            }
            
            // Leer la configuración avanzada
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
                // Obtener el proveedor de IA configurado
                const provider = localStorage.getItem('ia_chatbot_provider') || 'openai';
                let apiUrl, requestBody;
                
                if (provider === 'openai') {
                    // Configuración para OpenAI
                    apiUrl = `${window.location.origin}/modules/ia_chatbot/debug.php`;
                    // Leer la configuración avanzada
                    const model = localStorage.getItem('ia_chatbot_model') || 'gpt-3.5-turbo';
                    // Construir payload con parámetros y contexto completo
                    requestBody = {
                        api_key: apiKey,
                        model: model,
                        temperature: parseFloat(temperature),
                        max_tokens: parseInt(maxTokens),
                        system_prompt: systemPrompt,
                        history: history,
                        message: msg,
                        provider: 'openai'
                    };
                } else if (provider === 'ollama') {
                    // Configuración para Ollama
                    const ollamaServerIp = localStorage.getItem('ollama_server_ip') || '192.168.19.10';
                    const ollamaPort = localStorage.getItem('ollama_server_port') || '11434';
                    const ollamaModel = localStorage.getItem('ia_chatbot_ollama_model') || 'llama3';
                    
                    // En lugar de conectar directamente a Ollama, usamos nuestro proxy PHP para evitar problemas de CORS y Mixed Content
                    apiUrl = `${window.location.origin}/modules/ia_chatbot/debug.php`;
                    
                    // Para Ollama, reducir el historial a solo los últimos 3 intercambios para mayor velocidad
                    const limitedHistory = history.length > 6 ? history.slice(-6) : history;
                    
                    // Crear payload para Ollama a través del proxy
                    requestBody = {
                        provider: 'ollama',
                        ollama_server: ollamaServerIp,
                        ollama_port: ollamaPort,
                        model: ollamaModel,
                        temperature: parseFloat(temperature),
                        max_tokens: parseInt(maxTokens),
                        system_prompt: systemPrompt,
                        history: limitedHistory, // Usar historial reducido
                        message: msg,
                        fast_mode: true // Indicar que queremos modo rápido
                    };
                } else {
                    throw new Error('Proveedor de IA no configurado o no válido');
                }
                
                // Evitar logging de datos sensibles, solo mostrar información mínima
                console.log(`IA Chatbot - Enviando solicitud al servidor (${provider})`);
                
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    credentials: provider === 'openai' ? 'include' : 'omit', // Solo incluir credenciales para OpenAI
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify(requestBody)
                });

                console.log('IA Chatbot - HTTP status:', response.status);
                
                // Eliminar apiKey de la memoria del navegador después de usarla si usamos OpenAI
                if (provider === 'openai') {
                    apiKey = null;
                    requestBody.api_key = null;
                }

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
    });
})(jQuery);
