document.addEventListener('DOMContentLoaded', function () {
    // Elementos del DOM
    const sectionTitle = document.getElementById('section-title');
    const currentDate = document.getElementById('current-date');
    const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
    const contentSections = document.querySelectorAll('.content-section');
    const newDayBtn = document.getElementById('new-day-btn');
    const saveBtn = document.getElementById('save-btn');
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const logoutBtn = document.getElementById('logout-btn');

    // Establecer fecha actual
    const today = new Date();
    const formattedDate = today.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    currentDate.textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

    // Navegación entre secciones
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();

            sidebarLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            const sectionId = this.getAttribute('data-section');
            const sectionText = this.querySelector('span').textContent;
            sectionTitle.textContent = sectionText;

            contentSections.forEach(section => {
                section.classList.remove('active');
            });

            const targetSection = document.getElementById(`${sectionId}-section`);
            if (targetSection) {
                targetSection.classList.add('active');
                targetSection.classList.add('slide-in-right');

                setTimeout(() => {
                    targetSection.classList.remove('slide-in-right');
                }, 500);
            }

            // Cerrar sidebar en móviles
            if (window.innerWidth <= 1900) {
                sidebar.classList.remove('active');
            }
        });
    });

    // Botón Nuevo Día
    if (newDayBtn) {
        newDayBtn.addEventListener('click', function () {
            showConfirmationModal(
                '¿Comenzar nuevo día?',
                'Esto reseteará todos los registros del día actual (incluyendo el contador de billetes y efectivo). ¿Estás seguro?',
                'warning',
                resetDay
            );
        });
    }

    // Botón Guardar
    if (saveBtn) {
        saveBtn.addEventListener('click', function () {
            saveAllData();
            showNotification('Datos guardados correctamente', 'success');
        });
    }

    // Botón Salir con confirmación
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            showConfirmationModal(
                '¿Salir del Dashboard?',
                'Se cerrará la sesión y volverás a la página principal.',
                'info',
                function () {
                    window.location.href = 'index.html';
                }
            );
        });
    }

    // Toggle del sidebar
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            toggleSidebar();
        });
    }

    // Botón móvil en top bar
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function () {
            toggleSidebar();
        });
    }

    function toggleSidebar() {
        sidebar.classList.toggle('active');
        if (sidebarToggle) {
            sidebarToggle.innerHTML = sidebar.classList.contains('active') 
                ? '<i class="fas fa-times"></i>' 
                : '<i class="fas fa-bars"></i>';
        }
    }

    // Cerrar sidebar al hacer clic fuera en móviles
    mainContent.addEventListener('click', function (e) {
        if (window.innerWidth <= 768 &&
            sidebar.classList.contains('active') &&
            !e.target.closest('.sidebar') &&
            !e.target.closest('.mobile-menu-toggle') &&
            !e.target.closest('.sidebar-toggle')) {
            closeSidebarMobile();
        }
    });

    function closeSidebarMobile() {
        sidebar.classList.remove('active');
        if (sidebarToggle) {
            sidebarToggle.innerHTML = '<i class="fas fa-bars"></i>';
        }
    }

    // Actualizar resumen
    function updateSummary() {
        // Obtener datos
        const salonData = StorageManager.getSalonData();
        const cocinaData = StorageManager.getCocinaData();
        const consumoData = StorageManager.getConsumoData();
        const extraccionesData = StorageManager.getExtraccionesData();
        const transferenciasData = StorageManager.getTransferenciasData();
        const efectivoData = getEfectivoData();

        // Calcular ventas
        let ventasSalon = 0;
        let ventasCocina = 0;

        salonData.forEach(item => {
            if (item.importe) ventasSalon += parseFloat(item.importe) || 0;
        });

        cocinaData.forEach(item => {
            if (item.importe) ventasCocina += parseFloat(item.importe) || 0;
        });

        const ventasTotal = ventasSalon + ventasCocina;

        // Calcular dinero real
        let consumoTotal = 0;
        let extraccionesTotal = 0;
        let transferenciasTotal = 0;
        let efectivoTotal = 0;

        consumoData.forEach(item => {
            consumoTotal += parseFloat(item.monto) || 0;
        });

        extraccionesData.forEach(item => {
            extraccionesTotal += parseFloat(item.monto) || 0;
        });

        transferenciasData.forEach(item => {
            transferenciasTotal += parseFloat(item.monto) || 0;
        });

        efectivoData.forEach(item => {
            efectivoTotal += parseFloat(item.monto) || 0;
        });

        const dineroReal = consumoTotal + extraccionesTotal + transferenciasTotal + efectivoTotal;
        const diferencia = dineroReal - ventasTotal;

        // Calcular 1% del dinero real (redondeado al entero más cercano)
        const porciento = Math.floor(dineroReal * 0.01);

        // Actualizar UI
        document.getElementById('total-ventas').textContent = `$${ventasTotal.toFixed(2)}`;
        document.getElementById('dinero-real').textContent = `$${dineroReal.toFixed(2)}`;
        document.getElementById('porciento-ventas').textContent = `$${porciento.toFixed(2)}`;

        const diferenciaElement = document.getElementById('diferencia');
        const diferenciaDesc = document.getElementById('diferencia-desc');
        const porcientoDesc = document.getElementById('porciento-desc');

        diferenciaElement.textContent = `$${Math.abs(diferencia).toFixed(2)}`;

        if (diferencia > 0) {
            diferenciaElement.className = 'amount positive';
            diferenciaDesc.textContent = 'Sobrante';
            diferenciaDesc.style.color = 'var(--success-color)';
        } else if (diferencia < 0) {
            diferenciaElement.className = 'amount negative';
            diferenciaDesc.textContent = 'Faltante';
            diferenciaDesc.style.color = 'var(--danger-color)';
        } else {
            diferenciaElement.className = 'amount';
            diferenciaDesc.textContent = 'Sin diferencias';
            diferenciaDesc.style.color = 'var(--gray-medium)';
        }

        porcientoDesc.textContent = `1% de $${dineroReal.toFixed(2)}`;

        // Actualizar detalles
        document.getElementById('ventas-salon').textContent = `$${ventasSalon.toFixed(2)}`;
        document.getElementById('ventas-cocina').textContent = `$${ventasCocina.toFixed(2)}`;
        document.getElementById('ventas-total').textContent = `$${ventasTotal.toFixed(2)}`;
        document.getElementById('consumo-total').textContent = `$${consumoTotal.toFixed(2)}`;
        document.getElementById('extracciones-total').textContent = `$${extraccionesTotal.toFixed(2)}`;
        document.getElementById('transferencias-total').textContent = `$${transferenciasTotal.toFixed(2)}`;
        document.getElementById('efectivo-total').textContent = `$${efectivoTotal.toFixed(2)}`;
        document.getElementById('dinero-real-detalle').textContent = `$${dineroReal.toFixed(2)}`;

        // Actualizar resumen de billetes si existe
        updateBilletesResumen();
    }

    // Función para obtener datos de efectivo
    function getEfectivoData() {
        const data = localStorage.getItem('ipb_efectivo_data');
        if (data) {
            try {
                return JSON.parse(data);
            } catch (error) {
                console.error('Error al cargar datos de efectivo:', error);
                return [];
            }
        }
        return [];
    }

    // Actualizar resumen de billetes en la sección resumen
    function updateBilletesResumen() {
        const registros = getBilletesRegistros();

        if (registros.length > 0) {
            const resumenCard = document.getElementById('billetes-resumen-card');
            const detalleContainer = document.getElementById('billetes-resumen-detalle');
            const totalElement = document.getElementById('total-billetes-resumen');

            resumenCard.style.display = 'block';

            // Calcular totales de todos los registros
            let totalCUP = 0;
            let totalUSDCUP = 0;

            registros.forEach(registro => {
                totalCUP += registro.totales.totalCUP || 0;
                totalUSDCUP += registro.totales.totalUSDCUP || 0;
            });

            const granTotal = totalCUP + totalUSDCUP;

            // Mostrar último registro como ejemplo
            const ultimoRegistro = registros[registros.length - 1];
            let html = `
                <div class="detalle-item">
                    <span>Último conteo (${ultimoRegistro.hora}):</span>
                    <span>$${granTotal.toLocaleString('es-ES')} CUP</span>
                </div>
                <div class="detalle-item">
                    <span>Total registros hoy:</span>
                    <span>${registros.length}</span>
                </div>
            `;

            detalleContainer.innerHTML = html;
            totalElement.textContent = `$${granTotal.toLocaleString('es-ES')} CUP`;
        }
    }

    // Función para obtener registros de billetes
    function getBilletesRegistros() {
        const hoy = today.toISOString().split('T')[0];
        const data = localStorage.getItem('ipb_billetes_registros');
        if (data) {
            try {
                const registros = JSON.parse(data);
                return registros.filter(r => r.fecha === hoy);
            } catch (error) {
                console.error('Error al cargar registros de billetes:', error);
                return [];
            }
        }
        return [];
    }

    function resetDay() {
        // Guardar productos actuales ANTES de limpiar
        const salonData = StorageManager.getSalonData();
        const cocinaData = StorageManager.getCocinaData();

        // Filtrar para mantener solo los productos (sin importe/contador)
        const productosSalon = salonData.map(item => {
            return {
                descripcion: item.descripcion || '',
                // Mantener solo los campos del producto, eliminar datos del día
                importe: 0,
                cantidad: 0
            };
        });

        const productosCocina = cocinaData.map(item => {
            return {
                descripcion: item.descripcion || '',
                importe: 0,
                cantidad: 0
            };
        });

        // Ahora limpiar los datos del día
        StorageManager.clearDailyData();

        // Restaurar los productos (solo estructura) con valores en 0
        localStorage.setItem('ipb_salon_data', JSON.stringify(productosSalon));
        localStorage.setItem('ipb_cocina_data', JSON.stringify(productosCocina));

        // Resetear contador de billetes
        if (typeof window.resetBilletes === 'function') {
            window.resetBilletes();
        }

        // Resetear efectivo
        if (typeof window.resetEfectivo === 'function') {
            window.resetEfectivo();
        }

        // Resetear registros de billetes del día
        const hoy = today.toISOString().split('T')[0];
        const registrosData = localStorage.getItem('ipb_billetes_registros');
        if (registrosData) {
            try {
                let registros = JSON.parse(registrosData);
                registros = registros.filter(r => r.fecha !== hoy);
                localStorage.setItem('ipb_billetes_registros', JSON.stringify(registros));
            } catch (error) {
                console.error('Error al resetear registros:', error);
            }
        }

        // Resetear efectivo
        localStorage.setItem('ipb_efectivo_data', JSON.stringify([]));

        updateSummary();
        showNotification('Nuevo día iniciado. Los productos se mantienen, valores reiniciados.', 'success');

        localStorage.setItem('ipb_last_reset', hoy);
    }

    function saveAllData() {
        const data = {
            lastSaved: new Date().toISOString(),
            summary: {
                ventasTotal: parseFloat(document.getElementById('total-ventas').textContent.replace('$', '') || 0),
                dineroReal: parseFloat(document.getElementById('dinero-real').textContent.replace('$', '') || 0),
                porcientoVentas: parseFloat(document.getElementById('porciento-ventas').textContent.replace('$', '') || 0)
            }
        };

        StorageManager.saveDailyData(data);
    }


    // Inicializar
    updateSummary();

    // Verificar si es un nuevo día
    const lastReset = localStorage.getItem('ipb_last_reset');
    const todayStr = today.toISOString().split('T')[0];

    if (lastReset !== todayStr) {
        setTimeout(() => {
            showConfirmationModal(
                'Nuevo día detectado',
                'Parece que es un nuevo día. ¿Quieres iniciar un nuevo registro?',
                'info',
                resetDay
            );
        }, 1000);
    }

    // Actualizar resumen periódicamente
    setInterval(updateSummary, 30000);

    // Ajustar responsive
    function adjustResponsive() {
        if (window.innerWidth <= 768) {
            if (sidebarToggle) {
                sidebarToggle.style.display = 'flex';
            }
            if (mobileMenuToggle) {
                mobileMenuToggle.style.display = 'flex';
            }
        } else {
            if (sidebarToggle) {
                sidebarToggle.style.display = 'none';
            }
            if (mobileMenuToggle) {
                mobileMenuToggle.style.display = 'none';
            }
        }
    }

    adjustResponsive();
    window.addEventListener('resize', adjustResponsive);
});

// Funciones auxiliares (mantener showNotification y showConfirmationModal)
function showNotification(message, type = 'info') {
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

    const style = document.createElement('style');
    style.textContent = `
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
    document.head.appendChild(style);
}

function showConfirmationModal(title, message, type, confirmCallback) {
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
                        <i class="fas fa-${type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
                    </div>
                    <p>${message}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary cancel-btn">Cancelar</button>
                    <button class="btn btn-primary confirm-btn">Confirmar</button>
                </div>
            </div>
        `;

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

    modal.querySelector('.modal-overlay').addEventListener('click', () => {
        modal.remove();
    });
}

window.showConfirmationModal = showConfirmationModal;
window.showNotification = showNotification;