// transferencias.js - Versión Simplificada
document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const transferenciaForm = document.getElementById('transferencia-form');
    const transferenciaTable = document.getElementById('transferencia-table');
    const transferenciaList = document.getElementById('transferencia-list');
    const btnAgregarTransferencia = document.getElementById('btn-agregar-transferencia');
    const btnCancelarTransferencia = document.getElementById('btn-cancelar-transferencia');
    const totalTransferencias = document.getElementById('total-transferencias');
    const exportTransferenciasBtn = document.getElementById('export-transferencias');
    
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
        
        // Botón exportar
        if (exportTransferenciasBtn) {
            exportTransferenciasBtn.addEventListener('click', exportTransferencias);
        }
    }
    
    // Mostrar formulario de transferencia
    function showTransferenciaForm() {
        if (transferenciaForm) transferenciaForm.style.display = 'block';
        if (transferenciaTable) transferenciaTable.style.display = 'none';
        
        // Establecer hora actual
        const horaInput = document.getElementById('transferencia-hora');
        if (horaInput) {
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            horaInput.value = `${hours}:${minutes}`;
        }
        
        // Enfocar el campo de monto
        const montoInput = document.getElementById('transferencia-monto');
        if (montoInput) montoInput.focus();
    }
    
    // Ocultar formulario de transferencia
    function hideTransferenciaForm() {
        if (transferenciaForm) transferenciaForm.style.display = 'none';
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
        const horaInput = document.getElementById('transferencia-hora');
        const notasInput = document.getElementById('transferencia-notas');
        
        if (!montoInput || !horaInput) return;
        
        const monto = parseFloat(montoInput.value);
        const hora = horaInput.value;
        const notas = notasInput ? notasInput.value.trim() : '';
        
        // Validaciones
        if (!monto || monto <= 0) {
            showNotification('Por favor, ingresa un monto válido', 'error');
            return;
        }
        
        if (!hora) {
            showNotification('Por favor, ingresa la hora de la transferencia', 'error');
            return;
        }
        
        const transferencia = {
            id: editingId || Date.now().toString(),
            monto: monto,
            hora: hora,
            notas: notas,
            fecha: new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString()
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
        const hoy = new Date().toISOString().split('T')[0];
        
        // Filtrar transferencias del día actual
        const transferenciasHoy = transferencias.filter(t => t.fecha === hoy);
        
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
            // Obtener la última transferencia (más reciente)
            const ultima = transferencias.sort((a, b) => {
                const timeA = a.hora ? a.hora.split(':').map(Number) : [0, 0];
                const timeB = b.hora ? b.hora.split(':').map(Number) : [0, 0];
                return (timeB[0] * 60 + timeB[1]) - (timeA[0] * 60 + timeA[1]);
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
    
    // Renderizar lista de transferencias
    function renderTransferenciasList(transferencias) {
        if (!transferenciaList) return;
        
        if (transferencias.length === 0) {
            transferenciaList.innerHTML = `
                <tr class="empty-row">
                    <td colspan="4">
                        <div class="empty-state">
                            <i class="fas fa-exchange-alt"></i>
                            <p>No hay transferencias registradas hoy</p>
                            <button class="btn btn-outline" id="btn-add-first-transferencia">
                                <i class="fas fa-plus"></i> Agregar primera transferencia
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            
            const addFirstBtn = document.getElementById('btn-add-first-transferencia');
            if (addFirstBtn) {
                addFirstBtn.addEventListener('click', function() {
                    showTransferenciaForm();
                });
            }
            
            return;
        }
        
        // Ordenar por hora (más reciente primero)
        transferencias.sort((a, b) => {
            const timeA = a.hora ? a.hora.split(':').map(Number) : [0, 0];
            const timeB = b.hora ? b.hora.split(':').map(Number) : [0, 0];
            return (timeB[0] * 60 + timeB[1]) - (timeA[0] * 60 + timeA[1]);
        });
        
        let html = '';
        
        transferencias.forEach((transferencia) => {
            const formattedMonto = parseFloat(transferencia.monto || 0).toLocaleString('es-ES', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            
            html += `
                <tr class="transferencia-item" data-id="${transferencia.id}">
                    <td class="amount">$${formattedMonto}</td>
                    <td>
                        <div class="transferencia-hora">
                            <i class="fas fa-clock"></i>
                            <span>${transferencia.hora || '--:--'}</span>
                        </div>
                    </td>
                    <td>
                        ${transferencia.notas ? `<div class="transferencia-notas">${transferencia.notas}</div>` : 
                          '<span class="text-muted">Sin notas</span>'}
                    </td>
                    <td class="actions">
                        <button class="btn-icon edit-transferencia" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete-transferencia" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        transferenciaList.innerHTML = html;
        
        // Agregar event listeners a los botones
        document.querySelectorAll('.edit-transferencia').forEach(btn => {
            btn.addEventListener('click', function() {
                const row = this.closest('.transferencia-item');
                const id = row.getAttribute('data-id');
                editarTransferencia(id);
            });
        });
        
        document.querySelectorAll('.delete-transferencia').forEach(btn => {
            btn.addEventListener('click', function() {
                const row = this.closest('.transferencia-item');
                const id = row.getAttribute('data-id');
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
        const horaInput = document.getElementById('transferencia-hora');
        const notasInput = document.getElementById('transferencia-notas');
        
        if (montoInput) montoInput.value = transferencia.monto || '';
        if (horaInput) horaInput.value = transferencia.hora || '';
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
    
    // Exportar transferencias
    function exportTransferencias() {
        const transferencias = obtenerTransferencias();
        const hoy = new Date().toISOString().split('T')[0];
        const transferenciasHoy = transferencias.filter(t => t.fecha === hoy);
        
        if (transferenciasHoy.length === 0) {
            if (typeof showNotification === 'function') {
                showNotification('No hay transferencias para exportar hoy', 'info');
            }
            return;
        }
        
        // Crear contenido CSV
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Monto,Hora,Notas,Fecha\n";
        
        transferenciasHoy.forEach(t => {
            const row = [
                t.monto || 0,
                `"${t.hora || ''}"`,
                `"${t.notas || ''}"`,
                `"${t.fecha || ''}"`
            ].join(',');
            csvContent += row + "\n";
        });
        
        // Crear enlace de descarga
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `transferencias_${hoy}.csv`);
        
        // Simular clic
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        if (typeof showNotification === 'function') {
            showNotification('Transferencias exportadas correctamente', 'success');
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
});