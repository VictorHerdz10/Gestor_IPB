// Control de Cocina - VERSIÓN SIMPLIFICADA Y MEJORADA
document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const cocinaTable = document.getElementById('cocina-tbody');
    const cocinaSearch = document.getElementById('cocina-search');
    const btnEditarFinalCocina = document.getElementById('btn-agregar-agrego');
    const btnFinalizarDiaCocina = document.getElementById('btn-finalizar-dia-cocina');
    const btnSincronizarProductosCocina = document.getElementById('btn-sincronizar-productos-cocina');
    const btnSincronizarEmptyCocina = document.getElementById('btn-sincronizar-empty-cocina');
    const cocinaEmptyState = document.getElementById('cocina-empty-state');
    const saveIndicatorCocina = document.getElementById('save-indicator-cocina');
    const cocinaTableContainer = document.getElementById('cocina-table-container');
    const cocinaNoProducts = document.getElementById('cocina-no-products');
    const btnIrProductos = document.getElementById('btn-ir-productos');
    
    // Elementos de agregos
    const listaAgregos = document.getElementById('lista-agregos');
    const btnAgregarAgregoTop = document.getElementById('btn-agregar-agrego-top');
    
    // Variables de estado
    let cocinaData = [];
    let productosCocina = [];
    let agregos = [];
    let relacionesProductos = []; // Relaciones fijas: producto -> ingrediente
    let autoSaveTimer = null;
    let editingFinalEnabled = false;

    // Inicializar
    initCocina();
    
    async function initCocina() {
        try {
            mostrarCargandoCocina();
            await cargarProductosCocina();
            await cargarRelacionesProductos();
            await cargarDatosCocina();
            await cargarAgregos();
            setupEventListeners();
            verificarProductosCocina();
            
            // Sincronizar productos automáticamente al cargar
            await sincronizarConProductosCocina();
            
            // Recalcular relaciones automáticas
            recalcularConsumosPorRelaciones();
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
    }
    
    function cargarDatosCocina() {
        return new Promise((resolve) => {
            const datosGuardados = localStorage.getItem('ipb_cocina');
            
            if (datosGuardados) {
                cocinaData = JSON.parse(datosGuardados);
            } else {
                cocinaData = productosCocina.map(producto => ({
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
                    ultimaActualizacion: obtenerHoraActual()
                }));
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
    
    function guardarAgregos() {
        const today = getTodayDate();
        localStorage.setItem(`cocina_agregos_${today}`, JSON.stringify(agregos));
    }
    
    function recalcularDisponibilidad() {
        // Calcular disponibilidad para cada ingrediente
        cocinaData.forEach(producto => {
            if (producto.esIngrediente) {
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
        const row = document.createElement('tr');
        row.dataset.id = producto.id;
        row.dataset.index = index;
        
        recalcularProductoCocina(producto);
        recalcularDisponibilidad();
        
        let valorFinal = producto.final;
        
        if (!editingFinalEnabled && producto.final === 0 && producto.venta > 0) {
            valorFinal = producto.venta;
        }
        
        // Verificar si tiene relaciones
        const esUsadoEn = relacionesProductos.filter(r => r.ingredienteId === producto.id).length > 0;
        const esProductoConIngredientes = relacionesProductos.filter(r => r.productoId === producto.id).length > 0;
        
        row.innerHTML = `
            <td class="producto-cell">
                <span class="product-name">${producto.nombre}</span>
                ${producto.esIngrediente ? '<span class="badge-ingrediente">Ingrediente</span>' : ''}
                ${esUsadoEn ? '<span class="badge-relacion" title="Usado en otros productos">✓</span>' : ''}
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
            
            input.addEventListener('focus', function() {
                this.dataset.oldValue = this.value;
                this.classList.add('focus');
                
                if (this.dataset.field === 'final' && this.disabled && editingFinalEnabled) {
                    this.disabled = false;
                    this.classList.add('editing-enabled');
                }
            });
            
            input.addEventListener('blur', function() {
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
                    
                    programarAutoSaveCocina();
                    
                    setTimeout(() => {
                        this.classList.remove('edited');
                    }, 1000);
                }
            });
            
            input.addEventListener('input', function() {
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
            
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    this.blur();
                }
            });
        });
    }
    
    function validarDisponibilidadIngredientes(producto, nuevoFinal) {
        const venta = producto.venta;
        const nuevoVendido = venta - nuevoFinal;
        const diferenciaVendido = nuevoVendido - producto.vendido;
        
        if (diferenciaVendido <= 0) return true;
        
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
        producto.venta = producto.inicio + producto.entrada;
        
        if (!editingFinalEnabled && producto.final === 0 && producto.venta > 0) {
            producto.final = producto.venta;
        }
        
        producto.vendido = Math.max(0, producto.venta - producto.final);
        producto.importe = producto.precio > 0 ? producto.vendido * producto.precio : 0;
        
        return producto;
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
                
                recalcularProductoCocina(producto);
                
                if (!producto.esIngrediente) {
                    if (field === 'final') {
                        if (!validarDisponibilidadIngredientes(producto, value)) {
                            producto[field] = oldValue;
                            recalcularProductoCocina(producto);
                            return;
                        }
                    }
                    recalcularConsumosPorRelaciones();
                }
                
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
                
                guardarDatosCocina();
            }
        }
    }
    
    function recalcularConsumosPorRelaciones() {
        cocinaData.forEach(producto => {
            if (producto.esIngrediente) {
                const vendidoAgregos = producto.vendido;
                producto.vendido = 0;
                recalcularProductoCocina(producto);
                producto.vendido = vendidoAgregos;
            }
        });
        
        cocinaData.forEach(producto => {
            if (!producto.esIngrediente) {
                const relaciones = relacionesProductos.filter(r => r.productoId === producto.id);
                
                relaciones.forEach(relacion => {
                    const ingrediente = cocinaData.find(p => p.id === relacion.ingredienteId);
                    if (ingrediente) {
                        const consumo = producto.vendido * relacion.cantidad;
                        ingrediente.vendido += consumo;
                        ingrediente.final = Math.max(0, ingrediente.venta - ingrediente.vendido);
                    }
                });
            }
        });
        
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
            cocinaSearch.addEventListener('input', function() {
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
            btnEditarFinalCocina.addEventListener('click', function() {
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
            btnFinalizarDiaCocina.addEventListener('click', function() {
                showConfirmationModal(
                    'Finalizar Día en Cocina',
                    '¿Estás seguro de finalizar el día en cocina? Se calcularán automáticamente los productos vendidos.',
                    'warning',
                    function() {
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
        
        // Sincronizar productos
        if (btnSincronizarProductosCocina) {
            btnSincronizarProductosCocina.addEventListener('click', function() {
                cargarProductosCocina().then(() => {
                    if (productosCocina.length === 0) {
                        showNotification('No hay productos en la cocina. Agrega productos primero.', 'warning');
                        verificarProductosCocina();
                    } else {
                        sincronizarConProductosCocina();
                        recalcularConsumosPorRelaciones();
                        guardarDatosCocina();
                        verificarProductosCocina();
                        actualizarTablaCocina();
                        actualizarResumenCocina();
                        
                        showNotification(`Sincronizados ${productosCocina.length} productos de cocina`, 'success');
                    }
                });
            });
        }
        
        if (btnSincronizarEmptyCocina) {
            btnSincronizarEmptyCocina.addEventListener('click', function() {
                cargarProductosCocina().then(() => {
                    if (productosCocina.length > 0) {
                        sincronizarConProductosCocina();
                        recalcularConsumosPorRelaciones();
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
            btnIrProductos.addEventListener('click', function() {
                const productoLink = document.querySelector('a[data-section="productos"]');
                if (productoLink) {
                    productoLink.click();
                }
            });
        }
        
        // Agregar agrego/producto compuesto
        if (btnAgregarAgregoTop) {
            btnAgregarAgregoTop.addEventListener('click', mostrarModalAgregoCompuesto);
        }
    }
    
    function sincronizarConProductosCocina() {
        const productosIds = productosCocina.map(p => p.id);
        const cocinaIds = cocinaData.map(p => p.id);
        
        productosCocina.forEach(producto => {
            if (!cocinaIds.includes(producto.id)) {
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
                    ultimaActualizacion: obtenerHoraActual()
                });
            }
        });
        
        cocinaData = cocinaData.filter(item => productosIds.includes(item.id));
        
        cocinaData.forEach(item => {
            const productoActual = productosCocina.find(p => p.id === item.id);
            if (productoActual) {
                item.nombre = productoActual.nombre;
                item.precio = productoActual.precio;
                item.esIngrediente = productoActual.precio === 0;
            }
        });
        
        return Promise.resolve();
    }
    
    function mostrarModalAgregoCompuesto() {
        // Filtrar productos
        const productosBase = cocinaData.filter(p => p.precio > 0);
        const ingredientes = cocinaData.filter(p => p.precio === 0);
        
        if (productosBase.length === 0 && ingredientes.length === 0) {
            showNotification('No hay productos ni ingredientes disponibles para registrar', 'warning');
            return;
        }
        
        const modalHtml = `
            <div class="modal active" id="modal-agrego-compuesto">
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-plus-circle"></i> Registrar Agrego o Producto Compuesto</h3>
                        <button class="modal-close" onclick="document.getElementById('modal-agrego-compuesto').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="tipo-registro">Tipo de Registro *</label>
                                <select id="tipo-registro" class="form-select" required>
                                    <option value="">Selecciona tipo...</option>
                                    <option value="agrego">Agrego Simple (Complemento)</option>
                                    <option value="producto">Producto Compuesto</option>
                                    <option value="configurar">Configurar Relaciones de Producto</option>
                                </select>
                            </div>
                        </div>
                        
                        <!-- Campos para Agrego/Producto -->
                        <div id="campos-agrego-producto" style="display: none;">
                            <div class="form-row">
                                <div class="form-group" id="campo-nombre-agrego" style="display: none;">
                                    <label for="agrego-nombre">Nombre del Agrego *</label>
                                    <input type="text" id="agrego-nombre" class="form-input" placeholder="Ej: Jamón, Queso, Tocino...">
                                </div>
                                
                                <div class="form-group" id="campo-producto-base" style="display: none;">
                                    <label for="producto-base">Producto Base *</label>
                                    <select id="producto-base" class="form-select">
                                        <option value="">Selecciona un producto...</option>
                                        ${productosBase.map(p => `
                                            <option value="${p.id}">${p.nombre} - $${p.precio.toFixed(2)}</option>
                                        `).join('')}
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label for="precio-registro">Precio *</label>
                                    <input type="number" id="precio-registro" class="form-input" placeholder="0.00" step="1.00" min="0">
                                </div>
                                
                                <div class="form-group">
                                    <label for="cantidad-registro">Cantidad *</label>
                                    <input type="number" id="cantidad-registro" class="form-input" placeholder="Ej: 1, 2, 3..." min="1" value="1">
                                </div>
                            </div>
                            
                            <!-- Campos para Configurar Relaciones -->
                            <div id="campos-configurar-relaciones" style="display: none;">
                                <div class="form-group">
                                    <label for="producto-relacion">Producto para Configurar *</label>
                                    <select id="producto-relacion" class="form-select">
                                        <option value="">Selecciona un producto...</option>
                                        ${productosBase.map(p => `
                                            <option value="${p.id}">${p.nombre}</option>
                                        `).join('')}
                                    </select>
                                </div>
                            </div>
                            
                            <h4>Ingredientes Utilizados:</h4>
                            <p class="small-text"><i class="fas fa-info-circle"></i> Solo puedes usar ingredientes disponibles</p>
                            <div class="ingredientes-grid" id="ingredientes-list" style="max-height: 300px; overflow-y: auto;">
                                ${ingredientes.map(ing => `
                                    <div class="ingrediente-item ${ing.disponible <= 0 ? 'disabled' : ''}">
                                        <div class="ingrediente-info">
                                            <span class="ingrediente-nombre">${ing.nombre}</span>
                                            <span class="ingrediente-disponible ${ing.disponible > 0 ? 'available' : 'unavailable'}">
                                                Disponible: ${ing.disponible}
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
                                                   ${ing.disponible <= 0 ? 'disabled' : ''}>
                                            <span class="unidad-text">unidad(es)</span>
                                        </div>
                                        ${ing.disponible <= 0 ? '<div class="ingrediente-sin-disponibilidad">Sin disponibilidad</div>' : ''}
                                    </div>
                                `).join('')}
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group full-width">
                                    <label for="notas-registro">Notas (Opcional)</label>
                                    <textarea id="notas-registro" class="form-textarea" placeholder="Detalles adicionales..." rows="2"></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="document.getElementById('modal-agrego-compuesto').remove()">
                            Cancelar
                        </button>
                        <button class="btn btn-primary" id="guardar-registro-modal">
                            <i class="fas fa-save"></i> Guardar
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Añadir estilos específicos
        const style = document.createElement('style');
        style.textContent = `
            .modal .form-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin-bottom: 15px;
            }
            
            .modal .form-group.full-width {
                grid-column: span 2;
            }
            
            .modal .form-group label {
                display: block;
                margin-bottom: 5px;
                font-weight: 500;
                color: #333;
            }
            
            .modal .form-select,
            .modal .form-input,
            .modal .form-textarea {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
                transition: border-color 0.3s;
            }
            
            .modal .form-input-sm {
                width: 80px;
                padding: 6px 8px;
                text-align: center;
            }
            
            .modal .form-select:focus,
            .modal .form-input:focus,
            .modal .form-textarea:focus {
                outline: none;
                border-color: #4a6cf7;
                box-shadow: 0 0 0 2px rgba(74, 108, 247, 0.1);
            }
            
            .modal .ingredientes-grid {
                margin-top: 10px;
                padding: 15px;
                border: 1px solid #ddd;
                border-radius: 5px;
                background: #f8f9fa;
            }
            
            .modal .ingrediente-item {
                padding: 10px;
                margin-bottom: 10px;
                border-bottom: 1px solid #eee;
                background: white;
                border-radius: 4px;
            }
            
            .modal .ingrediente-item.disabled {
                opacity: 0.6;
            }
            
            .modal .ingrediente-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .modal .ingrediente-nombre {
                font-weight: 500;
            }
            
            .modal .ingrediente-disponible {
                font-size: 12px;
                padding: 2px 6px;
                border-radius: 10px;
            }
            
            .modal .ingrediente-disponible.available {
                background: #d4edda;
                color: #155724;
            }
            
            .modal .ingrediente-disponible.unavailable {
                background: #f8d7da;
                color: #721c24;
            }
            
            .modal .ingrediente-controls {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .modal .unidad-text {
                font-size: 13px;
                color: #666;
            }
            
            .modal .ingrediente-sin-disponibilidad {
                font-size: 11px;
                color: #dc3545;
                margin-top: 5px;
            }
            
            .modal .small-text {
                font-size: 12px;
                color: #666;
                margin-bottom: 10px;
            }
            
            .modal .small-text i {
                margin-right: 5px;
            }
        `;
        document.head.appendChild(style);
        
        const tipoRegistroSelect = document.getElementById('tipo-registro');
        const camposAgregoProducto = document.getElementById('campos-agrego-producto');
        const camposConfigurarRelaciones = document.getElementById('campos-configurar-relaciones');
        const campoNombreAgrego = document.getElementById('campo-nombre-agrego');
        const campoProductoBase = document.getElementById('campo-producto-base');
        const productoRelacionSelect = document.getElementById('producto-relacion');
        
        tipoRegistroSelect.addEventListener('change', function() {
            const tipo = this.value;
            
            if (tipo === '') {
                camposAgregoProducto.style.display = 'none';
                return;
            }
            
            camposAgregoProducto.style.display = 'block';
            
            if (tipo === 'agrego') {
                campoNombreAgrego.style.display = 'block';
                campoProductoBase.style.display = 'none';
                camposConfigurarRelaciones.style.display = 'none';
                document.getElementById('precio-registro').value = '';
                document.getElementById('precio-registro').disabled = false;
            } else if (tipo === 'producto') {
                campoNombreAgrego.style.display = 'none';
                campoProductoBase.style.display = 'block';
                camposConfigurarRelaciones.style.display = 'none';
                // Actualizar precio cuando se selecciona producto base
                productoRelacionSelect.addEventListener('change', function() {
                    const productoId = parseInt(this.value);
                    if (productoId) {
                        const producto = cocinaData.find(p => p.id === productoId);
                        if (producto) {
                            document.getElementById('precio-registro').value = producto.precio;
                            document.getElementById('precio-registro').disabled = true;
                        }
                    }
                });
            } else if (tipo === 'configurar') {
                campoNombreAgrego.style.display = 'none';
                campoProductoBase.style.display = 'none';
                camposConfigurarRelaciones.style.display = 'block';
                document.getElementById('precio-registro').value = '';
                document.getElementById('precio-registro').disabled = true;
                document.getElementById('cantidad-registro').disabled = true;
                
                // Cargar relaciones existentes si las hay
                productoRelacionSelect.addEventListener('change', function() {
                    const productoId = parseInt(this.value);
                    if (productoId) {
                        const relaciones = relacionesProductos.filter(r => r.productoId === productoId);
                        document.querySelectorAll('.ingrediente-cantidad').forEach(input => {
                            const ingredienteId = parseInt(input.dataset.ingredienteId);
                            const relacion = relaciones.find(r => r.ingredienteId === ingredienteId);
                            input.value = relacion ? relacion.cantidad : 0;
                        });
                    }
                });
            }
        });
        
        document.getElementById('guardar-registro-modal').addEventListener('click', function() {
            guardarRegistroDesdeModal();
        });
        
        // Validación en tiempo real para inputs de ingredientes
        document.querySelectorAll('.ingrediente-cantidad').forEach(input => {
            input.addEventListener('input', function() {
                const max = parseInt(this.max) || 0;
                const value = parseInt(this.value) || 0;
                
                if (value > max) {
                    this.value = max;
                    showNotification(`No puedes usar más de ${max} unidades de ${this.dataset.ingredienteNombre}`, 'error');
                }
            });
            
            input.addEventListener('blur', function() {
                const max = parseInt(this.max) || 0;
                const value = parseInt(this.value) || 0;
                
                if (value > max) {
                    this.value = max;
                    showNotification(`Ajustado a ${max} unidades de ${this.dataset.ingredienteNombre} (máximo disponible)`, 'warning');
                }
            });
        });
    }
    
    function guardarRegistroDesdeModal() {
        const tipo = document.getElementById('tipo-registro').value;
        
        if (!tipo) {
            showNotification('Debes seleccionar un tipo de registro', 'error');
            return;
        }
        
        if (tipo === 'agrego') {
            guardarAgregoDesdeModal();
        } else if (tipo === 'producto') {
            guardarProductoDesdeModal();
        } else if (tipo === 'configurar') {
            guardarRelacionesDesdeModal();
        }
    }
    
    function guardarAgregoDesdeModal() {
        const nombre = document.getElementById('agrego-nombre').value.trim();
        const precio = parseFloat(document.getElementById('precio-registro').value) || 0;
        const cantidad = parseInt(document.getElementById('cantidad-registro').value) || 1;
        const notas = document.getElementById('notas-registro').value.trim();
        
        if (!nombre) {
            showNotification('El nombre del agrego es requerido', 'error');
            return;
        }
        
        if (precio <= 0) {
            showNotification('El precio debe ser mayor a 0', 'error');
            return;
        }
        
        if (cantidad <= 0) {
            showNotification('La cantidad debe ser mayor a 0', 'error');
            return;
        }
        
        // Obtener ingredientes seleccionados
        const ingredientesInputs = document.querySelectorAll('.ingrediente-cantidad:not(:disabled)');
        const ingredientesConsumidos = [];
        let hayIngredientes = false;
        
        ingredientesInputs.forEach(input => {
            const cantidadUsada = parseInt(input.value) || 0;
            if (cantidadUsada > 0) {
                const disponible = parseInt(input.dataset.ingredienteDisponible) || 0;
                
                if (cantidadUsada > disponible) {
                    showNotification(`No hay suficiente ${input.dataset.ingredienteNombre}. Disponible: ${disponible}`, 'error');
                    return;
                }
                
                ingredientesConsumidos.push({
                    id: parseInt(input.dataset.ingredienteId),
                    nombre: input.dataset.ingredienteNombre,
                    cantidad: cantidadUsada
                });
                hayIngredientes = true;
            }
        });
        
        if (!hayIngredientes) {
            showNotification('Debe seleccionar al menos un ingrediente consumido', 'warning');
            return;
        }
        
        // Descontar ingredientes
        ingredientesConsumidos.forEach(ingrediente => {
            const productoIndex = cocinaData.findIndex(p => p.id === ingrediente.id);
            if (productoIndex !== -1) {
                const ingredienteItem = cocinaData[productoIndex];
                ingredienteItem.vendido += ingrediente.cantidad;
                ingredienteItem.final = Math.max(0, ingredienteItem.venta - ingredienteItem.vendido);
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
            tipo: 'agrego'
        };
        
        agregos.push(nuevoAgrego);
        
        recalcularDisponibilidad();
        guardarDatosCocina();
        actualizarResumenCocina();
        actualizarListaAgregos();
        actualizarTablaCocina();
        
        document.getElementById('modal-agrego-compuesto').remove();
        
        showNotification('Agrego registrado correctamente', 'success');
    }
    
    function guardarProductoDesdeModal() {
        const productoBaseId = parseInt(document.getElementById('producto-base').value);
        const cantidad = parseInt(document.getElementById('cantidad-registro').value) || 1;
        const notas = document.getElementById('notas-registro').value.trim();
        
        if (!productoBaseId) {
            showNotification('Debes seleccionar un producto base', 'error');
            return;
        }
        
        if (cantidad <= 0) {
            showNotification('La cantidad debe ser mayor a 0', 'error');
            return;
        }
        
        const productoBase = cocinaData.find(p => p.id === productoBaseId);
        if (!productoBase) {
            showNotification('Producto no encontrado', 'error');
            return;
        }
        
        // Verificar si el producto tiene relaciones configuradas
        const relaciones = relacionesProductos.filter(r => r.productoId === productoBaseId);
        
        if (relaciones.length === 0) {
            showNotification('Este producto no tiene ingredientes configurados. Configura las relaciones primero.', 'error');
            return;
        }
        
        // Calcular ingredientes necesarios
        let hayDisponibilidad = true;
        let mensajeError = '';
        const ingredientesConsumidos = [];
        
        relaciones.forEach(relacion => {
            const ingrediente = cocinaData.find(p => p.id === relacion.ingredienteId);
            if (ingrediente) {
                const cantidadNecesaria = cantidad * relacion.cantidad;
                
                if (ingrediente.disponible < cantidadNecesaria) {
                    hayDisponibilidad = false;
                    const faltante = cantidadNecesaria - ingrediente.disponible;
                    mensajeError += `\n• ${ingrediente.nombre}: Necesitas ${cantidadNecesaria}, solo tienes ${ingrediente.disponible} disponible(s). Faltan ${faltante}.`;
                } else {
                    ingredientesConsumidos.push({
                        id: ingrediente.id,
                        nombre: ingrediente.nombre,
                        cantidad: cantidadNecesaria,
                        cantidadPorProducto: relacion.cantidad
                    });
                }
            }
        });
        
        if (!hayDisponibilidad) {
            showNotification(
                `No hay suficientes ingredientes para producir ${cantidad} ${productoBase.nombre}:${mensajeError}`,
                'error'
            );
            return;
        }
        
        // Descontar ingredientes
        ingredientesConsumidos.forEach(ingrediente => {
            const productoIndex = cocinaData.findIndex(p => p.id === ingrediente.id);
            if (productoIndex !== -1) {
                const ingredienteItem = cocinaData[productoIndex];
                ingredienteItem.vendido += ingrediente.cantidad;
                ingredienteItem.final = Math.max(0, ingredienteItem.venta - ingredienteItem.vendido);
            }
        });
        
        const nuevoProducto = {
            id: Date.now(),
            productoBaseId: productoBaseId,
            productoBaseNombre: productoBase.nombre,
            cantidad: cantidad,
            precioUnitario: productoBase.precio,
            ingredientes: ingredientesConsumidos,
            notas: notas,
            hora: obtenerHoraActual(),
            fecha: new Date().toISOString(),
            montoTotal: productoBase.precio * cantidad,
            tipo: 'producto'
        };
        
        agregos.push(nuevoProducto);
        
        recalcularDisponibilidad();
        guardarDatosCocina();
        actualizarResumenCocina();
        actualizarListaAgregos();
        actualizarTablaCocina();
        
        document.getElementById('modal-agrego-compuesto').remove();
        
        showNotification(`Producto "${productoBase.nombre}" registrado correctamente`, 'success');
    }
    
    function guardarRelacionesDesdeModal() {
        const productoId = parseInt(document.getElementById('producto-relacion').value);
        
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
        const ingredientesInputs = document.querySelectorAll('.ingrediente-cantidad:not(:disabled)');
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
            showNotification('Debes configurar al menos un ingrediente', 'warning');
            return;
        }
        
        // Eliminar relaciones existentes
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
        
        guardarRelacionesProductos();
        recalcularConsumosPorRelaciones();
        actualizarTablaCocina();
        actualizarResumenCocina();
        
        document.getElementById('modal-agrego-compuesto').remove();
        
        showNotification(`Relaciones configuradas para "${producto.nombre}"`, 'success');
    }
    
    function eliminarAgrego(agregoId) {
        showConfirmationModal(
            'Eliminar Registro',
            '¿Estás seguro de eliminar este registro? Esta acción restaurará los ingredientes consumidos.',
            'warning',
            function() {
                const agregoIndex = agregos.findIndex(a => a.id === agregoId);
                if (agregoIndex !== -1) {
                    const agrego = agregos[agregoIndex];
                    
                    if (agrego.ingredientes && agrego.ingredientes.length > 0) {
                        agrego.ingredientes.forEach(ingrediente => {
                            const productoIndex = cocinaData.findIndex(p => p.id === ingrediente.id);
                            if (productoIndex !== -1) {
                                const ingredienteItem = cocinaData[productoIndex];
                                ingredienteItem.vendido -= ingrediente.cantidad;
                                if (ingredienteItem.vendido < 0) {
                                    ingredienteItem.vendido = 0;
                                }
                                ingredienteItem.final = Math.max(0, ingredienteItem.venta - ingredienteItem.vendido);
                            }
                        });
                    }
                    
                    agregos.splice(agregoIndex, 1);
                    
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
                
                if (agrego.tipo === 'agrego') {
                    tipoBadge = '<span class="badge-tipo badge-agrego">Agrego</span>';
                } else if (agrego.tipo === 'producto') {
                    tipoBadge = '<span class="badge-tipo badge-producto">Producto</span>';
                }
                
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
                btn.addEventListener('click', function() {
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
    
    // Funciones disponibles globalmente
    window.getCocinaVentasTotal = function() {
        const totalImporte = cocinaData.reduce((sum, p) => sum + p.importe, 0);
        const totalAgregos = agregos.reduce((sum, a) => sum + a.montoTotal, 0);
        return totalImporte + totalAgregos;
    };
    
    window.getCocinaAgregosTotal = function() {
        return agregos.reduce((sum, a) => sum + a.montoTotal, 0);
    };
    
    window.resetCocinaDia = function() {
        cocinaData.forEach(producto => {
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
        
        editingFinalEnabled = false;
        agregos = [];
        
        recalcularDisponibilidad();
        guardarDatosCocina();
        actualizarTablaCocina();
        actualizarResumenCocina();
        actualizarListaAgregos();
    };
    
    // Exponer datos y funciones para uso global
    window.cocinaData = cocinaData;
    window.productosCocina = productosCocina;
    window.agregos = agregos;
    window.relacionesProductos = relacionesProductos;
    
    console.log('Cocina cargada con validaciones mejoradas');
});