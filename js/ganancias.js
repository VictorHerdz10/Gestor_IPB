// ganancias.js - Sistema completo de gestión de ganancias con paginación
class GestionGanancias {
    constructor() {
        this.preciosCompra = {};
        this.gastosExtras = [];
        this.gananciasCalculadas = false;
        this.productosFiltrados = [];
        this.paginaActual = 1;
        this.productosPorPagina = 12;
        this.terminoBusqueda = '';
        this.paginaActualGastos = 1;
        this.gastosPorPagina = 10;
        this.gastosFiltrados = [];
        this.init();
    }

    init() {
        this.cargarDatos();
        this.setupEventListeners();
        this.cargarProductosPaginados();
        this.cargarGastosUI();
        this.calcularGanancias();

        // Hacer disponible globalmente
        window.gananciasManager = this;
    }

    cargarDatos() {
        // Cargar precios de compra
        const preciosGuardados = localStorage.getItem('ipb_precios_compra');
        if (preciosGuardados) {
            this.preciosCompra = JSON.parse(preciosGuardados);
        } else {
            this.preciosCompra = {};
        }

        // Cargar gastos extras
        const gastosGuardados = localStorage.getItem('ipb_gastos_extras');
        if (gastosGuardados) {
            this.gastosExtras = JSON.parse(gastosGuardados);
        } else {
            this.gastosExtras = [];
        }
    }

    guardarDatos() {
        localStorage.setItem('ipb_precios_compra', JSON.stringify(this.preciosCompra));
        localStorage.setItem('ipb_gastos_extras', JSON.stringify(this.gastosExtras));
    }

    setupEventListeners() {
        // Botón para calcular ganancias
        const btnCalcular = document.getElementById('btn-calcular-ganancias');
        if (btnCalcular) {
            btnCalcular.addEventListener('click', () => {
            showNotification("Se han actualizado las ganancias", "success");
            });
        }

        // Botón para agregar gasto
        const btnAgregarGasto = document.getElementById('btn-agregar-gasto');
        if (btnAgregarGasto) {
            btnAgregarGasto.addEventListener('click', () => this.mostrarFormularioGasto());
        }

        // Botón para cancelar gasto
        const btnCancelarGasto = document.getElementById('btn-cancelar-gasto');
        if (btnCancelarGasto) {
            btnCancelarGasto.addEventListener('click', () => this.ocultarFormularioGasto());
        }

        // Formulario de gasto
        const formGasto = document.getElementById('form-nuevo-gasto');
        if (formGasto) {
            formGasto.addEventListener('submit', (e) => {
                e.preventDefault();
                this.guardarGasto();
            });
        }

        // Botón para agregar primer gasto
        const btnAddFirstGasto = document.getElementById('btn-add-first-gasto');
        if (btnAddFirstGasto) {
            btnAddFirstGasto.addEventListener('click', () => this.mostrarFormularioGasto());
        }

        // Búsqueda de productos
        const buscarInput = document.getElementById('buscar-productos-ganancias');
        if (buscarInput) {
            buscarInput.addEventListener('input', (e) => {
                this.terminoBusqueda = e.target.value.toLowerCase().trim();
                this.paginaActual = 1;
                this.cargarProductosPaginados();
            });
        }

        // Actualizar automáticamente cuando cambien los datos del salón o cocina
        document.addEventListener('datosActualizados', () => {
            this.calcularGanancias();
        });

        // Escuchar cambios en los productos del salón
        if (typeof window.salonData !== 'undefined') {
            const originalSalonSave = window.guardarDatosSalon;
            if (originalSalonSave) {
                window.guardarDatosSalon = () => {
                    originalSalonSave();
                    setTimeout(() => this.calcularGanancias(), 100);
                };
            }
        }

        // Escuchar cambios en los productos de cocina
        if (typeof window.cocinaData !== 'undefined') {
            const originalCocinaSave = window.guardarDatosCocina;
            if (originalCocinaSave) {
                window.guardarDatosCocina = () => {
                    originalCocinaSave();
                    setTimeout(() => this.calcularGanancias(), 100);
                };
            }
        }
    }

