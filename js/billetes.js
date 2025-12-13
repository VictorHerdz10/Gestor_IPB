// billetes.js - Sistema mejorado de contador de billetes CON VALIDACIÓN Y SELECCIÓN DE DESTINO
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
        input.addEventListener('change', validateInput);
    });

    denominacionesUSD.forEach(billete => {
        const input = document.getElementById(billete.id);
        input.addEventListener('input', updateBilletesTotals);
        input.addEventListener('change', validateInput);
    });

    // Event listeners para tasas de cambio
    denominacionesUSD.forEach(billete => {
        const input = document.getElementById(billete.tasaId);
        input.addEventListener('change', updateBilletesTotals);
    });

    // Botón Guardar Conteo
    guardarConteoBtn.addEventListener('click', function () {
        mostrarModalDestino();
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

    // Función para mostrar modal de selección de destino
    function mostrarModalDestino() {
        // Calcular totales primero
        const datosConteo = obtenerDatosConteo();

        // VALIDACIÓN: No permitir guardar si todos los valores son 0
        let totalCantidad = 0;
        Object.values(datosConteo.billetesCUP).forEach(cantidad => totalCantidad += cantidad);
        Object.values(datosConteo.billetesUSD).forEach(cantidad => totalCantidad += cantidad);

        if (totalCantidad === 0) {
            showNotification('No se puede guardar un conteo vacío. Ingresa al menos un billete.', 'warning');
            return;
        }

        const totalCUP = datosConteo.totales.totalCUP;
        const totalUSD = datosConteo.totales.totalUSD;
        const totalUSDCUP = datosConteo.totales.totalUSDCUP;
        const granTotal = datosConteo.totales.granTotal;

        const modal = document.createElement('div');
        modal.className = 'destino-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Guardar Conteo</h3>
                    <button class="modal-close"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="resumen-conteo">
                        <h4>Resumen del Conteo</h4>
                        <div class="resumen-item">
                            <span>Total CUP:</span>
                            <span>$${totalCUP.toLocaleString('es-ES')} CUP</span>
                        </div>
                        <div class="resumen-item">
                            <span>Total USD:</span>
                            <span>$${totalUSD.toLocaleString('es-ES')} USD</span>
                        </div>
                        <div class="resumen-item">
                            <span>Total USD en CUP:</span>
                            <span>$${totalUSDCUP.toLocaleString('es-ES')} CUP</span>
                        </div>
                        <div class="resumen-item total">
                            <span>Gran Total:</span>
                            <span>$${granTotal.toLocaleString('es-ES')} CUP</span>
                        </div>
                    </div>
                    
                    <div class="seleccion-destino">
                        <h4>Selecciona el destino:</h4>
                        <div class="opciones-destino">
                            <div class="opcion-destino" data-destino="registro">
                                <div class="icono">
                                    <i class="fas fa-history"></i>
                                </div>
                                <div class="info">
                                    <h5>Solo Guardar Registro</h5>
                                    <p>Guarda solo en el historial de conteos</p>
                                </div>
                                <div class="selector">
                                    <i class="fas fa-chevron-right"></i>
                                </div>
                            </div>
                            
                            <div class="opcion-destino" data-destino="extraccion">
                                <div class="icono">
                                    <i class="fas fa-money-bill-wave"></i>
                                </div>
                                <div class="info">
                                    <h5>Registrar como Extracción</h5>
                                    <p>Guarda en registro de conteo y extracciones</p>
                                </div>
                                <div class="selector">
                                    <i class="fas fa-chevron-right"></i>
                                </div>
                            </div>
                            
                            <div class="opcion-destino" data-destino="efectivo">
                                <div class="icono">
                                    <i class="fas fa-cash-register"></i>
                                </div>
                                <div class="info">
                                    <h5>Registrar como Efectivo</h5>
                                    <p>Guarda en registro de conteo y efectivo</p>
                                </div>
                                <div class="selector">
                                    <i class="fas fa-chevron-right"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Estilos para el modal
        const style = document.createElement('style');
        style.textContent = `
            .destino-modal {
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
            
            .destino-modal .modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(5px);
            }
            
            .destino-modal .modal-content {
                background: white;
                border-radius: 15px;
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                z-index: 2001;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                animation: slideInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .destino-modal .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.5rem;
                border-bottom: 1px solid var(--gray-light);
                position: sticky;
                top: 0;
                background: white;
                z-index: 1;
            }
            
            .destino-modal .modal-header h3 {
                color: var(--secondary-color);
                font-size: 1.3rem;
                margin: 0;
            }
            
            .destino-modal .modal-close {
                background: none;
                border: none;
                color: var(--gray-medium);
                font-size: 1.2rem;
                cursor: pointer;
                padding: 0.5rem;
                transition: var(--transition);
            }
            
            .destino-modal .modal-close:hover {
                color: var(--danger-color);
            }
            
            .destino-modal .modal-body {
                padding: 1.5rem;
            }
            
            .resumen-conteo {
                background: var(--gray-lightest);
                border-radius: 10px;
                padding: 1.5rem;
                margin-bottom: 1.5rem;
            }
            
            .resumen-conteo h4 {
                color: var(--secondary-color);
                margin-bottom: 1rem;
                font-size: 1.1rem;
            }
            
            .resumen-item {
                display: flex;
                justify-content: space-between;
                padding: 0.5rem 0;
                border-bottom: 1px solid var(--gray-light);
            }
            
            .resumen-item.total {
                font-weight: bold;
                font-size: 1.2rem;
                color: var(--primary-color);
                border-bottom: none;
                padding-top: 1rem;
                margin-top: 0.5rem;
                border-top: 2px solid var(--gray-light);
            }
            
            .seleccion-destino h4 {
                color: var(--secondary-color);
                margin-bottom: 1rem;
                font-size: 1.1rem;
            }
            
            .opciones-destino {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }
            
            .opcion-destino {
                display: flex;
                align-items: center;
                padding: 1rem;
                background: var(--gray-lightest);
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.3s ease;
                border: 2px solid transparent;
            }
            
            .opcion-destino:hover {
                background: var(--gray-light);
                transform: translateY(-2px);
            }
            
            .opcion-destino.active {
                border-color: var(--primary-color);
                background: rgba(67, 97, 238, 0.05);
            }
            
            .opcion-destino .icono {
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: var(--primary-color);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 1rem;
                font-size: 1.5rem;
            }
            
            .opcion-destino[data-destino="extraccion"] .icono {
                background: var(--warning-color);
            }
            
            .opcion-destino[data-destino="efectivo"] .icono {
                background: var(--success-color);
            }
            
            .opcion-destino .info {
                flex: 1;
            }
            
            .opcion-destino .info h5 {
                margin: 0;
                color: var(--dark-color);
                font-size: 1rem;
            }
            
            .opcion-destino .info p {
                margin: 0.25rem 0 0;
                color: var(--gray-medium);
                font-size: 0.9rem;
            }
            
            .opcion-destino .selector {
                color: var(--gray-medium);
                font-size: 1.2rem;
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
        let destinoSeleccionado = 'registro';

        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('.modal-overlay').addEventListener('click', () => {
            modal.remove();
        });

        // Event listeners para las opciones de destino
        const opciones = modal.querySelectorAll('.opcion-destino');
        opciones.forEach(opcion => {
            opcion.addEventListener('click', function () {
                // Remover clase active de todas las opciones
                opciones.forEach(o => o.classList.remove('active'));

                // Agregar clase active a la opción seleccionada
                this.classList.add('active');

                // Actualizar destino seleccionado
                destinoSeleccionado = this.dataset.destino;

                // Mostrar botón de confirmar
                mostrarBotonConfirmar(modal, destinoSeleccionado, datosConteo);
            });
        });

        // Seleccionar la primera opción por defecto
        opciones[0].classList.add('active');

        // Mostrar botón de confirmar inicial
        mostrarBotonConfirmar(modal, destinoSeleccionado, datosConteo);
    }

    // Función para mostrar botón de confirmar en el modal
    function mostrarBotonConfirmar(modal, destino, datosConteo) {
        let footer = modal.querySelector('.modal-footer');

        if (!footer) {
            footer = document.createElement('div');
            footer.className = 'modal-footer';
            modal.querySelector('.modal-content').appendChild(footer);
        }

        footer.innerHTML = '';

        const cancelarBtn = document.createElement('button');
        cancelarBtn.className = 'btn btn-secondary';
        cancelarBtn.textContent = 'Cancelar';
        cancelarBtn.addEventListener('click', () => {
            modal.remove();
        });

        const confirmarBtn = document.createElement('button');
        confirmarBtn.className = 'btn btn-primary';

        switch (destino) {
            case 'extraccion':
                confirmarBtn.textContent = 'Guardar como Extracción';
                confirmarBtn.style.background = 'var(--warning-color)';
                break;
            case 'efectivo':
                confirmarBtn.textContent = 'Guardar como Efectivo';
                confirmarBtn.style.background = 'var(--success-color)';
                break;
            default:
                confirmarBtn.textContent = 'Guardar Solo Registro';
        }

        confirmarBtn.addEventListener('click', () => {
            guardarRegistroCompleto(datosConteo, destino);
            modal.remove();
        });

        footer.appendChild(cancelarBtn);
        footer.appendChild(confirmarBtn);

        // Agregar estilos para el footer
        const styleFooter = document.createElement('style');
        if (!document.querySelector('#footer-style')) {
            styleFooter.id = 'footer-style';
            styleFooter.textContent = `
        .destino-modal .modal-footer {
            display: flex;
            gap: 1rem;
            padding: 1.5rem;
            border-top: 1px solid var(--gray-light);
            position: sticky;
            bottom: 0;
            background: white;
            z-index: 1;
            text-align:center;
            justify-content: space-between;
        }
        
        .destino-modal .modal-footer .btn {
            flex: 1;
            min-width: 0; /* Permite que los botones se reduzcan */
        }
        
        /* Responsive para móviles */
        @media (max-width: 768px) {
            .destino-modal .modal-footer {
                flex-direction: column;
                gap: 0.75rem;
                padding: 1rem;
            }
            
            .destino-modal .modal-footer .btn {
                width: 100%;
                margin-bottom: 0.5rem;
            }
            
            .destino-modal .modal-content {
                margin: 1rem;
                max-height: calc(100vh - 2rem);
                display: flex;
                flex-direction: column;
            }
            
            .destino-modal .modal-body {
                flex: 1;
                overflow-y: auto;
                padding-bottom: 0;
            }
            
            .destino-modal .modal-footer {
                position: sticky;
                bottom: 0;
                background: white;
                border-top: 1px solid var(--gray-light);
                margin-top: auto;
            }
        }
        
        /* Para pantallas muy pequeñas */
        @media (max-width: 480px) {
            .destino-modal .modal-footer {
                padding: 0.75rem;
                gap: 0.5rem;
            }
            
            .destino-modal .modal-footer .btn {
                padding: 0.75rem;
                font-size: 0.9rem;
            }
            
            .destino-modal .modal-content {
                width: 95%;
                max-width: 95%;
                margin: 0.5rem;
                border-radius: 10px;
            }
        }
        
        /* Para tablets en landscape */
        @media (min-width: 769px) and (max-width: 1024px) and (orientation: landscape) {
            .destino-modal .modal-content {
                max-width: 90%;
                max-height: 90vh;
            }
            
            .destino-modal .modal-footer {
                position: relative;
            }
        }
        
        /* Asegurar que el modal sea scrollable en móviles */
        @media (max-width: 768px) {
            .confirmation-modal {
                align-items: flex-start;
                padding-top: 2rem;
                overflow-y: auto;
            }
            
            .destino-modal .modal-content {
                max-height: 85vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
        }
    `;
            document.head.appendChild(styleFooter);
        }
    }

    // Función para guardar registro completo con destino
    function guardarRegistroCompleto(datosConteo, destino) {
        // Crear registro de conteo
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
            destino: destino,
            billetesCUP: datosConteo.billetesCUP,
            billetesUSD: datosConteo.billetesUSD,
            tasasUSD: datosConteo.tasasUSD,
            totales: datosConteo.totales
        };

        // Guardar en registro de conteos
        saveRegistro(registro);

        // Guardar según el destino seleccionado
        switch (destino) {
            case 'extraccion':
                guardarComoExtraccion(registro);
                break;
            case 'efectivo':
                guardarComoEfectivo(registro);
                break;
        }

        // Actualizar lista de registros
        loadRegistros();

        // Mostrar notificación
        let mensaje = 'Conteo guardado correctamente';
        if (destino !== 'registro') {
            mensaje += ` como ${destino === 'extraccion' ? 'extracción' : 'efectivo'}`;
        }
        showNotification(mensaje, 'success');

        // Limpiar conteo
        limpiarConteo();
    }

    // Función para guardar como extracción
    function guardarComoExtraccion(registro) {
        try {
            // Obtener extracciones actuales
            let extracciones = [];
            const extraccionesData = localStorage.getItem('ipb_extracciones');

            if (extraccionesData) {
                extracciones = JSON.parse(extraccionesData);
            }

            // Crear nueva extracción
            const nuevaExtraccion = {
                id: Date.now(),
                descripcion: `Conteo de caja - ${registro.hora}`,
                monto: registro.totales.granTotal,
                notas: `Conteo automático desde billetes. CUP: $${registro.totales.totalCUP.toLocaleString('es-ES')}, USD: $${registro.totales.totalUSD.toLocaleString('es-ES')}`,
                fecha: new Date().toISOString(),
                hora: obtenerHoraActual(),
                origen: 'conteo_billetes',
                registroId: registro.id
            };

            // Agregar a extracciones
            extracciones.push(nuevaExtraccion);

            // Guardar en localStorage
            localStorage.setItem('ipb_extracciones', JSON.stringify(extracciones));

            // Actualizar dashboard si está disponible
            if (typeof window.initExtracciones === 'function') {
                window.initExtracciones();
            }

            if (typeof window.updateSummary === 'function') {
                window.updateSummary();
            }

        } catch (error) {
            console.error('Error al guardar como extracción:', error);
            showNotification('Error al guardar como extracción', 'error');
        }
    }

    // Función para guardar como efectivo
    function guardarComoEfectivo(registro) {
        try {
            // Obtener efectivo actual
            let efectivoRegistros = [];
            const efectivoData = localStorage.getItem('ipb_efectivo_data');

            if (efectivoData) {
                efectivoRegistros = JSON.parse(efectivoData);
            }

            // Crear nuevo registro de efectivo
            const nuevoEfectivo = {
                id: Date.now(),
                fecha: new Date().toISOString().split('T')[0],
                hora: new Date().toLocaleString('es-ES', {
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                }),
                monto: registro.totales.granTotal,
                origen: 'conteo_billetes',
                registroId: registro.id
            };

            // Agregar a efectivo
            efectivoRegistros.push(nuevoEfectivo);

            // Guardar en localStorage
            localStorage.setItem('ipb_efectivo_data', JSON.stringify(efectivoRegistros));

            // Actualizar dashboard si está disponible
            if (typeof window.loadEfectivoData === 'function') {
                window.loadEfectivoData();
            }

        } catch (error) {
            console.error('Error al guardar como efectivo:', error);
            showNotification('Error al guardar como efectivo', 'error');
        }
    }

    // Función para obtener datos del conteo actual
    function obtenerDatosConteo() {
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
        let totalUSD = 0;
        let totalUSDCUP = 0;

        denominacionesCUP.forEach(billete => {
            totalCUP += (billetesCUP[billete.valor] || 0) * billete.valor;
        });

        denominacionesUSD.forEach(billete => {
            const cantidad = billetesUSD[billete.valor] || 0;
            const valorUSD = cantidad * billete.valor;
            const tasa = tasasUSD[billete.valor] || 400;

            totalUSD += valorUSD;
            totalUSDCUP += valorUSD * tasa;
        });

        const granTotal = totalCUP + totalUSDCUP;

        return {
            billetesCUP,
            billetesUSD,
            tasasUSD,
            totales: {
                totalCUP,
                totalUSD,
                totalUSDCUP,
                granTotal
            }
        };
    }

    // Función para validar inputs
    function validateInput(e) {
        const input = e.target;
        let value = parseInt(input.value);

        // Asegurar que sea un número válido
        if (isNaN(value) || value < 0) {
            input.value = 0;
            value = 0;
        }

        // Asegurar que sea un número entero
        if (!Number.isInteger(value)) {
            input.value = Math.floor(value);
        }

        updateBilletesTotals();
    }

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

                // Determinar ícono según destino
                let iconoDestino = 'history';
                let textoDestino = 'Registro';
                let claseDestino = 'destino-registro';

                if (registro.destino === 'extraccion') {
                    iconoDestino = 'money-bill-wave';
                    textoDestino = 'Extracción';
                    claseDestino = 'destino-extraccion';
                } else if (registro.destino === 'efectivo') {
                    iconoDestino = 'cash-register';
                    textoDestino = 'Efectivo';
                    claseDestino = 'destino-efectivo';
                }

                html += `
                    <div class="registro-item ${claseDestino}" data-id="${registro.id}">
                        <div class="registro-info">
                            <div class="registro-hora">${registro.hora}</div>
                            <div class="registro-destino">
                                <i class="fas fa-${iconoDestino}"></i>
                                <span>${textoDestino}</span>
                            </div>
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

    // Función para ver detalle de registro (MODIFICADA PARA MOSTRAR DESTINO)
    function verDetalleRegistro(id) {
        const registrosData = localStorage.getItem('ipb_billetes_registros');
        if (!registrosData) return;

        try {
            const registros = JSON.parse(registrosData);
            const registro = registros.find(r => r.id === id);

            if (!registro) return;

            // Determinar texto del destino
            let textoDestino = 'Solo Registro';
            let iconoDestino = 'history';

            if (registro.destino === 'extraccion') {
                textoDestino = 'Extracción';
                iconoDestino = 'money-bill-wave';
            } else if (registro.destino === 'efectivo') {
                textoDestino = 'Efectivo';
                iconoDestino = 'cash-register';
            }

            // Generar HTML del detalle
            let html = `
                <div class="detalle-registro">
                    <div class="detalle-header">
                        <div class="destino-info">
                            <i class="fas fa-${iconoDestino}"></i>
                            <span>Destino: ${textoDestino}</span>
                        </div>
                        <div class="hora-info">${registro.hora}</div>
                    </div>
                    
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
                    <div class="detalle-billete destino">
                        <span>Destino:</span>
                        <span><i class="fas fa-${iconoDestino}"></i> ${textoDestino}</span>
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
            'Esta acción eliminará el registro de conteo. Si también se guardó como extracción o efectivo, deberás eliminarlo manualmente desde esas secciones.',
            'warning',
            function () {
                const registrosData = localStorage.getItem('ipb_billetes_registros');
                if (!registrosData) return;

                try {
                    let registros = JSON.parse(registrosData);
                    const registroEliminar = registros.find(r => r.id === id);

                    // Eliminar de conteos
                    registros = registros.filter(r => r.id !== id);
                    localStorage.setItem('ipb_billetes_registros', JSON.stringify(registros));

                    // Si tenía destino, informar al usuario
                    if (registroEliminar && registroEliminar.destino !== 'registro') {
                        showNotification(`Registro eliminado. Recuerda eliminar manualmente de ${registroEliminar.destino === 'extraccion' ? 'extracciones' : 'efectivo'} si es necesario.`, 'info');
                    } else {
                        showNotification('Registro eliminado', 'success');
                    }

                    loadRegistros();
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

    // Función para obtener hora actual formateada
    function obtenerHoraActual() {
        const now = new Date();
        return now.toLocaleString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
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

    // FUNCIONES DE UI REUTILIZABLES

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

    document.addEventListener('click', function (e) {
        const link = e.target.closest('a[data-section="extracciones"]');
        if (link) {
            setTimeout(initExtracciones, 100);
        }
    });

    // Inicializar cuando cambie la sección (si existe el evento)
    if (typeof window.addEventListener === 'function') {
        window.addEventListener('sectionChanged', function (e) {
            if (e.detail && e.detail.section === 'extracciones') {
                setTimeout(initExtracciones, 100);
            }
        });
    }

    // Función para recargar datos (similar a reloadEfectivoData)
    window.reloadExtraccionesData = function () {
        cargarExtracciones();
        actualizarListaExtracciones();
        actualizarResumen();
    };
});