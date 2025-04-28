/**
 * Dropdown Enhancer - Mejora la funcionalidad de los selectores desplegables
 * para asegurar que las opciones seleccionadas se muestren correctamente.
 */
(function() {
    'use strict';

    // Función para mejorar los selectores después de que el DOM esté listo
    function enhanceDropdowns() {
        const selects = document.querySelectorAll('select.form-control');
        
        selects.forEach(select => {
            applySelectEnhancements(select);
        });

        // Mejorar los selectores en modales cuando se abren
        document.addEventListener('click', function(e) {
            // Diferir la mejora para dar tiempo a que el modal se abra completamente
            setTimeout(() => {
                const modalSelects = document.querySelectorAll('.modal-body select.form-control');
                modalSelects.forEach(select => {
                    applySelectEnhancements(select);
                });
            }, 100);
        });

        // Observar cambios en el DOM para mejorar nuevos selectores que se añadan dinámicamente
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // ELEMENT_NODE
                            const newSelects = node.querySelectorAll('select.form-control');
                            if (newSelects.length > 0) {
                                newSelects.forEach(select => {
                                    applySelectEnhancements(select);
                                });
                            }
                            
                            // Si es un modal, esperar un poco para asegurar que todos los elementos estén renderizados
                            if (node.classList && node.classList.contains('modal-dialog')) {
                                setTimeout(() => {
                                    const modalSelects = node.querySelectorAll('select.form-control');
                                    modalSelects.forEach(select => {
                                        applySelectEnhancements(select);
                                    });
                                }, 200);
                            }
                        }
                    });
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Función para aplicar mejoras a un selector individual
    function applySelectEnhancements(select) {
        // Evitar aplicar mejoras múltiples veces
        if (select.dataset.enhanced === 'true') return;
        
        // Marcar como mejorado
        select.dataset.enhanced = 'true';
        
        // Reforzar la visualización de la opción seleccionada actual
        updateSelectVisuals(select);

        // Asegurar que el valor seleccionado se refleje visualmente al cambiar
        select.addEventListener('change', function() {
            updateSelectVisuals(this);
            
            // Forzar actualización visual del selector
            setTimeout(() => {
                // Disparar un evento personalizado para notificar que el valor ha cambiado
                const event = new CustomEvent('enhanced-change', {
                    detail: { value: this.value, text: this.options[this.selectedIndex].textContent }
                });
                this.dispatchEvent(event);
            }, 50);
        });
        
        // También actualizar cuando el selector recibe el foco
        select.addEventListener('focus', function() {
            updateSelectVisuals(this);
        });
    }
    
    // Función para actualizar el aspecto visual de un selector
    function updateSelectVisuals(select) {
        if (select.value) {
            // Buscar el texto de la opción seleccionada
            const selectedOption = Array.from(select.options).find(option => option.value === select.value);
            if (selectedOption) {
                // Asegurarnos de que el texto de la opción seleccionada sea visible
                select.classList.add('selection-active');
                
                // Aplicar un atributo de datos personalizado para asegurar que se muestre el texto correcto
                select.setAttribute('data-selected-text', selectedOption.textContent);
                select.setAttribute('aria-label', 'Seleccionado: ' + selectedOption.textContent);
                
                // Forzar un refresco de la UI para algunos navegadores problemáticos
                select.style.opacity = '0.99';
                setTimeout(() => {
                    select.style.opacity = '1';
                }, 10);
            }
        }
    }
    
    // Aplicar las mejoras durante la carga inicial 
    function initialize() {
        enhanceDropdowns();
        
        // También comprobar después de un breve retraso para capturar elementos que puedan 
        // cargarse de forma asíncrona o mediante scripts
        setTimeout(enhanceDropdowns, 500);
        setTimeout(enhanceDropdowns, 1000);
    }

    // Ejecutar cuando el DOM esté completamente cargado
    document.addEventListener('DOMContentLoaded', initialize);

    // Para casos donde el script se cargue después de que el DOM esté listo
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(initialize, 1);
    }
})();