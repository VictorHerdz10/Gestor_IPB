// Registro de Extracciones - Gestión de retiros de dinero de caja
document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const extraccionesSection = document.getElementById('extracciones-section');
    const btnAgregarExtraccion = document.getElementById('btn-agregar-extraccion');
    const extraccionForm = document.getElementById('extraccion-form');
    const formNuevaExtraccion = document.getElementById('form-nueva-extraccion');
    const btnCancelarExtraccion = document.getElementById('btn-cancelar-extraccion');
    const extraccionList = document.getElementById('extraccion-list');
    const totalExtraccionesElement = document.getElementById('total-extracciones');
    
    // Elementos de resumen
    const summaryTotalExtracciones = document.getElementById('summary-total-extracciones');
    const summaryCantidadExtracciones = document.getElementById('summary-cantidad-extracciones');
    const summaryUltimaExtraccion = document.getElementById('summary-ultima-extraccion');
    
    // Variables de estado
    let extracciones = [];
    let isInitialized = false;
    
    // Inicializar cuando la sección se muestre
    function initExtracciones() {
        if (isInitialized) return;
        
        
        try {
            cargarExtracciones();
            setupEventListeners();
            actualizarListaExtracciones();
            actualizarResumen();
            
            // Re-asignar event listener al botón de agregar primera extracción si existe
            const btnAddFirstExtraccion = document.getElementById('btn-add-first-extraccion');
            if (btnAddFirstExtraccion) {
                btnAddFirstExtraccion.addEventListener('click', mostrarFormulario);
            }
            
            isInitialized = true;
        } catch (error) {
            console.error('Error inicializando extracciones:', error);
        }
    }
    
    // Inicializar si ya estamos en la sección de extracciones
    if (extraccionesSection && extraccionesSection.classList.contains('active')) {
        setTimeout(initExtracciones, 100);
    }
    
    // También inicializar cuando se haga clic en el enlace del sidebar
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a[data-section="extracciones"]');
        if (link) {
            setTimeout(initExtracciones, 100);
        }
    });
    
    // Inicializar cuando cambie la sección (si existe el evento)
    if (typeof window.addEventListener === 'function') {
        window.addEventListener('sectionChanged', function(e) {
            if (e.detail && e.detail.section === 'extracciones') {
                setTimeout(initExtracciones, 100);
            }
        });
    }
    
    function cargarExtracciones() {
        try {
            extracciones = StorageManager.getExtraccionesData();
        } catch (error) {
            console.error('Error cargando extracciones:', error);
            extracciones = [];
        }
    }
    
    function setupEventListeners() {
        
        // Mostrar formulario
        if (btnAgregarExtraccion) {
            btnAgregarExtraccion.removeEventListener('click', mostrarFormulario);
            btnAgregarExtraccion.addEventListener('click', mostrarFormulario);
        }
        
        // Cancelar formulario
        if (btnCancelarExtraccion) {
            btnCancelarExtraccion.removeEventListener('click', ocultarFormulario);
            btnCancelarExtraccion.addEventListener('click', ocultarFormulario);
        }
        
        // Enviar formulario
        if (formNuevaExtraccion) {
            formNuevaExtraccion.removeEventListener('submit', guardarExtraccion);
            formNuevaExtraccion.addEventListener('submit', guardarExtraccion);
        }
    }
    
    function mostrarFormulario() {
        if (extraccionForm) {
            extraccionForm.style.display = 'block';
            // Desplazar hacia el formulario
            extraccionForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Limpiar formulario
            formNuevaExtraccion.reset();
            // Enfocar el primer campo
            const descripcionInput = document.getElementById('extraccion-descripcion');
            if (descripcionInput) {
                descripcionInput.focus();
            }
        }
    }
    
    function ocultarFormulario() {
        if (extraccionForm) {
            extraccionForm.style.display = 'none';
        }
    }
    
    function guardarExtraccion(e) {
        e.preventDefault();
        
        const descripcionInput = document.getElementById('extraccion-descripcion');
        const montoInput = document.getElementById('extraccion-monto');
        const notasInput = document.getElementById('extraccion-notas');
        
        if (!descripcionInput || !montoInput) {
            showNotification('Error: No se encontraron los campos del formulario', 'error');
            return;
        }
        
        const descripcion = descripcionInput.value.trim();
        const monto = parseFloat(montoInput.value) || 0;
        const notas = notasInput ? notasInput.value.trim() : '';
        
        if (!descripcion) {
            showNotification('Por favor ingresa una descripción para la extracción', 'warning');
            descripcionInput.focus();
            return;
        }
        
        if (monto <= 0) {
            showNotification('El monto debe ser mayor a 0', 'warning');
            montoInput.focus();
            return;
        }
        
        // Crear nueva extracción
        const nuevaExtraccion = {
            id: Date.now(), // ID único basado en timestamp
            descripcion: descripcion,
            monto: monto,
            notas: notas,
            fecha: new Date().toISOString(),
            hora: obtenerHoraActual()
        };
        
        // Agregar a la lista
        extracciones.push(nuevaExtraccion);
        
        // Guardar en almacenamiento
        StorageManager.saveExtraccionesData(extracciones);
        
        // Actualizar interfaz
        actualizarListaExtracciones();
        actualizarResumen();
        
        // Ocultar formulario
        ocultarFormulario();
        
        // Mostrar notificación
        showNotification(`Extracción registrada: $${monto.toFixed(2)}`, 'success');
        
        // Actualizar dashboard
        if (typeof window.updateSummary === 'function') {
            window.updateSummary();
        }
        
    }
    
    function actualizarListaExtracciones() {
        if (!extraccionList) {
            console.error('No se encontró el elemento extraccion-list');
            return;
        }
        extraccionList.innerHTML = '';
        
        if (extracciones.length === 0) {
            // Mostrar estado vacío
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state-card';
            emptyState.innerHTML = `
                <i class="fas fa-money-bill-wave"></i>
                <p>No hay extracciones registradas hoy</p>
                <button class="btn btn-outline" id="btn-add-first-extraccion">
                    <i class="fas fa-plus"></i> Agregar primera extracción
                </button>
            `;
            extraccionList.appendChild(emptyState);
            
            // Re-asignar event listener al botón
            setTimeout(() => {
                const btn = document.getElementById('btn-add-first-extraccion');
                if (btn) {
                    btn.removeEventListener('click', mostrarFormulario);
                    btn.addEventListener('click', mostrarFormulario);
                }
            }, 100);
            
            return;
        }
        
        // Ordenar por fecha más reciente primero
        const extraccionesOrdenadas = [...extracciones].sort((a, b) => 
            new Date(b.fecha) - new Date(a.fecha)
        );
        
        // Crear tarjetas para cada extracción
        extraccionesOrdenadas.forEach(extraccion => {
            const card = document.createElement('div');
            card.className = 'extraccion-card';
            card.dataset.id = extraccion.id;
            
            const notasHTML = extraccion.notas ? `
                <div class="card-body">
                    <p class="notas">${extraccion.notas}</p>
                </div>
            ` : '';
            
            card.innerHTML = `
                <div class="card-header">
                    <h4 class="descripcion">${extraccion.descripcion}</h4>
                    <span class="monto">$${extraccion.monto.toFixed(2)}</span>
                </div>
                ${notasHTML}
                <div class="card-footer">
                    <span class="hora">
                        <i class="far fa-clock"></i> ${extraccion.hora}
                    </span>
                    <div class="acciones">
                        <button class="btn-eliminar" data-id="${extraccion.id}" title="Eliminar extracción">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            
            extraccionList.appendChild(card);
        });
        
        // Agregar event listeners para botones de eliminar
        setTimeout(() => {
            const botonesEliminar = document.querySelectorAll('.btn-eliminar');
            botonesEliminar.forEach(btn => {
                btn.removeEventListener('click', handleEliminarClick);
                btn.addEventListener('click', handleEliminarClick);
            });
        }, 100);
        
        // Actualizar total
        const totalExtraido = extracciones.reduce((total, ex) => total + ex.monto, 0);
        if (totalExtraccionesElement) {
            totalExtraccionesElement.textContent = `$${totalExtraido.toFixed(2)}`;
        }
    }
    
    function handleEliminarClick() {
        const id = parseInt(this.dataset.id);
        eliminarExtraccion(id);
    }
    
    function eliminarExtraccion(id) {
        showConfirmationModal(
            'Eliminar Extracción',
            '¿Estás seguro de eliminar esta extracción? Esta acción no se puede deshacer.',
            'warning',
            function() {
                // Filtrar la extracción a eliminar
                const index = extracciones.findIndex(ex => ex.id === id);
                if (index !== -1) {
                    const extraccionEliminada = extracciones[index];
                    extracciones.splice(index, 1);
                    
                    // Guardar cambios
                    StorageManager.saveExtraccionesData(extracciones);
                    
                    // Actualizar interfaz
                    actualizarListaExtracciones();
                    actualizarResumen();
                    
                    // Mostrar notificación
                    showNotification('Extracción eliminada correctamente', 'success');
                    
                    // Actualizar dashboard
                    if (typeof window.updateSummary === 'function') {
                        window.updateSummary();
                    }
                    
                }
            }
        );
    }
    
    function actualizarResumen() {
        const totalExtraido = extracciones.reduce((total, ex) => total + ex.monto, 0);
        const cantidad = extracciones.length;
        
        // Obtener la última extracción (más reciente)
        let ultimaHora = '--:--';
        if (extracciones.length > 0) {
            const ultima = extracciones.reduce((latest, ex) => 
                new Date(ex.fecha) > new Date(latest.fecha) ? ex : latest
            );
            ultimaHora = ultima.hora;
        }
        
        // Actualizar elementos del DOM
        if (summaryTotalExtracciones) {
            summaryTotalExtracciones.textContent = `$${totalExtraido.toFixed(2)}`;
        }
        
        if (summaryCantidadExtracciones) {
            summaryCantidadExtracciones.textContent = cantidad;
        }
        
        if (summaryUltimaExtraccion) {
            summaryUltimaExtraccion.textContent = ultimaHora;
        }
        
        // Actualizar también en el dashboard
        const extraccionesTotalElement = document.getElementById('extracciones-total');
        if (extraccionesTotalElement) {
            extraccionesTotalElement.textContent = `$${totalExtraido.toFixed(2)}`;
        }
    }
    
    function obtenerHoraActual() {
        const now = new Date();
        return now.toLocaleString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }
    
    // Funciones disponibles globalmente
    window.getExtraccionesTotal = function() {
        return extracciones.reduce((total, ex) => total + ex.monto, 0);
    };
    
    window.getExtraccionesCount = function() {
        return extracciones.length;
    };
    
    window.resetExtraccionesDia = function() {
        extracciones = [];
        StorageManager.saveExtraccionesData(extracciones);
        actualizarListaExtracciones();
        actualizarResumen();
    };
    
    // Función para forzar inicialización
    window.initExtracciones = initExtracciones;
    
    // Exponer datos para depuración
    window.extraccionesData = extracciones;
});