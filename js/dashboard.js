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

    // Verificar parámetros de URL
    const urlParams = new URLSearchParams(window.location.search);
    const fileUrl = urlParams.get('file') || urlParams.get('url') || urlParams.get('uri');

    if (fileUrl) {
        console.log('📂 Archivo detectado en dashboard:', fileUrl);

        // Esperar a que backupManager esté listo
        const waitForBackupManager = setInterval(() => {
            if (window.backupManager && window.backupManager.handleFileOpen) {
                clearInterval(waitForBackupManager);

                // Decodificar URL si es necesario
                const decodedUrl = decodeURIComponent(fileUrl);
                console.log('🔄 Procesando archivo en dashboard:', decodedUrl);

                // Procesar el archivo
                window.backupManager.handleFileOpen(decodedUrl);

                // Limpiar la URL para no procesar de nuevo
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }, 100);
    }

    // También verificar sessionStorage
    const pendingFile = sessionStorage.getItem('pending_backup_file');
    if (pendingFile) {
        console.log('📂 Archivo pendiente en sessionStorage:', pendingFile);

        setTimeout(() => {
            if (window.backupManager && window.backupManager.handleFileOpen) {
                window.backupManager.handleFileOpen(pendingFile);
                sessionStorage.removeItem('pending_backup_file');
            }
        }, 500);
    }

    // Configurar listener para mensajes
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'FILE_TO_OPEN') {
            console.log('📤 Archivo recibido en dashboard via message:', event.data.fileUrl);

            if (window.backupManager && window.backupManager.handleFileOpen) {
                window.backupManager.handleFileOpen(event.data.fileUrl);
            }
        }
    });

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
        sidebarToggle.addEventListener('click', function () {
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

        // Obtener ventas de cocina usando la función global
        if (typeof window.getCocinaVentasTotal === 'function') {
            ventasCocina = window.getCocinaVentasTotal();
        } else {
            // Si no existe la función, calcular manualmente desde localStorage
            const today = new Date().toISOString().split('T')[0];
            const agregosDataKey = `cocina_agregos`;
            const agregosData = JSON.parse(localStorage.getItem(agregosDataKey) || '[]');

            // Sumar productos
            cocinaData.forEach(item => {
                if (item.importe) ventasCocina += parseFloat(item.importe) || 0;
            });

            // Sumar agregos
            agregosData.forEach(agrego => {
                if (agrego.montoTotal) ventasCocina += parseFloat(agrego.montoTotal) || 0;
            });
        }

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
        const dineroAporcentuar = ventasTotal - consumoTotal;
        const dineroAporcentuarConFlatante = dineroReal - consumoTotal;

        // Calcular cada 10000 el porciento seria 100 ese es el calculo abajo q necesito
        const porcientoSobrante = Math.floor(dineroAporcentuar / 10000) * 100;
        const porcientoFaltante = Math.floor(dineroAporcentuarConFlatante / 10000) * 100;

        // Actualizar UI
        document.getElementById('total-ventas').textContent = `$${ventasTotal.toFixed(2)}`;
        document.getElementById('dinero-real').textContent = `$${dineroReal.toFixed(2)}`;
        document.getElementById('porciento-ventas').textContent = diferencia > 0 ? `$${porcientoSobrante.toFixed(2)}` : `$${porcientoFaltante.toFixed(2)}`;

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

        porcientoDesc.textContent = diferencia > 0 ? `Calculado de (Ventas Totales - consumo), $100 cada $10000 de $${dineroAporcentuar.toFixed(2)}` : `Calculado de (Dinero Real - consumo), $100 cada $10000 de $${dineroAporcentuarConFlatante.toFixed(2)}`;

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
        // Actualizar ganancias si están disponibles
        if (window.gananciasManager) {
            const ganancias = window.gananciasManager.calcularGanancias();
            if (ganancias) {
                // Actualizar card de ganancias en el resumen
                let gananciasCard = document.querySelector('.summary-card .ganancias-info');
                if (!gananciasCard) {
                    // Crear card si no existe
                    const summaryCards = document.querySelector('.summary-cards');
                    if (summaryCards) {
                        const nuevaCard = document.createElement('div');
                        nuevaCard.className = 'summary-card';
                        nuevaCard.innerHTML = `
                        <div class="card-header">
                            <h3>Ganancias Netas</h3>
                            <i class="fas fa-money-bill-wave"></i>
                        </div>
                        <div class="card-body ganancias-info">
                            <p class="amount ${ganancias.gananciaNeta >= 0 ? 'positive' : 'negative'}" id="dashboard-ganancia-neta">$${ganancias.gananciaNeta.toFixed(2)}</p>
                            <p class="description">Después de costos y gastos</p>
                        </div>
                    `;
                        summaryCards.appendChild(nuevaCard);
                    }
                } else {
                    const gananciaElement = document.getElementById('dashboard-ganancia-neta');
                    if (gananciaElement) {
                        gananciaElement.textContent = `$${ganancias.gananciaNeta.toFixed(2)}`;
                        gananciaElement.className = `amount ${ganancias.gananciaNeta >= 0 ? 'positive' : 'negative'}`;
                    }
                }
            }
        }

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
                    <span>Total registros:</span>
                    <span>${registros.length}</span>
                </div>
            `;

            detalleContainer.innerHTML = html;
            totalElement.textContent = `$${granTotal.toLocaleString('es-ES')} CUP`;
        }
    }

    // Función para obtener registros de billetes
    function getBilletesRegistros() {
        const data = localStorage.getItem('ipb_billetes_registros');
        if (data) {
            try {
                const registros = JSON.parse(data);
                return registros;
            } catch (error) {
                console.error('Error al cargar registros de billetes:', error);
                return [];
            }
        }
        return [];
    }

    // dashboard.js - Función resetDay SIMPLIFICADA
    async function resetDay() {
        try {
            // 1. CONFIRMACIÓN SIMPLE
            const confirmacion = await showConfirmationModalPromise(
                'Reiniciar Día',
                '¿Estas seguro de que quieres reiniciar el día? Los finales se guardarán como inicios del nuevo día.',
                'warning'
            );

            if (!confirmacion) return;

            showNotification('⏳ Procesando cierre del día...', 'info');

            // 2. ASEGURAR QUE HISTORIAL ESTÉ DISPONIBLE
            let historialDisponible = false;
            let historialInstancia = null;

            try {
                historialInstancia = await asegurarHistorialDisponible();
                historialDisponible = true;
                console.log('✅ Historial disponible para guardar reporte');
            } catch (error) {
                console.warn('⚠️ Historial no disponible:', error.message);
                historialDisponible = false;
            }

            // 3. GUARDAR REPORTE FINAL EN HISTORIAL (si está disponible)
            if (historialDisponible && historialInstancia) {
                try {
                    const reporte = await historialInstancia.guardarReporteActual('Reporte Final del Día');
                    if (!reporte) {
                        showNotification('⚠️ No se pudo guardar el reporte final (posible duplicado)', 'warning');
                    } else {
                        showNotification('✅ Reporte final guardado en historial', 'success');
                    }
                } catch (error) {
                    console.error('Error guardando reporte:', error);
                    showNotification('⚠️ Error al guardar reporte en historial', 'warning');
                }
            } else {
                showNotification('ℹ️ Historial no disponible, continuando sin guardar reporte', 'info');
            }

            // 3. OBTENER DATOS ACTUALES
            const salonData = StorageManager.getSalonData();
            const cocinaData = StorageManager.getCocinaData();
            const productosSalon = StorageManager.getProducts();
            const productosCocina = StorageManager.getCocinaProducts();

            // 4. CREAR NUEVOS DATOS CON FINALES COMO INICIOS
            const newSalonData = salonData.map(producto => {
                const productoBase = productosSalon.find(p => p.id === producto.id) || {};

                return {
                    id: producto.id,
                    nombre: productoBase.nombre || producto.nombre,
                    precio: productoBase.precio || producto.precio,
                    inicio: producto.final,
                    entrada: 0,
                    venta: producto.final,
                    final: producto.final,
                    finalEditado: false,
                    vendido: 0,
                    importe: 0,
                    historial: [],
                    ultimaActualizacion: obtenerHoraActual()
                };
            });

            const newCocinaData = cocinaData.map(producto => {
                const productoBase = productosCocina.find(p => p.id === producto.id) || {};

                return {
                    id: producto.id,
                    nombre: productoBase.nombre || producto.nombre,
                    precio: productoBase.precio || producto.precio,
                    esIngrediente: (productoBase.precio === 0) || (producto.esIngrediente || false),
                    inicio: producto.final,
                    entrada: 0,
                    venta: producto.final,
                    final: producto.final,
                    vendido: 0,
                    importe: 0,
                    disponible: producto.final,
                    historial: [],
                    ultimaActualizacion: obtenerHoraActual(),
                    finalEditado: false
                };
            });

            // 5. GUARDAR DATOS PRINCIPALES
            StorageManager.saveSalonData(newSalonData);
            StorageManager.saveCocinaData(newCocinaData);

            // 6. LIMPIAR DATOS TRANSACCIONALES
            const datosParaLimpiar = [
                'ipb_precios_compra',
                'ipb_gastos_extras',
                'ipb_billetes_registros',
                'ipb_billetes_config',
                'ipb_consumo_data',
                'ipb_transferencias_data',
                'ipb_extracciones',
                'ipb_efectivo_data',
                'cocina_agregos',
                'ipb_daily_data',
                'ipb_today_transactions',
                'ipb_today_summary'
            ];

            datosParaLimpiar.forEach(key => {
                localStorage.removeItem(key);
            });

            // 7. LLAMAR RESET ESPECÍFICOS
            if (typeof window.resetBilletes === 'function') window.resetBilletes();
            if (typeof window.resetEfectivo === 'function') window.resetEfectivo();
            if (typeof window.resetExtraccionesDia === 'function') window.resetExtraccionesDia();
            if (typeof window.gananciasManager?.resetDia === 'function') {
                window.gananciasManager.resetDia();
            }

            // 8. GUARDAR FECHA DEL RESET
            const hoy = new Date().toISOString().split('T')[0];
            localStorage.setItem('ipb_last_reset', hoy);

            // 9. RECARGAR MÓDULOS
            setTimeout(() => {
                if (typeof window.resetSalonDia === 'function') window.resetSalonDia();
                else if (typeof window.cargarSalonData === 'function') window.cargarSalonData();

                if (typeof window.resetCocinaDia === 'function') window.resetCocinaDia();
                else if (typeof window.cargarDatosCocina === 'function') window.cargarDatosCocina();

                if (typeof window.productManager?.renderProducts === 'function') window.productManager.renderProducts();
                if (typeof window.cargarConsumos === 'function') window.cargarConsumos();
                if (typeof window.cargarTransferencias === 'function') window.cargarTransferencias();
                if (typeof window.reloadExtraccionesData === 'function') window.reloadExtraccionesData();
                else if (typeof window.initExtracciones === 'function') window.initExtracciones();

                if (typeof window.updateSummary === 'function') window.updateSummary();
            }, 500);

            // 10. NOTIFICACIÓN FINAL
            setTimeout(() => {
                showNotification(`
            🎉 NUEVO DÍA INICIADO<br>
            <br>
            📊 <strong>Resumen:</strong><br>
            • Salón: ${newSalonData.length} productos reseteados<br>
            • Cocina: ${newCocinaData.length} productos reseteados<br>
            • Inicios: Finales del día anterior<br>
            • Ventas: Inicios (porque entrada=0)<br>
            • Finales: Igual a inicios<br>
            • Vendidos: CERO (reiniciado)<br>
            • Importe: CERO (reiniciado)<br>
            <br>
            🔄 Recargando sistema...
        `, 'success');
            }, 1000);

        } catch (error) {
            console.error('Error al reiniciar día:', error);
            showNotification('Error al reiniciar día', 'error');
        }
    }

    // Función auxiliar para confirmación simple
    function showConfirmationModalPromise(title, message, type = 'warning') {
        return new Promise((resolve) => {
            if (typeof window.showConfirmationModal === 'function') {
                window.showConfirmationModal(
                    title,
                    message,
                    type,
                    () => resolve(true),
                    () => resolve(false)
                );
            } else {
                resolve(confirm(`${title}\n\n${message}`));
            }
        });
    }

    // Función para obtener hora actual
    function obtenerHoraActual() {
        const now = new Date();
        return now.toLocaleString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    // Función auxiliar para mostrar notificaciones
    function showNotification(message, type = 'info') {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }

        // Fallback básico
        const notification = document.createElement('div');
        notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#28a745' :
                type === 'error' ? '#dc3545' :
                    type === 'warning' ? '#ffc107' : '#17a2b8'};
        color: white;
        border-radius: 5px;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
        display: flex;
        align-items: center;
        gap: 10px;
    `;

        notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' :
                type === 'error' ? 'fa-exclamation-circle' :
                    type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);

        // Agregar estilos si no existen
        if (!document.querySelector('#notification-animations')) {
            const style = document.createElement('style');
            style.id = 'notification-animations';
            style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
            document.head.appendChild(style);
        }
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
    setInterval(updateSummary, 5000);

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

// Añadir los estilos CSS solo una vez al cargar la página
function setupNotificationStyles() {
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 40px;
                right: 20px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px 20px;
                max-width: 400px;
                min-width: 300px;
                animation: slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                border-left: 4px solid var(--gray-medium);
                transform: translateX(0);
                transition: transform 0.3s ease-out, opacity 0.3s ease-out;
                opacity: 1;
            }
            
            .notification.success {
                border-left-color: var(--success-color);
                background: linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%);
            }
            
            .notification.error {
                border-left-color: var(--danger-color);
                background: linear-gradient(135deg, #fff0f0 0%, #ffe6e6 100%);
            }
            
            .notification.warning {
                border-left-color: var(--warning-color);
                background: linear-gradient(135deg, #fff9e6 0%, #fff2cc 100%);
            }
            
            .notification.info {
                border-left-color: var(--primary-color);
                background: linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%);
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                gap: 12px;
                flex: 1;
            }
            
            .notification i {
                font-size: 1.4rem;
                min-width: 24px;
            }
            
            .notification.success i {
                color: var(--success-color);
            }
            
            .notification.error i {
                color: var(--danger-color);
            }
            
            .notification.warning i {
                color: var(--warning-color);
            }
            
            .notification.info i {
                color: var(--primary-color);
            }
            
            .notification-message {
                color: var(--dark-color);
                font-size: 0.95rem;
                line-height: 1.4;
                flex: 1;
            }
            
            .notification-close {
                background: none;
                border: none;
                color: var(--gray-medium);
                font-size: 1rem;
                cursor: pointer;
                padding: 4px 8px;
                margin-left: 10px;
                transition: color 0.2s;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .notification-close:hover {
                color: var(--danger-color);
                background: rgba(0, 0, 0, 0.05);
            }
            
            .notification.hiding {
                animation: slideOut 0.3s ease-out forwards;
                opacity: 0;
            }
            
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            
            /* Responsive para móviles */
            @media (max-width: 768px) {
                .notification {
                    top: 40px;
                    right: 15px;
                    left: 15px;
                    max-width: none;
                    min-width: auto;
                    width: calc(100% - 30px);
                    padding: 14px 16px;
                    border-radius: 10px;
                }
                
                .notification-content {
                    gap: 10px;
                }
                
                .notification i {
                    font-size: 1.2rem;
                }
                
                .notification-message {
                    font-size: 0.9rem;
                }
                
                .notification-close {
                    width: 26px;
                    height: 26px;
                    font-size: 0.9rem;
                }
            }
            
            /* Para pantallas pequeñas (mínimo 360px) */
            @media (max-width: 480px) {
                .notification {
                    top: 40px;
                    right: 10px;
                    left: 10px;
                    width: calc(100% - 20px);
                    padding: 12px 14px;
                }
                
                .notification-message {
                    font-size: 0.85rem;
                }
            }
            
            /* Para pantallas muy pequeñas (mínimo 360px) */
            @media (max-width: 360px) {
                .notification {
                    top: 40px;
                    right: 8px;
                    left: 8px;
                    width: calc(100% - 16px);
                    padding: 10px 12px;
                }
                
                .notification-content {
                    gap: 8px;
                }
                
                .notification i {
                    font-size: 1.1rem;
                }
                
                .notification-message {
                    font-size: 0.8rem;
                }
                
                .notification-close {
                    width: 24px;
                    height: 24px;
                    font-size: 0.85rem;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Llamar a setupNotificationStyles cuando se carga el DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupNotificationStyles);
} else {
    setupNotificationStyles();
}
function showNotification(message, type = 'info') {
    // Eliminar todas las notificaciones existentes inmediatamente
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });

    // Crear y mostrar la nueva notificación
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' :
            type === 'error' ? 'exclamation-circle' :
                type === 'warning' ? 'exclamation-triangle' :
                    'info-circle'}"></i>
            <span class="notification-message">${message}</span>
        </div>
        <button class="notification-close"><i class="fas fa-times"></i></button>
    `;

    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });

    document.body.appendChild(notification);

    // Auto-ocultar después de 5 segundos
    const autoHideTimeout = setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);

    // Pausar auto-ocultar cuando el usuario interactúa
    notification.addEventListener('mouseenter', () => {
        clearTimeout(autoHideTimeout);
    });

    notification.addEventListener('mouseleave', () => {
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    });
}
// dashboard.js - REEMPLAZAR LA FUNCIÓN ACTUAL CON ESTA VERSIÓN MEJORADA
function showConfirmationModal(title, message, type, confirmCallback, cancelCallback) {
    // Evitar duplicados - cerrar cualquier modal existente primero
    const existingModals = document.querySelectorAll('.confirmation-modal');
    existingModals.forEach(modal => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    });

    // Crear el modal
    const modal = document.createElement('div');
    modal.className = 'confirmation-modal';
    modal.setAttribute('data-confirmation-modal', 'true');
    modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div class="modal-icon ${type}">
                    <i class="fas fa-${type === 'warning' ? 'exclamation-triangle' :
            type === 'error' ? 'exclamation-circle' :
                type === 'success' ? 'check-circle' : 'info-circle'}"></i>
                </div>
                <p>${message}</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary cancel-btn">Cancelar</button>
                <button class="btn btn-primary confirm-btn">Confirmar</button>
            </div>
        </div>
    `;

    // Si ya existen los estilos CSS, no agregarlos de nuevo
    if (!document.querySelector('#confirmation-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'confirmation-modal-styles';
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
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            .confirmation-modal .modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(5px);
            }
            
            .confirmation-modal .modal-content {
                background: white;
                border-radius: 15px;
                width: 90%;
                max-width: 400px;
                z-index: 2001;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                animation: slideInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .confirmation-modal .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.5rem;
                border-bottom: 1px solid var(--gray-light);
            }
            
            .confirmation-modal .modal-header h3 {
                color: var(--secondary-color);
                font-size: 1.3rem;
            }
            
            .confirmation-modal .modal-close {
                background: none;
                border: none;
                color: var(--gray-medium);
                font-size: 1.2rem;
                cursor: pointer;
                padding: 0.5rem;
                transition: var(--transition);
            }
            
            .confirmation-modal .modal-close:hover {
                color: var(--danger-color);
            }
            
            .confirmation-modal .modal-body {
                padding: 2rem 1.5rem;
                text-align: center;
            }
            
            .confirmation-modal .modal-icon {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 1.5rem;
                font-size: 2rem;
            }
            
            .confirmation-modal .modal-icon.warning {
                background-color: rgba(247, 37, 133, 0.1);
                color: var(--warning-color);
            }
            
            .confirmation-modal .modal-icon.info {
                background-color: rgba(23, 162, 184, 0.1);
                color: var(--info-color);
            }
            
            .confirmation-modal .modal-icon.error {
                background-color: rgba(220, 53, 69, 0.1);
                color: var(--danger-color);
            }
            
            .confirmation-modal .modal-icon.success {
                background-color: rgba(40, 167, 69, 0.1);
                color: var(--success-color);
            }
            
            .confirmation-modal .modal-body p {
                color: var(--dark-color);
                line-height: 1.6;
                font-size: 1.1rem;
            }
            
            .confirmation-modal .modal-footer {
                display: flex;
                gap: 1rem;
                padding: 1.5rem;
                border-top: 1px solid var(--gray-light);
            }
            
            .confirmation-modal .modal-footer .btn {
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
    }

    document.body.appendChild(modal);

    // Función para cerrar el modal
    const closeModal = () => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    };

    // Event listeners
    modal.querySelector('.modal-close').addEventListener('click', () => {
        if (cancelCallback) cancelCallback();
        closeModal();
    });

    modal.querySelector('.cancel-btn').addEventListener('click', () => {
        if (cancelCallback) cancelCallback();
        closeModal();
    });

    modal.querySelector('.confirm-btn').addEventListener('click', () => {
        if (confirmCallback) confirmCallback();
        closeModal();
    });

    modal.querySelector('.modal-overlay').addEventListener('click', () => {
        if (cancelCallback) cancelCallback();
        closeModal();
    });

    // Retornar funciones para control externo
    return {
        modal,
        closeModal,
        confirm: () => {
            if (confirmCallback) confirmCallback();
            closeModal();
        },
        cancel: () => {
            if (cancelCallback) cancelCallback();
            closeModal();
        }
    };
}

