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

            console.log('Datos cargados - Estado inicial:', {
                cocinaData: cocinaData.map(p => ({
                    nombre: p.nombre,
                    inicio: p.inicio,
                    entrada: p.entrada,
                    venta: p.venta,
                    final: p.final,
                    vendido: p.vendido,  // ← Verificar este valor
                    precio: p.precio
                }))
            });

            // 4. Reconstruir consumos
            reconstruirConsumosDesdeAgregos();

            setupEventListeners();
            verificarProductosCocina();

            // 5. Recalcular todo
            recalcularDisponibilidad();
            actualizarTablaCocina();
            actualizarResumenCocina();
            actualizarListaAgregos();
            ocultarCargandoCocina();

            console.log('Cocina inicializada correctamente');

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
            const agregosGuardados = localStorage.getItem(`cocina_agregos_${today}`);

            agregos = agregosGuardados ? JSON.parse(agregosGuardados) : [];
            resolve();
        });
    }

    function reconstruirConsumosDesdeAgregos() {
        console.log('Reconstruyendo consumos desde agregos...', agregos.length);

        // PRIMERO: Calcular total consumido por cada ingrediente desde agregos
        const consumoDesdeAgregos = {};

        // Inicializar contador
        cocinaData.forEach(producto => {
            if (producto.esIngrediente) {
                consumoDesdeAgregos[producto.id] = 0;
            }
        });

        // Calcular consumo desde agregos
        agregos.forEach(agrego => {
            if (agrego.ingredientes && agrego.ingredientes.length > 0) {
                agrego.ingredientes.forEach(ingrediente => {
                    if (consumoDesdeAgregos[ingrediente.id] !== undefined) {
                        consumoDesdeAgregos[ingrediente.id] += ingrediente.cantidad;
                    }
                });
            }
        });

        // SEGUNDO: Actualizar vendidos SIN perder ventas de productos principales
        cocinaData.forEach(producto => {
            if (producto.esIngrediente) {
                // Solo actualizar vendido para ingredientes
                const consumoAgregos = consumoDesdeAgregos[producto.id] || 0;

                // Calcular ventas desde productos principales (si existen relaciones)
                let consumoProductosPrincipales = 0;
                const relaciones = relacionesProductos.filter(r => r.ingredienteId === producto.id);

                relaciones.forEach(rel => {
                    const productoPrincipal = cocinaData.find(p => p.id === rel.productoId);
                    if (productoPrincipal && !productoPrincipal.esIngrediente) {
                        consumoProductosPrincipales += productoPrincipal.vendido * rel.cantidad;
                    }
                });

                // Vendido total = consumo desde agregos + consumo desde productos principales
                producto.vendido = consumoAgregos + consumoProductosPrincipales;

                // Recalcular final
                producto.final = Math.max(0, producto.venta - producto.vendido);
            }
        });

        console.log('Consumo desde agregos:', consumoDesdeAgregos);

        // Recalcular disponibilidad
        recalcularDisponibilidad();
    }
    function guardarAgregos() {
        const today = getTodayDate();
        localStorage.setItem(`cocina_agregos_${today}`, JSON.stringify(agregos));
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
            return;
        }

        if (cocinaEmptyState) cocinaEmptyState.style.display = 'none';

        cocinaData.forEach((producto, index) => {
            const row = crearFilaProductoCocina(producto, index);
            cocinaTable.appendChild(row);
        });
    }

    function crearFilaProductoCocina(producto, index) {
        console.log(producto)
        const row = document.createElement('tr');
        row.dataset.id = producto.id;
        row.dataset.index = index;

        // Recalcular primero
        recalcularProductoCocina(producto);
        recalcularDisponibilidad();

        // Determinar valor a mostrar en campo final
        let valorFinal = producto.final;

        // MODIFICACIÓN: Solo auto-establecer si NO es ingrediente, es 0, NO estamos editando y hay ventas
        // NO auto-ajustar ingredientes (precio = 0)
        if (valorFinal === 0 && !editingFinalEnabled && producto.venta > 0 && producto.precio > 0) {
            valorFinal = producto.venta;
            producto.final = valorFinal;
            // Recalcular con el nuevo valor
            recalcularProductoCocina(producto);
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

                    // Si el valor es mayor a la venta, ajustar y mostrar notificación
                    if (newValue > venta) {
                        newValue = venta;
                        this.value = venta;

                        showNotification(
                            `El valor final no puede ser mayor a la venta (${venta}). Se ajustó a ${venta}.`,
                            'warning'
                        );
                    }

                    // Validar disponibilidad de ingredientes si es un producto con ingredientes fijos
                    if (!producto.esIngrediente) {
                        validarDisponibilidadIngredientes(producto, newValue);
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

    function validarDisponibilidadIngredientes(producto, nuevoFinal) {
        // Calcular cuántas unidades se quieren vender
        const venta = producto.venta;
        const nuevoVendido = venta - nuevoFinal;
        const diferenciaVendido = nuevoVendido - producto.vendido;

        if (diferenciaVendido <= 0) return true; // No se está vendiendo más

        // Buscar relaciones de ingredientes para este producto
        const relaciones = relacionesProductos.filter(r => r.productoId === producto.id);

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

        if (!hayDisponibilidad) {
            showNotification(
                `No hay suficientes ingredientes para vender ${diferenciaVendido} ${producto.nombre}:${mensajeError}\n\nPor favor, da entrada a más ingredientes o ajusta el valor final.`,
                'error'
            );
            return false;
        }

        return true;
    }

    function recalcularProductoCocina(producto) {
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
            const puedeVender = validarDisponibilidadIngredientes(producto, producto.final, false); // false para no mostrar notificación
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
        if (producto.esIngrediente) return producto.venta; // Los ingredientes no tienen restricciones

        const relaciones = relacionesProductos.filter(r => r.productoId === producto.id);
        if (relaciones.length === 0) return producto.venta; // Sin relaciones, puede vender todo

        let maxVendible = producto.venta; // Inicializar con el máximo teórico

        relaciones.forEach(relacion => {
            const ingrediente = cocinaData.find(p => p.id === relacion.ingredienteId);
            if (ingrediente) {
                // Calcular cuántas unidades se pueden hacer con este ingrediente
                const disponibles = ingrediente.disponible;
                const maxConEsteIngrediente = Math.floor(disponibles / relacion.cantidad);

                // Tomar el mínimo entre todos los ingredientes
                maxVendible = Math.min(maxVendible, maxConEsteIngrediente);
            }
        });

        return Math.max(0, maxVendible); // No puede ser negativo
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
                    producto.finalEditado = true;
                }

                // Recalcular primero
                recalcularProductoCocina(producto);

                // Si es un producto principal (no ingrediente) y cambió el FINAL
                if (!producto.esIngrediente && field === 'final') {
                    // Calcular cuánto se vendió realmente
                    const nuevoVendido = producto.venta - value;

                    // Validar disponibilidad de ingredientes
                    if (!validarDisponibilidadIngredientes(producto, value)) {
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
        // PRIMERO: Calcular cuánto deberían haber consumido los ingredientes basado en productos vendidos
        const consumoPorIngrediente = {};

        // Inicializar el objeto de consumo
        cocinaData.forEach(producto => {
            if (producto.esIngrediente) {
                consumoPorIngrediente[producto.id] = {
                    id: producto.id,
                    nombre: producto.nombre,
                    consumoTotal: 0,
                    vendidoActual: producto.vendido
                };
            }
        });

        // SEGUNDO: Calcular el consumo teórico basado en productos vendidos
        cocinaData.forEach(producto => {
            if (!producto.esIngrediente) {
                const relaciones = relacionesProductos.filter(r => r.productoId === producto.id);

                relaciones.forEach(relacion => {
                    if (consumoPorIngrediente[relacion.ingredienteId]) {
                        // Solo sumar el consumo de lo que se ha vendido AHORA, no acumular
                        consumoPorIngrediente[relacion.ingredienteId].consumoTotal +=
                            producto.vendido * relacion.cantidad;
                    }
                });
            }
        });

        // TERCERO: Ajustar los vendidos de los ingredientes SOLO si es necesario
        Object.values(consumoPorIngrediente).forEach(ing => {
            const ingrediente = cocinaData.find(p => p.id === ing.id);
            if (ingrediente) {
                // Si el consumo teórico es diferente a lo que ya está registrado, ajustar
                if (ingrediente.vendido !== ing.consumoTotal) {
                    ingrediente.vendido = ing.consumoTotal;
                    // Recalcular el final del ingrediente
                    ingrediente.final = Math.max(0, ingrediente.venta - ingrediente.vendido);
                    recalcularProductoCocina(ingrediente);
                }
            }
        });

        // Recalcular disponibilidad
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
                const searchTerm = this.value.toLowerCase().trim();
                const rows = cocinaTable.querySelectorAll('tr');
                let visibleCount = 0;

                rows.forEach(row => {
                    const productName = row.querySelector('.product-name');
                    if (productName) {
                        const match = productName.textContent.toLowerCase().includes(searchTerm);
                        row.style.display = match ? '' : 'none';
                        if (match) visibleCount++;
                    }
                });

                if (cocinaEmptyState) {
                    cocinaEmptyState.style.display = visibleCount === 0 ? 'block' : 'none';
                }
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
                    vendido: 0,  // ← Iniciar en 0
                    importe: 0,
                    disponible: 0,
                    historial: [],
                    ultimaActualizacion: obtenerHoraActual(),
                    finalEditado: false  // ← Agregar esta propiedad
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
                        vendido: productoExistente.vendido,  // ← CRÍTICO: Preservar vendido
                        importe: productoExistente.importe,
                        disponible: productoExistente.disponible,
                        historial: productoExistente.historial,
                        ultimaActualizacion: productoExistente.ultimaActualizacion,
                        finalEditado: productoExistente.finalEditado
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
                        // Ajustar final si no ha sido editado
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

        // Crear modal con gestión de disponibilidad
        const modalHtml = `
        <div class="modal active" id="modal-agrego-simple">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3><i class="fas fa-hamburger"></i> Registrar Agrego Simple o Producto Compuesto</h3>
                    <button class="modal-close" onclick="cerrarModalAgrego()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="agrego-nombre">Nombre del Agrego o Producto *</label>
                            <input type="text" id="agrego-nombre" class="form-input" placeholder="Ej: Jamón, Queso, Tocino..." required>
                        </div>
                        
                        <div class="form-group">
                            <label for="agrego-precio">Precio del Agrego o Producto *</label>
                            <input type="number" id="agrego-precio" class="form-input" placeholder="0.00" step="1.00" min="0" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="agrego-cantidad">Cantidad del Agrego o Producto *</label>
                            <input type="number" id="agrego-cantidad" class="form-input" placeholder="Ej: 1, 2, 3..." min="1" value="1" required>
                        </div>
                    </div>
                    
                    <h4>Seleccionar Ingredientes Consumidos:</h4>
                    <p class="small-text"><i class="fas fa-info-circle"></i> Solo puedes usar ingredientes disponibles</p>
                    
                    <div style="margin-bottom: 10px; text-align: right;">
                        <button type="button" class="btn btn-sm btn-secondary" onclick="actualizarDisponibilidadModal()">
                            <i class="fas fa-sync-alt"></i> Actualizar Disponibilidad
                        </button>
                    </div>
                    
                    <div class="ingredientes-grid" id="ingredientes-list" style="max-height: 300px; overflow-y: auto;">
                        ${ingredientes.map(ing => `
                            <div class="ingrediente-item ${ing.disponible <= 0 ? 'disabled' : ''}" id="ingrediente-${ing.id}">
                                <div class="ingrediente-info">
                                    <span class="ingrediente-nombre">${ing.nombre}</span>
                                    <span class="ingrediente-disponible ${ing.disponible > 0 ? 'available' : 'unavailable'}">
                                        Disponible: <span id="disponible-${ing.id}">${ing.disponible}</span>
                                    </span>
                                </div>
                                <div class="ingrediente-controls">
                                    <input type="number" 
                                           min="0" 
                                           max="${ing.disponible}"
                                           value="0"
                                           data-ingrediente-id="${ing.id}"
                                           data-ingrediente-nombre="${ing.nombre}"
                                           data-ingrediente-disponible="${ing.disponible}"
                                           class="ingrediente-cantidad form-input-sm"
                                           ${ing.disponible <= 0 ? 'disabled' : ''}
                                           oninput="validarCantidadIngrediente(this)">
                                    <span class="unidad-text">unidad(es)</span>
                                </div>
                                ${ing.disponible <= 0 ? '<div class="ingrediente-sin-disponibilidad">Sin disponibilidad</div>' : ''}
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group full-width">
                            <label for="agrego-notas">Notas (Opcional)</label>
                            <textarea id="agrego-notas" class="form-textarea" placeholder="Detalles adicionales sobre el agrego..." rows="2"></textarea>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="cerrarModalAgrego()">
                        Cancelar
                    </button>
                    <button class="btn btn-primary" id="guardar-agrego-simple-modal" onclick="guardarAgregoSimpleDesdeModal()">
                        <i class="fas fa-save"></i> Guardar
                    </button>
                </div>
            </div>
        </div>
    `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Añadir funciones globales para el modal
        window.cerrarModalAgrego = function () {
            const modal = document.getElementById('modal-agrego-simple');
            if (modal) modal.remove();
        };

        window.actualizarDisponibilidadModal = function () {
            // Recalcular disponibilidad global
            recalcularDisponibilidad();

            // Actualizar cada ingrediente en el modal
            ingredientes.forEach(ing => {
                const disponibleSpan = document.getElementById(`disponible-${ing.id}`);
                const input = document.querySelector(`[data-ingrediente-id="${ing.id}"]`);
                const itemDiv = document.getElementById(`ingrediente-${ing.id}`);

                if (disponibleSpan) {
                    disponibleSpan.textContent = ing.disponible;
                }

                if (input) {
                    // Actualizar el máximo permitido
                    input.max = ing.disponible;
                    input.dataset.ingredienteDisponible = ing.disponible;

                    // Si el valor actual excede la nueva disponibilidad, ajustarlo
                    const currentValue = parseInt(input.value) || 0;
                    if (currentValue > ing.disponible) {
                        input.value = ing.disponible;
                        showNotification(`Ajustado ${ing.nombre} a ${ing.disponible} unidades (máximo disponible)`, 'warning');
                    }

                    // Habilitar/deshabilitar según disponibilidad
                    if (ing.disponible <= 0) {
                        input.disabled = true;
                        input.value = 0;
                        if (itemDiv) itemDiv.classList.add('disabled');
                    } else {
                        input.disabled = false;
                        if (itemDiv) itemDiv.classList.remove('disabled');
                    }
                }
            });

            showNotification('Disponibilidad actualizada', 'info');
        };

        window.validarCantidadIngrediente = function (input) {
            const max = parseInt(input.max) || 0;
            let value = parseInt(input.value) || 0;

            // Evitar valores negativos
            if (value < 0) {
                value = 0;
                input.value = 0;
            }

            // Validar que no exceda el máximo
            if (value > max) {
                value = max;
                input.value = max;
                showNotification(`No puedes usar más de ${max} unidades de ${input.dataset.ingredienteNombre}`, 'error');
            }

            // Actualizar total de ingredientes seleccionados
            actualizarTotalIngredientes();
        };

        // Inicializar el contador de ingredientes
        setTimeout(actualizarTotalIngredientes, 100);
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

    function guardarAgregoSimpleDesdeModal() {
        // Obtener valores de los campos
        const nombre = document.getElementById('agrego-nombre').value.trim();
        const precio = parseFloat(document.getElementById('agrego-precio').value) || 0;
        const cantidad = parseInt(document.getElementById('agrego-cantidad').value) || 1;
        const notas = document.getElementById('agrego-notas').value.trim();

        // Validación 1: Nombre requerido
        if (!nombre) {
            showNotification('El nombre es requerido', 'error');
            document.getElementById('agrego-nombre').focus();
            return;
        }

        // Validación 2: Precio válido
        if (precio <= 0) {
            showNotification('El precio debe ser mayor a 0', 'error');
            document.getElementById('agrego-precio').focus();
            return;
        }

        // Validación 3: Cantidad válida
        if (cantidad <= 0) {
            showNotification('La cantidad debe ser mayor a 0', 'error');
            document.getElementById('agrego-cantidad').focus();
            return;
        }

        // Validación 4: Notas (opcional pero con límite)
        if (notas.length > 500) {
            showNotification('Las notas no pueden exceder 500 caracteres', 'warning');
            document.getElementById('agrego-notas').focus();
            return;
        }

        // Obtener ingredientes seleccionados
        const ingredientesInputs = document.querySelectorAll('.ingrediente-cantidad:not(:disabled)');
        const ingredientesConsumidos = [];
        let hayIngredientes = false;

        // Validación 5: Revisar cada ingrediente
        ingredientesInputs.forEach(input => {
            const cantidadUsada = parseInt(input.value) || 0;
            const inputId = input.id || input.dataset.ingredienteId;

            if (cantidadUsada > 0) {
                const disponible = parseInt(input.dataset.ingredienteDisponible) || 0;
                const ingredienteNombre = input.dataset.ingredienteNombre || 'Ingrediente';

                // Validación: Cantidad no puede ser negativa
                if (cantidadUsada < 0) {
                    showNotification(`La cantidad de ${ingredienteNombre} no puede ser negativa`, 'error');
                    input.value = 0;
                    input.focus();
                    return;
                }

                // Validación: No exceder disponibilidad
                if (cantidadUsada > disponible) {
                    showNotification(`No hay suficiente ${ingredienteNombre}. Disponible: ${disponible}`, 'error');
                    input.value = Math.min(cantidadUsada, disponible);
                    input.focus();
                    return;
                }

                // Si pasa todas las validaciones, agregar al array
                ingredientesConsumidos.push({
                    id: parseInt(input.dataset.ingredienteId),
                    nombre: ingredienteNombre,
                    cantidad: cantidadUsada,
                    inputId: inputId
                });
                hayIngredientes = true;
            }
        });

        // Validación 6: Al menos un ingrediente
        if (!hayIngredientes) {
            showNotification('Debe seleccionar al menos un ingrediente consumido', 'warning');

            // Enfocar el primer input de ingrediente disponible
            const primerInput = document.querySelector('.ingrediente-cantidad:not(:disabled)');
            if (primerInput) {
                primerInput.focus();
            }

            return;
        }

        // Validación 7: Verificar que no haya valores NaN en los inputs
        let hayValoresInvalidos = false;
        document.querySelectorAll('.ingrediente-cantidad').forEach(input => {
            const valor = input.value;
            if (valor && isNaN(parseInt(valor))) {
                showNotification(`Valor inválido en ${input.dataset.ingredienteNombre || 'ingrediente'}`, 'error');
                input.value = 0;
                hayValoresInvalidos = true;
            }
        });

        if (hayValoresInvalidos) {
            return;
        }

        // Descontar del ingrediente en la tabla
        ingredientesConsumidos.forEach(ingrediente => {
            const productoIndex = cocinaData.findIndex(p => p.id === ingrediente.id);
            if (productoIndex !== -1) {
                const ingredienteItem = cocinaData[productoIndex];
                ingredienteItem.vendido += ingrediente.cantidad;
                // Ajustar el final para mantener consistencia
                ingredienteItem.final = Math.max(0, ingredienteItem.venta - ingredienteItem.vendido);
                console.log(ingredienteItem.final)
            }
        });

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
            tipo: 'agrego-simple'
        };

        // Agregar a la lista de agregos
        agregos.push(nuevoAgrego);

        // Guardar y actualizar
        recalcularDisponibilidad();
        guardarDatosCocina();
        actualizarResumenCocina();
        actualizarListaAgregos();
        actualizarTablaCocina();

        document.getElementById('modal-agrego-simple').remove();

        showNotification('Agrego o producto compuesto registrado correctamente', 'success');

        // Limpiar formulario si es necesario
        if (typeof resetFormularioAgrego === 'function') {
            resetFormularioAgrego();
        }
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
                                producto.vendido -= ingrediente.cantidad;
                                if (producto.vendido < 0) {
                                    producto.vendido = 0;
                                }
                                producto.final = Math.max(0, producto.venta - producto.vendido);
                            }
                        });
                    }

                    agregos.splice(agregoIndex, 1);

                    // Recalcular disponibilidad y guardar
                    recalcularDisponibilidad();
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
                    <p>No hay agregos registrados hoy</p>
                </div>
            `;
        } else {
            let html = '';
            agregos.forEach(agrego => {
                let tipoBadge = '';
                let ingredientesText = '';

                if (agrego.ingredientes && agrego.ingredientes.length > 0) {
                    ingredientesText = agrego.ingredientes.map(i => {
                        if (i.cantidadPorProducto) {
                            return `${i.nombre} (${i.cantidadPorProducto} × ${agrego.cantidad} = ${i.cantidad})`;
                        }
                        return `${i.nombre} (${i.cantidad})`;
                    }).join(', ');
                }

                html += `
                    <div class="agrego-card" data-id="${agrego.id}" data-tipo="${agrego.tipo}">
                        <div class="agrego-info">
                            <div class="agrego-header">
                                <div class="agrego-descripcion">
                                    <strong>${agrego.nombre || agrego.productoBaseNombre}</strong>
                                    ${agrego.cantidad > 1 ? `- ${agrego.cantidad} unidad(es)` : ''}
                                    ${tipoBadge}
                                </div>
                            </div>
                            ${ingredientesText ? `
                                <div class="agrego-ingredientes">
                                    <small><i class="fas fa-clipboard-list"></i> Ingredientes: ${ingredientesText}</small>
                                </div>
                            ` : ''}
                            ${agrego.notas ? `<div class="agrego-notas">${agrego.notas}</div>` : ''}
                        </div>
                        <div class="agrego-monto">$${agrego.montoTotal.toFixed(2)}</div>
                        <div class="agrego-hora">${agrego.hora}</div>
                        <button class="eliminar-agrego-btn" data-id="${agrego.id}" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
            });

            listaAgregos.innerHTML = html;

            const botonesEliminar = listaAgregos.querySelectorAll('.eliminar-agrego-btn');
            botonesEliminar.forEach(btn => {
                btn.addEventListener('click', function () {
                    const agregoId = parseInt(this.dataset.id);
                    eliminarAgrego(agregoId);
                });
            });
        }

        const totalAgregosElement = document.getElementById('total-agregos');
        const total = agregos.reduce((sum, a) => sum + a.montoTotal, 0);

        if (totalAgregosElement) {
            totalAgregosElement.textContent = `$${total.toFixed(2)}`;
        }
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
            producto.venta = producto.inicio + producto.entrada;
            producto.final = 0;
            producto.vendido = 0;
            producto.importe = 0;
            producto.disponible = 0;
            producto.historial = [];
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
    window.guardarAgregoSimpleDesdeModal = guardarAgregoSimpleDesdeModal;

    console.log('Cocina cargada con validaciones avanzadas de disponibilidad y productos compuestos');
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