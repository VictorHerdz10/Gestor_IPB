// efectivo.js - Sistema de gestión de efectivo
document.addEventListener('DOMContentLoaded', function () {
    // Elementos del DOM
    const montoEfectivo = document.getElementById('monto-efectivo');
    const agregarEfectivoBtn = document.getElementById('agregar-efectivo');
    const listaEfectivo = document.getElementById('lista-efectivo');
    const totalEfectivoHoy = document.getElementById('total-efectivo-hoy');

    // Cargar datos
    loadEfectivoData();

    // Event listener para agregar efectivo
    agregarEfectivoBtn.addEventListener('click', agregarEfectivo);

    // Permitir Enter para agregar
    montoEfectivo.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            agregarEfectivo();
        }
    });

    // Función para agregar efectivo
    function agregarEfectivo() {
        const monto = parseFloat(montoEfectivo.value);

        if (!monto || monto <= 0) {
            showNotification('Por favor ingrese un monto válido', 'error');
            return;
        }

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
            monto: monto
        };

        // Guardar en localStorage
        saveEfectivoRegistro(registro);

        // Actualizar UI
        loadEfectivoData();

        // Limpiar input
        montoEfectivo.value = '';

        // Enfocar input
        montoEfectivo.focus();

        // Mostrar notificación
        showNotification(`Efectivo agregado: $${monto.toFixed(2)}`, 'success');
    }

    // Función para guardar registro
    function saveEfectivoRegistro(registro) {
        let registros = [];
        const registrosData = localStorage.getItem('ipb_efectivo_data');

        if (registrosData) {
            try {
                registros = JSON.parse(registrosData);
            } catch (error) {
                console.error('Error al cargar registros de efectivo:', error);
            }
        }

        registros.push(registro);
        localStorage.setItem('ipb_efectivo_data', JSON.stringify(registros));
    }

    // Función para cargar datos
    function loadEfectivoData() {
        const hoy = new Date().toISOString().split('T')[0];
        let registros = [];
        const registrosData = localStorage.getItem('ipb_efectivo_data');

        if (registrosData) {
            try {
                registros = JSON.parse(registrosData);
            } catch (error) {
                console.error('Error al cargar registros de efectivo:', error);
            }
        }

        // Filtrar registros de hoy
        registros = registros.filter(r => r.fecha === hoy);

        // Calcular total
        let total = 0;

        // Actualizar UI
        if (registros.length === 0) {
            listaEfectivo.innerHTML = '<p class="no-data">No hay registros de efectivo hoy</p>';
        } else {
            let html = '';

            registros.forEach(registro => {
                total += registro.monto;

                html += `
                    <div class="efectivo-item" data-id="${registro.id}">
                        <div class="efectivo-info">
                            <div class="monto">$${registro.monto.toFixed(2)}</div>
                            <div class="hora">${registro.hora}</div>
                        </div>
                        <button class="eliminar" data-id="${registro.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
            });

            listaEfectivo.innerHTML = html;

            // Event listeners para botones eliminar
            listaEfectivo.querySelectorAll('.eliminar').forEach(btn => {
                btn.addEventListener('click', function () {
                    const id = parseInt(this.getAttribute('data-id'));
                    eliminarEfectivoRegistro(id);
                });
            });
        }

        // Actualizar total
        totalEfectivoHoy.textContent = `$${total.toFixed(2)}`;
    }

    // Función para eliminar registro
    function eliminarEfectivoRegistro(id) {
        showConfirmationModal(
            '¿Eliminar registro de efectivo?',
            'Esta acción no se puede deshacer. ¿Continuar?',
            'warning',
            function () {
                const registrosData = localStorage.getItem('ipb_efectivo_data');
                if (!registrosData) return;

                try {
                    let registros = JSON.parse(registrosData);
                    registros = registros.filter(r => r.id !== id);
                    localStorage.setItem('ipb_efectivo_data', JSON.stringify(registros));

                    loadEfectivoData();
                    showNotification('Registro eliminado', 'success');
                } catch (error) {
                    console.error('Error al eliminar registro:', error);
                    showNotification('Error al eliminar el registro', 'error');
                }
            }
        );
    }

    // Función para resetear (nuevo día)
    window.resetEfectivo = function () {
        const hoy = new Date().toISOString().split('T')[0];
        const registrosData = localStorage.getItem('ipb_efectivo_data');

        if (registrosData) {
            try {
                let registros = JSON.parse(registrosData);
                registros = registros.filter(r => r.fecha !== hoy);
                localStorage.setItem('ipb_efectivo_data', JSON.stringify(registros));
            } catch (error) {
                console.error('Error al resetear efectivo:', error);
            }
        }

        loadEfectivoData();
    };

    // Función para obtener total de efectivo
    window.getTotalEfectivo = function () {
        const hoy = new Date().toISOString().split('T')[0];
        const registrosData = localStorage.getItem('ipb_efectivo_data');

        if (!registrosData) return 0;

        try {
            const registros = JSON.parse(registrosData);
            const registrosHoy = registros.filter(r => r.fecha === hoy);

            return registrosHoy.reduce((total, registro) => total + registro.monto, 0);
        } catch (error) {
            console.error('Error al calcular total de efectivo:', error);
            return 0;
        }
    };

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

    // Inicializar cuando se muestra la sección
    function initEfectivo() {
        loadEfectivoData();

    }

    // Inicializar si ya estamos en la sección de efectivo
    const efectivoSection = document.getElementById('efectivo-section');
    if (efectivoSection && efectivoSection.classList.contains('active')) {
        setTimeout(initEfectivo, 100);
    }

    // Inicializar cuando se haga clic en el enlace del sidebar
    document.addEventListener('click', function (e) {
        const link = e.target.closest('a[data-section="efectivo"]');
        if (link) {
            setTimeout(initEfectivo, 100);
        }
    });

    // Función para forzar inicialización desde fuera
    window.initEfectivo = initEfectivo;
});