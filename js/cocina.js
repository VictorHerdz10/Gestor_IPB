// Control de Cocina - VERSIÓN MEJORADA (similar a salón pero con agregos)
document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const cocinaTable = document.getElementById('cocina-tbody');
    const cocinaSearch = document.getElementById('cocina-search');
    const btnEditarFinalCocina = document.getElementById('btn-agregar-agrego'); // Cambiado a editar final
    const btnFinalizarDiaCocina = document.getElementById('btn-finalizar-dia-cocina');
    const btnSincronizarProductosCocina = document.getElementById('btn-sincronizar-productos-cocina');
    const btnSincronizarEmptyCocina = document.getElementById('btn-sincronizar-empty-cocina');
    const cocinaEmptyState = document.getElementById('cocina-empty-state');
    const saveIndicatorCocina = document.getElementById('save-indicator-cocina');
    const cocinaTableContainer = document.getElementById('cocina-table-container');
    const cocinaNoProducts = document.getElementById('cocina-no-products');
    const btnIrProductos = document.getElementById('btn-ir-productos');
    const btnCrearProductoCocina = document.getElementById('btn-crear-producto-cocina');
    
    // Elementos de agregos (mantenidos)
    const agregoForm = document.getElementById('agrego-form');
    const btnCancelarAgrego = document.getElementById('btn-cancelar-agrego');
    const formNuevoAgrego = document.getElementById('form-nuevo-agrego');
    const listaAgregos = document.getElementById('lista-agregos');
    const btnAgregarAgregoTop = document.getElementById('btn-agregar-agrego-top');
    
    // Variables de estado
    let cocinaData = [];
    let productosCocina = [];
    let agregos = [];
    let autoSaveTimer = null;
    let editingFinalEnabled = false; // Similar a salón

    // Inicializar
    initCocina();
    
    async function initCocina() {
        try {
            mostrarCargandoCocina();
            await cargarProductosCocina();
            await cargarDatosCocina();
            await cargarAgregos();
            setupEventListeners();
            verificarProductosCocina();
            actualizarTablaCocina();
            actualizarResumenCocina();
            actualizarListaAgregos();
            ocultarCargandoCocina();
            
            console.log('Cocina inicializada correctamente:', {
                productos: productosCocina.length,
                cocinaData: cocinaData.length,
                agregos: agregos.length
            });
        } catch (error) {
            console.error('Error inicializando cocina:', error);
            showNotification('Error al cargar datos de cocina', 'error');
        }
    }
    
    function verificarProductosCocina() {
        if (productosCocina.length === 0) {
            // No hay productos en cocina
            if (cocinaTableContainer) cocinaTableContainer.style.display = 'none';
            if (cocinaNoProducts) cocinaNoProducts.style.display = 'block';
            if (document.getElementById('agregos-section')) {
                document.getElementById('agregos-section').style.display = 'none';
            }
            if (document.getElementById('cocina-resumen')) {
                document.getElementById('cocina-resumen').style.display = 'none';
            }
        } else {
            // Hay productos
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
            // Cargar productos de cocina desde localStorage
            const productosGuardados = localStorage.getItem('ipb_cocina_products');
            
            if (productosGuardados) {
                productosCocina = JSON.parse(productosGuardados);
                console.log('Productos de cocina cargados:', productosCocina.length);
            } else {
                // Si no hay productos, inicializar array vacío
                productosCocina = [];
                console.log('No hay productos de cocina registrados');
            }
            
            // Ordenar alfabéticamente
            productosCocina.sort((a, b) => a.nombre.localeCompare(b.nombre));
            resolve();
        });
    }
    
    function cargarDatosCocina() {
        return new Promise((resolve) => {
            const today = getTodayDate();
            const datosGuardados = localStorage.getItem('ipb_cocina');
            
            if (datosGuardados) {
                cocinaData = JSON.parse(datosGuardados);
                console.log('Datos de cocina cargados del día:', cocinaData.length);
            } else {
                // Crear datos iniciales solo para productos existentes
                cocinaData = productosCocina.map(producto => ({
                    id: producto.id,
                    nombre: producto.nombre,
                    precio: producto.precio,
                    inicio: 0,
                    entrada: 0,
                    venta: 0,
                    final: 0,
                    vendido: 0,
                    importe: 0,
                    historial: [],
                    ultimaActualizacion: obtenerHoraActual()
                }));
                console.log('Datos iniciales de cocina creados:', cocinaData.length);
            }
            
            resolve();
        });
    }
    
    function guardarDatosCocina() {
        try {
            localStorage.setItem(`ipb_cocina`, JSON.stringify(cocinaData));
            guardarAgregos();
            mostrarIndicadorGuardadoCocina();
            
            console.log('Datos de cocina guardados a las:', obtenerHoraActual());
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
            console.log('Agregos cargados:', agregos.length);
            
            resolve();
        });
    }
    
    function guardarAgregos() {
        const today = getTodayDate();
        localStorage.setItem(`cocina_agregos_${today}`, JSON.stringify(agregos));
        console.log('Agregos guardados:', agregos.length);
    }
    
    function actualizarTablaCocina() {
        if (!cocinaTable || productosCocina.length === 0) return;
        
        cocinaTable.innerHTML = '';
        
        if (cocinaData.length === 0) {
            if (cocinaEmptyState) cocinaEmptyState.style.display = 'block';
            return;
        }
        
        if (cocinaEmptyState) cocinaEmptyState.style.display = 'none';
        
        // Mostrar solo productos normales (NO agregos en la tabla)
        cocinaData.forEach((producto, index) => {
            const row = crearFilaProductoCocina(producto, index);
            cocinaTable.appendChild(row);
        });
    }
    
    function crearFilaProductoCocina(producto, index) {
        const row = document.createElement('tr');
        row.dataset.id = producto.id;
        row.dataset.index = index;
        
        // Calcular valores automáticamente
        recalcularProductoCocina(producto);
        
        // Determinar el valor a mostrar en el campo final
        let valorFinal = producto.final;
        
        // Si el modo de edición está deshabilitado Y el final es 0 Y hay ventas disponibles
        if (!editingFinalEnabled && producto.final === 0 && producto.venta > 0) {
            valorFinal = producto.venta;
        }
        
        row.innerHTML = `
            <td class="producto-cell">
                <span class="product-name">${producto.nombre}</span>
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
                       value="${valorFinal}" 
                       data-field="final" 
                       data-id="${producto.id}"
                       class="editable-input final-input ${editingFinalEnabled ? 'editing-enabled' : ''}"
                       placeholder="0"
                       autocomplete="off"
                       ${!editingFinalEnabled ? 'disabled' : ''}>
            </td>
            <td class="calculated-cell vendido-cell">
                <span class="vendido-display">${producto.vendido}</span>
            </td>
            <td class="currency-cell importe-cell">
                <span class="importe-display">$${producto.importe.toFixed(2)}</span>
            </td>
        `;
        
        // Agregar event listeners a los inputs editables
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
                
                // Si es un campo final y está deshabilitado pero se va a habilitar
                if (this.dataset.field === 'final' && this.disabled && editingFinalEnabled) {
                    this.disabled = false;
                    this.classList.add('editing-enabled');
                }
            });
            
            input.addEventListener('blur', function() {
                this.classList.remove('focus');
                const newValue = parseInt(this.value) || 0;
                const oldValue = parseInt(this.dataset.oldValue) || 0;
                
                if (newValue !== oldValue) {
                    this.classList.add('edited');
                    actualizarProductoCocinaDesdeInput(this);
                    
                    // Programar guardado automático
                    programarAutoSaveCocina();
                    
                    // Efecto visual
                    setTimeout(() => {
                        this.classList.remove('edited');
                    }, 1000);
                }
            });
            
            input.addEventListener('input', function() {
                // Actualizar en tiempo real para los campos de inicio y entrada
                const field = this.dataset.field;
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
    
    function recalcularProductoCocina(producto) {
        // venta = inicio + entrada
        producto.venta = producto.inicio + producto.entrada;
        
        // Si el final no ha sido establecido y hay ventas disponibles, establecerlo igual a venta
        if (!editingFinalEnabled && producto.final === 0 && producto.venta > 0) {
            producto.final = producto.venta;
        }
        
        // vendido = venta - final
        producto.vendido = Math.max(0, producto.venta - producto.final);
        
        // importe = vendido * precio
        producto.importe = producto.vendido * producto.precio;
        
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
                // Actualizar valor
                producto[field] = value;
                producto.ultimaActualizacion = obtenerHoraActual();
                
                // Recalcular todos los valores derivados
                recalcularProductoCocina(producto);
                
                // Agregar al historial
                producto.historial.push({
                    fecha: new Date().toISOString(),
                    hora: obtenerHoraActual(),
                    campo: field,
                    valorAnterior: oldValue,
                    valorNuevo: value,
                    accion: 'modificación'
                });
                
                // Actualizar UI
                if (realTime) {
                    actualizarFilaUICocina(id);
                } else {
                    actualizarFilaCompletaCocina(id);
                }
                
                console.log(`Producto cocina ${id} actualizado: ${field} = ${value}`);
            }
        }
    }
    
    function actualizarFilaUICocina(productoId) {
        const producto = cocinaData.find(p => p.id === productoId);
        if (!producto) return;
        
        const row = document.querySelector(`tr[data-id="${productoId}"]`);
        if (!row) return;
        
        // Actualizar solo los valores calculados
        const ventaDisplay = row.querySelector('.venta-display');
        const vendidoDisplay = row.querySelector('.vendido-display');
        const importeDisplay = row.querySelector('.importe-display');
        
        if (ventaDisplay) ventaDisplay.textContent = producto.venta;
        if (vendidoDisplay) vendidoDisplay.textContent = producto.vendido;
        if (importeDisplay) importeDisplay.textContent = `$${producto.importe.toFixed(2)}`;
        
        // Actualizar resumen general
        actualizarResumenCocina();
    }
    
    function actualizarFilaCompletaCocina(productoId) {
        const productoIndex = cocinaData.findIndex(p => p.id === productoId);
        if (productoIndex === -1) return;
        
        const row = document.querySelector(`tr[data-id="${productoId}"]`);
        if (!row) return;
        
        // Reemplazar la fila completa
        const producto = cocinaData[productoIndex];
        const newRow = crearFilaProductoCocina(producto, productoIndex);
        
        row.parentNode.replaceChild(newRow, row);
        
        // Actualizar resumen general
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
        
        // Editar final (similar a salón)
        if (btnEditarFinalCocina) {
            btnEditarFinalCocina.addEventListener('click', function() {
                editingFinalEnabled = !editingFinalEnabled;
                
                if (editingFinalEnabled) {
                    // Habilitar edición de finales
                    const finalInputs = document.querySelectorAll('#cocina-tbody .final-input');
                    finalInputs.forEach(input => {
                        input.disabled = false;
                        input.classList.add('editing-enabled');
                        
                        // Si el valor es 0, establecerlo igual al total de ventas
                        if (parseInt(input.value) === 0) {
                            const id = parseInt(input.dataset.id);
                            const producto = cocinaData.find(p => p.id === id);
                            if (producto && producto.venta > 0) {
                                input.value = producto.venta;
                                actualizarProductoCocinaDesdeInput(input, false);
                            }
                        }
                    });
                    
                    this.innerHTML = '<i class="fas fa-times"></i><span class="btn-text">Cancelar Edición</span>';
                    this.classList.remove('btn-primary');
                    this.classList.add('btn-secondary');
                    
                    showNotification('Modo edición de valores finales activado en cocina', 'info');
                } else {
                    // Deshabilitar edición de finales
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
                
                // Actualizar tabla para reflejar cambios
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
                        // Recalcular todos los productos
                        cocinaData.forEach(producto => {
                            recalcularProductoCocina(producto);
                        });
                        
                        // Guardar cambios
                        guardarDatosCocina();
                        
                        // Actualizar interfaz
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
                        // Sincronizar con productos actuales
                        sincronizarConProductosCocina();
                        
                        // Guardar y actualizar
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
                // Cambiar a la sección de productos
                const productoLink = document.querySelector('a[data-section="productos"]');
                if (productoLink) {
                    productoLink.click();
                }
            });
        }
        
        // Botón para crear producto en cocina
        if (btnCrearProductoCocina) {
            btnCrearProductoCocina.addEventListener('click', function() {
                // Mostrar modal para crear producto rápido
                showModalCrearProductoCocina();
            });
        }
        
        // Agregar agrego (mantenido)
        if (btnAgregarAgregoTop) {
            btnAgregarAgregoTop.addEventListener('click', mostrarFormularioAgrego);
        }
        
        // Cancelar agrego
        if (btnCancelarAgrego) {
            btnCancelarAgrego.addEventListener('click', ocultarFormularioAgrego);
        }
        
        // Formulario de agrego
        if (formNuevoAgrego) {
            formNuevoAgrego.addEventListener('submit', function(e) {
                e.preventDefault();
                agregarNuevoAgrego();
            });
        }
    }
    
    function sincronizarConProductosCocina() {
        const productosIds = productosCocina.map(p => p.id);
        const cocinaIds = cocinaData.map(p => p.id);
        
        // Agregar productos nuevos
        productosCocina.forEach(producto => {
            if (!cocinaIds.includes(producto.id)) {
                cocinaData.push({
                    id: producto.id,
                    nombre: producto.nombre,
                    precio: producto.precio,
                    inicio: 0,
                    entrada: 0,
                    venta: 0,
                    final: 0,
                    vendido: 0,
                    importe: 0,
                    historial: [],
                    ultimaActualizacion: obtenerHoraActual()
                });
                console.log('Producto agregado a cocina:', producto.nombre);
            }
        });
        
        // Eliminar productos que ya no existen
        cocinaData = cocinaData.filter(item => productosIds.includes(item.id));
        
        // Actualizar nombres y precios
        cocinaData.forEach(item => {
            const productoActual = productosCocina.find(p => p.id === item.id);
            if (productoActual) {
                item.nombre = productoActual.nombre;
                item.precio = productoActual.precio;
            }
        });
    }
    
    function mostrarFormularioAgrego() {
        if (agregoForm) agregoForm.style.display = 'block';
        if (btnAgregarAgregoTop) btnAgregarAgregoTop.style.display = 'none';
    }
    
    function ocultarFormularioAgrego() {
        if (agregoForm) agregoForm.style.display = 'none';
        if (btnAgregarAgregoTop) btnAgregarAgregoTop.style.display = 'flex';
        if (formNuevoAgrego) formNuevoAgrego.reset();
    }
    
    function agregarNuevoAgrego() {
        const descripcion = document.getElementById('agrego-descripcion').value.trim();
        const monto = parseFloat(document.getElementById('agrego-monto').value) || 0;
        const notas = document.getElementById('agrego-notas').value.trim();
        
        if (!descripcion) {
            showNotification('La descripción del agrego es requerida', 'error');
            return;
        }
        
        if (monto <= 0) {
            showNotification('El monto del agrego debe ser mayor a 0', 'error');
            return;
        }
        
        const nuevoAgrego = {
            id: Date.now(),
            descripcion: descripcion,
            monto: monto,
            notas: notas,
            hora: obtenerHoraActual(),
            fecha: new Date().toISOString()
        };
        
        // Agregar a la lista de agregos
        agregos.push(nuevoAgrego);
        
        // Guardar y actualizar
        guardarDatosCocina();
        actualizarResumenCocina();
        actualizarListaAgregos();
        ocultarFormularioAgrego();
        
        showNotification('Agrego agregado correctamente', 'success');
    }
    
    function eliminarAgrego(agregoId) {
        showConfirmationModal(
            'Eliminar Agrego',
            '¿Estás seguro de eliminar este agrego? Esta acción no se puede deshacer.',
            'warning',
            function() {
                // Eliminar de la lista de agregos
                agregos = agregos.filter(a => a.id !== agregoId);
                
                // Guardar y actualizar
                guardarDatosCocina();
                actualizarResumenCocina();
                actualizarListaAgregos();
                
                showNotification('Agrego eliminado correctamente', 'success');
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
                html += `
                    <div class="agrego-card" data-id="${agrego.id}">
                        <div class="agrego-info">
                            <div class="agrego-descripcion">${agrego.descripcion}</div>
                            ${agrego.notas ? `<div class="agrego-notas">${agrego.notas}</div>` : ''}
                        </div>
                        <div class="agrego-monto">$${agrego.monto.toFixed(2)}</div>
                        <div class="agrego-hora">${agrego.hora}</div>
                        <button class="eliminar-agrego-btn" data-id="${agrego.id}" title="Eliminar agrego">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
            });
            
            listaAgregos.innerHTML = html;
            
            // Agregar eventos a botones de eliminar
            const botonesEliminar = listaAgregos.querySelectorAll('.eliminar-agrego-btn');
            botonesEliminar.forEach(btn => {
                btn.addEventListener('click', function() {
                    const agregoId = parseInt(this.dataset.id);
                    eliminarAgrego(agregoId);
                });
            });
        }
        
        // Actualizar total de agregos
        const totalAgregosElement = document.getElementById('total-agregos');
        const total = agregos.reduce((sum, a) => sum + a.monto, 0);
        
        if (totalAgregosElement) {
            totalAgregosElement.textContent = `$${total.toFixed(2)}`;
        }
    }
    
    function actualizarResumenCocina() {
        const totalProductos = cocinaData.length;
        const totalUnidadesVendidas = cocinaData.reduce((sum, p) => sum + p.vendido, 0);
        const totalImporte = cocinaData.reduce((sum, p) => sum + p.importe, 0);
        const totalAgregos = agregos.reduce((sum, a) => sum + a.monto, 0);
        const ventasTotales = totalImporte + totalAgregos;
        
        // Actualizar elementos del DOM
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
        
        // Actualizar resumen general del dashboard
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
    
    // Helper functions
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
    
    // Función para mostrar modal de confirmación
    function showConfirmationModal(title, message, type, onConfirm) {
        if (typeof window.showConfirmationModal === 'function') {
            window.showConfirmationModal(title, message, type, onConfirm);
        } else {
            // Fallback simple
            if (confirm(`${title}\n\n${message}`)) {
                onConfirm();
            }
        }
    }
    
    // Función para mostrar notificaciones
    function showNotification(message, type = 'success') {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            // Fallback simple
            alert(message);
        }
    }
    
    // Funciones disponibles globalmente
    window.getCocinaVentasTotal = function() {
        const totalImporte = cocinaData.reduce((sum, p) => sum + p.importe, 0);
        const totalAgregos = agregos.reduce((sum, a) => sum + a.monto, 0);
        return totalImporte + totalAgregos;
    };
    
    window.resetCocinaDia = function() {
        // Resetear productos para nuevo día
        cocinaData.forEach(producto => {
            producto.inicio = producto.final; // El final del día anterior es el inicio del nuevo
            producto.entrada = 0;
            producto.venta = producto.inicio + producto.entrada;
            producto.final = 0; // Reiniciar final
            producto.vendido = 0;
            producto.importe = 0;
            producto.historial = [];
            producto.ultimaActualizacion = obtenerHoraActual();
        });
        
        // Desactivar modo edición
        editingFinalEnabled = false;
        
        // Limpiar agregos del día anterior
        agregos = [];
        
        guardarDatosCocina();
        actualizarTablaCocina();
        actualizarResumenCocina();
        actualizarListaAgregos();
        
        console.log('Cocina reseteada para nuevo día');
    };
    
    // Exponer datos para depuración
    window.cocinaData = cocinaData;
    window.productosCocina = productosCocina;
    window.agregos = agregos;
});