// Asegurar que esté disponible globalmente
window.showConfirmationModal = showConfirmationModal;

// Agregar esta función a cocina.js o crear un archivo separado relaciones.js
window.gestionarRelacionesCocina = {
    abrirModalRelaciones: function (productoId) {
        // Mostrar modal para gestionar relaciones de un producto
        const producto = window.productosCocina.find(p => p.id === productoId);
        if (!producto) return;

        // Obtener ingredientes disponibles (productos con precio 0)
        const ingredientes = window.cocinaData.filter(p => p.precio === 0);
        const relacionesActuales = window.relacionesProductos.filter(r => r.productoId === productoId);

        // Crear modal
        const modalHtml = `
            <div class="modal active" id="modal-relaciones">
                <div class="modal-content" style="max-width: 700px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-link"></i> Relaciones de "${producto.nombre}"</h3>
                        <button class="modal-close" onclick="document.getElementById('modal-relaciones').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <h4>Ingredientes Usados:</h4>
                        <div id="lista-relaciones-actuales" style="margin-bottom: 20px;">
                            ${relacionesActuales.length === 0 ?
                '<p class="no-data">No hay ingredientes asignados</p>' :
                relacionesActuales.map(r => {
                    const ingrediente = window.cocinaData.find(p => p.id === r.ingredienteId);
                    return `
                                        <div class="relacion-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #eee;">
                                            <span>${ingrediente?.nombre || 'Desconocido'}</span>
                                            <div>
                                                <span>Cantidad: ${r.cantidad}</span>
                                                <button class="btn btn-sm btn-danger" onclick="window.gestionarRelacionesCocina.eliminarRelacion(${r.id})" style="margin-left: 10px;">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </div>
                                    `;
                }).join('')
            }
                        </div>
                        
                        <h4>Agregar Nuevo Ingrediente:</h4>
                        <div class="form-group">
                            <select id="select-ingrediente" class="form-control">
                                <option value="">Seleccionar ingrediente...</option>
                                ${ingredientes.map(i =>
                `<option value="${i.id}">${i.nombre}</option>`
            ).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="cantidad-ingrediente">Cantidad:</label>
                            <input type="number" id="cantidad-ingrediente" min="1" value="1" class="form-control">
                        </div>
                        
                        <button class="btn btn-primary" onclick="window.gestionarRelacionesCocina.agregarRelacion(${productoId})">
                            <i class="fas fa-plus"></i> Agregar Relación
                        </button>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="document.getElementById('modal-relaciones').remove()">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    agregarRelacion: function (productoId) {
        const ingredienteId = parseInt(document.getElementById('select-ingrediente').value);
        const cantidad = parseInt(document.getElementById('cantidad-ingrediente').value);

        if (!ingredienteId || cantidad < 1) {
            showNotification('Seleccione un ingrediente y una cantidad válida', 'error');
            return;
        }

        window.agregarRelacionProducto(productoId, ingredienteId, cantidad);

        // Actualizar modal
        setTimeout(() => {
            document.getElementById('modal-relaciones').remove();
            this.abrirModalRelaciones(productoId);
        }, 500);
    },

    eliminarRelacion: function (relacionId) {
        window.eliminarRelacionProducto(relacionId);

        // Actualizar modal
        const productoId = window.relacionesProductos.find(r => r.id === relacionId)?.productoId;
        if (productoId) {
            setTimeout(() => {
                document.getElementById('modal-relaciones').remove();
                this.abrirModalRelaciones(productoId);
            }, 500);
        }
    }
};
async function asegurarHistorialDisponible() {
    // Si ya está disponible, retornar
    if (window.historialIPV) {
        return window.historialIPV;
    }

    // Si el archivo ya está cargado pero no se inicializó
    if (window.HistorialIPV) {
        window.historialIPV = new window.HistorialIPV();
        return window.historialIPV;
    }

    // Si no está cargado, cargarlo dinámicamente
    return new Promise((resolve, reject) => {
        // Verificar si ya está en el DOM
        const existingScript = document.querySelector('script[src*="historial.js"]');

        if (existingScript) {
            // Esperar a que se cargue
            existingScript.onload = () => {
                if (window.HistorialIPV) {
                    window.historialIPV = new window.HistorialIPV();
                    resolve(window.historialIPV);
                } else {
                    reject(new Error('HistorialIPV no disponible después de cargar'));
                }
            };

            // Si ya está cargado pero no inicializado
            if (window.HistorialIPV) {
                window.historialIPV = new window.HistorialIPV();
                resolve(window.historialIPV);
            }
        } else {
            // Cargar el script
            const script = document.createElement('script');
            script.src = 'js/historial.js';

            script.onload = () => {
                setTimeout(() => {
                    if (window.HistorialIPV) {
                        window.historialIPV = new window.HistorialIPV();
                        resolve(window.historialIPV);
                    } else {
                        reject(new Error('HistorialIPV no disponible'));
                    }
                }, 500);
            };

            script.onerror = reject;
            document.head.appendChild(script);
        }
    });
}



window.showConfirmationModal = showConfirmationModal;
window.showNotification = showNotification;