    obtenerProductosFiltrados() {
        // Obtener productos del salón y cocina
        let productosSalon = [];
        let productosCocina = [];

        if (typeof StorageManager !== 'undefined') {
            productosSalon = StorageManager.getProducts();
            productosCocina = StorageManager.getCocinaProducts();
        } else {
            // Fallback si StorageManager no está disponible
            const salonData = localStorage.getItem('ipb_products');
            const cocinaData = localStorage.getItem('ipb_cocina_products');

            if (salonData) productosSalon = JSON.parse(salonData);
            if (cocinaData) productosCocina = JSON.parse(cocinaData);
        }

        const todosProductos = [...productosSalon, ...productosCocina];

        // Aplicar filtro de búsqueda
        if (this.terminoBusqueda) {
            return todosProductos.filter(producto =>
                producto.nombre.toLowerCase().includes(this.terminoBusqueda) ||
                (producto.ubicacion && producto.ubicacion.toLowerCase().includes(this.terminoBusqueda))
            );
        }

        return todosProductos;
    }

    cargarProductosPaginados() {
        const container = document.getElementById('configuracion-precios-grid');
        const totalElement = document.getElementById('total-productos-ganancias');
        const paginacionContainer = document.getElementById('paginacion-productos');

        if (!container) return;

        // Obtener productos filtrados
        this.productosFiltrados = this.obtenerProductosFiltrados();
        const totalProductos = this.productosFiltrados.length;

        // Actualizar contador
        if (totalElement) {
            totalElement.textContent = totalProductos;
        }

        // Mostrar estado vacío si no hay productos
        if (totalProductos === 0) {
            container.innerHTML = `
                <div class="empty-state-card">
                    <i class="fas fa-box-open"></i>
                    <p>No hay productos ${this.terminoBusqueda ? 'que coincidan con la búsqueda' : 'configurados'}</p>
                    ${this.terminoBusqueda ?
                    '<button class="btn btn-outline" onclick="gananciasManager.limpiarBusqueda()">Limpiar búsqueda</button>' :
                    '<p class="small-text">Agrega productos desde la sección de Productos</p>'
                }
                </div>
            `;
            if (paginacionContainer) paginacionContainer.style.display = 'none';
            return;
        }

        // Calcular paginación
        const totalPaginas = Math.ceil(totalProductos / this.productosPorPagina);
        const inicio = (this.paginaActual - 1) * this.productosPorPagina;
        const fin = Math.min(this.paginaActual * this.productosPorPagina, totalProductos);
        const productosPagina = this.productosFiltrados.slice(inicio, fin);

        // Renderizar productos de la página actual
        container.innerHTML = '';
        productosPagina.forEach(producto => {
            const precioCompraActual = this.preciosCompra[producto.id] || (producto.precio * 0.6);
            const margenEstimado = ((producto.precio - precioCompraActual) / producto.precio) * 100;

            const card = document.createElement('div');
            card.className = 'producto-precio-card';
            card.innerHTML = `
                <div class="producto-precio-header">
                    <h4 title="${producto.nombre}">${this.truncarTexto(producto.nombre, 20)}</h4>
                    <span class="producto-ubicacion-badge ${producto.ubicacion === 'cocina' ? 'badge-cocina' : 'badge-salon'}">
                        ${producto.ubicacion === 'cocina' ? 'Cocina' : 'Salón'}
                    </span>
                </div>
                <div class="producto-precio-fields">
                    <div class="precio-field">
                        <label><i class="fas fa-dollar-sign"></i> Precio Venta:</label>
                        <div class="precio-actual">$${producto.precio.toFixed(2)}</div>
                    </div>
                    <div class="precio-field">
                        <label><i class="fas fa-shopping-cart"></i> Precio Compra:</label>
                        <input type="number" 
                               class="precio-compra-input" 
                               data-id="${producto.id}"
                               value="${precioCompraActual.toFixed(2)}"
                               min="0"
                               step="0.01"
                               title="Precio de compra">
                    </div>
                    <div class="precio-field">
                        <label><i class="fas fa-chart-line"></i> Margen Estimado:</label>
                        <div class="margen-estimado ${margenEstimado >= 30 ? 'margen-alto' : margenEstimado >= 20 ? 'margen-medio' : 'margen-bajo'}">
                            ${margenEstimado.toFixed(1)}%
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        // Agregar event listeners a los inputs
        container.querySelectorAll('.precio-compra-input').forEach(input => {
            input.addEventListener('change', (e) => this.actualizarPrecioCompra(e));
            input.addEventListener('blur', (e) => this.actualizarPrecioCompra(e));
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.actualizarPrecioCompra(e);
            });
        });

        // Generar paginación
        this.generarPaginacion(totalProductos, totalPaginas, inicio, fin, paginacionContainer);
    }

    actualizarPrecioCompra(event) {
        const input = event.target;
        const productoId = parseInt(input.dataset.id);
        const nuevoPrecio = parseFloat(input.value);

        if (!isNaN(nuevoPrecio) && nuevoPrecio >= 0) {
            this.preciosCompra[productoId] = nuevoPrecio;
            this.guardarDatos();
            this.calcularGanancias();

            // Efecto visual
            input.classList.add('edited');
            setTimeout(() => input.classList.remove('edited'), 1000);

            // Recalcular y mostrar margen actualizado
            const producto = this.productosFiltrados.find(p => p.id === productoId);
            if (producto) {
                const margenEstimado = ((producto.precio - nuevoPrecio) / producto.precio) * 100;
                const margenElement = input.closest('.producto-precio-fields').querySelector('.margen-estimado');
                if (margenElement) {
                    margenElement.textContent = `${margenEstimado.toFixed(1)}%`;
                    margenElement.className = `margen-estimado ${margenEstimado >= 30 ? 'margen-alto' : margenEstimado >= 20 ? 'margen-medio' : 'margen-bajo'}`;
                }
            }
        }
    }

    generarPaginacion(totalProductos, totalPaginas, inicio, fin, container) {
        if (!container) return;

        if (totalPaginas <= 1) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';

        let html = `
            <div class="paginacion-info">
                <i class="fas fa-list-ol"></i>
                <span>Mostrando ${inicio + 1}-${fin} de ${totalProductos} productos</span>
            </div>
            
            <div class="paginacion-controles">
                <button class="btn-paginacion" onclick="gananciasManager.cambiarPagina(${this.paginaActual - 1})" ${this.paginaActual === 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i>
                    <span>Anterior</span>
                </button>
                
                <div class="paginacion-numeros">
        `;

        // Mostrar números de página con truncado inteligente
        const paginasAMostrar = 5;
        let inicioPaginas = Math.max(1, this.paginaActual - Math.floor(paginasAMostrar / 2));
        let finPaginas = Math.min(totalPaginas, inicioPaginas + paginasAMostrar - 1);

        // Ajustar si no tenemos suficientes páginas
        if (finPaginas - inicioPaginas + 1 < paginasAMostrar) {
            inicioPaginas = Math.max(1, finPaginas - paginasAMostrar + 1);
        }

        // Página 1
        if (inicioPaginas > 1) {
            html += `<button class="btn-pagina" onclick="gananciasManager.cambiarPagina(1)">1</button>`;
            if (inicioPaginas > 2) html += `<span class="puntos">...</span>`;
        }

        // Páginas intermedias
        for (let i = inicioPaginas; i <= finPaginas; i++) {
            html += `<button class="btn-pagina ${i === this.paginaActual ? 'active' : ''}" onclick="gananciasManager.cambiarPagina(${i})">${i}</button>`;
        }

        // Última página
        if (finPaginas < totalPaginas) {
            if (finPaginas < totalPaginas - 1) html += `<span class="puntos">...</span>`;
            html += `<button class="btn-pagina" onclick="gananciasManager.cambiarPagina(${totalPaginas})">${totalPaginas}</button>`;
        }

        html += `
                </div>
                
                <button class="btn-paginacion" onclick="gananciasManager.cambiarPagina(${this.paginaActual + 1})" ${this.paginaActual === totalPaginas ? 'disabled' : ''}>
                    <span>Siguiente</span>
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
            
            <div class="paginacion-selector">
                <label>Mostrar:</label>
                <select onchange="gananciasManager.cambiarProductosPorPagina(this.value)">
                    <option value="5" ${this.productosPorPagina === 5 ? 'selected' : ''}>5</option>
                    <option value="12" ${this.productosPorPagina === 12 ? 'selected' : ''}>12</option>
                    <option value="24" ${this.productosPorPagina === 24 ? 'selected' : ''}>24</option>
                    <option value="36" ${this.productosPorPagina === 36 ? 'selected' : ''}>36</option>
                    <option value="48" ${this.productosPorPagina === 48 ? 'selected' : ''}>48</option>
                    <option value="100" ${this.productosPorPagina === 100 ? 'selected' : ''}>100</option>
                </select>
            </div>
        `;

        container.innerHTML = html;
    }

    cambiarPagina(nuevaPagina) {
        const totalPaginas = Math.ceil(this.productosFiltrados.length / this.productosPorPagina);
        if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
            this.paginaActual = nuevaPagina;
            this.cargarProductosPaginados();

            // Scroll suave hacia arriba
            const container = document.getElementById('configuracion-precios-grid');
            if (container) {
                container.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }

    cambiarProductosPorPagina(nuevoValor) {
        this.productosPorPagina = parseInt(nuevoValor);
        this.paginaActual = 1;
        this.cargarProductosPaginados();
    }

    limpiarBusqueda() {
        const buscarInput = document.getElementById('buscar-productos-ganancias');
        if (buscarInput) {
            buscarInput.value = '';
        }
        this.terminoBusqueda = '';
        this.paginaActual = 1;
        this.cargarProductosPaginados();
    }

    mostrarFormularioGasto() {
        const form = document.getElementById('gasto-form');
        if (form) form.style.display = 'block';

        // Resetear formulario
        const formElement = document.getElementById('form-nuevo-gasto');
        if (formElement) formElement.reset();

        // Enfocar en la descripción
        const descInput = document.getElementById('gasto-descripcion');
        if (descInput) descInput.focus();
    }

    ocultarFormularioGasto() {
        const form = document.getElementById('gasto-form');
        if (form) form.style.display = 'none';

        const formElement = document.getElementById('form-nuevo-gasto');
        if (formElement) formElement.reset();
    }

    guardarGasto() {
        const descripcion = document.getElementById('gasto-descripcion').value.trim();
        const monto = parseFloat(document.getElementById('gasto-monto').value);
        const categoria = document.getElementById('gasto-categoria').value;
        const notas = document.getElementById('gasto-notas').value.trim();

        if (!descripcion || isNaN(monto) || monto <= 0 || !categoria) {
            showNotification('Por favor complete todos los campos requeridos', 'error');
            return;
        }

        const nuevoGasto = {
            id: Date.now(),
            descripcion,
            monto,
            categoria,
            notas,
            fecha: new Date().toISOString(),
            hora: this.obtenerHoraActual()
        };

        this.gastosExtras.push(nuevoGasto);
        this.guardarDatos();
        this.cargarGastosUI();
        this.calcularGanancias();
        this.ocultarFormularioGasto();

        showNotification('Gasto registrado exitosamente', 'success');
    }

    eliminarGasto(gastoId) {
        if (window.showConfirmationModal) {
            window.showConfirmationModal(
                '¿Eliminar Gasto?',
                '¿Está seguro de eliminar este gasto? Esta acción no se puede deshacer.',
                'warning',
                () => {
                    this.gastosExtras = this.gastosExtras.filter(g => g.id !== gastoId);
                    this.guardarDatos();
                    this.cargarGastosUI();
                    this.calcularGanancias();
                    showNotification('Gasto eliminado', 'success');
                }
            );
        } else {
            if (confirm('¿Está seguro de eliminar este gasto?')) {
                this.gastosExtras = this.gastosExtras.filter(g => g.id !== gastoId);
                this.guardarDatos();
                this.cargarGastosUI();
                this.calcularGanancias();
                showNotification('Gasto eliminado', 'success');
            }
        }
    }

    cargarGastosUI() {
        const container = document.getElementById('lista-gastos');
        const totalElement = document.getElementById('total-gastos');
        if (!container) return;

        this.gastosFiltrados = this.gastosExtras;

        if (this.gastosFiltrados.length === 0) {
            container.innerHTML = `
                <div class="empty-state-card">
                    <i class="fas fa-receipt"></i>
                    <p>No hay gastos extras registrados</p>
                    <button class="btn btn-outline" id="btn-add-first-gasto">
                        <i class="fas fa-plus"></i> Agregar primer gasto
                    </button>
                </div>
            `;

            // Reagregar event listener al botón
            const btn = document.getElementById('btn-add-first-gasto');
            if (btn) {
                btn.addEventListener('click', () => this.mostrarFormularioGasto());
            }

            // Ocultar paginación de gastos si existe
            const paginacionGastos = document.getElementById('paginacion-gastos');
            if (paginacionGastos) paginacionGastos.style.display = 'none';

            return;
        }

        // Calcular total
        const totalGastos = this.gastosFiltrados.reduce((sum, gasto) => sum + gasto.monto, 0);

        // Actualizar total en el header
        if (totalElement) {
            totalElement.textContent = `$${totalGastos.toFixed(2)}`;
        }

        // Calcular paginación para gastos
        const totalPaginasGastos = Math.ceil(this.gastosFiltrados.length / this.gastosPorPagina);
        const inicioGastos = (this.paginaActualGastos - 1) * this.gastosPorPagina;
        const finGastos = Math.min(this.paginaActualGastos * this.gastosPorPagina, this.gastosFiltrados.length);
        const gastosPagina = this.gastosFiltrados.slice(inicioGastos, finGastos);

        // Renderizar gastos de la página actual
        container.innerHTML = gastosPagina.map(gasto => `
            <div class="gasto-item" data-id="${gasto.id}">
                <div class="gasto-info">
                    <div class="gasto-descripcion">${gasto.descripcion}</div>
                    <div class="gasto-detalles">
                        <span class="gasto-categoria">${this.getCategoriaTexto(gasto.categoria)}</span>
                        <span>${gasto.hora}</span>
                        ${gasto.notas ? `<span><i class="fas fa-sticky-note"></i> ${this.truncarTexto(gasto.notas, 30)}</span>` : ''}
                    </div>
                </div>
                <div class="gasto-monto">$${gasto.monto.toFixed(2)}</div>
                <div class="gasto-actions">
                    <button class="btn-eliminar-gasto" data-id="${gasto.id}" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Agregar event listeners a los botones de eliminar
        container.querySelectorAll('.btn-eliminar-gasto').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const gastoId = parseInt(e.currentTarget.dataset.id);
                this.eliminarGasto(gastoId);
            });
        });

