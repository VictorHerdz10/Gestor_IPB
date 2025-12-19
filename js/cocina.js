// Control de Cocina - VERSIÓN MEJORADA CON VALIDACIONES Y PRODUCTOS COMPUESTOS
document.addEventListener('DOMContentLoaded', function () {
    // Elementos del DOM
    const cocinaTable = document.getElementById('cocina-tbody');
    const cocinaSearch = document.getElementById('cocina-search');
    const btnEditarFinalCocina = document.getElementById('btn-agregar-agrego');
    const btnFinalizarDiaCocina = document.getElementById('btn-finalizar-dia-cocina');
    const btnSincronizarEmptyCocina = document.getElementById('btn-sincronizar-empty-cocina');
    const cocinaEmptyState = document.getElementById('cocina-empty-state');
    const saveIndicatorCocina = document.getElementById('save-indicator-cocina');
    const cocinaTableContainer = document.getElementById('cocina-table-container');
    const cocinaNoProducts = document.getElementById('cocina-no-products');
    const btnIrProductos = document.getElementById('btn-ir-productos');

    // Elementos de agregos
    const agregoForm = document.getElementById('agrego-form');
    const btnCancelarAgrego = document.getElementById('btn-cancelar-agrego');
    const formNuevoAgrego = document.getElementById('form-nuevo-agrego');
    const listaAgregos = document.getElementById('lista-agregos');
    const btnAgregarAgregoTop = document.getElementById('btn-agregar-agrego-top');

    // Variables de estado
    let cocinaData = [];
    let productosCocina = [];
    let agregos = [];
    let relacionesProductos = []; // Relaciones fijas: producto -> ingrediente
    let relacionesPanIngredientes = []; // Relaciones para panes con ingredientes
    let autoSaveTimer = null;
    let editingFinalEnabled = false;
    let paginaActualCocina = 1;
    let productosPorPaginaCocina = 10;
    let datosFiltradosCocina = [];

    // Inicializar
    initCocina();

    async function initCocina() {
        try {
            mostrarCargandoCocina();

            // 1. Cargar productos primero
            await cargarProductosCocina();
            await cargarRelacionesProductos();

            // 2. Sincronizar estructura (sin reiniciar vendidos)
            await sincronizarConProductosCocina();

            // 3. CARGAR DATOS después de sincronizar estructura
            await cargarDatosCocina();
            await cargarAgregos();

            // 4. Reconstruir consumos
            reconstruirConsumosDesdeAgregos();

            setupEventListeners();
            verificarProductosCocina();

            // 5. Recalcular todo
            recalcularDisponibilidad();
            datosFiltradosCocina = [...cocinaData]; // Inicializar datos filtrados
            actualizarTablaCocina();
            actualizarResumenCocina();
            actualizarListaAgregos();
            ocultarCargandoCocina();


        } catch (error) {
            console.error('Error inicializando cocina:', error);
            showNotification('Error al cargar datos de cocina', 'error');
        }
    }

    function verificarProductosCocina() {
        if (productosCocina.length === 0) {
            if (cocinaTableContainer) cocinaTableContainer.style.display = 'none';
            if (cocinaNoProducts) cocinaNoProducts.style.display = 'block';
            if (document.getElementById('agregos-section')) {
                document.getElementById('agregos-section').style.display = 'none';
            }
            if (document.getElementById('cocina-resumen')) {
                document.getElementById('cocina-resumen').style.display = 'none';
            }
        } else {
            if (cocinaTableContainer) cocinaTableContainer.style.display = 'block';
            if (cocinaNoProducts) cocinaNoProducts.style.display = 'none';
            if (document.getElementById('agregos-section')) {
                document.getElementById('agregos-section').style.display = 'block';
            }
            if (document.getElementById('cocina-resumen')) {
                document.getElementById('cocina-resumen').style.display = 'block';
            }
        }
    }

    function cargarProductosCocina() {
        return new Promise((resolve) => {
            const productosGuardados = localStorage.getItem('ipb_cocina_products');

            if (productosGuardados) {
                productosCocina = JSON.parse(productosGuardados);
            } else {
                productosCocina = [];
            }

            productosCocina.sort((a, b) => a.nombre.localeCompare(b.nombre));
            resolve();
        });
    }

    function cargarRelacionesProductos() {
        return new Promise((resolve) => {
            const relacionesGuardadas = localStorage.getItem('cocina_relaciones_fijas');
            relacionesProductos = relacionesGuardadas ? JSON.parse(relacionesGuardadas) : [];
            resolve();
        });
    }

    function guardarRelacionesProductos() {
        localStorage.setItem('cocina_relaciones_fijas', JSON.stringify(relacionesProductos));
        localStorage.setItem('cocina_relaciones_panes', JSON.stringify(relacionesPanIngredientes));
    }

    function cargarDatosCocina() {
        return new Promise((resolve) => {
            const datosGuardados = localStorage.getItem('ipb_cocina');

            if (datosGuardados) {
                const datosCargados = JSON.parse(datosGuardados);

                // Fusionar datos cargados con la estructura actual
                datosCargados.forEach(datoCargado => {
                    const productoExistente = cocinaData.find(p => p.id === datoCargado.id);
                    if (productoExistente) {
                        // Preservar TODOS los valores importantes
                        Object.assign(productoExistente, {
                            inicio: datoCargado.inicio || 0,
                            entrada: datoCargado.entrada || 0,
                            venta: datoCargado.venta || 0,
                            final: datoCargado.final || 0,
                            vendido: datoCargado.vendido || 0,  // ← CRÍTICO
                            importe: datoCargado.importe || 0,
                            disponible: datoCargado.disponible || 0,
                            historial: datoCargado.historial || [],
                            ultimaActualizacion: datoCargado.ultimaActualizacion || obtenerHoraActual(),
                            finalEditado: datoCargado.finalEditado || false  // ← CRÍTICO
                        });

                        // Recalcular para asegurar consistencia
                        recalcularProductoCocina(productoExistente);
                    }
                });
            } else {
                // Si no hay datos guardados, inicializar con valores por defecto
                cocinaData.forEach(producto => {
                    producto.inicio = 0;
                    producto.entrada = 0;
                    producto.venta = 0;
                    producto.final = 0;
                    producto.vendido = 0;  // ← Iniciar en 0
                    producto.importe = 0;
                    producto.disponible = 0;
                    producto.historial = [];
                    producto.ultimaActualizacion = obtenerHoraActual();
                    producto.finalEditado = false;  // ← Iniciar en false
                });
            }

            resolve();
        });
    }

    function guardarDatosCocina() {
        try {
            localStorage.setItem(`ipb_cocina`, JSON.stringify(cocinaData));
            guardarAgregos();
            guardarRelacionesProductos();
            mostrarIndicadorGuardadoCocina();
        } catch (error) {
            console.error('Error guardando datos de cocina:', error);
            showNotification('Error al guardar datos de cocina', 'error');
        }
    }

    function cargarAgregos() {
        return new Promise((resolve) => {
            const today = getTodayDate();
            const agregosGuardados = localStorage.getItem(`cocina_agregos`);

            agregos = agregosGuardados ? JSON.parse(agregosGuardados) : [];
            resolve();
        });
    }

    function reconstruirConsumosDesdeAgregos() {
        // RESETEAR primero todos los vendidos de ingredientes
        cocinaData.forEach(producto => {
            if (producto.esIngrediente) {
                producto.vendido = 0;
            }
        });

        // Calcular consumo desde agregos
        agregos.forEach(agrego => {
            if (agrego.ingredientes && agrego.ingredientes.length > 0) {
                agrego.ingredientes.forEach(ingrediente => {
                    const productoIngrediente = cocinaData.find(p => p.id === ingrediente.id);
                    if (productoIngrediente) {
                        // Sumar la cantidad correcta según la estructura del agrego
                        let cantidad = 0;

                        if (ingrediente.cantidadTotal !== undefined) {
                            cantidad = ingrediente.cantidadTotal;
                        } else if (ingrediente.cantidad !== undefined) {
                            cantidad = ingrediente.cantidad;
                        } else if (ingrediente.cantidadPorProducto !== undefined && agrego.cantidad !== undefined) {
                            cantidad = ingrediente.cantidadPorProducto * agrego.cantidad;
                        } else {
                            cantidad = agrego.cantidad || 1;
                        }

                        productoIngrediente.vendido += cantidad;
                    }
                });
            }
        });

        // Calcular consumo desde productos principales (si existen relaciones)
        cocinaData.forEach(producto => {
            if (!producto.esIngrediente && producto.vendido > 0) {
                const relaciones = relacionesProductos.filter(r => r.productoId === producto.id);
                relaciones.forEach(rel => {
                    const ingrediente = cocinaData.find(p => p.id === rel.ingredienteId);
                    if (ingrediente) {
                        ingrediente.vendido += producto.vendido * rel.cantidad;
                    }
                });
            }
        });

        // Recalcular final y disponibilidad para todos los ingredientes
        cocinaData.forEach(producto => {
            if (producto.esIngrediente) {
                producto.final = Math.max(0, producto.venta - producto.vendido);
                producto.disponible = Math.max(0, producto.venta - producto.vendido);
            }
        });
    }
    function guardarAgregos() {
        const today = getTodayDate();
        localStorage.setItem(`cocina_agregos`, JSON.stringify(agregos));
    }

    function recalcularDisponibilidad() {
        // Calcular disponibilidad para cada ingrediente
        cocinaData.forEach(producto => {
            if (producto.esIngrediente) {
                // Disponible = Venta - Vendido (lo que realmente queda)
                producto.disponible = Math.max(0, producto.venta - producto.vendido);
            } else {
                producto.disponible = 0;
            }
        });
    }

    function actualizarTablaCocina() {
        if (!cocinaTable || productosCocina.length === 0) return;

        cocinaTable.innerHTML = '';

        if (cocinaData.length === 0) {
            if (cocinaEmptyState) cocinaEmptyState.style.display = 'block';
            actualizarControlesPaginacionCocina(); // Actualizar paginación
            return;
        }

        if (cocinaEmptyState) cocinaEmptyState.style.display = 'none';

        // Filtrar datos si hay búsqueda
        const searchTerm = cocinaSearch ? cocinaSearch.value.toLowerCase().trim() : '';
        datosFiltradosCocina = cocinaData.filter(producto =>
            producto.nombre.toLowerCase().includes(searchTerm)
        );

        // Calcular índices para la paginación
        const inicio = (paginaActualCocina - 1) * productosPorPaginaCocina;
        const fin = paginaActualCocina * productosPorPaginaCocina;
        const productosPagina = datosFiltradosCocina.slice(inicio, fin);

        // Crear filas solo para los productos de esta página
        productosPagina.forEach((producto, index) => {
            const row = crearFilaProductoCocina(producto, inicio + index);
            cocinaTable.appendChild(row);
        });

        // Actualizar controles de paginación
        actualizarControlesPaginacionCocina();

    }
    function actualizarControlesPaginacionCocina() {
        const paginacionContainer = document.getElementById('paginacion-cocina');
        if (!paginacionContainer) return;

        const totalProductos = datosFiltradosCocina.length;
        const totalPaginas = Math.ceil(totalProductos / productosPorPaginaCocina);

        // Si hay 0 productos o solo 1 página, ocultar paginación
        if (totalProductos === 0 || totalPaginas <= 1) {
            paginacionContainer.style.display = 'none';
            return;
        }

        paginacionContainer.style.display = 'flex';

        const inicio = Math.min((paginaActualCocina - 1) * productosPorPaginaCocina + 1, totalProductos);
        const fin = Math.min(paginaActualCocina * productosPorPaginaCocina, totalProductos);

        let html = `
        <div class="paginacion-info">
            <i class="fas fa-list-ol"></i>
            <span>Mostrando ${inicio}-${fin} de ${totalProductos} productos</span>
        </div>
        
        <div class="paginacion-controles">
            <button class="btn-paginacion" onclick="cambiarPaginaCocina(${paginaActualCocina - 1})" ${paginaActualCocina === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
                <span>Anterior</span>
            </button>
            
            <div class="paginacion-numeros">
    `;

        // Mostrar números de página con truncado inteligente
        const paginasAMostrar = 5;
        let inicioPaginas = Math.max(1, paginaActualCocina - Math.floor(paginasAMostrar / 2));
        let finPaginas = Math.min(totalPaginas, inicioPaginas + paginasAMostrar - 1);

        // Ajustar si no tenemos suficientes páginas
        if (finPaginas - inicioPaginas + 1 < paginasAMostrar) {
            inicioPaginas = Math.max(1, finPaginas - paginasAMostrar + 1);
        }

        // Página 1
        if (inicioPaginas > 1) {
            html += `<button class="btn-pagina" onclick="cambiarPaginaCocina(1)">1</button>`;
            if (inicioPaginas > 2) html += `<span class="puntos">...</span>`;
        }

        // Páginas intermedias
        for (let i = inicioPaginas; i <= finPaginas; i++) {
            html += `<button class="btn-pagina ${i === paginaActualCocina ? 'active' : ''}" onclick="cambiarPaginaCocina(${i})">${i}</button>`;
        }

        // Última página
        if (finPaginas < totalPaginas) {
            if (finPaginas < totalPaginas - 1) html += `<span class="puntos">...</span>`;
            html += `<button class="btn-pagina" onclick="cambiarPaginaCocina(${totalPaginas})">${totalPaginas}</button>`;
        }

        html += `
            </div>
            
            <button class="btn-paginacion" onclick="cambiarPaginaCocina(${paginaActualCocina + 1})" ${paginaActualCocina === totalPaginas ? 'disabled' : ''}>
                <span>Siguiente</span>
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
        
        <div class="paginacion-selector">
            <label>Mostrar:</label>
            <select onchange="cambiarProductosPorPaginaCocina(this.value)">
                <option value="10" ${productosPorPaginaCocina === 10 ? 'selected' : ''}>10</option>
                <option value="25" ${productosPorPaginaCocina === 25 ? 'selected' : ''}>25</option>
                <option value="50" ${productosPorPaginaCocina === 50 ? 'selected' : ''}>50</option>
                <option value="100" ${productosPorPaginaCocina === 100 ? 'selected' : ''}>100</option>
                <option value="200" ${productosPorPaginaCocina === 200 ? 'selected' : ''}>200</option>
            </select>
        </div>
    `;

        paginacionContainer.innerHTML = html;
    }
    // Función global para cambiar página en cocina
    window.cambiarPaginaCocina = function (nuevaPagina) {
        const totalPaginas = Math.ceil(datosFiltradosCocina.length / productosPorPaginaCocina);
        if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
            paginaActualCocina = nuevaPagina;
            actualizarTablaCocina();
        }
    };

    // Función global para cambiar productos por página en cocina
    window.cambiarProductosPorPaginaCocina = function (nuevoValor) {
        productosPorPaginaCocina = parseInt(nuevoValor);
        paginaActualCocina = 1;
        actualizarTablaCocina();
    };

    function crearFilaProductoCocina(producto, index) {

        const row = document.createElement('tr');
        row.dataset.id = producto.id;
        row.dataset.index = index;

        // Recalcular primero
        recalcularProductoCocina(producto);
        recalcularDisponibilidad();

        // Determinar valor a mostrar en campo final
        let valorFinal = producto.final;

        // MODIFICACIÓN CRÍTICA: Solo auto-ajustar si:
        // 1. NO es ingrediente (precio > 0)
        // 2. El final es 0 (no se ha vendido nada)
        // 3. NO estamos en modo edición de final
        // 4. El usuario NO ha editado manualmente el final (finalEditado === false)
        // 5. Hay ventas disponibles
        if (producto.precio > 0 &&
            valorFinal === 0 &&
            !editingFinalEnabled &&
            !producto.finalEditado &&
            producto.venta > 0) {
            valorFinal = producto.venta;
            producto.final = valorFinal;
            // Recalcular con el nuevo valor
            recalcularProductoCocina(producto);
        }

        // Si el usuario YA editó el final (finalEditado = true), respetar su valor
        if (producto.finalEditado) {
            // Asegurar que no sea mayor que la venta
            if (producto.final > producto.venta) {
                producto.final = producto.venta;
                recalcularProductoCocina(producto);
            }
        }
        // Verificar si tiene relaciones (se usa en otros productos)
        const esUsadoEn = relacionesProductos.filter(r => r.ingredienteId === producto.id).length > 0;
        const esPan = relacionesPanIngredientes.filter(r => r.panId === producto.id).length > 0;
        const esProductoConIngredientes = relacionesProductos.filter(r => r.productoId === producto.id).length > 0;

        row.innerHTML = `
        <td class="producto-cell">
            <span class="product-name">${producto.nombre}</span>
            ${producto.esIngrediente ? '<span class="badge-ingrediente">Ingrediente</span>' : ''}
            ${esUsadoEn ? '<span class="badge-relacion" title="Usado en otros productos">✓</span>' : ''}
            ${esPan ? '<span class="badge-pan" title="Pan con ingredientes">🍞</span>' : ''}
            ${esProductoConIngredientes ? '<span class="badge-producto" title="Producto con ingredientes fijos">⭐</span>' : ''}
        </td>
        <td class="numeric-cell currency-cell">
            <span class="price-display">$${producto.precio.toFixed(2)}</span>
        </td>
        <td class="numeric-cell">
            <input type="number" 
                   min="0" 
                   value="${producto.inicio}" 
                   data-field="inicio" 
                   data-id="${producto.id}"
                   class="editable-input inicio-input"
                   placeholder="0"
                   autocomplete="off">
        </td>
        <td class="numeric-cell">
            <input type="number" 
                   min="0" 
                   value="${producto.entrada}" 
                   data-field="entrada" 
                   data-id="${producto.id}"
                   class="editable-input entrada-input"
                   placeholder="0"
                   autocomplete="off">
        </td>
        <td class="calculated-cell venta-cell">
            <span class="venta-display">${producto.venta}</span>
        </td>
        <td class="numeric-cell">
            <input type="number" 
                   min="0" 
                   max="${producto.venta}"
                   value="${valorFinal}" 
                   data-field="final" 
                   data-id="${producto.id}"
                   data-venta="${producto.venta}"
                   class="editable-input final-input ${editingFinalEnabled ? 'editing-enabled' : ''}"
                   placeholder="0"
                   autocomplete="off"
                   ${!editingFinalEnabled ? 'disabled' : ''}>
        </td>
        <td class="calculated-cell vendido-cell">
            <span class="vendido-display">${producto.vendido}</span>
        </td>
        <td class="currency-cell importe-cell">
            <span class="importe-display">${producto.precio > 0 ? `$${producto.importe.toFixed(2)}` : '$0.00'}</span>
        </td>
    `;

        agregarEventListenersFila(row, producto);

        return row;
    }

    function agregarEventListenersFila(row, producto) {
        const inputs = row.querySelectorAll('.editable-input:not(:disabled)');
        inputs.forEach(input => {
            input.dataset.oldValue = input.value;

            input.addEventListener('focus', function () {
                this.dataset.oldValue = this.value;
                this.classList.add('focus');

                if (this.dataset.field === 'final' && this.disabled && editingFinalEnabled) {
                    this.disabled = false;
                    this.classList.add('editing-enabled');
                }
            });

            input.addEventListener('blur', function () {
                this.classList.remove('focus');
                let newValue = parseInt(this.value) || 0;
                const oldValue = parseInt(this.dataset.oldValue) || 0;
                const field = this.dataset.field;

                // Validación especial para campo final
                if (field === 'final') {
                    const venta = parseInt(this.dataset.venta) || 0;

                    // Permitir 0 (vender todo) - CORRECCIÓN AQUÍ: usar newValue en lugar de value
                    if (newValue === 0) {
                        // Si es 0, está bien - significa vender todo
                        // No hacer nada especial, dejar que pase
                    }
                    // Si el valor es mayor a la venta, ajustar y mostrar notificación
                    else if (newValue > venta) {
                        newValue = venta;
                        this.value = venta;

                        showNotification(
                            `El valor final no puede ser mayor a la venta (${venta}). Se ajustó a ${venta}.`,
                            'warning'
                        );
                    }

                    // Validar disponibilidad de ingredientes si es un producto con ingredientes fijos
                    if (!producto.esIngrediente) {
                        // Pasar el nuevo valor a la validación
                        const puedeVender = validarDisponibilidadIngredientes(producto, newValue);
                        if (!puedeVender) {
                            // Si no puede vender, restaurar el valor anterior
                            newValue = oldValue;
                            this.value = oldValue;
                        }
                    }
                }

                if (newValue !== oldValue) {
                    this.classList.add('edited');
                    actualizarProductoCocinaDesdeInput(this);
                    productoCocina();
                    programarAutoSaveCocina();

                    setTimeout(() => {
                        this.classList.remove('edited');
                    }, 1000);
                }
            });

            input.addEventListener('input', function () {
                const field = this.dataset.field;
                let value = parseInt(this.value) || 0;

                // Validación en tiempo real para campo final
                if (field === 'final') {
                    const venta = parseInt(this.dataset.venta) || 0;

                    if (value > venta) {
                        value = venta;
                        this.value = venta;

                        // Mostrar notificación solo si el usuario está escribiendo
                        if (this === document.activeElement) {
                            showNotification(
                                `El valor final no puede ser mayor a la venta (${venta})`,
                                'error'
                            );
                        }
                    }
                }

                if (field === 'inicio' || field === 'entrada') {
                    actualizarProductoCocinaDesdeInput(this, true);
                }
            });

            input.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    this.blur();
                }
            });
        });
    }

    function validarDisponibilidadIngredientes(producto, nuevoFinal, mostrarNotificacion = true) {
        // Calcular cuántas unidades se quieren vender
        const venta = producto.venta;
        const nuevoVendido = venta - nuevoFinal;
        const diferenciaVendido = nuevoVendido - producto.vendido;

        if (diferenciaVendido <= 0) return true; // No se está vendiendo más

        // Buscar relaciones de ingredientes para este producto
        const relaciones = relacionesProductos.filter(r => r.productoId === producto.id);

        // Si no tiene relaciones, puede vender todo
        if (relaciones.length === 0) return true;

        let hayDisponibilidad = true;
        let mensajeError = '';

        relaciones.forEach(relacion => {
            const ingrediente = cocinaData.find(p => p.id === relacion.ingredienteId);
            if (ingrediente) {
                const ingredienteNecesario = diferenciaVendido * relacion.cantidad;

                if (ingrediente.disponible < ingredienteNecesario) {
                    hayDisponibilidad = false;
                    const faltante = ingredienteNecesario - ingrediente.disponible;
                    mensajeError += `\n• ${ingrediente.nombre}: Necesitas ${ingredienteNecesario}, solo tienes ${ingrediente.disponible} disponible(s). Faltan ${faltante}.`;
                }
            }
        });

        if (!hayDisponibilidad && mostrarNotificacion) {
            showNotification(
                `No hay suficientes ingredientes para vender ${diferenciaVendido} ${producto.nombre}:${mensajeError}\n\nPor favor, da entrada a más ingredientes o ajusta el valor final.`,
                'error'
            );
            return false;
        }

        return hayDisponibilidad;
    }

    function recalcularProductoCocina(producto) {
        // Asegurar que todos los valores sean números
        producto.inicio = parseInt(producto.inicio) || 0;
        producto.entrada = parseInt(producto.entrada) || 0;
        producto.final = parseInt(producto.final) || 0;
        producto.vendido = parseInt(producto.vendido) || 0;
        producto.venta = parseInt(producto.venta) || 0;

        // Calcular venta
        const nuevaVenta = producto.inicio + producto.entrada;

        // Si la venta cambió
        if (producto.venta !== nuevaVenta) {
            producto.venta = nuevaVenta;

            // Si el final NO ha sido editado por el usuario, ajustarlo automáticamente
            if (!producto.finalEditado) {
                producto.final = producto.venta;
            } else {
                // Si ya fue editado, asegurar que no sea mayor que la venta
                if (producto.final > producto.venta) {
                    producto.final = producto.venta;
                }
            }
        }

        // Calcular vendido e importe
        producto.vendido = Math.max(0, producto.venta - producto.final);
        producto.importe = producto.precio > 0 ? producto.vendido * producto.precio : 0;

        // Si es un producto con ingredientes, validar disponibilidad automáticamente
        if (!producto.esIngrediente && producto.vendido > 0) {
            const puedeVender = validarDisponibilidadIngredientes(producto, producto.final, false);
            if (!puedeVender) {
                // Ajustar automáticamente a lo máximo que puede vender
                const maxPuedeVender = calcularMaximoVendible(producto);
                producto.final = Math.max(0, producto.venta - maxPuedeVender);
                producto.vendido = maxPuedeVender;
                producto.importe = producto.precio > 0 ? producto.vendido * producto.precio : 0;
            }
        }

        return producto;
    }
    function calcularMaximoVendible(producto) {
        if (producto.esIngrediente) return producto.venta;

        const relaciones = relacionesProductos.filter(r => r.productoId === producto.id);
        if (relaciones.length === 0) return producto.venta;

        let maxVendible = producto.venta;

        relaciones.forEach(relacion => {
            const ingrediente = cocinaData.find(p => p.id === relacion.ingredienteId);
            if (ingrediente) {
                // Calcular lo que REALMENTE queda del ingrediente
                // Esto es más confiable que usar disponible o final
                const ventaDelIngrediente = ingrediente.venta || 0;
                const vendidoDelIngrediente = ingrediente.vendido || 0;
                const realmenteQueda = Math.max(0, ventaDelIngrediente - vendidoDelIngrediente);

                const maxConEsteIngrediente = Math.floor(realmenteQueda / relacion.cantidad);

                maxVendible = Math.min(maxVendible, maxConEsteIngrediente);
            }
        });

        return Math.max(0, maxVendible);
    }

    function actualizarProductoCocinaDesdeInput(input, realTime = false) {
        const id = parseInt(input.dataset.id);
        const field = input.dataset.field;
        const value = parseInt(input.value) || 0;

        const productoIndex = cocinaData.findIndex(p => p.id === id);
        if (productoIndex !== -1) {
            const producto = cocinaData[productoIndex];
            const oldValue = producto[field];

            if (value !== oldValue) {
                producto[field] = value;
                producto.ultimaActualizacion = obtenerHoraActual();

                // Si se está editando el campo "final", marcar como editado
                if (field === 'final') {
                    producto.finalEditado = true; // ← Asegurar que se marque como editado
                }

                // Recalcular primero
                recalcularProductoCocina(producto);

                // Si es un producto principal (no ingrediente) y cambió el FINAL
                if (!producto.esIngrediente && field === 'final') {
                    // Calcular cuánto se vendió realmente
                    const nuevoVendido = producto.venta - value;

                    // Validar disponibilidad de ingredientes
                    if (!validarDisponibilidadIngredientes(producto, value, true)) {
                        // Revertir el cambio si no hay disponibilidad
                        producto[field] = oldValue;
                        recalcularProductoCocina(producto);
                        // Restaurar el valor en el input
                        input.value = oldValue;
                        return;
                    }

                    // Actualizar ingredientes relacionados
                    const relaciones = relacionesProductos.filter(r => r.productoId === producto.id);
                    relaciones.forEach(relacion => {
                        const ingrediente = cocinaData.find(p => p.id === relacion.ingredienteId);
                        if (ingrediente) {
                            const consumoAnterior = producto.vendido * relacion.cantidad;
                            const consumoNuevo = nuevoVendido * relacion.cantidad;
                            const diferencia = consumoNuevo - consumoAnterior;

                            ingrediente.vendido += diferencia;
                            // Recalcular el ingrediente
                            recalcularProductoCocina(ingrediente);
                        }
                    });
                }

                // Agregar al historial
                producto.historial.push({
                    fecha: new Date().toISOString(),
                    hora: obtenerHoraActual(),
                    campo: field,
                    valorAnterior: oldValue,
                    valorNuevo: value,
                    accion: 'modificación'
                });

                if (realTime) {
                    actualizarFilaUICocina(id);
                } else {
                    actualizarFilaCompletaCocina(id);
                }

                // Recalcular disponibilidad después de todos los cambios
                recalcularDisponibilidad();

                // Guardar cambios
                guardarDatosCocina();
            }
        }
    }

    function recalcularConsumosPorRelaciones() {

        // 1. Calcular consumo total desde AGREGOS
        const consumoDesdeAgregos = {};
        agregos.forEach(agrego => {
            if (agrego.ingredientes && agrego.ingredientes.length > 0) {
                agrego.ingredientes.forEach(ingrediente => {
                    if (!consumoDesdeAgregos[ingrediente.id]) {
                        consumoDesdeAgregos[ingrediente.id] = 0;
                    }
                    consumoDesdeAgregos[ingrediente.id] += ingrediente.cantidad;
                });
            }
        });


        // 2. Para cada PRODUCTO NO INGREDIENTE, verificar consistencia
        cocinaData.forEach(producto => {
            if (!producto.esIngrediente) {
                const relaciones = relacionesProductos.filter(r => r.productoId === producto.id);

                if (relaciones.length > 0) {
                    // Calcular máximo que puede vender basado en disponibilidad de ingredientes
                    const maxVendible = calcularMaximoVendible(producto);

                    // Lo que el usuario QUIERE vender (según el campo final)
                    const quiereVender = producto.venta - producto.final;

                    // MODIFICACIÓN CRÍTICA: Solo ajustar si el usuario NO ha editado manualmente
                    // O si está intentando vender más de lo que puede
                    if (quiereVender > maxVendible) {


                        // Si el usuario NO ha editado manualmente, ajustamos automáticamente
                        if (!producto.finalEditado) {


                            // Ajustar a lo máximo que puede vender
                            const nuevoVendido = maxVendible;
                            const nuevoFinal = Math.max(0, producto.venta - nuevoVendido);

                            // Solo ajustar si hay cambio
                            if (producto.final !== nuevoFinal) {
                                producto.final = nuevoFinal;
                                producto.vendido = nuevoVendido;
                                producto.importe = producto.precio > 0 ? producto.vendido * producto.precio : 0;

                            }
                        } else {
                            // Si el usuario YA editó manualmente, mostrar advertencia pero no ajustar
                            // Podrías mostrar una notificación opcional aquí
                            // showNotification(`${producto.nombre}: Quieres vender ${quiereVender} pero solo hay ingredientes para ${maxVendible}`, 'warning');
                        }
                    }
                }
            }
        });

        // 3. Para cada INGREDIENTE, calcular consumo total y ajustar si es necesario
        cocinaData.forEach(ingrediente => {
            if (ingrediente.esIngrediente) {
                let consumoTotal = 0;

                // A. Consumo desde agregos
                const consumoAgregos = consumoDesdeAgregos[ingrediente.id] || 0;
                consumoTotal += consumoAgregos;

                // B. Consumo desde productos vendidos
                const relacionesComoIngrediente = relacionesProductos.filter(r => r.ingredienteId === ingrediente.id);
                relacionesComoIngrediente.forEach(rel => {
                    const producto = cocinaData.find(p => p.id === rel.productoId);
                    if (producto && !producto.esIngrediente) {
                        consumoTotal += producto.vendido * rel.cantidad;
                    }
                });

                // MODIFICACIÓN: Solo ajustar ingredientes si el consumoTotal es diferente
                // Pero respetar si el ingrediente fue editado manualmente
                if (consumoTotal !== ingrediente.vendido) {
                    // Si el ingrediente NO ha sido editado manualmente, ajustamos
                    if (!ingrediente.finalEditado) {

                        ingrediente.vendido = consumoTotal;
                        ingrediente.final = Math.max(0, ingrediente.venta - ingrediente.vendido);
                        recalcularProductoCocina(ingrediente);
                    } else {

                    }
                }
            }
        });

        // 4. Recalcular disponibilidad final
        recalcularDisponibilidad();

    }
    function actualizarFilaUICocina(productoId) {
        const producto = cocinaData.find(p => p.id === productoId);
        if (!producto) return;

        const row = document.querySelector(`tr[data-id="${productoId}"]`);
        if (!row) return;

        const ventaDisplay = row.querySelector('.venta-display');
        const vendidoDisplay = row.querySelector('.vendido-display');
        const importeDisplay = row.querySelector('.importe-display');
        const finalInput = row.querySelector('.final-input');

        if (ventaDisplay) ventaDisplay.textContent = producto.venta;
        if (vendidoDisplay) vendidoDisplay.textContent = producto.vendido;
        if (importeDisplay) {
            importeDisplay.textContent = producto.precio > 0 ? `$${producto.importe.toFixed(2)}` : '$0.00';
        }
        if (finalInput) {
            finalInput.dataset.venta = producto.venta;
            finalInput.max = producto.venta;
        }

        actualizarResumenCocina();
    }

    function actualizarFilaCompletaCocina(productoId) {
        const productoIndex = cocinaData.findIndex(p => p.id === productoId);
        if (productoIndex === -1) return;

        const row = document.querySelector(`tr[data-id="${productoId}"]`);
        if (!row) return;

        const producto = cocinaData[productoIndex];
        const newRow = crearFilaProductoCocina(producto, productoIndex);

        row.parentNode.replaceChild(newRow, row);

        actualizarResumenCocina();
    }

    function programarAutoSaveCocina() {
        if (autoSaveTimer) {
            clearTimeout(autoSaveTimer);
        }

        autoSaveTimer = setTimeout(() => {
            guardarDatosCocina();
        }, 1500);
    }

    function mostrarIndicadorGuardadoCocina() {
        if (!saveIndicatorCocina) return;

        const saveTime = document.getElementById('save-time-cocina');
        if (saveTime) {
            saveTime.textContent = `Guardado ${obtenerHoraActual()}`;
        }

        saveIndicatorCocina.style.display = 'flex';

        setTimeout(() => {
            saveIndicatorCocina.classList.add('fade-out');
            setTimeout(() => {
                saveIndicatorCocina.style.display = 'none';
                saveIndicatorCocina.classList.remove('fade-out');
            }, 300);
        }, 3000);
    }

    function setupEventListeners() {
        // Búsqueda
        if (cocinaSearch) {
            cocinaSearch.addEventListener('input', function () {
                paginaActualCocina = 1; // Resetear a página 1 al buscar
                const searchTerm = this.value.toLowerCase().trim();
                datosFiltradosCocina = cocinaData.filter(producto =>
                    producto.nombre.toLowerCase().includes(searchTerm)
                );

                // Mostrar/ocultar empty state según resultados
                if (cocinaEmptyState) {
                    cocinaEmptyState.style.display = datosFiltradosCocina.length === 0 ? 'block' : 'none';
                }

                // Actualizar tabla y paginación
                actualizarTablaCocina();
            });
        }

        // Editar final
        if (btnEditarFinalCocina) {
            btnEditarFinalCocina.addEventListener('click', function () {
                editingFinalEnabled = !editingFinalEnabled;

                if (editingFinalEnabled) {
                    const finalInputs = document.querySelectorAll('#cocina-tbody .final-input');
                    finalInputs.forEach(input => {
                        input.disabled = false;
                        input.classList.add('editing-enabled');

                        if (parseInt(input.value) === 0) {
                            const id = parseInt(input.dataset.id);
                            const producto = cocinaData.find(p => p.id === id);
                            if (producto && producto.venta > 0) {
                                input.value = producto.venta;
                                input.max = producto.venta;
                                input.dataset.venta = producto.venta;
                                actualizarProductoCocinaDesdeInput(input, false);
                            }
                        }
                    });

                    this.innerHTML = '<i class="fas fa-times"></i><span class="btn-text">Cancelar Edición</span>';
                    this.classList.remove('btn-primary');
                    this.classList.add('btn-secondary');

                    showNotification('Modo edición de valores finales activado en cocina', 'info');
                } else {
                    const finalInputs = document.querySelectorAll('#cocina-tbody .final-input');
                    finalInputs.forEach(input => {
                        input.disabled = true;
                        input.classList.remove('editing-enabled');
                    });

                    this.innerHTML = '<i class="fas fa-sliders-h"></i><span class="btn-text">Editar Final</span>';
                    this.classList.remove('btn-secondary');
                    this.classList.add('btn-primary');

                    showNotification('Modo edición desactivado en cocina', 'info');
                }

                actualizarTablaCocina();
            });
        }

        // Finalizar día en cocina
        if (btnFinalizarDiaCocina) {
            btnFinalizarDiaCocina.addEventListener('click', function () {
                showConfirmationModal(
                    'Finalizar Día en Cocina',
                    '¿Estás seguro de finalizar el día en cocina? Se calcularán automáticamente los productos vendidos.',
                    'warning',
                    function () {
                        cocinaData.forEach(producto => {
                            recalcularProductoCocina(producto);
                        });

                        recalcularConsumosPorRelaciones();

                        guardarDatosCocina();
                        actualizarTablaCocina();
                        actualizarResumenCocina();

                        showNotification('Día en cocina finalizado correctamente', 'success');
                    }
                );
            });
        }


        if (btnSincronizarEmptyCocina) {
            btnSincronizarEmptyCocina.addEventListener('click', function () {
                cargarProductosCocina().then(() => {
                    if (productosCocina.length > 0) {
                        sincronizarConProductosCocina();
                        recalcularConsumosPorRelaciones();
                        reconstruirConsumosDesdeAgregos();
                        guardarDatosCocina();
                        verificarProductosCocina();
                        actualizarTablaCocina();
                        actualizarResumenCocina();

                        showNotification(`Sincronizados ${productosCocina.length} productos de cocina`, 'success');
                    } else {
                        showNotification('No hay productos en la cocina para sincronizar', 'warning');
                    }
                });
            });
        }

        // Botón para ir a productos
        if (btnIrProductos) {
            btnIrProductos.addEventListener('click', function () {
                const productoLink = document.querySelector('a[data-section="productos"]');
                if (productoLink) {
                    productoLink.click();
                }
            });
        }

        // Agregar agrego/producto compuesto
        if (btnAgregarAgregoTop) {
            btnAgregarAgregoTop.addEventListener('click', mostrarModalSeleccionTipo);
        }

        // Cancelar agrego
        if (btnCancelarAgrego) {
            btnCancelarAgrego.addEventListener('click', ocultarFormularioAgrego);
        }

        // Formulario de agrego (mantener por compatibilidad)
        if (formNuevoAgrego) {
            formNuevoAgrego.addEventListener('submit', function (e) {
                e.preventDefault();
                agregarNuevoAgregoSimple();
            });
        }
    }

    function sincronizarConProductosCocina() {
        const productosIds = productosCocina.map(p => p.id);
        const cocinaIds = cocinaData.map(p => p.id);

        productosCocina.forEach(producto => {
            if (!cocinaIds.includes(producto.id)) {
                // NUEVO producto: crear con valores por defecto
                cocinaData.push({
                    id: producto.id,
                    nombre: producto.nombre,
                    precio: producto.precio,
                    esIngrediente: producto.precio === 0,
                    inicio: 0,
                    entrada: 0,
                    venta: 0,
                    final: 0,
                    vendido: 0,
                    importe: 0,
                    disponible: 0,
                    historial: [],
                    ultimaActualizacion: obtenerHoraActual(),
                    finalEditado: false // ← Iniciar en false
                });
            } else {
                // Producto EXISTENTE: actualizar solo nombre y precio
                const productoExistente = cocinaData.find(p => p.id === producto.id);
                if (productoExistente) {
                    // Guardar valores críticos ANTES de actualizar
                    const valoresPreservados = {
                        inicio: productoExistente.inicio,
                        entrada: productoExistente.entrada,
                        venta: productoExistente.venta,
                        final: productoExistente.final,
                        vendido: productoExistente.vendido,
                        importe: productoExistente.importe,
                        disponible: productoExistente.disponible,
                        historial: productoExistente.historial,
                        ultimaActualizacion: productoExistente.ultimaActualizacion,
                        finalEditado: productoExistente.finalEditado // ← Preservar este valor
                    };

                    // Actualizar solo nombre y precio
                    productoExistente.nombre = producto.nombre;
                    productoExistente.precio = producto.precio;
                    productoExistente.esIngrediente = producto.precio === 0;

                    // Restaurar valores preservados
                    Object.assign(productoExistente, valoresPreservados);

                    // Recalcular venta si es necesario
                    const nuevaVenta = productoExistente.inicio + productoExistente.entrada;
                    if (productoExistente.venta !== nuevaVenta) {
                        productoExistente.venta = nuevaVenta;
                        // Ajustar final solo si no ha sido editado
                        if (!productoExistente.finalEditado) {
                            productoExistente.final = productoExistente.venta;
                        }
                    }

                    // Recalcular el producto completo
                    recalcularProductoCocina(productoExistente);
                }
            }
        });

        // Eliminar productos que ya no existen
        cocinaData = cocinaData.filter(item => productosIds.includes(item.id));

        // Actualizar datos filtrados
        datosFiltradosCocina = [...cocinaData];

        return Promise.resolve();
    }

    function mostrarModalSeleccionTipo() {
        const modalHtml = `
            <div class="modal active" id="modal-seleccion-tipo">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-plus-circle"></i> ¿Qué deseas registrar?</h3>
                        <button class="modal-close" onclick="document.getElementById('modal-seleccion-tipo').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="seleccion-tipo-grid">
                            <button class="tipo-opcion" id="tipo-agrego-simple">
                                <div class="tipo-icono">
                                    <i class="fas fa-hamburger"></i>
                                </div>
                                <div class="tipo-contenido">
                                    <h4>Agrego Simple o Producto Compuesto</h4>
                                    <p>Agrega un extra o complemento (ej: queso extra, salchicha)</p>
                                    <p>Producto con ingredientes fijos (ej: pan que usa queso, jamón)</p>
                                </div>
                            </button>
                            
                            <button class="tipo-opcion" id="tipo-configurar-relaciones">
                                <div class="tipo-icono">
                                    <i class="fas fa-cogs"></i>
                                </div>
                                <div class="tipo-contenido">
                                    <h4>Configurar Relaciones</h4>
                                    <p>Establecer qué ingredientes usa un producto</p>
                                </div>
                            </button>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="document.getElementById('modal-seleccion-tipo').remove()">
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('tipo-agrego-simple').addEventListener('click', function () {
            document.getElementById('modal-seleccion-tipo').remove();
            showModalAgregoSimple();
        });

        document.getElementById('tipo-configurar-relaciones').addEventListener('click', function () {
            document.getElementById('modal-seleccion-tipo').remove();
            showModalConfigurarRelaciones();
        });

        // Añadir estilos para la selección
        const style = document.createElement('style');
        style.textContent = `
            .seleccion-tipo-grid {
                display: grid;
                gap: 15px;
                margin: 20px 0;
            }
            
            .tipo-opcion {
                display: flex;
                align-items: center;
                padding: 15px;
                border: 2px solid #ddd;
                border-radius: 10px;
                background: white;
                cursor: pointer;
                transition: all 0.3s ease;
                text-align: left;
                width: 100%;
            }
            
            .tipo-opcion:hover {
                border-color: #4a6cf7;
                background: #f8f9ff;
                transform: translateY(-2px);
            }
            
            .tipo-icono {
                font-size: 24px;
                color: #4a6cf7;
                margin-right: 15px;
                width: 40px;
                text-align: center;
            }
            
            .tipo-contenido h4 {
                margin: 0 0 5px 0;
                color: #333;
            }
            
            .tipo-contenido p {
                margin: 0;
                color: #666;
                font-size: 14px;
            }
        `;
        document.head.appendChild(style);
    }

    function showModalAgregoSimple() {
        // Asegurarse de que la disponibilidad esté actualizada ANTES de abrir el modal
        recalcularDisponibilidad();

        // Filtrar solo ingredientes (productos con precio 0)
        const ingredientes = cocinaData.filter(p => p.precio === 0);

        if (ingredientes.length === 0) {
            showNotification('No hay ingredientes disponibles. Agrega productos con precio 0 primero.', 'warning');
            return;
        }

        // Crear modal con CHECKBOXES y VALIDACIONES
        const modalHtml = `
    <div class="modal active" id="modal-agrego-simple">
        <div class="modal-content modal-agrego-responsive">
            <div class="modal-header modal-header-agrego">
                <h3><i class="fas fa-hamburger"></i> Registrar Producto Compuesto</h3>
                <button class="modal-close" onclick="cerrarModalAgrego()">&times;</button>
            </div>
            <div class="modal-body modal-body-agrego">
                <!-- MENSAJES DE VALIDACIÓN -->
                <div id="alertas-validacion" class="alertas-container"></div>
                
                <!-- ADVERTENCIA INTELIGENTE PAN -->
                <div id="advertencia-pan" class="alert-warning-custom" style="display: none;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span id="texto-advertencia-pan"></span>
                </div>
                
                <!-- SECCIÓN 1: INFORMACIÓN BÁSICA -->
                <div class="seccion-basica">
                    <h4 class="seccion-titulo">
                        <i class="fas fa-info-circle"></i> Información del Producto
                    </h4>
                    <div class="form-grid-tres">
                        <div class="form-group-agrego">
                            <label for="agrego-nombre" class="form-label-agrego">
                                <i class="fas fa-tag"></i> Nombre *
                            </label>
                            <input type="text" id="agrego-nombre" class="form-input-agrego" 
                                   placeholder="Ej: Pan con Jamón, Combo Especial..." 
                                   required oninput="validarNombreProducto(this.value)">
                            <div class="form-helper">Describe claramente el producto</div>
                        </div>
                        
                        <div class="form-group-agrego">
                            <label for="agrego-precio" class="form-label-agrego">
                                <i class="fas fa-dollar-sign"></i> Precio *
                            </label>
                            <input type="number" id="agrego-precio" class="form-input-agrego" 
                                   placeholder="0.00" step="0.01" min="0" 
                                   required oninput="validarPrecioProducto(this.value)">
                            <div class="form-helper">Precio por unidad</div>
                        </div>
                        
                        <div class="form-group-agrego">
                            <label for="agrego-cantidad" class="form-label-agrego">
                                <i class="fas fa-box"></i> Cantidad *
                            </label>
                            <input type="number" id="agrego-cantidad" class="form-input-agrego" 
                                   placeholder="Ej: 4" min="1" value="1" 
                                   required oninput="validarCantidadProducto(this.value)">
                            <div class="form-helper">Unidades a vender</div>
                        </div>
                    </div>
                </div>
                
                <!-- VALIDACIÓN DE DISPONIBILIDAD -->
                <div id="validacion-disponibilidad" class="validacion-disponibilidad" style="display: none;">
                    <div class="validacion-header">
                        <i class="fas fa-clipboard-check"></i>
                        <span>Verificación de Disponibilidad</span>
                    </div>
                    <div id="resultado-disponibilidad" class="validacion-resultado"></div>
                </div>
                
                <!-- SECCIÓN 2: INGREDIENTES -->
                <div class="seccion-ingredientes-agrego">
                    <h4 class="seccion-titulo">
                        <i class="fas fa-utensils"></i> Seleccionar Ingredientes
                        <span class="requerido">*</span>
                    </h4>
                    
                    <div class="instruccion-ingredientes">
                        <i class="fas fa-info-circle"></i>
                        <span>Cada ingrediente seleccionado consume <strong>1 unidad por cada producto vendido</strong></span>
                    </div>
                    
                    <!-- CONTADOR Y ACCIONES -->
                    <div class="controles-ingredientes">
                        <div class="contador-y-mensaje">
                            <span id="contador-seleccionados" class="contador-badge">0 seleccionados</span>
                            <span id="mensaje-minimo" class="mensaje-error">
                                <i class="fas fa-exclamation-circle"></i> Selecciona al menos 1 ingrediente
                            </span>
                        </div>
                        
                        <div class="botones-accion">
                            <button type="button" class="btn btn-sm btn-outline" onclick="actualizarDisponibilidadCheckboxes()">
                                <i class="fas fa-sync-alt"></i> Actualizar
                            </button>
                            <button type="button" class="btn btn-sm btn-info" onclick="verificarDisponibilidadTotal()">
                                <i class="fas fa-search"></i> Verificar
                            </button>
                        </div>
                    </div>
                    
                    <!-- RESUMEN -->
                    <div class="resumen-checkboxes">
                        <div class="resumen-item">
                            <span class="resumen-label">Productos:</span>
                            <span id="calculo-checkbox-unidades" class="resumen-valor">1 unidad</span>
                        </div>
                        <div class="resumen-item">
                            <span class="resumen-label">Ingredientes:</span>
                            <span id="calculo-checkbox-ingredientes" class="resumen-valor">0 seleccionados</span>
                        </div>
                        <div class="resumen-item resumen-total">
                            <span class="resumen-label">Consumo total:</span>
                            <span id="calculo-checkbox-total" class="resumen-valor">0 unidades</span>
                        </div>
                        <div class="resumen-lista">
                            <span id="lista-ingredientes-seleccionados">Ningún ingrediente seleccionado</span>
                        </div>
                    </div>
                    
                    <!-- LISTA DE INGREDIENTES -->
                    <div class="ingredientes-checkbox-grid" id="ingredientes-checkbox-list">
                        ${ingredientes.map(ing => `
                            <div class="ingrediente-checkbox-item ${ing.disponible <= 0 ? 'disabled' : ''}" id="ingrediente-checkbox-${ing.id}">
                                <div class="checkbox-container">
                                    <input type="checkbox" 
                                           id="checkbox-${ing.id}"
                                           data-ingrediente-id="${ing.id}"
                                           data-ingrediente-nombre="${ing.nombre}"
                                           data-ingrediente-disponible="${ing.disponible}"
                                           class="ingrediente-checkbox"
                                           ${ing.disponible <= 0 ? 'disabled' : ''}
                                           onchange="manejarCheckboxIngrediente(this)">
                                    <label for="checkbox-${ing.id}" class="checkbox-label">
                                        <span class="custom-checkbox"></span>
                                        <div class="ingrediente-info-detalle">
                                            <span class="ingrediente-checkbox-nombre">${ing.nombre}</span>
                                            <span class="ingrediente-disponible-checkbox ${ing.disponible > 0 ? 'available' : 'unavailable'}">
                                                <i class="fas fa-box"></i> Disponible: <span id="disponible-checkbox-${ing.id}">${ing.disponible}</span>
                                            </span>
                                        </div>
                                    </label>
                                </div>
                                <div class="consumo-checkbox-display" id="consumo-checkbox-${ing.id}" style="display: none;">
                                    <div class="consumo-info">
                                        <i class="fas fa-calculator"></i>
                                        <span class="consumo-text">
                                            <span class="valor-consumo">0</span> unidad(es)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- SECCIÓN 3: NOTAS -->
                <div class="seccion-notas">
                    <h4 class="seccion-titulo">
                        <i class="fas fa-sticky-note"></i> Notas Adicionales
                    </h4>
                    <div class="form-group-agrego">
                        <textarea id="agrego-notas" class="form-textarea-agrego" 
                                  placeholder="Detalles adicionales, observaciones o instrucciones especiales..." 
                                  rows="3"></textarea>
                        <div class="form-helper">Opcional - Máximo 500 caracteres</div>
                    </div>
                </div>
            </div>
            <div class="modal-footer modal-footer-agrego">
                <button class="btn btn-outline" onclick="cerrarModalAgrego()">
                    <i class="fas fa-times"></i> Cancelar
                </button>
                <button class="btn btn-primary" id="guardar-agrego-simple-modal" onclick="validarYGuardarAgrego()">
                    <i class="fas fa-save"></i> Guardar Producto Compuesto
                </button>
            </div>
        </div>
    </div>
    `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // AGREGAR ESTILOS MEJORADOS
        const estilosModal = `
    <style>
    /* MODAL RESPONSIVE */
    .modal-agrego-responsive {
        max-width: 800px;
        width: 95%;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        margin: 20px auto;
    }
    
    .modal-header-agrego {
        padding: 20px 25px;
        border-bottom: 1px solid #e8e8e8;
        background: linear-gradient(135deg, #4a6cf7 0%, #6c8cff 100%);
        color: white;
        border-radius: 12px 12px 0 0;
    }
    
    .modal-header-agrego h3 {
        margin: 0;
        font-size: 18px;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .modal-header-agrego .modal-close {
        color: white;
        opacity: 0.8;
        transition: opacity 0.3s ease;
    }
    
    .modal-header-agrego .modal-close:hover {
        opacity: 1;
        transform: scale(1.1);
    }
    
    .modal-body-agrego {
        flex: 1;
        overflow-y: auto;
        padding: 25px;
        display: flex;
        flex-direction: column;
        gap: 25px;
    }
    
    /* SECCIONES */
    .seccion-basica,
    .seccion-ingredientes-agrego,
    .seccion-notas {
        background: white;
        border-radius: 12px;
        padding: 20px;
        border: 1px solid #f0f0f0;
        box-shadow: 0 2px 10px rgba(0,0,0,0.04);
    }
    
    .seccion-titulo {
        margin: 0 0 20px 0;
        font-size: 16px;
        color: #333;
        display: flex;
        align-items: center;
        gap: 10px;
        padding-bottom: 12px;
        border-bottom: 2px solid #f0f2ff;
    }
    
    .seccion-titulo i {
        color: #4a6cf7;
    }
    
    /* FORMULARIO MEJORADO */
    .form-grid-tres {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
    }
    
    .form-group-agrego {
        display: flex;
        flex-direction: column;
    }
    
    .form-label-agrego {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        font-weight: 500;
        color: #444;
        font-size: 14px;
    }
    
    .form-label-agrego i {
        color: #666;
        font-size: 14px;
    }
    
    .form-input-agrego {
        padding: 12px 15px;
        border: 2px solid #e8e8e8;
        border-radius: 8px;
        font-size: 15px;
        transition: all 0.3s ease;
        background: white;
    }
    
    .form-input-agrego:focus {
        outline: none;
        border-color: #4a6cf7;
        box-shadow: 0 0 0 3px rgba(74, 108, 247, 0.1);
    }
    
    .form-helper {
        margin-top: 6px;
        font-size: 12px;
        color: #888;
    }
    
    /* INGREDIENTES */
    .instruccion-ingredientes {
        background: #f8f9ff;
        padding: 12px 15px;
        border-radius: 8px;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        color: #555;
        border-left: 3px solid #4a6cf7;
    }
    
    .instruccion-ingredientes i {
        color: #4a6cf7;
    }
    
    .controles-ingredientes {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        flex-wrap: wrap;
        gap: 15px;
    }
    
    .contador-y-mensaje {
        display: flex;
        align-items: center;
        gap: 15px;
        flex: 1;
    }
    
    .contador-badge {
        background: #4a6cf7;
        color: white;
        padding: 6px 15px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        gap: 5px;
    }
    
    .botones-accion {
        display: flex;
        gap: 10px;
    }
    
    .btn-outline {
        background: white;
        border: 2px solid #e8e8e8;
        color: #555;
        padding: 8px 15px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 14px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
    }
    
    .btn-outline:hover {
        border-color: #4a6cf7;
        color: #4a6cf7;
        background: #f8f9ff;
    }
    
    /* RESUMEN MEJORADO */
    .resumen-checkboxes {
        background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
        border-radius: 10px;
        padding: 15px 20px;
        margin-bottom: 20px;
        border: 1px solid #e0e2ff;
    }
    
    .resumen-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px dashed #d0d4ff;
    }
    
    .resumen-item:last-child {
        border-bottom: none;
    }
    
    .resumen-total {
        font-weight: 600;
        color: #333;
    }
    
    .resumen-label {
        color: #666;
        font-size: 14px;
    }
    
    .resumen-valor {
        font-weight: 500;
        color: #4a6cf7;
    }
    
    .resumen-lista {
        margin-top: 10px;
        padding: 10px;
        background: white;
        border-radius: 6px;
        font-size: 13px;
        color: #666;
        border: 1px solid #eee;
    }
    
    /* LISTA INGREDIENTES MEJORADA */
    .ingredientes-checkbox-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 12px;
        max-height: 300px;
        overflow-y: auto;
        padding-right: 5px;
    }
    
    .ingrediente-checkbox-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        background: white;
        border: 1px solid #e8e8e8;
        border-radius: 10px;
        transition: all 0.3s ease;
        min-height: 80px;
    }
    
    .ingrediente-checkbox-item:hover:not(.disabled) {
        border-color: #4a6cf7;
        box-shadow: 0 4px 12px rgba(74, 108, 247, 0.1);
        transform: translateY(-2px);
    }
    
    .checkbox-container {
        display: flex;
        align-items: center;
        gap: 15px;
        flex: 1;
    }
    
    .ingrediente-info-detalle {
        display: flex;
        flex-direction: column;
        gap: 5px;
    }
    
    .ingrediente-checkbox-nombre {
        font-weight: 600;
        color: #333;
        font-size: 15px;
    }
    
    .ingrediente-disponible-checkbox {
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 5px;
    }
    
    .ingrediente-disponible-checkbox.available {
        color: #28a745;
    }
    
    .ingrediente-disponible-checkbox.unavailable {
        color: #dc3545;
    }
    
    .consumo-checkbox-display {
        background: #f8f9ff;
        padding: 8px 12px;
        border-radius: 8px;
        min-width: 100px;
        text-align: center;
        border: 1px solid #e0e2ff;
    }
    
    .consumo-info {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 14px;
    }
    
    .consumo-info i {
        color: #4a6cf7;
    }
    
    .consumo-text {
        color: #4a6cf7;
        font-weight: 500;
    }
    
    /* TEXTAREA */
    .form-textarea-agrego {
        width: 100%;
        padding: 12px 15px;
        border: 2px solid #e8e8e8;
        border-radius: 8px;
        font-size: 15px;
        transition: all 0.3s ease;
        resize: vertical;
        min-height: 100px;
        font-family: inherit;
    }
    
    .form-textarea-agrego:focus {
        outline: none;
        border-color: #4a6cf7;
        box-shadow: 0 0 0 3px rgba(74, 108, 247, 0.1);
    }
    
    /* FOOTER MODAL */
    .modal-footer-agrego {
        padding: 20px 25px;
        border-top: 1px solid #e8e8e8;
        display: flex;
        justify-content: space-between;
        gap: 15px;
        background: #fafafa;
        border-radius: 0 0 12px 12px;
    }
    
    /* ALERTAS */
    .alertas-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    
    /* RESPONSIVE */
    @media (max-width: 768px) {
        .modal-agrego-responsive {
            width: 98%;
            max-height: 95vh;
            margin: 10px;
        }
        
        .form-grid-tres {
            grid-template-columns: 1fr;
            gap: 15px;
        }
        
        .ingredientes-checkbox-grid {
            grid-template-columns: 1fr;
        }
        
        .ingrediente-checkbox-item {
            flex-direction: column;
            align-items: stretch;
            gap: 15px;
        }
        
        .checkbox-container {
            width: 100%;
        }
        
        .consumo-checkbox-display {
            width: 100%;
            text-align: left;
            padding: 10px 15px;
        }
        
        .consumo-info {
            justify-content: flex-start;
        }
        
        .controles-ingredientes {
            flex-direction: column;
            align-items: stretch;
        }
        
        .contador-y-mensaje {
            justify-content: space-between;
        }
        
        .botones-accion {
            width: 100%;
            justify-content: space-between;
        }
        
        .modal-footer-agrego {
            flex-direction: column;
        }
        
        .modal-footer-agrego .btn {
            width: 100%;
            justify-content: center;
        }
        
        .modal-body-agrego {
            padding: 20px;
        }
    }
    
    @media (max-width: 480px) {
        .modal-header-agrego,
        .modal-footer-agrego {
            padding: 15px;
        }
        
        .modal-body-agrego {
            padding: 15px;
        }
        
        .seccion-basica,
        .seccion-ingredientes-agrego,
        .seccion-notas {
            padding: 15px;
        }
        
        .resumen-checkboxes {
            padding: 12px 15px;
        }
        
        .ingrediente-checkbox-item {
            padding: 12px;
        }
    }
    
    /* SCROLLBAR PERSONALIZADO */
    .ingredientes-checkbox-grid::-webkit-scrollbar {
        width: 6px;
    }
    
    .ingredientes-checkbox-grid::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 10px;
    }
    
    .ingredientes-checkbox-grid::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 10px;
    }
    
    .ingredientes-checkbox-grid::-webkit-scrollbar-thumb:hover {
        background: #a1a1a1;
    }
    </style>
    `;

        // Agregar estilos si no existen
        if (!document.querySelector('#estilos-modal-agrego-mejorado')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'estilos-modal-agrego-mejorado';
            styleElement.textContent = estilosModal;
            document.head.appendChild(styleElement);
        }
        // FUNCIONES GLOBALES PARA VALIDACIONES
        window.cerrarModalAgrego = function () {
            const modal = document.getElementById('modal-agrego-simple');
            if (modal) modal.remove();
        };

        window.actualizarDisponibilidadCheckboxes = function () {
            // Recalcular disponibilidad global
            recalcularDisponibilidad();

            // Actualizar cada ingrediente en el modal
            ingredientes.forEach(ing => {
                const disponibleSpan = document.getElementById(`disponible-checkbox-${ing.id}`);
                const checkbox = document.getElementById(`checkbox-${ing.id}`);
                const itemDiv = document.getElementById(`ingrediente-checkbox-${ing.id}`);

                if (disponibleSpan) {
                    disponibleSpan.textContent = ing.disponible;
                }

                if (checkbox) {
                    checkbox.dataset.ingredienteDisponible = ing.disponible;

                    if (ing.disponible <= 0) {
                        checkbox.checked = false;
                        checkbox.disabled = true;
                        if (itemDiv) itemDiv.classList.add('disabled');

                        const consumoDisplay = document.getElementById(`consumo-checkbox-${ing.id}`);
                        if (consumoDisplay) consumoDisplay.style.display = 'none';
                    } else {
                        checkbox.disabled = false;
                        if (itemDiv) itemDiv.classList.remove('disabled');
                    }
                }
            });

            actualizarCalculoCheckboxes();
            showNotification('Disponibilidad actualizada', 'info');
        };

        window.manejarCheckboxIngrediente = function (checkbox) {
            const consumoDisplay = document.getElementById(`consumo-checkbox-${checkbox.dataset.ingredienteId}`);
            if (consumoDisplay) {
                consumoDisplay.style.display = checkbox.checked ? 'block' : 'none';
            }

            actualizarCalculoCheckboxes();
            validarIngredientesMinimos();
            validarNombreProducto(document.getElementById('agrego-nombre').value);
        };

        window.actualizarCalculoCheckboxes = function () {
            const cantidad = parseInt(document.getElementById('agrego-cantidad').value) || 1;
            const checkboxesSeleccionados = document.querySelectorAll('.ingrediente-checkbox:checked:not(:disabled)');
            const ingredientesSeleccionados = Array.from(checkboxesSeleccionados);

            // Actualizar contador
            const contador = document.getElementById('contador-seleccionados');
            if (contador) {
                contador.textContent = `${ingredientesSeleccionados.length} seleccionado(s)`;
            }

            // Actualizar resumen
            document.getElementById('calculo-checkbox-unidades').textContent = `${cantidad} unidad(es)`;
            document.getElementById('calculo-checkbox-ingredientes').textContent = `${ingredientesSeleccionados.length} ingrediente(s)`;

            const totalUnidadesIngredientes = cantidad * ingredientesSeleccionados.length;
            document.getElementById('calculo-checkbox-total').textContent = `${totalUnidadesIngredientes} unidades totales`;

            // Actualizar lista de ingredientes seleccionados
            const nombresIngredientes = ingredientesSeleccionados.map(cb => cb.dataset.ingredienteNombre);
            const listaElement = document.getElementById('lista-ingredientes-seleccionados');

            if (nombresIngredientes.length > 0) {
                listaElement.textContent = nombresIngredientes.join(', ');
                listaElement.style.color = '#4a6cf7';
            } else {
                listaElement.textContent = 'Ningún ingrediente seleccionado';
                listaElement.style.color = '#666';
            }

            // Actualizar consumo display para cada ingrediente seleccionado
            checkboxesSeleccionados.forEach(checkbox => {
                const consumoDisplay = document.getElementById(`consumo-checkbox-${checkbox.dataset.ingredienteId}`);
                if (consumoDisplay) {
                    const valorConsumo = consumoDisplay.querySelector('.valor-consumo');
                    if (valorConsumo) {
                        valorConsumo.textContent = cantidad;
                    }
                }
            });

            // Ocultar consumo display para ingredientes no seleccionados
            document.querySelectorAll('.ingrediente-checkbox:not(:checked)').forEach(checkbox => {
                const consumoDisplay = document.getElementById(`consumo-checkbox-${checkbox.dataset.ingredienteId}`);
                if (consumoDisplay) {
                    consumoDisplay.style.display = 'none';
                }
            });
        };

        // VALIDACIÓN DE CAMPOS
        window.validarNombreProducto = function (nombre) {
            const alertasDiv = document.getElementById('alertas-validacion');
            let alertas = [];

            if (!nombre.trim()) {
                alertas.push('El nombre del producto es requerido');
            } else if (nombre.length < 3) {
                alertas.push('El nombre debe tener al menos 3 caracteres');
            }

            // Detectar si contiene "pan" y mostrar advertencia
            const nombreLower = nombre.toLowerCase();
            const contienePan = nombreLower.includes('pan');

            if (contienePan) {
                // Verificar si hay pan en los ingredientes disponibles
                const hayPanEnIngredientes = ingredientes.some(ing =>
                    ing.nombre.toLowerCase().includes('pan') && ing.disponible > 0
                );

                // Verificar si pan está seleccionado
                const panSeleccionado = document.querySelectorAll('.ingrediente-checkbox:checked:not(:disabled)')
                    .some(checkbox => checkbox.dataset.ingredienteNombre.toLowerCase().includes('pan'));

                const advertenciaDiv = document.getElementById('advertencia-pan');
                const textoAdvertencia = document.getElementById('texto-advertencia-pan');

                if (advertenciaDiv && textoAdvertencia) {
                    if (hayPanEnIngredientes && !panSeleccionado) {
                        // Mostrar advertencia de "no olvides seleccionar pan"
                        textoAdvertencia.textContent = '¡No olvides seleccionar "Pan" en los ingredientes! Tu producto contiene la palabra "pan" en el nombre.';
                        advertenciaDiv.style.display = 'flex';
                    } else if (!hayPanEnIngredientes) {
                        // Mostrar advertencia de "no hay pan disponible"
                        textoAdvertencia.textContent = 'Advertencia: El producto contiene "pan" pero no hay pan disponible en los ingredientes.';
                        advertenciaDiv.style.display = 'flex';
                    } else {
                        // Ocultar advertencia
                        advertenciaDiv.style.display = 'none';
                    }
                }
            } else {
                // Ocultar advertencia si no contiene "pan"
                const advertenciaDiv = document.getElementById('advertencia-pan');
                if (advertenciaDiv) {
                    advertenciaDiv.style.display = 'none';
                }
            }

            mostrarAlertas(alertasDiv, alertas);
            return alertas.length === 0;
        };

        window.validarPrecioProducto = function (precio) {
            const alertasDiv = document.getElementById('alertas-validacion');
            const precioNum = parseFloat(precio) || 0;
            let alertas = [];

            if (!precio || precio.trim() === '') {
                alertas.push('El precio es requerido');
            } else if (precioNum <= 0) {
                alertas.push('El precio debe ser mayor a 0');
            } else if (precioNum > 10000) {
                alertas.push('El precio no puede ser mayor a $10,000');
            }

            mostrarAlertas(alertasDiv, alertas);
            return alertas.length === 0;
        };

        window.validarCantidadProducto = function (cantidad) {
            const alertasDiv = document.getElementById('alertas-validacion');
            const cantidadNum = parseInt(cantidad) || 0;
            let alertas = [];

            if (!cantidad || cantidad.trim() === '') {
                alertas.push('La cantidad es requerida');
            } else if (cantidadNum <= 0) {
                alertas.push('La cantidad debe ser mayor a 0');
            } else if (cantidadNum > 1000) {
                alertas.push('La cantidad no puede ser mayor a 1,000 unidades');
            }

            actualizarCalculoCheckboxes();
            mostrarAlertas(alertasDiv, alertas);
            return alertas.length === 0;
        };

        window.validarIngredientesMinimos = function () {
            const checkboxesSeleccionados = document.querySelectorAll('.ingrediente-checkbox:checked:not(:disabled)');
            const mensajeMinimo = document.getElementById('mensaje-minimo');

            if (mensajeMinimo) {
                if (checkboxesSeleccionados.length === 0) {
                    mensajeMinimo.style.display = 'inline-flex';
                    return false;
                } else {
                    mensajeMinimo.style.display = 'none';
                    return true;
                }
            }
            return false;
        };

        window.verificarDisponibilidadTotal = function () {
            const cantidad = parseInt(document.getElementById('agrego-cantidad').value) || 1;
            const checkboxesSeleccionados = document.querySelectorAll('.ingrediente-checkbox:checked:not(:disabled)');

            if (checkboxesSeleccionados.length === 0) {
                showNotification('Primero selecciona ingredientes para verificar disponibilidad', 'warning');
                return;
            }

            const validacionDiv = document.getElementById('validacion-disponibilidad');
            const resultadoDiv = document.getElementById('resultado-disponibilidad');

            let hayProblemas = false;
            let html = '';

            checkboxesSeleccionados.forEach(checkbox => {
                const ingredienteId = parseInt(checkbox.dataset.ingredienteId);
                const ingredienteNombre = checkbox.dataset.ingredienteNombre;
                const disponible = parseInt(checkbox.dataset.ingredienteDisponible) || 0;
                const consumoTotal = cantidad * 1; // 1 unidad por ingrediente

                const tieneSuficiente = disponible >= consumoTotal;

                if (!tieneSuficiente) {
                    hayProblemas = true;
                }

                html += `
                <div class="validacion-item ${tieneSuficiente ? 'disponible' : 'insuficiente'}">
                    <span class="nombre">${ingredienteNombre}</span>
                    <span class="detalle">
                        ${disponible} disponible / ${consumoTotal} necesario
                        ${!tieneSuficiente ? ' <i class="fas fa-times-circle" style="color: #dc3545;"></i>' : ' <i class="fas fa-check-circle" style="color: #28a745;"></i>'}
                    </span>
                </div>
            `;
            });

            if (validacionDiv && resultadoDiv) {
                resultadoDiv.innerHTML = html;
                validacionDiv.style.display = 'block';

                if (!hayProblemas) {
                    showNotification('✅ Todos los ingredientes tienen disponibilidad suficiente', 'success');
                } else {
                    showNotification('⚠️ Algunos ingredientes no tienen disponibilidad suficiente', 'error');
                }
            }
        };

        // FUNCIÓN PRINCIPAL DE VALIDACIÓN Y GUARDADO
        window.validarYGuardarAgrego = function () {
            // 1. Validar campos básicos
            const nombre = document.getElementById('agrego-nombre').value.trim();
            const precio = document.getElementById('agrego-precio').value;
            const cantidad = document.getElementById('agrego-cantidad').value;
            const checkboxesSeleccionados = document.querySelectorAll('.ingrediente-checkbox:checked:not(:disabled)');

            let errores = [];

            // Validar nombre
            if (!nombre) {
                errores.push('El nombre del producto es requerido');
                document.getElementById('agrego-nombre').focus();
            } else if (nombre.length < 3) {
                errores.push('El nombre debe tener al menos 3 caracteres');
                document.getElementById('agrego-nombre').focus();
            }

            // Validar precio
            const precioNum = parseFloat(precio) || 0;
            if (!precio || precio.trim() === '') {
                errores.push('El precio es requerido');
                if (!nombre) document.getElementById('agrego-precio').focus();
            } else if (precioNum <= 0) {
                errores.push('El precio debe ser mayor a 0');
                document.getElementById('agrego-precio').focus();
            }

            // Validar cantidad
            const cantidadNum = parseInt(cantidad) || 0;
            if (!cantidad || cantidad.trim() === '') {
                errores.push('La cantidad es requerida');
                if (!nombre && !precio) document.getElementById('agrego-cantidad').focus();
            } else if (cantidadNum <= 0) {
                errores.push('La cantidad debe ser mayor a 0');
                document.getElementById('agrego-cantidad').focus();
            } else if (cantidadNum > 1000) {
                errores.push('La cantidad no puede ser mayor a 1,000 unidades');
                document.getElementById('agrego-cantidad').focus();
            }

            // Validar ingredientes mínimos
            if (checkboxesSeleccionados.length === 0) {
                errores.push('Debes seleccionar al menos 1 ingrediente');
            }

            // Mostrar errores si hay
            if (errores.length > 0) {
                const alertasDiv = document.getElementById('alertas-validacion');
                mostrarAlertas(alertasDiv, errores, 'error');
                showNotification('Corrige los errores antes de guardar', 'error');
                return;
            }

            // 2. Validar disponibilidad de cada ingrediente
            let problemasDisponibilidad = [];

            for (const checkbox of checkboxesSeleccionados) {
                const ingredienteId = parseInt(checkbox.dataset.ingredienteId);
                const ingredienteNombre = checkbox.dataset.ingredienteNombre;
                const disponible = parseInt(checkbox.dataset.ingredienteDisponible) || 0;
                const consumoTotal = cantidadNum * 1; // 1 unidad por ingrediente

                if (consumoTotal > disponible) {
                    problemasDisponibilidad.push({
                        nombre: ingredienteNombre,
                        disponible: disponible,
                        necesario: consumoTotal,
                        faltante: consumoTotal - disponible
                    });
                }
            }

            // Si hay problemas de disponibilidad
            if (problemasDisponibilidad.length > 0) {
                let mensajeError = 'No hay suficiente disponibilidad para los siguientes ingredientes:\n';
                problemasDisponibilidad.forEach(prob => {
                    mensajeError += `\n• ${prob.nombre}: Disponible ${prob.disponible}, Necesitas ${prob.necesario} (Faltan ${prob.faltante})`;
                });
                mensajeError += '\n\nPor favor, ajusta la cantidad o da entrada a más ingredientes.';

                showNotification(mensajeError, 'error');

                // Mostrar en la sección de validación
                const validacionDiv = document.getElementById('validacion-disponibilidad');
                const resultadoDiv = document.getElementById('resultado-disponibilidad');

                if (validacionDiv && resultadoDiv) {
                    let html = '';
                    problemasDisponibilidad.forEach(prob => {
                        html += `
                        <div class="validacion-item insuficiente">
                            <span class="nombre">${prob.nombre}</span>
                            <span class="detalle">
                                ${prob.disponible} disponible / ${prob.necesario} necesario
                                <i class="fas fa-times-circle" style="color: #dc3545;"></i>
                            </span>
                        </div>
                    `;
                    });
                    resultadoDiv.innerHTML = html;
                    validacionDiv.style.display = 'block';
                }

                return; // No guardar si hay problemas de disponibilidad
            }

            // 3. Si pasa todas las validaciones, proceder a guardar
            guardarAgregoValidado();
        };

        window.guardarAgregoValidado = function () {
            const nombre = document.getElementById('agrego-nombre').value.trim();
            const precio = parseFloat(document.getElementById('agrego-precio').value) || 0;
            const cantidad = parseInt(document.getElementById('agrego-cantidad').value) || 1;
            const notas = document.getElementById('agrego-notas').value.trim();
            const checkboxesSeleccionados = document.querySelectorAll('.ingrediente-checkbox:checked:not(:disabled)');

            // Obtener ingredientes consumidos
            const ingredientesConsumidos = Array.from(checkboxesSeleccionados).map(checkbox => ({
                id: parseInt(checkbox.dataset.ingredienteId),
                nombre: checkbox.dataset.ingredienteNombre,
                cantidadPorUnidad: 1,
                cantidadTotal: cantidad * 1
            }));

            // Descontar ingredientes de la cocina
            ingredientesConsumidos.forEach(ingrediente => {
                const productoIndex = cocinaData.findIndex(p => p.id === ingrediente.id);
                if (productoIndex !== -1) {
                    const ingredienteItem = cocinaData[productoIndex];
                    ingredienteItem.vendido += ingrediente.cantidadTotal;
                    ingredienteItem.final = Math.max(0, ingredienteItem.venta - ingredienteItem.vendido);
                    recalcularProductoCocina(ingredienteItem);
                }
            });

            // Crear el nuevo agrego
            const nuevoAgrego = {
                id: Date.now(),
                nombre: nombre,
                precio: precio,
                cantidad: cantidad,
                ingredientes: ingredientesConsumidos,
                notas: notas,
                hora: obtenerHoraActual(),
                fecha: new Date().toISOString(),
                montoTotal: precio * cantidad,
                tipo: 'producto-checkbox'
            };

            // Agregar a la lista de agregos
            agregos.push(nuevoAgrego);

            // Guardar y actualizar
            recalcularDisponibilidad();
            guardarDatosCocina();
            actualizarResumenCocina();
            actualizarListaAgregos();
            actualizarTablaCocina();

            // Cerrar modal
            const modal = document.getElementById('modal-agrego-simple');
            if (modal) modal.remove();

            // Mostrar mensaje de éxito con resumen
            let mensaje = `✅ ${nombre} registrado correctamente\n`;
            mensaje += `📦 Cantidad: ${cantidad} unidad(es)\n`;
            mensaje += `💰 Total: $${(precio * cantidad).toFixed(2)}\n`;

            if (ingredientesConsumidos.length > 0) {
                mensaje += `🍽️ Ingredientes consumidos:\n`;
                ingredientesConsumidos.forEach(i => {
                    mensaje += `   • ${i.cantidadTotal} ${i.nombre}\n`;
                });
            }

            showNotification(mensaje, 'success');
        };

        // FUNCIÓN AUXILIAR PARA MOSTRAR ALERTAS
        function mostrarAlertas(container, alertas, tipo = 'error') {
            if (!container) return;

            if (alertas.length === 0) {
                container.innerHTML = '';
                container.style.display = 'none';
                return;
            }

            let alertasHtml = '';
            alertas.forEach(alerta => {
                alertasHtml += `
                <div class="alert-${tipo}" style="padding: 10px 15px; margin-bottom: 10px; border-radius: 8px; 
                        background: ${tipo === 'error' ? '#f8d7da' : '#fff3cd'}; 
                        border: 1px solid ${tipo === 'error' ? '#f5c6cb' : '#ffeaa7'};
                        color: ${tipo === 'error' ? '#721c24' : '#856404'};">
                    <i class="fas fa-${tipo === 'error' ? 'exclamation-circle' : 'exclamation-triangle'}"></i>
                    ${alerta}
                </div>
            `;
            });

            container.innerHTML = alertasHtml;
            container.style.display = 'block';
        }

        // Inicializar
        setTimeout(() => {
            actualizarCalculoCheckboxes();
            document.getElementById('agrego-nombre').focus();

            // Agregar evento para validar nombre en tiempo real
            const nombreInput = document.getElementById('agrego-nombre');
            if (nombreInput) {
                nombreInput.addEventListener('blur', function () {
                    validarNombreProducto(this.value);
                });
            }
        }, 100);
    }
    function showModalConfigurarRelaciones() {
        // Filtrar productos
        const productosBase = cocinaData.filter(p => p.precio > 0);
        const ingredientes = cocinaData.filter(p => p.precio === 0);

        if (productosBase.length === 0 || ingredientes.length === 0) {
            showNotification('Necesitas productos base e ingredientes para configurar relaciones', 'warning');
            return;
        }

        const modalHtml = `
        <div class="modal active" id="modal-configurar-relaciones">
            <div class="modal-content configurar-relaciones-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-cogs"></i> Configurar Relaciones de Productos</h3>
                    <button class="modal-close" onclick="document.getElementById('modal-configurar-relaciones').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="seleccionar-producto-relacion" class="form-label">Seleccionar Producto *</label>
                        <select id="seleccionar-producto-relacion" class="form-select" required>
                            <option value="">Selecciona un producto...</option>
                            ${productosBase.map(p => {
            const tieneRelaciones = relacionesProductos.filter(r => r.productoId === p.id).length > 0;
            return `<option value="${p.id}" ${tieneRelaciones ? 'data-tiene-relaciones="true"' : ''}>
                                    ${p.nombre} ${tieneRelaciones ? '(ya configurado)' : ''}
                                </option>`;
        }).join('')}
                        </select>
                    </div>
                    
                    <div id="relaciones-actuales" class="relaciones-actuales-container">
                        <h4><i class="fas fa-list-check"></i> Relaciones Actuales:</h4>
                        <ul id="lista-relaciones-actuales" class="relaciones-lista"></ul>
                    </div>
                    
                    <div class="configuracion-ingredientes-section">
                        <h4><i class="fas fa-utensils"></i> Configurar Ingredientes Fijos</h4>
                        <p class="descripcion-configuracion">
                            <i class="fas fa-info-circle"></i> 
                            Define cuánto de cada ingrediente usa <strong>UNA unidad</strong> de este producto
                        </p>
                        
                        <div class="ingredientes-relaciones-container" id="ingredientes-relaciones-list">
                            ${ingredientes.map(ing => `
                                <div class="ingrediente-relacion-item">
                                    <div class="ingrediente-relacion-info">
                                        <span class="ingrediente-relacion-nombre">${ing.nombre}</span>
                                        <span class="ingrediente-disponibilidad">
                                            <i class="fas fa-box"></i> Disponible: ${ing.disponible}
                                        </span>
                                    </div>
                                    <div class="ingrediente-relacion-controls">
                                        <div class="cantidad-input-group">
                                            <input type="number" 
                                                   min="0" 
                                                   max="10"
                                                   value="0"
                                                   data-ingrediente-id="${ing.id}"
                                                   data-ingrediente-nombre="${ing.nombre}"
                                                   class="relacion-ingrediente-cantidad form-input-sm"
                                                   placeholder="0">
                                            <span class="cantidad-unidad">por producto</span>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="document.getElementById('modal-configurar-relaciones').remove()">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button class="btn btn-danger" id="eliminar-relaciones-modal" style="display: none;">
                        <i class="fas fa-trash"></i> Eliminar Relaciones
                    </button>
                    <button class="btn btn-primary" id="guardar-relaciones-modal">
                        <i class="fas fa-save"></i> Guardar Relaciones
                    </button>
                </div>
            </div>
        </div>
        
        <style>
            /* Estilos específicos para el modal de configuración de relaciones */
            .configurar-relaciones-modal {
                max-width: 800px;
                max-height: 85vh;
                display: flex;
                flex-direction: column;
            }
            
            .modal-body {
                overflow-y: auto;
                flex: 1;
                padding: 20px;
            }
            
            .form-select {
                width: 100%;
                padding: 10px 15px;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                font-size: 16px;
                background-color: white;
                transition: all 0.3s ease;
                margin-bottom: 20px;
            }
            
            .form-select:focus {
                outline: none;
                border-color: #4a6cf7;
                box-shadow: 0 0 0 3px rgba(74, 108, 247, 0.1);
            }
            
            .relaciones-actuales-container {
                margin: 20px 0;
                padding: 15px;
                background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
                border-radius: 10px;
                border-left: 4px solid #4a6cf7;
                display: none;
            }
            
            .relaciones-actuales-container h4 {
                margin: 0 0 10px 0;
                color: #333;
                font-size: 16px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .relaciones-lista {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .relaciones-lista li {
                padding: 8px 12px;
                margin: 5px 0;
                background: white;
                border-radius: 6px;
                border: 1px solid #e8e8e8;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .relaciones-lista li:before {
                content: "✓";
                color: #4a6cf7;
                font-weight: bold;
                margin-right: 10px;
            }
            
            .configuracion-ingredientes-section {
                margin-top: 25px;
                background: white;
                border-radius: 10px;
                padding: 20px;
                border: 1px solid #e8e8e8;
            }
            
            .configuracion-ingredientes-section h4 {
                margin: 0 0 10px 0;
                color: #333;
                font-size: 18px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .descripcion-configuracion {
                color: #666;
                font-size: 14px;
                margin: 0 0 20px 0;
                padding: 10px;
                background: #f9f9f9;
                border-radius: 6px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .ingredientes-relaciones-container {
                max-height: 350px;
                overflow-y: auto;
                border: 1px solid #eee;
                border-radius: 8px;
                padding: 10px;
            }
            
            .ingrediente-relacion-item {
                padding: 15px;
                margin-bottom: 10px;
                background: white;
                border-radius: 8px;
                border: 1px solid #f0f0f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: all 0.3s ease;
            }
            
            .ingrediente-relacion-item:hover {
                border-color: #4a6cf7;
                box-shadow: 0 2px 8px rgba(74, 108, 247, 0.1);
                transform: translateY(-1px);
            }
            
            .ingrediente-relacion-info {
                flex: 1;
            }
            
            .ingrediente-relacion-nombre {
                font-weight: 600;
                color: #333;
                font-size: 15px;
                display: block;
                margin-bottom: 5px;
            }
            
            .ingrediente-disponibilidad {
                font-size: 13px;
                color: #666;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .ingrediente-relacion-controls {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .cantidad-input-group {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .relacion-ingrediente-cantidad {
                width: 80px;
                padding: 8px 12px;
                text-align: center;
                border: 2px solid #e0e0e0;
                border-radius: 6px;
                font-size: 15px;
                font-weight: 500;
            }
            
            .relacion-ingrediente-cantidad:focus {
                outline: none;
                border-color: #4a6cf7;
                box-shadow: 0 0 0 3px rgba(74, 108, 247, 0.1);
            }
            
            .cantidad-unidad {
                font-size: 13px;
                color: #666;
                white-space: nowrap;
            }
            
            /* Estilos para botones del modal footer */
            .modal-footer {
                display: flex;
                justify-content: space-between;
                gap: 10px;
                padding: 20px;
                border-top: 1px solid #eee;
                background: #fafafa;
            }
            
            .modal-footer .btn {
                min-width: 140px;
                padding: 10px 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                font-weight: 500;
            }
            
            /* Responsive */
            @media (max-width: 768px) {
                .configurar-relaciones-modal {
                    max-width: 95%;
                    max-height: 90vh;
                    margin: 10px;
                }
                
                .ingrediente-relacion-item {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 15px;
                }
                
                .ingrediente-relacion-controls {
                    width: 100%;
                    justify-content: space-between;
                }
                
                .modal-footer {
                    flex-direction: column;
                }
                
                .modal-footer .btn {
                    width: 100%;
                }
                
                .cantidad-input-group {
                    width: 100%;
                    justify-content: flex-end;
                }
            }
            
            @media (max-width: 480px) {
                .modal-body {
                    padding: 15px;
                }
                
                .ingredientes-relaciones-container {
                    max-height: 300px;
                }
                
                .configuracion-ingredientes-section {
                    padding: 15px;
                }
                
                .relacion-ingrediente-cantidad {
                    width: 70px;
                    padding: 6px 10px;
                }
            }
            
            /* Scrollbar personalizado */
            .ingredientes-relaciones-container::-webkit-scrollbar {
                width: 6px;
            }
            
            .ingredientes-relaciones-container::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 3px;
            }
            
            .ingredientes-relaciones-container::-webkit-scrollbar-thumb {
                background: #c1c1c1;
                border-radius: 3px;
            }
            
            .ingredientes-relaciones-container::-webkit-scrollbar-thumb:hover {
                background: #a1a1a1;
            }
            
            /* Animaciones */
            .relaciones-actuales-container {
                animation: slideIn 0.3s ease;
            }
            
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            /* Estado cuando no hay disponibilidad */
            .ingrediente-relacion-item.sin-disponibilidad {
                opacity: 0.6;
                background: #f9f9f9;
            }
            
            .ingrediente-relacion-item.sin-disponibilidad .ingrediente-relacion-nombre {
                color: #999;
            }
        </style>
    `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const selectProducto = document.getElementById('seleccionar-producto-relacion');
        const relacionesActualesDiv = document.getElementById('relaciones-actuales');

        selectProducto.addEventListener('change', function () {
            const productoId = parseInt(this.value);
            if (!productoId) {
                relacionesActualesDiv.style.display = 'none';
                document.getElementById('eliminar-relaciones-modal').style.display = 'none';
                return;
            }

            const producto = cocinaData.find(p => p.id === productoId);
            const relacionesActuales = relacionesProductos.filter(r => r.productoId === productoId);

            if (relacionesActuales.length > 0) {
                const lista = document.getElementById('lista-relaciones-actuales');
                lista.innerHTML = '';

                // Actualizar el título con el nombre del producto
                const titulo = relacionesActualesDiv.querySelector('h4');
                if (titulo) {
                    titulo.innerHTML = `<i class="fas fa-list-check"></i> Relaciones de "${producto.nombre}":`;
                }

                relacionesActuales.forEach(rel => {
                    const ingrediente = cocinaData.find(p => p.id === rel.ingredienteId);
                    if (ingrediente) {
                        const li = document.createElement('li');
                        li.innerHTML = `
                        <span>${ingrediente.nombre}</span>
                        <strong>${rel.cantidad} por unidad</strong>
                    `;
                        lista.appendChild(li);
                    }
                });

                relacionesActualesDiv.style.display = 'block';
                document.getElementById('eliminar-relaciones-modal').style.display = 'inline-block';

                // Pre-cargar valores en los inputs
                document.querySelectorAll('.relacion-ingrediente-cantidad').forEach(input => {
                    const ingredienteId = parseInt(input.dataset.ingredienteId);
                    const relacion = relacionesActuales.find(r => r.ingredienteId === ingredienteId);
                    input.value = relacion ? relacion.cantidad : 0;

                    // Resaltar ingredientes configurados
                    if (relacion) {
                        const item = input.closest('.ingrediente-relacion-item');
                        if (item) {
                            item.style.borderColor = '#4a6cf7';
                            item.style.backgroundColor = '#f8f9ff';
                        }
                    }
                });
            } else {
                relacionesActualesDiv.style.display = 'none';
                document.getElementById('eliminar-relaciones-modal').style.display = 'none';

                // Limpiar inputs y estilos
                document.querySelectorAll('.relacion-ingrediente-cantidad').forEach(input => {
                    input.value = 0;
                    const item = input.closest('.ingrediente-relacion-item');
                    if (item) {
                        item.style.borderColor = '';
                        item.style.backgroundColor = '';
                    }
                });
            }
        });

        // Añadir validación en tiempo real a los inputs
        document.querySelectorAll('.relacion-ingrediente-cantidad').forEach(input => {
            input.addEventListener('input', function () {
                const valor = parseInt(this.value) || 0;
                if (valor < 0) {
                    this.value = 0;
                } else if (valor > 10) {
                    this.value = 10;
                    showNotification('La cantidad máxima por producto es 10', 'warning');
                }

                // Resaltar si tiene valor
                const item = this.closest('.ingrediente-relacion-item');
                if (item) {
                    if (valor > 0) {
                        item.style.borderColor = '#4a6cf7';
                        item.style.backgroundColor = '#f8f9ff';
                    } else {
                        item.style.borderColor = '';
                        item.style.backgroundColor = '';
                    }
                }
            });
        });

        document.getElementById('guardar-relaciones-modal').addEventListener('click', function () {
            guardarRelacionesDesdeModal();
        });

        document.getElementById('eliminar-relaciones-modal').addEventListener('click', function () {
            eliminarRelacionesProducto();
        });

        // Mostrar notificación inicial
        setTimeout(() => {
            showNotification('Selecciona un producto para configurar sus ingredientes', 'info');
        }, 300);
    }

    function guardarAgregoSimpleCheckboxes() {
        // Obtener valores de los campos
        const nombre = document.getElementById('agrego-nombre').value.trim();
        const precio = parseFloat(document.getElementById('agrego-precio').value) || 0;
        const cantidad = parseInt(document.getElementById('agrego-cantidad').value) || 1;
        const notas = document.getElementById('agrego-notas').value.trim();

        // Validaciones básicas
        if (!nombre) {
            showNotification('El nombre es requerido', 'error');
            document.getElementById('agrego-nombre').focus();
            return;
        }

        if (precio <= 0) {
            showNotification('El precio debe ser mayor a 0', 'error');
            document.getElementById('agrego-precio').focus();
            return;
        }

        if (cantidad <= 0) {
            showNotification('La cantidad debe ser mayor a 0', 'error');
            document.getElementById('agrego-cantidad').focus();
            return;
        }

        // Obtener ingredientes seleccionados con checkbox
        const checkboxesSeleccionados = document.querySelectorAll('.ingrediente-checkbox:checked:not(:disabled)');
        const ingredientesConsumidos = [];

        // Verificar disponibilidad para cada ingrediente seleccionado
        for (const checkbox of checkboxesSeleccionados) {
            const ingredienteId = parseInt(checkbox.dataset.ingredienteId);
            const ingredienteNombre = checkbox.dataset.ingredienteNombre;
            const disponible = parseInt(checkbox.dataset.ingredienteDisponible) || 0;

            // Cada ingrediente consume 1 unidad por cada producto vendido
            const consumoTotal = cantidad * 1; // 1 unidad por ingrediente por producto

            if (consumoTotal > disponible) {
                showNotification(
                    `No hay suficiente ${ingredienteNombre}. Disponible: ${disponible}, Necesitas: ${consumoTotal}`,
                    'error'
                );
                checkbox.focus();
                return;
            }

            // Agregar al array de ingredientes consumidos
            ingredientesConsumidos.push({
                id: ingredienteId,
                nombre: ingredienteNombre,
                cantidadPorUnidad: 1, // Siempre 1 cuando se usa checkbox
                cantidadTotal: consumoTotal
            });
        }

        // Descontar ingredientes de la cocina
        ingredientesConsumidos.forEach(ingrediente => {
            const productoIndex = cocinaData.findIndex(p => p.id === ingrediente.id);
            if (productoIndex !== -1) {
                const ingredienteItem = cocinaData[productoIndex];
                ingredienteItem.vendido += ingrediente.cantidadTotal;
                ingredienteItem.final = Math.max(0, ingredienteItem.venta - ingredienteItem.vendido);

                // Recalcular el ingrediente
                recalcularProductoCocina(ingredienteItem);
            }
        });

        // Crear el nuevo agrego
        const nuevoAgrego = {
            id: Date.now(),
            nombre: nombre,
            precio: precio,
            cantidad: cantidad,
            ingredientes: ingredientesConsumidos,
            notas: notas,
            hora: obtenerHoraActual(),
            fecha: new Date().toISOString(),
            montoTotal: precio * cantidad,
            tipo: 'producto-checkbox'
        };

        // Agregar a la lista de agregos
        agregos.push(nuevoAgrego);

        // Guardar y actualizar
        recalcularDisponibilidad();
        guardarDatosCocina();
        actualizarResumenCocina();
        actualizarListaAgregos();
        actualizarTablaCocina();

        // Cerrar modal
        const modal = document.getElementById('modal-agrego-simple');
        if (modal) modal.remove();

        // Mostrar resumen
        let mensaje = `${nombre} registrado correctamente: ${cantidad} unidad(es) × $${precio.toFixed(2)} = $${(precio * cantidad).toFixed(2)}`;
        if (ingredientesConsumidos.length > 0) {
            mensaje += `\nIngredientes consumidos: ${ingredientesConsumidos.map(i => `${i.cantidadTotal} ${i.nombre}`).join(', ')}`;
        }

        showNotification(mensaje, 'success');
    }
    function guardarRelacionesDesdeModal() {
        const productoId = parseInt(document.getElementById('seleccionar-producto-relacion').value);

        if (!productoId) {
            showNotification('Debes seleccionar un producto', 'error');
            return;
        }

        const producto = cocinaData.find(p => p.id === productoId);
        if (!producto) {
            showNotification('Producto no encontrado', 'error');
            return;
        }

        // Obtener ingredientes configurados
        const ingredientesInputs = document.querySelectorAll('.relacion-ingrediente-cantidad');
        const nuevasRelaciones = [];

        ingredientesInputs.forEach(input => {
            const cantidad = parseInt(input.value) || 0;
            if (cantidad > 0) {
                nuevasRelaciones.push({
                    ingredienteId: parseInt(input.dataset.ingredienteId),
                    cantidad: cantidad
                });
            }
        });

        if (nuevasRelaciones.length === 0) {
            showNotification('Debes configurar al menos un ingrediente para establecer relaciones', 'warning');
            return;
        }

        // Eliminar relaciones existentes para este producto
        relacionesProductos = relacionesProductos.filter(r => r.productoId !== productoId);

        // Agregar nuevas relaciones
        nuevasRelaciones.forEach(rel => {
            relacionesProductos.push({
                id: Date.now(),
                productoId: productoId,
                ingredienteId: rel.ingredienteId,
                cantidad: rel.cantidad
            });
        });

        // Guardar relaciones
        guardarRelacionesProductos();

        // Recalcular consumos basados en las nuevas relaciones
        recalcularConsumosPorRelaciones();

        // Actualizar tabla
        actualizarTablaCocina();
        actualizarResumenCocina();

        document.getElementById('modal-configurar-relaciones').remove();

        showNotification(`Relaciones configuradas para "${producto.nombre}"`, 'success');
    }

    function eliminarRelacionesProducto() {
        const productoId = parseInt(document.getElementById('seleccionar-producto-relacion').value);

        if (!productoId) return;

        const producto = cocinaData.find(p => p.id === productoId);

        showConfirmationModal(
            'Eliminar Relaciones',
            `¿Estás seguro de eliminar todas las relaciones del producto "${producto.nombre}"?`,
            'warning',
            function () {
                // Eliminar relaciones
                relacionesProductos = relacionesProductos.filter(r => r.productoId !== productoId);

                // Guardar relaciones
                guardarRelacionesProductos();

                // Recalcular consumos
                recalcularConsumosPorRelaciones();

                // Actualizar tabla
                actualizarTablaCocina();
                actualizarResumenCocina();

                document.getElementById('modal-configurar-relaciones').remove();

                showNotification(`Relaciones eliminadas para "${producto.nombre}"`, 'success');
            }
        );
    }

    function agregarNuevoAgregoSimple() {
        // Función de compatibilidad para el formulario antiguo
        const descripcion = document.getElementById('agrego-descripcion').value.trim();
        const monto = parseFloat(document.getElementById('agrego-monto').value) || 0;
        const notas = document.getElementById('agrego-notas').value.trim();

        if (!descripcion || monto <= 0) {
            showNotification('Por favor, complete todos los campos correctamente', 'error');
            return;
        }

        const nuevoAgrego = {
            id: Date.now(),
            nombre: descripcion,
            precio: monto,
            cantidad: 1,
            ingredientes: [],
            notas: notas,
            hora: obtenerHoraActual(),
            fecha: new Date().toISOString(),
            montoTotal: monto,
            tipo: 'agrego-simple-legacy'
        };

        agregos.push(nuevoAgrego);

        guardarDatosCocina();
        actualizarResumenCocina();
        actualizarListaAgregos();
        ocultarFormularioAgrego();

        showNotification('Agrego registrado correctamente', 'success');
    }

    function ocultarFormularioAgrego() {
        if (agregoForm) agregoForm.style.display = 'none';
        if (btnAgregarAgregoTop) btnAgregarAgregoTop.style.display = 'flex';
        if (formNuevoAgrego) formNuevoAgrego.reset();
    }

    function eliminarAgrego(agregoId) {
        showConfirmationModal(
            'Eliminar Registro',
            '¿Estás seguro de eliminar este registro? Esta acción restaurará los ingredientes consumidos.',
            'warning',
            function () {
                const agregoIndex = agregos.findIndex(a => a.id === agregoId);
                if (agregoIndex !== -1) {
                    const agrego = agregos[agregoIndex];

                    // Restaurar ingredientes consumidos
                    if (agrego.ingredientes && agrego.ingredientes.length > 0) {
                        agrego.ingredientes.forEach(ingrediente => {
                            const producto = cocinaData.find(p => p.id === ingrediente.id);
                            if (producto && producto.esIngrediente) {
                                // Obtener la cantidad correcta a restar
                                let cantidadARestar = 0;

                                if (ingrediente.cantidadTotal !== undefined) {
                                    cantidadARestar = ingrediente.cantidadTotal;
                                } else if (ingrediente.cantidad !== undefined) {
                                    cantidadARestar = ingrediente.cantidad;
                                } else if (ingrediente.cantidadPorProducto !== undefined && agrego.cantidad !== undefined) {
                                    cantidadARestar = ingrediente.cantidadPorProducto * agrego.cantidad;
                                } else {
                                    cantidadARestar = agrego.cantidad || 1;
                                }

                                // Restar la cantidad
                                producto.vendido = Math.max(0, producto.vendido - cantidadARestar);

                                // IMPORTANTE: Recalcular el producto completo
                                recalcularProductoCocina(producto);
                            }
                        });
                    }

                    agregos.splice(agregoIndex, 1);

                    // Recalcular disponibilidad y guardar
                    recalcularDisponibilidad();
                    recalcularConsumosPorRelaciones(); // Añadir esta línea
                    guardarDatosCocina();
                    actualizarResumenCocina();
                    actualizarListaAgregos();
                    actualizarTablaCocina();

                    showNotification('Registro eliminado correctamente', 'success');
                }
            }
        );
    }

    function actualizarListaAgregos() {
        if (!listaAgregos) return;

        if (agregos.length === 0) {
            listaAgregos.innerHTML = `
            <div class="empty-state-card">
                <i class="fas fa-plus-circle"></i>
                <p>No hay agregos registrados</p>
            </div>
        `;
        } else {
            let html = '';
            agregos.forEach(agrego => {
                let tipoBadge = '';
                let ingredientesText = '';

                // CORRECCIÓN AQUÍ: Manejar diferentes estructuras de ingredientes
                if (agrego.ingredientes && agrego.ingredientes.length > 0) {
                    // Mapear correctamente las cantidades según la estructura
                    const ingredientesFormateados = agrego.ingredientes.map(ing => {
                        // Opción 1: Si tiene cantidadTotal (de los nuevos agregos con checkbox)
                        if (ing.cantidadTotal !== undefined) {
                            return `${ing.nombre} (${ing.cantidadTotal})`;
                        }
                        // Opción 2: Si tiene cantidad (de los agregos antiguos)
                        else if (ing.cantidad !== undefined) {
                            return `${ing.nombre} (${ing.cantidad})`;
                        }
                        // Opción 3: Si tiene cantidadPorProducto (de las relaciones)
                        else if (ing.cantidadPorProducto !== undefined && agrego.cantidad !== undefined) {
                            const total = ing.cantidadPorProducto * agrego.cantidad;
                            return `${ing.nombre} (${ing.cantidadPorProducto} × ${agrego.cantidad} = ${total})`;
                        }
                        // Opción 4: Formato por defecto
                        else {
                            return `${ing.nombre} (1)`;
                        }
                    });

                    ingredientesText = ingredientesFormateados.join(', ');
                }

                // Determinar tipo de badge
                if (agrego.tipo === 'producto-checkbox') {
                    tipoBadge = '<span class="badge-checkbox">Compuesto</span>';
                } else if (agrego.tipo === 'producto-compuesto') {
                    tipoBadge = '<span class="badge-compuesto">Compuesto</span>';
                } else if (agrego.tipo === 'agrego-simple') {
                    tipoBadge = '<span class="badge-simple">Simple</span>';
                }

                // CORRECCIÓN: HTML simplificado y compatible con responsive
                html += `
            <div class="agrego-card" data-id="${agrego.id}" data-tipo="${agrego.tipo}">
                <div class="agrego-header">
                    <div class="agrego-titulo">
                        <div class="agrego-nombre">
                            <strong>${agrego.nombre}</strong>
                            ${agrego.cantidad > 1 ? `<span class="agrego-cantidad">× ${agrego.cantidad}</span>` : ''}
                            ${tipoBadge}
                        </div>
                        <div class="agrego-hora">
                            <i class="far fa-clock"></i> ${agrego.hora}
                        </div>
                    </div>
                    
                    <div class="agrego-monto-total">
                        $${agrego.montoTotal.toFixed(2)}
                        <small class="agrego-precio-unitario">$${agrego.precio.toFixed(2)} c/u</small>
                    </div>
                </div>
                
                ${ingredientesText ? `
                <div class="agrego-ingredientes">
                    <i class="fas fa-clipboard-list"></i>
                    <span class="ingredientes-texto">${ingredientesText}</span>
                </div>
                ` : ''}
                
                ${agrego.notas ? `
                <div class="agrego-notas">
                    <i class="fas fa-sticky-note"></i>
                    <span>${agrego.notas}</span>
                </div>
                ` : ''}
                
                <div class="agrego-footer">
                    <div class="agrego-calculo">
                        <small class="calculo-detalle">
                            ${agrego.cantidad} × $${agrego.precio.toFixed(2)} = $${agrego.montoTotal.toFixed(2)}
                        </small>
                    </div>
                    <button class="eliminar-agrego-btn" data-id="${agrego.id}" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            `;
            });

            listaAgregos.innerHTML = html;

            // Agregar event listeners a botones de eliminar
            const botonesEliminar = listaAgregos.querySelectorAll('.eliminar-agrego-btn');
            botonesEliminar.forEach(btn => {
                btn.addEventListener('click', function () {
                    const agregoId = parseInt(this.dataset.id);
                    eliminarAgrego(agregoId);
                });
            });
        }

        // Actualizar total de agregos
        const totalAgregosElement = document.getElementById('total-agregos');
        const total = agregos.reduce((sum, a) => sum + a.montoTotal, 0);

        if (totalAgregosElement) {
            totalAgregosElement.textContent = `$${total.toFixed(2)}`;
        }
    }

    // Agrega estos estilos al CSS:
    const estilosAgregos = `
<style>/* ESTILOS MEJORADOS PARA CARD DE AGREGOS - RESPONSIVE */
.agrego-card {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.agrego-card:hover {
    border-color: #4a6cf7;
    box-shadow: 0 4px 12px rgba(74, 108, 247, 0.1);
    transform: translateY(-2px);
}

/* HEADER */
.agrego-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
    flex-wrap: wrap;
}

.agrego-titulo {
    flex: 1;
    min-width: 0;
}

.agrego-nombre {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 6px;
}

.agrego-nombre strong {
    font-size: 16px;
    color: #333;
    line-height: 1.3;
    word-break: break-word;
}

.agrego-cantidad {
    background: #f0f2ff;
    color: #4a6cf7;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
}

.agrego-hora {
    font-size: 13px;
    color: #666;
    display: flex;
    align-items: center;
    gap: 5px;
}

.agrego-monto-total {
    text-align: right;
    font-size: 18px;
    font-weight: 600;
    color: #28a745;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    white-space: nowrap;
}

.agrego-precio-unitario {
    font-size: 12px;
    color: #666;
    font-weight: normal;
    margin-top: 2px;
}

/* INGREDIENTES */
.agrego-ingredientes {
    padding: 10px 12px;
    background: #f8f9ff;
    border-radius: 8px;
    border-left: 3px solid #4a6cf7;
    display: flex;
    align-items: flex-start;
    gap: 10px;
}

.agrego-ingredientes i {
    color: #4a6cf7;
    font-size: 14px;
    margin-top: 2px;
    flex-shrink: 0;
}

.ingredientes-texto {
    font-size: 13px;
    color: #555;
    line-height: 1.4;
    word-break: break-word;
    flex: 1;
}

/* NOTAS */
.agrego-notas {
    padding: 10px 12px;
    background: #fff9e6;
    border-radius: 8px;
    border-left: 3px solid #ffc107;
    display: flex;
    align-items: flex-start;
    gap: 10px;
}

.agrego-notas i {
    color: #ffc107;
    font-size: 14px;
    margin-top: 2px;
    flex-shrink: 0;
}

.agrego-notas span {
    font-size: 13px;
    color: #856404;
    line-height: 1.4;
    word-break: break-word;
    flex: 1;
}

/* FOOTER */
.agrego-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 10px;
    border-top: 1px solid #f0f0f0;
}

.agrego-calculo {
    flex: 1;
}

.calculo-detalle {
    font-size: 13px;
    color: #666;
    display: inline-block;
    padding: 6px 10px;
    background: #f8f9fa;
    border-radius: 4px;
}

.eliminar-agrego-btn {
    background: #ffebee;
    border: none;
    color: #dc3545;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-left: 10px;
}

.eliminar-agrego-btn:hover {
    background: #dc3545;
    color: white;
    transform: scale(1.05);
}

/* BADGES */
.badge-checkbox,
.badge-compuesto,
.badge-simple {
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
}

.badge-checkbox {
    background: #4a6cf7;
    color: white;
}

.badge-compuesto {
    background: #28a745;
    color: white;
}

.badge-simple {
    background: #ffc107;
    color: #333;
}

/* EMPTY STATE */
.empty-state-card {
    text-align: center;
    padding: 40px 20px;
    color: #666;
}

.empty-state-card i {
    font-size: 48px;
    color: #ddd;
    margin-bottom: 15px;
}

/* RESPONSIVE PARA MÓVILES */
@media (max-width: 768px) {
    .agrego-card {
        padding: 14px;
        gap: 10px;
    }
    
    .agrego-header {
        flex-direction: column;
        gap: 8px;
    }
    
    .agrego-titulo {
        width: 100%;
    }
    
    .agrego-monto-total {
        align-self: flex-start;
        flex-direction: row;
        align-items: center;
        gap: 8px;
    }
    
    .agrego-precio-unitario {
        margin-top: 0;
    }
    
    .agrego-nombre {
        gap: 6px;
    }
    
    .agrego-nombre strong {
        font-size: 15px;
    }
    
    .agrego-cantidad {
        font-size: 13px;
        padding: 1px 6px;
    }
    
    .agrego-monto-total {
        font-size: 16px;
    }
    
    .agrego-hora {
        font-size: 12px;
    }
    
    .agrego-ingredientes {
        padding: 8px 10px;
    }
    
    .ingredientes-texto {
        font-size: 12px;
    }
    
    .agrego-notas {
        padding: 8px 10px;
    }
    
    .agrego-notas span {
        font-size: 12px;
    }
    
    .calculo-detalle {
        font-size: 12px;
        padding: 5px 8px;
    }
    
    .eliminar-agrego-btn {
        width: 32px;
        height: 32px;
        margin-left: 8px;
    }
    
    .badge-checkbox,
    .badge-compuesto,
    .badge-simple {
        font-size: 10px;
        padding: 2px 6px;
    }
}

@media (max-width: 480px) {
    .agrego-card {
        padding: 12px;
        gap: 8px;
    }
    
    .agrego-nombre strong {
        font-size: 14px;
    }
    
    .agrego-monto-total {
        font-size: 15px;
    }
    
    .agrego-ingredientes {
        padding: 6px 8px;
    }
    
    .ingredientes-texto {
        font-size: 11px;
    }
    
    .agrego-notas span {
        font-size: 11px;
    }
    
    .calculo-detalle {
        font-size: 11px;
        padding: 4px 6px;
    }
    
    .eliminar-agrego-btn {
        width: 30px;
        height: 30px;
    }
}
</style>
`;

    // Agregar estilos al documento si no existen
    if (!document.querySelector('#estilos-agregos-mejorados')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'estilos-agregos-mejorados';
        styleElement.textContent = estilosAgregos;
        document.head.appendChild(styleElement);
    }

    function actualizarResumenCocina() {
        const totalProductos = cocinaData.length;
        const totalUnidadesVendidas = cocinaData.reduce((sum, p) => sum + p.vendido, 0);
        const totalImporte = cocinaData.reduce((sum, p) => sum + p.importe, 0);
        const totalAgregos = agregos.reduce((sum, a) => sum + a.montoTotal, 0);
        const ventasTotales = totalImporte + totalAgregos;

        const elementos = {
            'total-productos-cocina': totalProductos,
            'total-unidades-vendidas-cocina': `${totalUnidadesVendidas} unidades`,
            'total-importe-cocina': `$${totalImporte.toFixed(2)}`,
            'summary-total-agregos': `$${totalAgregos.toFixed(2)}`,
            'summary-cantidad-agregos': agregos.length,
            'summary-ventas-totales': `$${ventasTotales.toFixed(2)}`,
            'ultima-actualizacion-cocina': obtenerHoraActual(),
            'total-ventas-cocina': `$${ventasTotales.toFixed(2)}`
        };

        Object.entries(elementos).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });

        if (typeof window.updateSummary === 'function') {
            window.updateSummary();
        }
    }

    function mostrarCargandoCocina() {
        if (!cocinaTable) return;

        cocinaTable.innerHTML = `
            <tr>
                <td colspan="8" class="loading-state">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Cargando datos de cocina...</p>
                </td>
            </tr>
        `;
    }

    function ocultarCargandoCocina() {
        const loadingDiv = document.querySelector('.loading-state');
        if (loadingDiv) loadingDiv.remove();
    }

    // ===== FUNCIONES PARA GESTIONAR RELACIONES FIJAS =====

    // Función para agregar relación fija
    window.agregarRelacionFija = function (productoId, ingredienteId, cantidad) {
        // Verificar si ya existe la relación
        const existe = relacionesProductos.some(r =>
            r.productoId === productoId && r.ingredienteId === ingredienteId
        );

        if (!existe) {
            relacionesProductos.push({
                id: Date.now(),
                productoId: productoId,
                ingredienteId: ingredienteId,
                cantidad: cantidad
            });

            guardarRelacionesProductos();
            recalcularConsumosPorRelaciones();
            actualizarTablaCocina();
            showNotification('Relación fija agregada correctamente', 'success');
        } else {
            showNotification('Esta relación ya existe', 'warning');
        }
    };

    // Función para eliminar relación fija
    window.eliminarRelacionFija = function (relacionId) {
        const index = relacionesProductos.findIndex(r => r.id === relacionId);
        if (index !== -1) {
            relacionesProductos.splice(index, 1);
            guardarRelacionesProductos();
            recalcularConsumosPorRelaciones();
            actualizarTablaCocina();
            showNotification('Relación eliminada correctamente', 'success');
        }
    };

    // Función para gestionar panes con ingredientes
    window.agregarPanConIngredientes = function (panId, ingredientes) {
        // Primero eliminar relaciones existentes para este pan
        relacionesPanIngredientes = relacionesPanIngredientes.filter(r => r.panId !== panId);

        // Agregar nuevas relaciones
        ingredientes.forEach(ingrediente => {
            relacionesPanIngredientes.push({
                id: Date.now(),
                panId: panId,
                ingredienteId: ingrediente.id,
                cantidad: ingrediente.cantidad
            });
        });

        guardarRelacionesProductos();
        actualizarTablaCocina();
        showNotification('Pan con ingredientes configurado correctamente', 'success');
    };

    // Función para ver relaciones de un producto
    window.verRelacionesProducto = function (productoId) {
        const producto = cocinaData.find(p => p.id === productoId);
        if (!producto) return;

        const relaciones = relacionesProductos.filter(r => r.productoId === productoId);
        const panRelaciones = relacionesPanIngredientes.filter(r => r.panId === productoId);

        if (relaciones.length === 0 && panRelaciones.length === 0) {
            showNotification(`${producto.nombre} no tiene ingredientes configurados`, 'info');
            return;
        }

        let mensaje = `<strong>${producto.nombre}</strong><br><br>`;

        if (relaciones.length > 0) {
            mensaje += '<strong>Ingredientes fijos:</strong><br>';
            relaciones.forEach(rel => {
                const ingrediente = cocinaData.find(p => p.id === rel.ingredienteId);
                if (ingrediente) {
                    mensaje += `• ${ingrediente.nombre}: ${rel.cantidad} por unidad<br>`;
                }
            });
            mensaje += '<br>';
        }

        if (panRelaciones.length > 0) {
            mensaje += '<strong>Ingredientes para pan:</strong><br>';
            panRelaciones.forEach(rel => {
                const ingrediente = cocinaData.find(p => p.id === rel.ingredienteId);
                if (ingrediente) {
                    mensaje += `• ${ingrediente.nombre}: ${rel.cantidad}<br>`;
                }
            });
        }

        // Mostrar en modal
        const modalHtml = `
            <div class="modal active">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-list"></i> Ingredientes de ${producto.nombre}</h3>
                        <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div style="padding: 10px;">
                            ${mensaje}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    };

    // ===== FUNCIONES AUXILIARES =====

    function obtenerHoraActual() {
        const now = new Date();
        return now.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    function getTodayDate() {
        const now = new Date();
        return now.toISOString().split('T')[0];
    }

    function showConfirmationModal(title, message, type, onConfirm) {
        if (typeof window.showConfirmationModal === 'function') {
            window.showConfirmationModal(title, message, type, onConfirm);
        } else {
            if (confirm(`${title}\n\n${message}`)) {
                onConfirm();
            }
        }
    }

    function showNotification(message, type = 'success') {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            alert(message);
        }
    }

    function productoCocina() {
        cargarProductosCocina().then(() => {
            if (productosCocina.length === 0) {
                showNotification('No hay productos en la cocina. Agrega productos primero.', 'warning');
                verificarProductosCocina();
            } else {
                sincronizarConProductosCocina();
                recalcularConsumosPorRelaciones();
                reconstruirConsumosDesdeAgregos();
                guardarDatosCocina();
                verificarProductosCocina();
                actualizarTablaCocina();
                actualizarResumenCocina();
            }
        });
    }

    function actualizarTotalIngredientes() {
        // Función auxiliar para actualizar el total de ingredientes seleccionados
        const inputs = document.querySelectorAll('.ingrediente-cantidad:not(:disabled)');
        let total = 0;
        let contador = 0;

        inputs.forEach(input => {
            const valor = parseInt(input.value) || 0;
            if (valor > 0) {
                total += valor;
                contador++;
            }
        });

        // Actualizar algún elemento del DOM si es necesario
        const totalElement = document.getElementById('total-ingredientes-seleccionados');
        if (totalElement) {
            totalElement.textContent = `${contador} ingrediente(s) seleccionado(s) - Total: ${total} unidad(es)`;
        }
    }

    // Funciones disponibles globalmente
    window.getCocinaVentasTotal = function () {
        const totalImporte = cocinaData.reduce((sum, p) => sum + p.importe, 0);
        const totalAgregos = agregos.reduce((sum, a) => sum + a.montoTotal, 0);
        return totalImporte + totalAgregos;
    };

    window.getCocinaAgregosTotal = function () {
        return agregos.reduce((sum, a) => sum + a.montoTotal, 0);
    };

    window.resetCocinaDia = function () {
        // Resetear datos de cocina
        cocinaData.forEach(producto => {
            // Guardar el final del día anterior como inicio del nuevo día
            producto.inicio = producto.final;
            producto.entrada = 0;
            producto.venta = producto.final;
            producto.final = producto.final;
            producto.vendido = 0;
            producto.importe = 0;
            producto.disponible = 0;
            producto.historial = producto.historial;
            producto.ultimaActualizacion = obtenerHoraActual();
        });

        // Limpiar todos los agregos del día
        agregos = [];

        // Resetear estado de edición
        editingFinalEnabled = false;

        // Guardar cambios
        recalcularDisponibilidad();
        guardarDatosCocina();

        // Actualizar UI
        actualizarTablaCocina();
        actualizarResumenCocina();
        actualizarListaAgregos();
    };

    // Exponer datos y funciones para uso global
    window.cocinaData = cocinaData;
    window.productosCocina = productosCocina;
    window.agregos = agregos;
    window.relacionesProductos = relacionesProductos;
    window.relacionesPanIngredientes = relacionesPanIngredientes;
    window.sincronizarProductosCocina = productoCocina;
    window.guardarAgregoSimpleCheckboxes = guardarAgregoSimpleCheckboxes;
});

// Inicializar cuando se carga la sección de cocina
document.addEventListener('DOMContentLoaded', function () {
    // Escuchar cambios en la navegación
    const cocinaLinks = document.querySelectorAll('a[data-section="cocina"]');
    cocinaLinks.forEach(link => {
        link.addEventListener('click', function () {
            // Recargar productos cuando se entra a la sección
            setTimeout(() => {
                if (typeof window.sincronizarProductosCocina === 'function') {
                    window.sincronizarProductosCocina();
                }
            }, 500);
        });
    });
});