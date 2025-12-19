// transferencias.js - Versión con Tarjetas (CORREGIDO)
document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const transferenciaFormContainer = document.getElementById('transferencia-form');
    const transferenciaForm = document.getElementById('form-nueva-transferencia');
    const transferenciaTable = document.getElementById('transferencia-table');
    const transferenciaList = document.getElementById('transferencia-list');
    const btnAgregarTransferencia = document.getElementById('btn-agregar-transferencia');
    const btnCancelarTransferencia = document.getElementById('btn-cancelar-transferencia');
    const totalTransferencias = document.getElementById('total-transferencias');
    
    // Elementos del resumen
    const summaryTotal = document.getElementById('summary-total-transferencias');
    const summaryCantidad = document.getElementById('summary-cantidad-transferencias');
    const summaryUltima = document.getElementById('summary-ultima-transferencia');
    
    // Variables de estado
    let editingId = null;
    
    // Inicializar
    initTransferencias();
    
    // Inicializar módulo de transferencias
    function initTransferencias() {
        cargarTransferencias();
        setupEventListeners();
    }
    
    // Configurar event listeners
    function setupEventListeners() {
        // Botón agregar transferencia
        if (btnAgregarTransferencia) {
            btnAgregarTransferencia.addEventListener('click', function() {
                showTransferenciaForm();
            });
        }
        
        // Botón cancelar
        if (btnCancelarTransferencia) {
            btnCancelarTransferencia.addEventListener('click', function() {
                hideTransferenciaForm();
                resetForm();
            });
        }
        
        // Formulario de transferencia
        if (transferenciaForm) {
            transferenciaForm.addEventListener('submit', function(e) {
                e.preventDefault();
                guardarTransferencia();
            });
        }
    }
    
    // Mostrar formulario de transferencia
    function showTransferenciaForm() {
        if (transferenciaFormContainer) transferenciaFormContainer.style.display = 'block';
        if (transferenciaTable) transferenciaTable.style.display = 'none';
        
        // Enfocar el campo de monto
        const montoInput = document.getElementById('transferencia-monto');
        if (montoInput) montoInput.focus();
    }
    
    // Ocultar formulario de transferencia
    function hideTransferenciaForm() {
        if (transferenciaFormContainer) transferenciaFormContainer.style.display = 'none';
        if (transferenciaTable) transferenciaTable.style.display = 'block';
    }
    
    // Resetear formulario
    function resetForm() {
        if (transferenciaForm) transferenciaForm.reset();
        editingId = null;
        
        // Restaurar texto del botón
        const submitBtn = transferenciaForm?.querySelector('.btn-primary');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Transferencia';
        }
    }
    
    // Guardar transferencia
    function guardarTransferencia() {
        const montoInput = document.getElementById('transferencia-monto');
        const notasInput = document.getElementById('transferencia-notas');
        
        if (!montoInput) return;
        
        const monto = parseFloat(montoInput.value);
        const notas = notasInput ? notasInput.value.trim() : '';
        
        // Validaciones
        if (!monto || monto <= 0) {
            showNotification('Por favor, ingresa un monto válido', 'error');
            return;
        }
        
        // Crear timestamp con el formato que pediste
        const now = new Date();
        const hora = now.toLocaleString('es-ES', { 
            month: 'numeric', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
        
        const transferencia = {
            id: editingId || Date.now().toString(),
            monto: monto,
            hora: hora,
            notas: notas,
            fecha: new Date().toISOString().split('T')[0],
            timestamp: now.toISOString(),
            timestampMs: now.getTime() // Para ordenar por fecha
        };
        
        // Guardar en localStorage
        const transferencias = obtenerTransferencias();
        
        if (editingId) {
            // Editar transferencia existente
            const index = transferencias.findIndex(t => t.id === editingId);
            if (index !== -1) {
                transferencias[index] = transferencia;
                showNotification('Transferencia actualizada correctamente', 'success');
            }
        } else {
            // Nueva transferencia
            transferencias.push(transferencia);
            showNotification('Transferencia agregada correctamente', 'success');
        }
        
        // Guardar usando StorageManager si existe, sino usar localStorage directo
        if (typeof StorageManager !== 'undefined') {
            StorageManager.saveTransferenciasData(transferencias);
        } else {
            localStorage.setItem('ipb_transferencias_data', JSON.stringify(transferencias));
        }
        
        // Actualizar UI
        cargarTransferencias();
        resetForm();
        hideTransferenciaForm();
        
        // Actualizar dashboard
        if (typeof window.updateSummary === 'function') {
            window.updateSummary();
        }
    }
    
    // Cargar transferencias
    function cargarTransferencias() {
        const transferencias = obtenerTransferencias();
        
        // Filtrar transferencias del día actual
        const transferenciasHoy = transferencias;
        
        // Actualizar lista
        renderTransferenciasList(transferenciasHoy);
        
        // Actualizar total principal
        const total = transferenciasHoy.reduce((sum, t) => sum + (parseFloat(t.monto) || 0), 0);
        if (totalTransferencias) {
            totalTransferencias.textContent = `$${total.toFixed(2)}`;
        }
        
        // Actualizar resumen
        actualizarResumen(transferenciasHoy, total);
        
        // Guardar datos para el dashboard usando StorageManager si existe
        if (typeof StorageManager !== 'undefined') {
            StorageManager.saveTransferenciasData(transferenciasHoy);
        }
    }
    
    // Actualizar resumen
    function actualizarResumen(transferencias, total) {
        if (!summaryTotal || !summaryCantidad || !summaryUltima) return;
        
        summaryTotal.textContent = `$${total.toFixed(2)}`;
        summaryCantidad.textContent = transferencias.length;
        
        if (transferencias.length > 0) {
            // Obtener la última transferencia (más reciente por timestampMs)
            const ultima = transferencias.sort((a, b) => {
                return (b.timestampMs || 0) - (a.timestampMs || 0);
            })[0];
            
            summaryUltima.textContent = ultima.hora || '--:--';
        } else {
            summaryUltima.textContent = '--:--';
        }
    }
    
    // Obtener todas las transferencias
    function obtenerTransferencias() {
        let data;
        
        // Intentar obtener de StorageManager primero
        if (typeof StorageManager !== 'undefined') {
            data = StorageManager.getTransferenciasData();
        } else {
            // Fallback a localStorage directo
            const localStorageData = localStorage.getItem('ipb_transferencias_data');
            if (localStorageData) {
                try {
                    data = JSON.parse(localStorageData);
                } catch (error) {
                    console.error('Error al cargar transferencias:', error);
                    return [];
                }
            }
        }
        
        return data || [];
    }
    
    // Renderizar lista de transferencias como tarjetas - CORREGIDO
    function renderTransferenciasList(transferencias) {
        if (!transferenciaList) return;
        
        if (transferencias.length === 0) {
            // Usar la misma estructura que en consumo.js para mantener consistencia
            transferenciaList.innerHTML = `
                <div class="empty-card-placeholder">
                    <i class="fas fa-exchange-alt"></i>
                    <p>No hay transferencias registradas</p>
                    <button class="btn btn-outline" id="btn-add-first-transferencia">
                        <i class="fas fa-plus"></i> Agregar primera transferencia
                    </button>
                </div>
            `;
            
            const addFirstBtn = document.getElementById('btn-add-first-transferencia');
            if (addFirstBtn) {
                addFirstBtn.addEventListener('click', function() {
                    showTransferenciaForm();
                });
            }
            
            return;
        }
        
        // Ordenar por timestamp (más reciente primero)
        transferencias.sort((a, b) => {
            return (b.timestampMs || 0) - (a.timestampMs || 0);
        });
        
        let html = '';
        
        transferencias.forEach((transferencia) => {
            const formattedMonto = parseFloat(transferencia.monto || 0).toLocaleString('es-ES', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            
            // Usar la misma clase "consumo-card" para mantener consistencia de estilos
            html += `
                <div class="transferencia-card" data-id="${transferencia.id}">
                    <div class="transferencia-card-header">
                        <div class="transferencia-monto">$${formattedMonto}</div>
                        <div class="transferencia-hora">
                        <i class="fas fa-clock"></i> ${transferencia.hora || '--:--'}
                        </div>
                    </div>
                    
                    ${transferencia.notas ? `
                        <div class="transferencia-notas">
                            ${transferencia.notas}
                        </div>
                    ` : ''}
                    
                    <div class="transferencia-actions">
                        <button class="btn-icon edit-transferencia" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete-transferencia" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        transferenciaList.innerHTML = html;
        
        // Agregar event listeners a los botones
        document.querySelectorAll('.edit-transferencia').forEach(btn => {
            btn.addEventListener('click', function() {
                const card = this.closest('.transferencia-card');
                const id = card.getAttribute('data-id');
                editarTransferencia(id);
            });
        });
        
        document.querySelectorAll('.delete-transferencia').forEach(btn => {
            btn.addEventListener('click', function() {
                const card = this.closest('.transferencia-card');
                const id = card.getAttribute('data-id');
                eliminarTransferencia(id);
            });
        });
    }
    
    // Editar transferencia
    function editarTransferencia(id) {
        const transferencias = obtenerTransferencias();
        const transferencia = transferencias.find(t => t.id === id);
        
        if (!transferencia) return;
        
        // Rellenar formulario
        const montoInput = document.getElementById('transferencia-monto');
        const notasInput = document.getElementById('transferencia-notas');
        
        if (montoInput) montoInput.value = transferencia.monto || '';
        if (notasInput) notasInput.value = transferencia.notas || '';
        
        // Actualizar estado
        editingId = id;
        
        // Cambiar texto del botón
        const submitBtn = transferenciaForm?.querySelector('.btn-primary');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Actualizar Transferencia';
        }
        
        // Mostrar formulario
        showTransferenciaForm();
    }
    
    // Eliminar transferencia
    function eliminarTransferencia(id) {
        // Usar showConfirmationModal global si existe
        if (typeof showConfirmationModal === 'function') {
            showConfirmationModal(
                'Eliminar Transferencia',
                '¿Estás seguro de que quieres eliminar esta transferencia? Esta acción no se puede deshacer.',
                'warning',
                function() {
                    eliminarTransferenciaConfirmada(id);
                }
            );
        } else {
            // Fallback a confirm nativo
            if (confirm('¿Estás seguro de que quieres eliminar esta transferencia?')) {
                eliminarTransferenciaConfirmada(id);
            }
        }
    }
    
    function eliminarTransferenciaConfirmada(id) {
        const transferencias = obtenerTransferencias();
        const nuevasTransferencias = transferencias.filter(t => t.id !== id);
        
        // Guardar usando StorageManager si existe, sino localStorage directo
        if (typeof StorageManager !== 'undefined') {
            StorageManager.saveTransferenciasData(nuevasTransferencias);
        } else {
            localStorage.setItem('ipb_transferencias_data', JSON.stringify(nuevasTransferencias));
        }
        
        if (typeof showNotification === 'function') {
            showNotification('Transferencia eliminada correctamente', 'success');
        }
        
        cargarTransferencias();
        
        // Actualizar dashboard
        if (typeof window.updateSummary === 'function') {
            window.updateSummary();
        }
    }
    
    // Función para limpiar transferencias del día (usada por el dashboard)
    window.resetTransferencias = function() {
        const transferencias = obtenerTransferencias();
        const hoy = new Date().toISOString().split('T')[0];
        
        // Mantener solo transferencias de otros días
        const nuevasTransferencias = transferencias.filter(t => t.fecha !== hoy);
        
        // Guardar usando StorageManager si existe, sino localStorage directo
        if (typeof StorageManager !== 'undefined') {
            StorageManager.saveTransferenciasData(nuevasTransferencias);
        } else {
            localStorage.setItem('ipb_transferencias_data', JSON.stringify(nuevasTransferencias));
        }
        
        cargarTransferencias();
    };
    
    // Exponer funciones globalmente
    window.cargarTransferencias = cargarTransferencias;
    window.getTotalTransferencias = function() {
        const transferencias =  obtenerTransferencias();
        
        return transferencias.reduce((sum, t) => sum + (parseFloat(t.monto) || 0), 0);
    };
});