        // Generar paginación para gastos
        this.generarPaginacionGastos(totalPaginasGastos, inicioGastos, finGastos);
    }

    generarPaginacionGastos(totalPaginas, inicio, fin) {
        let paginacionContainer = document.getElementById('paginacion-gastos');

        if (!paginacionContainer) {
            // Crear contenedor de paginación si no existe
            const gastosContainer = document.querySelector('.gastos-container');
            if (gastosContainer) {
                paginacionContainer = document.createElement('div');
                paginacionContainer.id = 'paginacion-gastos';
                paginacionContainer.className = 'paginacion-gastos';
                gastosContainer.appendChild(paginacionContainer);
            }
        }

        if (!paginacionContainer) return;

        if (totalPaginas <= 1) {
            paginacionContainer.style.display = 'none';
            return;
        }

        paginacionContainer.style.display = 'flex';
        paginacionContainer.innerHTML = `
            <div class="paginacion-info">
                <i class="fas fa-receipt"></i>
                <span>Gastos: ${inicio + 1}-${fin} de ${this.gastosFiltrados.length}</span>
            </div>
            <div class="paginacion-controles-gastos">
                <button class="btn-paginacion btn-sm" onclick="gananciasManager.cambiarPaginaGastos(${this.paginaActualGastos - 1})" ${this.paginaActualGastos === 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i>
                </button>
                <span class="page-info">Página ${this.paginaActualGastos} de ${totalPaginas}</span>
                <button class="btn-paginacion btn-sm" onclick="gananciasManager.cambiarPaginaGastos(${this.paginaActualGastos + 1})" ${this.paginaActualGastos === totalPaginas ? 'disabled' : ''}>
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;
    }

    cambiarPaginaGastos(nuevaPagina) {
        const totalPaginas = Math.ceil(this.gastosFiltrados.length / this.gastosPorPagina);
        if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
            this.paginaActualGastos = nuevaPagina;
            this.cargarGastosUI();
        }
    }

    getCategoriaTexto(categoria) {
        const categorias = {
            'transporte': 'Transporte',
            'servicios': 'Servicios',
            'materiales': 'Materiales',
            'mantenimiento': 'Mantenimiento',
            'personal': 'Personal',
            'otros': 'Otros'
        };
        return categorias[categoria] || categoria;
    }

    calcularGanancias() {
        try {
            // Obtener datos del salón y cocina
            let salonData = [];
            let cocinaData = [];
            let agregosData = [];

            // Intentar obtener datos de diferentes maneras
            if (typeof StorageManager !== 'undefined') {
                salonData = StorageManager.getSalonData();
                cocinaData = StorageManager.getCocinaData();
            } else {
                // Fallback si StorageManager no está disponible
                const salonDataStr = localStorage.getItem('ipb_salon_data');
                const cocinaDataStr = localStorage.getItem('ipb_cocina_data');

                if (salonDataStr) salonData = JSON.parse(salonDataStr);
                if (cocinaDataStr) cocinaData = JSON.parse(cocinaDataStr);
            }

            // Obtener agregos de cocina
            const agregosDataStr = localStorage.getItem('cocina_agregos');
            if (agregosDataStr) {
                agregosData = JSON.parse(agregosDataStr);
            }

            // 1. Calcular ventas totales
            const ventasSalon = salonData.reduce((sum, producto) => sum + (parseFloat(producto.importe) || 0), 0);
            const ventasCocina = cocinaData.reduce((sum, producto) => sum + (parseFloat(producto.importe) || 0), 0);
            const ventasAgregos = agregosData.reduce((sum, agrego) => sum + (parseFloat(agrego.montoTotal) || 0), 0);

            const ventasTotales = ventasSalon + ventasCocina + ventasAgregos;

            // 2. Calcular costos de mercancía
            const costoSalon = salonData.reduce((sum, producto) => {
                const precioCompra = this.preciosCompra[producto.id] || (parseFloat(producto.precio) * 0.6);
                const unidadesVendidas = parseInt(producto.vendido) || 0;
                return sum + (precioCompra * unidadesVendidas);
            }, 0);

            const costoCocina = cocinaData.reduce((sum, producto) => {
                const precioCompra = this.preciosCompra[producto.id] || (parseFloat(producto.precio) * 0.6);
                const unidadesVendidas = parseInt(producto.vendido) || 0;
                return sum + (precioCompra * unidadesVendidas);
            }, 0);

            // Asumir costo de agregos como 60% del precio
            const costoAgregos = agregosData.reduce((sum, agrego) => {
                return sum + ((parseFloat(agrego.montoTotal) || 0) * 0.6);
            }, 0);

            const costoTotalMercancia = costoSalon + costoCocina + costoAgregos;

            // 3. Calcular gastos extras
            const totalGastosExtras = this.gastosExtras.reduce((sum, gasto) => sum + (gasto.monto || 0), 0);

            // 4. Calcular ganancias
            const gananciaBruta = ventasTotales - costoTotalMercancia;
            const gananciaNeta = gananciaBruta - totalGastosExtras;

            // 5. Calcular métricas
            const margenGanancia = ventasTotales > 0 ? (gananciaBruta / ventasTotales) * 100 : 0;
            const roi = costoTotalMercancia > 0 ? (gananciaNeta / costoTotalMercancia) * 100 : 0;

            // 6. Actualizar UI
            this.actualizarUI({
                ventasTotales,
                ventasSalon,
                ventasCocina,
                ventasAgregos,
                costoSalon,
                costoCocina,
                costoAgregos,
                costoTotalMercancia,
                totalGastosExtras,
                gananciaBruta,
                gananciaNeta,
                margenGanancia,
                roi
            });

            this.gananciasCalculadas = true;

            // 7. Actualizar el dashboard principal
            this.actualizarDashboard(gananciaNeta, gananciaBruta);

            return {
                gananciaNeta,
                gananciaBruta,
                ventasTotales,
                costoTotalMercancia,
                totalGastosExtras
            };

        } catch (error) {
            console.error('Error calculando ganancias:', error);
            if (typeof showNotification !== 'undefined') {
                showNotification('Error calculando ganancias', 'error');
            }
            return null;
        }
    }

    actualizarUI(datos) {
        // Actualizar resumen principal
        const elementos = {
            'resumen-ventas-totales': `$${datos.ventasTotales.toFixed(2)}`,
            'resumen-costo-mercancia': `$${datos.costoTotalMercancia.toFixed(2)}`,
            'resumen-ganancia-bruta': `$${datos.gananciaBruta.toFixed(2)}`,
            'resumen-gastos-extras': `$${datos.totalGastosExtras.toFixed(2)}`,
            'resumen-ganancia-neta': `$${datos.gananciaNeta.toFixed(2)}`,
            'margen-ganancia': `${datos.margenGanancia.toFixed(1)}%`,
            'roi': `${datos.roi.toFixed(1)}%`,
            'desglose-ventas-salon': `$${datos.ventasSalon.toFixed(2)}`,
            'desglose-ventas-cocina': `$${datos.ventasCocina.toFixed(2)}`,
            'desglose-total-ventas': `$${datos.ventasTotales.toFixed(2)}`,
            'desglose-costo-salon': `$${datos.costoSalon.toFixed(2)}`,
            'desglose-costo-cocina': `$${datos.costoCocina.toFixed(2)}`,
            'desglose-costo-agregos': `$${datos.costoAgregos.toFixed(2)}`,
            'desglose-total-costos': `$${datos.costoTotalMercancia.toFixed(2)}`
        };

        Object.entries(elementos).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;

                // Aplicar clases para colores
                if (id.includes('ganancia') && !id.includes('margen')) {
                    const valor = parseFloat(value.replace('$', ''));
                    if (valor >= 0) {
                        element.className = element.className.replace(/positive|negative/g, '') + ' positive';
                    } else {
                        element.className = element.className.replace(/positive|negative/g, '') + ' negative';
                    }
                }
            }
        });
    }

    actualizarDashboard(gananciaNeta, gananciaBruta) {
        // Buscar o crear card de ganancias en el dashboard
        let gananciasCard = document.querySelector('.summary-card .ganancias-info');

        if (!gananciasCard) {
            // Agregar nueva card al dashboard si no existe
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
                        <p class="amount ${gananciaNeta >= 0 ? 'positive' : 'negative'}" id="dashboard-ganancia-neta">$${gananciaNeta.toFixed(2)}</p>
                        <p class="description">Ganancia bruta: $${gananciaBruta.toFixed(2)}</p>
                    </div>
                `;
                summaryCards.appendChild(nuevaCard);
            }
        } else {
            // Actualizar card existente
            const gananciaElement = document.getElementById('dashboard-ganancia-neta');
            if (gananciaElement) {
                gananciaElement.textContent = `$${gananciaNeta.toFixed(2)}`;
                gananciaElement.className = `amount ${gananciaNeta >= 0 ? 'positive' : 'negative'}`;

                // Actualizar descripción
                const descElement = gananciasCard.querySelector('.description');
                if (descElement) {
                    descElement.textContent = `Ganancia bruta: $${gananciaBruta.toFixed(2)}`;
                }
            }
        }
    }

    obtenerHoraActual() {
        const now = new Date();
        return now.toLocaleString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    truncarTexto(texto, maxLength) {
        if (!texto) return '';
        if (texto.length <= maxLength) return texto;
        return texto.substring(0, maxLength - 3) + '...';
    }

    // Métodos para ser llamados desde otras secciones
    sincronizarConProductos() {
        this.cargarProductosPaginados();
        this.calcularGanancias();
    }

    resetDia() {
        // Resetear gastos del día
        this.gastosExtras = [];
        this.guardarDatos();
        this.cargarGastosUI();
        this.calcularGanancias();
    }

    // Método para recargar productos (puede ser llamado desde otras secciones)
    recargarProductos() {
        this.cargarProductosPaginados();
        this.calcularGanancias();
    }
}

// Inicializar cuando se carga la sección de ganancias
document.addEventListener('DOMContentLoaded', function () {
    // Escuchar cuando se entre a la sección de ganancias
    const gananciasLinks = document.querySelectorAll('a[data-section="ganancias"]');
    gananciasLinks.forEach(link => {
        link.addEventListener('click', function () {
            // Inicializar gestión de ganancias si no existe
            setTimeout(() => {
                if (!window.gananciasManager && document.getElementById('ganancias-section')) {
                    window.gananciasManager = new GestionGanancias();
                } else if (window.gananciasManager) {
                    window.gananciasManager.cargarProductosPaginados();
                    window.gananciasManager.calcularGanancias();
                }
            }, 500);
        });
    });

    // También inicializar si ya estamos en la sección de ganancias
    if (document.getElementById('ganancias-section') && !window.gananciasManager) {
        setTimeout(() => {
            window.gananciasManager = new GestionGanancias();
        }, 1000);
    }
});

// Exportar para uso global
window.GestionGanancias = GestionGanancias;

// Función global para recargar ganancias desde otras secciones
window.recargarGanancias = function () {
    if (window.gananciasManager) {
        window.gananciasManager.cargarProductosPaginados();
        window.gananciasManager.calcularGanancias();
    }
};