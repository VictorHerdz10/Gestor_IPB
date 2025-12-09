// billetes.js - Sistema mejorado de contador de billetes
document.addEventListener('DOMContentLoaded', function () {
    // Elementos del DOM
    const guardarConteoBtn = document.getElementById('guardar-conteo');
    const limpiarConteoBtn = document.getElementById('limpiar-conteo');
    const nuevoRegistroBtn = document.getElementById('nuevo-registro');
    const listaRegistros = document.getElementById('lista-registros');
    const modal = document.getElementById('modal-registro');
    const modalClose = modal.querySelector('.modal-close');
    const modalDetalle = document.getElementById('modal-detalle');

    // Denominaciones con IDs de tasas específicas
    const denominacionesCUP = [
        { id: 'cup-1000', valor: 1000 },
        { id: 'cup-500', valor: 500 },
        { id: 'cup-200', valor: 200 },
        { id: 'cup-100', valor: 100 },
        { id: 'cup-50', valor: 50 },
        { id: 'cup-20', valor: 20 },
        { id: 'cup-10', valor: 10 },
        { id: 'cup-5', valor: 5 },
        { id: 'cup-3', valor: 3 },
        { id: 'cup-1', valor: 1 }
    ];

    const denominacionesUSD = [
        { id: 'usd-100', valor: 100, tasaId: 'tasa-usd-100' },
        { id: 'usd-50', valor: 50, tasaId: 'tasa-usd-50' },
        { id: 'usd-20', valor: 20, tasaId: 'tasa-usd-20' },
        { id: 'usd-10', valor: 10, tasaId: 'tasa-usd-10' },
        { id: 'usd-5', valor: 5, tasaId: 'tasa-usd-5' },
        { id: 'usd-1', valor: 1, tasaId: 'tasa-usd-1' }
    ];

    // Cargar datos
    loadBilletesData();
    loadRegistros();

    // Event listeners para inputs
    denominacionesCUP.forEach(billete => {
        const input = document.getElementById(billete.id);
        input.addEventListener('input', updateBilletesTotals);
    });

    denominacionesUSD.forEach(billete => {
        const input = document.getElementById(billete.id);
        input.addEventListener('input', updateBilletesTotals);
    });

    // Event listeners para tasas de cambio
    denominacionesUSD.forEach(billete => {
        const input = document.getElementById(billete.tasaId);
        input.addEventListener('change', updateBilletesTotals);
    });

    // Botón Guardar Conteo
    guardarConteoBtn.addEventListener('click', function () {
        guardarRegistro();
    });

    // Botón Limpiar Conteo
    limpiarConteoBtn.addEventListener('click', function () {
        showConfirmationModal(
            '¿Limpiar conteo actual?',
            'Esta acción reseteará todos los campos a cero. ¿Continuar?',
            'warning',
            limpiarConteo
        );
    });

    // Botón Nuevo Registro
    if (nuevoRegistroBtn) {
        nuevoRegistroBtn.addEventListener('click', function () {
            // Navegar a la sección de billetes
            document.querySelector('[data-section="billetes"]').click();
        });
    }

    // Modal events
    modalClose.addEventListener('click', closeModal);
    modal.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Función para calcular totales
    function updateBilletesTotals() {
        let totalCUP = 0;

        // Calcular total CUP
        denominacionesCUP.forEach(billete => {
            const input = document.getElementById(billete.id);
            const cantidad = parseInt(input.value) || 0;
            const total = cantidad * billete.valor;

            const totalElement = document.getElementById(`total-${billete.id}`);
            totalElement.textContent = `${total.toLocaleString('es-ES')} CUP`;

            totalCUP += total;
        });

        // Actualizar total CUP
        document.getElementById('total-cup').textContent = `${totalCUP.toLocaleString('es-ES')} CUP`;
        document.getElementById('resumen-total-cup').textContent = `${totalCUP.toLocaleString('es-ES')} CUP`;

        // Calcular total USD
        let totalUSD = 0;
        let totalUSDCUP = 0;

        denominacionesUSD.forEach(billete => {
            const input = document.getElementById(billete.id);
            const cantidad = parseInt(input.value) || 0;
            const total = cantidad * billete.valor;

            const totalElement = document.getElementById(`total-${billete.id}`);
            totalElement.textContent = `${total.toLocaleString('es-ES')} USD`;

            totalUSD += total;

            // Calcular en CUP con tasa específica
            const tasaInput = document.getElementById(billete.tasaId);
            const tasa = parseFloat(tasaInput.value) || 400;
            totalUSDCUP += total * tasa;
        });

        // Actualizar total USD
        document.getElementById('total-usd').textContent = `${totalUSD.toLocaleString('es-ES')} USD`;
        document.getElementById('total-usd-cup').textContent = `${totalUSDCUP.toLocaleString('es-ES')} CUP`;
        document.getElementById('resumen-total-usd-cup').textContent = `${totalUSDCUP.toLocaleString('es-ES')} CUP`;

        // Calcular gran total
        const granTotal = totalCUP + totalUSDCUP;
        document.getElementById('gran-total-cup').textContent = `${granTotal.toLocaleString('es-ES')} CUP`;
    }

    // Función para guardar registro
    function guardarRegistro() {
        const billetesCUP = {};
        const billetesUSD = {};
        const tasasUSD = {};

        // Obtener billetes CUP
        denominacionesCUP.forEach(billete => {
            const input = document.getElementById(billete.id);
            billetesCUP[billete.valor] = parseInt(input.value) || 0;
        });

        // Obtener billetes USD y tasas
        denominacionesUSD.forEach(billete => {
            const input = document.getElementById(billete.id);
            billetesUSD[billete.valor] = parseInt(input.value) || 0;

            const tasaInput = document.getElementById(billete.tasaId);
            tasasUSD[billete.valor] = parseFloat(tasaInput.value) || 400;
        });

        // Calcular totales
        let totalCUP = 0;
        denominacionesCUP.forEach(billete => {
            totalCUP += (billetesCUP[billete.valor] || 0) * billete.valor;
        });

        let totalUSDCUP = 0;
        denominacionesUSD.forEach(billete => {
            const cantidad = billetesUSD[billete.valor] || 0;
            const tasa = tasasUSD[billete.valor] || 400;
            totalUSDCUP += cantidad * billete.valor * tasa;
        });

        const granTotal = totalCUP + totalUSDCUP;

        // Crear registro
        const registro = {
            id: Date.now(),
            fecha: new Date().toISOString().split('T')[0],
            hora: new Date().toLocaleString('es-ES', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }),
            billetesCUP,
            billetesUSD,
            tasasUSD,
            totales: {
                totalCUP,
                totalUSDCUP,
                granTotal
            }
        };

        // Guardar en localStorage
        saveRegistro(registro);

        // Actualizar lista
        loadRegistros();

        // Mostrar notificación
        showNotification('Conteo guardado correctamente', 'success');

        // Opcional: limpiar después de guardar
        limpiarConteo();
    }

    // Función para guardar registro en localStorage
    function saveRegistro(registro) {
        let registros = [];
        const registrosData = localStorage.getItem('ipb_billetes_registros');

        if (registrosData) {
            try {
                registros = JSON.parse(registrosData);
            } catch (error) {
                console.error('Error al cargar registros:', error);
            }
        }

        registros.push(registro);
        localStorage.setItem('ipb_billetes_registros', JSON.stringify(registros));
    }

    // Función para cargar registros
    function loadRegistros() {
        const hoy = new Date().toISOString().split('T')[0];
        let registros = [];
        const registrosData = localStorage.getItem('ipb_billetes_registros');

        if (registrosData) {
            try {
                registros = JSON.parse(registrosData);
            } catch (error) {
                console.error('Error al cargar registros:', error);
            }
        }

        // Filtrar registros de hoy
        registros = registros.filter(r => r.fecha === hoy);

        // Actualizar UI
        if (registros.length === 0) {
            listaRegistros.innerHTML = '<p class="no-data">No hay registros de conteo hoy</p>';
        } else {
            let html = '';

            // Calcular totales del día
            let totalDiaCUP = 0;
            let totalDiaUSDCUP = 0;
            let totalDia = 0;

            registros.forEach(registro => {
                totalDiaCUP += registro.totales.totalCUP || 0;
                totalDiaUSDCUP += registro.totales.totalUSDCUP || 0;
                totalDia += registro.totales.granTotal || 0;

                html += `
                    <div class="registro-item" data-id="${registro.id}">
                        <div class="registro-info">
                            <div class="registro-hora">${registro.hora}</div>
                            <div class="registro-total">$${registro.totales.granTotal.toLocaleString('es-ES')} CUP</div>
                        </div>
                        <div class="registro-acciones">
                            <button class="btn-ver ver-registro" data-id="${registro.id}">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                            <button class="btn-eliminar eliminar-registro" data-id="${registro.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });

            listaRegistros.innerHTML = html;

            // Actualizar totales del día
            document.getElementById('total-registros-cup').textContent = `${totalDiaCUP.toLocaleString('es-ES')} CUP`;
            document.getElementById('total-registros-usd-cup').textContent = `${totalDiaUSDCUP.toLocaleString('es-ES')} CUP`;
            document.getElementById('total-registros-dia').textContent = `${totalDia.toLocaleString('es-ES')} CUP`;

            // Event listeners para botones
            document.querySelectorAll('.ver-registro').forEach(btn => {
                btn.addEventListener('click', function () {
                    const id = parseInt(this.getAttribute('data-id'));
                    verDetalleRegistro(id);
                });
            });

            document.querySelectorAll('.eliminar-registro').forEach(btn => {
                btn.addEventListener('click', function () {
                    const id = parseInt(this.getAttribute('data-id'));
                    eliminarRegistro(id);
                });
            });
        }
    }

    // Función para ver detalle de registro
    function verDetalleRegistro(id) {
        const registrosData = localStorage.getItem('ipb_billetes_registros');
        if (!registrosData) return;

        try {
            const registros = JSON.parse(registrosData);
            const registro = registros.find(r => r.id === id);

            if (!registro) return;

            // Generar HTML del detalle
            let html = `
                <div class="detalle-registro">
                    <div class="detalle-monedas">
                        <h4>Billetes CUP</h4>
                        <div class="detalle-billetes">
            `;

            // Mostrar billetes CUP
            Object.entries(registro.billetesCUP).sort((a, b) => b[0] - a[0]).forEach(([valor, cantidad]) => {
                if (cantidad > 0) {
                    const total = cantidad * valor;
                    html += `
                        <div class="detalle-billete">
                            <span>$${valor}: ${cantidad} billetes</span>
                            <span>$${total.toLocaleString('es-ES')} CUP</span>
                        </div>
                    `;
                }
            });

            html += `
                        </div>
                        <div class="detalle-total">
                            <span>Total CUP:</span>
                            <span>$${registro.totales.totalCUP.toLocaleString('es-ES')} CUP</span>
                        </div>
                    </div>
                    
                    <div class="detalle-monedas">
                        <h4>Billetes USD</h4>
                        <div class="detalle-billetes">
            `;

            // Mostrar billetes USD
            Object.entries(registro.billetesUSD).sort((a, b) => b[0] - a[0]).forEach(([valor, cantidad]) => {
                if (cantidad > 0) {
                    const totalUSD = cantidad * valor;
                    const tasa = registro.tasasUSD[valor] || 400;
                    const totalCUP = totalUSD * tasa;
                    html += `
                        <div class="detalle-billete">
                            <span>$${valor}: ${cantidad} billetes (tasa: ${tasa} CUP)</span>
                            <span>$${totalCUP.toLocaleString('es-ES')} CUP</span>
                        </div>
                    `;
                }
            });

            html += `
                        </div>
                        <div class="detalle-total">
                            <span>Total USD en CUP:</span>
                            <span>$${registro.totales.totalUSDCUP.toLocaleString('es-ES')} CUP</span>
                        </div>
                    </div>
                </div>
                
                <div class="detalle-resumen">
                    <h4>Resumen del Conteo</h4>
                    <div class="detalle-billete">
                        <span>Total CUP:</span>
                        <span>$${registro.totales.totalCUP.toLocaleString('es-ES')} CUP</span>
                    </div>
                    <div class="detalle-billete">
                        <span>Total USD en CUP:</span>
                        <span>$${registro.totales.totalUSDCUP.toLocaleString('es-ES')} CUP</span>
                    </div>
                    <div class="detalle-billete total">
                        <span>Gran Total:</span>
                        <span>$${registro.totales.granTotal.toLocaleString('es-ES')} CUP</span>
                    </div>
                    <div class="detalle-billete">
                        <span>Hora del registro:</span>
                        <span>${registro.hora}</span>
                    </div>
                </div>
            `;

            modalDetalle.innerHTML = html;
            modal.classList.add('active');
        } catch (error) {
            console.error('Error al cargar detalle:', error);
            showNotification('Error al cargar el detalle del registro', 'error');
        }
    }

    // Función para eliminar registro
    function eliminarRegistro(id) {
        showConfirmationModal(
            '¿Eliminar registro?',
            'Esta acción no se puede deshacer. ¿Continuar?',
            'warning',
            function () {
                const registrosData = localStorage.getItem('ipb_billetes_registros');
                if (!registrosData) return;

                try {
                    let registros = JSON.parse(registrosData);
                    registros = registros.filter(r => r.id !== id);
                    localStorage.setItem('ipb_billetes_registros', JSON.stringify(registros));

                    loadRegistros();
                    showNotification('Registro eliminado', 'success');
                } catch (error) {
                    console.error('Error al eliminar registro:', error);
                    showNotification('Error al eliminar el registro', 'error');
                }
            }
        );
    }

    // Función para limpiar conteo actual
    function limpiarConteo() {
        denominacionesCUP.forEach(billete => {
            const input = document.getElementById(billete.id);
            input.value = 0;
        });

        denominacionesUSD.forEach(billete => {
            const input = document.getElementById(billete.id);
            input.value = 0;
        });

        updateBilletesTotals();
    }

    // Función para cargar datos guardados (tasas)
    function loadBilletesData() {
        const data = localStorage.getItem('ipb_billetes_config');
        if (data) {
            try {
                const config = JSON.parse(data);

                // Cargar tasas de cambio
                denominacionesUSD.forEach(billete => {
                    const input = document.getElementById(billete.tasaId);
                    if (config.tasasUSD && config.tasasUSD[billete.valor]) {
                        input.value = config.tasasUSD[billete.valor];
                    }
                });

            } catch (error) {
                console.error('Error al cargar configuración:', error);
            }
        }
    }

    // Función para guardar configuración (tasas)
    function saveBilletesConfig() {
        const config = {
            tasasUSD: {}
        };

        denominacionesUSD.forEach(billete => {
            const input = document.getElementById(billete.tasaId);
            config.tasasUSD[billete.valor] = parseFloat(input.value) || 400;
        });

        localStorage.setItem('ipb_billetes_config', JSON.stringify(config));
    }

    // Guardar configuración al cambiar tasas
    denominacionesUSD.forEach(billete => {
        const input = document.getElementById(billete.tasaId);
        input.addEventListener('change', saveBilletesConfig);
    });

    // Función para resetear (nuevo día)
    window.resetBilletes = function () {
        limpiarConteo();

        // Resetear tasas a valores por defecto
        document.getElementById('tasa-usd-1').value = 400;
        document.getElementById('tasa-usd-5').value = 440;
        document.getElementById('tasa-usd-10').value = 440;
        document.getElementById('tasa-usd-20').value = 440;
        document.getElementById('tasa-usd-50').value = 440;
        document.getElementById('tasa-usd-100').value = 440;

        saveBilletesConfig();
        updateBilletesTotals();
    };

    // Función para cerrar modal
    function closeModal() {
        modal.classList.remove('active');
    }

    // Inicializar
    updateBilletesTotals();

    // FUNCIONES DE UI REUTILIZABLES (añadir al final del archivo)

    // Función para mostrar notificaciones
    function showNotification(message, type = 'info') {
        // Primero intentar usar la función de dashboard si existe
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button class="notification-close"><i class="fas fa-times"></i></button>
        `;

        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', function () {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        });

        // Auto-eliminar después de 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);

        document.body.appendChild(notification);

        // Animación de salida
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    // Función para mostrar modal de confirmación personalizado
    function showConfirmationModal(title, message, type = 'info', confirmCallback) {
        // Primero intentar usar la función de dashboard si existe
        if (typeof window.showConfirmationModal === 'function') {
            window.showConfirmationModal(title, message, type, confirmCallback);
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'confirmation-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="modal-icon ${type}">
                        <i class="fas fa-${type === 'warning' ? 'exclamation-triangle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                    </div>
                    <p>${message}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary cancel-btn">Cancelar</button>
                    <button class="btn btn-primary confirm-btn">Confirmar</button>
                </div>
            </div>
        `;

        // Estilos para el modal
        const style = document.createElement('style');
        style.textContent = `
            .confirmation-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 2000;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease-out;
            }
            
            .modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(5px);
            }
            
            .modal-content {
                background: white;
                border-radius: 15px;
                width: 90%;
                max-width: 400px;
                z-index: 2001;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                animation: slideInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.5rem;
                border-bottom: 1px solid var(--gray-light);
            }
            
            .modal-header h3 {
                color: var(--secondary-color);
                font-size: 1.3rem;
            }
            
            .modal-close {
                background: none;
                border: none;
                color: var(--gray-medium);
                font-size: 1.2rem;
                cursor: pointer;
                padding: 0.5rem;
                transition: var(--transition);
            }
            
            .modal-close:hover {
                color: var(--danger-color);
            }
            
            .modal-body {
                padding: 2rem 1.5rem;
                text-align: center;
            }
            
            .modal-icon {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 1.5rem;
                font-size: 2rem;
            }
            
            .modal-icon.warning {
                background-color: rgba(247, 37, 133, 0.1);
                color: var(--warning-color);
            }
            
            .modal-icon.error {
                background-color: rgba(239, 35, 60, 0.1);
                color: var(--danger-color);
            }
            
            .modal-icon.info {
                background-color: rgba(67, 97, 238, 0.1);
                color: var(--primary-color);
            }
            
            .modal-body p {
                color: var(--dark-color);
                line-height: 1.6;
                font-size: 1.1rem;
            }
            
            .modal-footer {
                display: flex;
                gap: 1rem;
                padding: 1.5rem;
                border-top: 1px solid var(--gray-light);
            }
            
            .modal-footer .btn {
                flex: 1;
            }
            
            @keyframes slideInUp {
                from {
                    opacity: 0;
                    transform: translateY(50px) scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(modal);

        // Event listeners para el modal
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('.cancel-btn').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('.confirm-btn').addEventListener('click', () => {
            confirmCallback();
            modal.remove();
        });

        // Cerrar al hacer clic fuera
        modal.querySelector('.modal-overlay').addEventListener('click', () => {
            modal.remove();
        });
    }
});