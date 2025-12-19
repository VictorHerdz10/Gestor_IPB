// consumo.js - Sistema de Registro de Consumos Simplificado
document.addEventListener('DOMContentLoaded', function () {
    // Elementos del DOM
    const consumoFormContainer = document.getElementById('consumo-form');
    const consumoForm = document.getElementById('form-nuevo-consumo');
    const consumoTable = document.getElementById('consumo-table');
    const consumoList = document.getElementById('consumo-list');
    const btnAgregarConsumo = document.getElementById('btn-agregar-consumo');
    const btnCancelarConsumo = document.getElementById('btn-cancelar-consumo');
    const totalConsumo = document.getElementById('total-consumo');

    // Elementos del resumen
    const summaryTotal = document.getElementById('summary-total-consumo');
    const summaryCantidad = document.getElementById('summary-cantidad-consumo');
    const summaryUltimo = document.getElementById('summary-ultimo-consumo');

    // Variables de estado
    let editingId = null;

    // Inicializar
    initConsumo();

    // Inicializar módulo de consumo
    function initConsumo() {
        cargarConsumos();
        setupEventListeners();
    }

    // Configurar event listeners
    function setupEventListeners() {
        // Botón agregar consumo
        if (btnAgregarConsumo) {
            btnAgregarConsumo.addEventListener('click', function () {
                showConsumoForm();
            });
        }

        // Botón cancelar
        if (btnCancelarConsumo) {
            btnCancelarConsumo.addEventListener('click', function () {
                hideConsumoForm();
                resetForm();
            });
        }

        // Formulario de consumo
        if (consumoForm) {
            consumoForm.addEventListener('submit', function (e) {
                e.preventDefault();
                guardarConsumo();
            });
        }
    }

    // Mostrar formulario de consumo
    function showConsumoForm() {
        if (consumoFormContainer) consumoFormContainer.style.display = 'block';
        if (consumoTable) consumoTable.style.display = 'none';

        // Enfocar el campo de descripción
        const descripcionInput = document.getElementById('consumo-descripcion');
        if (descripcionInput) descripcionInput.focus();
    }

    // Ocultar formulario de consumo
    function hideConsumoForm() {
        if (consumoFormContainer) consumoFormContainer.style.display = 'none';
        if (consumoTable) consumoTable.style.display = 'block';
    }

    // Resetear formulario
    function resetForm() {
        if (consumoForm) consumoForm.reset();
        editingId = null;

        // Restaurar texto del botón
        const submitBtn = consumoForm?.querySelector('.btn-primary');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Consumo';
        }
    }

    // Guardar consumo
    function guardarConsumo() {
        const descripcionInput = document.getElementById('consumo-descripcion');
        const montoInput = document.getElementById('consumo-monto');
        const notasInput = document.getElementById('consumo-notas');

        if (!descripcionInput || !montoInput) return;

        const descripcion = descripcionInput.value.trim();
        const monto = parseFloat(montoInput.value);
        const notas = notasInput ? notasInput.value.trim() : '';

        // Validaciones
        if (!descripcion) {
            showNotification('Por favor, ingresa una descripción', 'error');
            return;
        }

        if (!monto || monto <= 0) {
            showNotification('Por favor, ingresa un monto válido', 'error');
            return;
        }

        // Crear timestamp con el formato
        const now = new Date();
        const hora = now.toLocaleString('es-ES', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        const consumo = {
            id: editingId || Date.now().toString(),
            descripcion: descripcion,
            monto: monto,
            notas: notas,
            hora: hora,
            fecha: new Date().toISOString().split('T')[0],
            timestamp: now.toISOString(),
            timestampMs: now.getTime()
        };

        // Guardar en localStorage
        const consumos = obtenerConsumos();

        if (editingId) {
            // Editar consumo existente
            const index = consumos.findIndex(c => c.id === editingId);
            if (index !== -1) {
                consumos[index] = consumo;
                showNotification('Consumo actualizado correctamente', 'success');
            }
        } else {
            // Nuevo consumo
            consumos.push(consumo);
            showNotification('Consumo agregado correctamente', 'success');
        }

        // Guardar usando StorageManager si existe, sino usar localStorage directo
        if (typeof StorageManager !== 'undefined') {
            StorageManager.saveConsumoData(consumos);
        } else {
            localStorage.setItem('ipb_consumo_data', JSON.stringify(consumos));
        }

        // Actualizar UI
        cargarConsumos();
        resetForm();
        hideConsumoForm();

        // Actualizar dashboard
        if (typeof window.updateSummary === 'function') {
            window.updateSummary();
        }
    }

    // Cargar consumos
    function cargarConsumos() {
        const consumosHoy = obtenerConsumos();

        // Actualizar lista
        renderConsumosList(consumosHoy);

        // Actualizar total principal
        const total = consumosHoy.reduce((sum, c) => sum + (parseFloat(c.monto) || 0), 0);
        if (totalConsumo) {
            totalConsumo.textContent = `$${total.toFixed(2)}`;
        }

        // Actualizar resumen
        actualizarResumen(consumosHoy, total);
    }

    // Actualizar resumen
    function actualizarResumen(consumos, total) {
        if (!summaryTotal || !summaryCantidad || !summaryUltimo) return;

        summaryTotal.textContent = `$${total.toFixed(2)}`;
        summaryCantidad.textContent = consumos.length;

        if (consumos.length > 0) {
            // Obtener el último consumo (más reciente por timestampMs)
            const ultimo = consumos.sort((a, b) => {
                return (b.timestampMs || 0) - (a.timestampMs || 0);
            })[0];

            summaryUltimo.textContent = ultimo.hora || '--:--';
        } else {
            summaryUltimo.textContent = '--:--';
        }
    }

    // Obtener todos los consumos
    function obtenerConsumos() {
        let data;

        // Intentar obtener de StorageManager primero
        if (typeof StorageManager !== 'undefined') {
            data = StorageManager.getConsumoData();
        } else {
            // Fallback a localStorage directo
            const localStorageData = localStorage.getItem('ipb_consumo_data');
            if (localStorageData) {
                try {
                    data = JSON.parse(localStorageData);
                } catch (error) {
                    console.error('Error al cargar consumos:', error);
                    return [];
                }
            }
        }

        return data || [];
    }

    // Renderizar lista de consumos como tarjetas
    // Renderizar lista de consumos como tarjetas
    function renderConsumosList(consumos) {
        if (!consumoList) return;

        if (consumos.length === 0) {
            consumoList.innerHTML = `
            <div class="empty-card-placeholder">
                <i class="fas fa-shopping-cart"></i>
                <p>No hay consumos registrados</p>
                <button class="btn btn-outline" id="btn-add-first-consumo">
                    <i class="fas fa-plus"></i> Agregar primer consumo
                </button>
            </div>
        `;

            const addFirstBtn = document.getElementById('btn-add-first-consumo');
            if (addFirstBtn) {
                addFirstBtn.addEventListener('click', function () {
                    showConsumoForm();
                });
            }

            return;
        }

        // Ordenar por timestamp (más reciente primero)
        consumos.sort((a, b) => {
            return (b.timestampMs || 0) - (a.timestampMs || 0);
        });

        let html = '';

        consumos.forEach((consumo) => {
            const formattedMonto = parseFloat(consumo.monto || 0).toLocaleString('es-ES', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });

            html += `
            <div class="consumo-card" data-id="${consumo.id}">
                <div class="consumo-card-header">
                    <div class="consumo-descripcion">${consumo.descripcion || 'Sin descripción'}</div>
                    <div class="consumo-monto">$${formattedMonto}</div>
                </div>
                
                <div class="consumo-hora">
                    <i class="fas fa-clock"></i> ${consumo.hora || '--:--'}
                </div>
                
                ${consumo.notas ? `
                    <div class="consumo-notas">
                        ${consumo.notas}
                    </div>
                ` : ''}
                
                <div class="consumo-actions">
                    <button class="btn-icon edit-consumo" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete-consumo" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        });

        consumoList.innerHTML = html;

        // Agregar event listeners a los botones
        document.querySelectorAll('.edit-consumo').forEach(btn => {
            btn.addEventListener('click', function () {
                const card = this.closest('.consumo-card');
                const id = card.getAttribute('data-id');
                editarConsumo(id);
            });
        });

        document.querySelectorAll('.delete-consumo').forEach(btn => {
            btn.addEventListener('click', function () {
                const card = this.closest('.consumo-card');
                const id = card.getAttribute('data-id');
                eliminarConsumo(id);
            });
        });
    }

    // Editar consumo
    function editarConsumo(id) {
        const consumos = obtenerConsumos();
        const consumo = consumos.find(c => c.id === id);

        if (!consumo) return;

        // Rellenar formulario
        const descripcionInput = document.getElementById('consumo-descripcion');
        const montoInput = document.getElementById('consumo-monto');
        const notasInput = document.getElementById('consumo-notas');

        if (descripcionInput) descripcionInput.value = consumo.descripcion || '';
        if (montoInput) montoInput.value = consumo.monto || '';
        if (notasInput) notasInput.value = consumo.notas || '';

        // Actualizar estado
        editingId = id;

        // Cambiar texto del botón
        const submitBtn = consumoForm?.querySelector('.btn-primary');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Actualizar Consumo';
        }

        // Mostrar formulario
        showConsumoForm();
    }

    // Eliminar consumo
    function eliminarConsumo(id) {
        // Usar showConfirmationModal global si existe
        if (typeof showConfirmationModal === 'function') {
            showConfirmationModal(
                'Eliminar Consumo',
                '¿Estás seguro de que quieres eliminar este consumo? Esta acción no se puede deshacer.',
                'warning',
                function () {
                    eliminarConsumoConfirmada(id);
                }
            );
        } else {
            // Fallback a confirm nativo
            if (confirm('¿Estás seguro de que quieres eliminar este consumo?')) {
                eliminarConsumoConfirmada(id);
            }
        }
    }

    function eliminarConsumoConfirmada(id) {
        const consumos = obtenerConsumos();
        const nuevosConsumos = consumos.filter(c => c.id !== id);

        // Guardar usando StorageManager si existe, sino localStorage directo
        if (typeof StorageManager !== 'undefined') {
            StorageManager.saveConsumoData(nuevosConsumos);
        } else {
            localStorage.setItem('ipb_consumo_data', JSON.stringify(nuevosConsumos));
        }

        if (typeof showNotification === 'function') {
            showNotification('Consumo eliminado correctamente', 'success');
        }

        cargarConsumos();

        // Actualizar dashboard
        if (typeof window.updateSummary === 'function') {
            window.updateSummary();
        }
    }

    // Función para limpiar consumos del día (usada por el dashboard)
    window.resetConsumos = function () {
        const consumos = obtenerConsumos();
        const hoy = new Date().toISOString().split('T')[0];

        // Mantener solo consumos de otros días
        const nuevosConsumos = consumos.filter(c => c.fecha !== hoy);

        // Guardar usando StorageManager si existe, sino localStorage directo
        if (typeof StorageManager !== 'undefined') {
            StorageManager.saveConsumoData(nuevosConsumos);
        } else {
            localStorage.setItem('ipb_consumo_data', JSON.stringify(nuevosConsumos));
        }

        cargarConsumos();
    };

    // Exponer funciones globalmente
    window.cargarConsumos = cargarConsumos;
    window.getTotalConsumo = function () {
        const consumos = obtenerConsumos();
        const hoy = new Date().toISOString().split('T')[0];
        const consumosHoy = consumos.filter(c => c.fecha === hoy);

        return consumosHoy.reduce((sum, c) => sum + (parseFloat(c.monto) || 0), 0);
    };
});