// Control de Cocina - VERSIÓN CORREGIDA
document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const cocinaTable = document.getElementById('cocina-tbody');
    const cocinaSearch = document.getElementById('cocina-search');
    const btnAgregarAgrego = document.getElementById('btn-agregar-agrego');
    const btnAgregarAgregoTop = document.getElementById('btn-agregar-agrego-top');
    const btnFinalizarDiaCocina = document.getElementById('btn-finalizar-dia-cocina');
    const btnSincronizarProductosCocina = document.getElementById('btn-sincronizar-productos-cocina');
    const btnSincronizarEmptyCocina = document.getElementById('btn-sincronizar-empty-cocina');
    const cocinaEmptyState = document.getElementById('cocina-empty-state');
    const saveIndicatorCocina = document.getElementById('save-indicator-cocina');
    const cocinaTableContainer = document.getElementById('cocina-table-container');
    const cocinaNoProducts = document.getElementById('cocina-no-products');
    const btnIrProductos = document.getElementById('btn-ir-productos');
    const btnCrearProductoCocina = document.getElementById('btn-crear-producto-cocina');
    
    // Elementos de agregos
    const agregoForm = document.getElementById('agrego-form');
    const btnCancelarAgrego = document.getElementById('btn-cancelar-agrego');
    const formNuevoAgrego = document.getElementById('form-nuevo-agrego');
    const listaAgregos = document.getElementById('lista-agregos');
    
    // Variables de estado
    let cocinaData = [];
    let productosCocina = [];
    let agregos = [];
    let autoSaveTimer = null;
    
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
            const datosGuardados = localStorage.getItem(`cocina_data_${today}`);
            
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
                    venta: producto.inicio + producto.entrada, // venta = inicio + entrada
                    final: producto.inicio + producto.entrada, // final inicia igual a venta (no vendido)
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
            const today = getTodayDate();
            localStorage.setItem(`cocina_data_${today}`, JSON.stringify(cocinaData));
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
        
        // Deshabilitar campo final inicialmente (solo se habilita al finalizar día)
        const finalDisabled = producto.final === producto.venta; // Si son iguales, está deshabilitado
        
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
                       value="${producto.final}" 
                       data-field="final" 
                       data-id="${producto.id}"
                       class="editable-input final-input ${finalDisabled ? 'disabled-field' : ''}"
                       placeholder="0"
                       autocomplete="off"
                       ${finalDisabled ? 'disabled' : ''}>
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
        
        // vendido = venta - final (no puede ser negativo)
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
                
                // Si es inicio o entrada, actualizar venta y final automáticamente
                if (field === 'inicio' || field === 'entrada') {
                    producto.venta = producto.inicio + producto.entrada;
                    producto.final = producto.venta; // Final se mantiene igual a venta
                }
                
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
        const finalInput = row.querySelector('.final-input');
        
        if (ventaDisplay) ventaDisplay.textContent = producto.venta;
        if (vendidoDisplay) vendidoDisplay.textContent = producto.vendido;
        if (importeDisplay) importeDisplay.textContent = `$${producto.importe.toFixed(2)}`;
        
        // Actualizar valor del campo final (pero mantener disabled si corresponde)
        if (finalInput) {
            finalInput.value = producto.final;
        }
        
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
        
        // Agregar agrego
        if (btnAgregarAgrego) {
            btnAgregarAgrego.addEventListener('click', mostrarFormularioAgrego);
        }
        
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
        
        // Finalizar día en cocina
        if (btnFinalizarDiaCocina) {
            btnFinalizarDiaCocina.addEventListener('click', function() {
                showConfirmationModal(
                    'Finalizar Día en Cocina',
                    '¿Estás seguro de finalizar el día en cocina? Se habilitarán los campos "Final" para registrar lo que queda.',
                    'warning',
                    function() {
                        // Habilitar campos final para todos los productos
                        cocinaData.forEach(producto => {
                            // Mantener el valor actual de final, pero habilitar el campo
                            producto.ultimaActualizacion = obtenerHoraActual();
                        });
                        
                        // Guardar cambios
                        guardarDatosCocina();
                        
                        // Actualizar interfaz
                        actualizarTablaCocina();
                        actualizarResumenCocina();
                        
                        showNotification('Día en cocina finalizado. Ahora puedes registrar el inventario final.', 'success');
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
                        // Crear datos para productos nuevos
                        productosCocina.forEach(producto => {
                            const existe = cocinaData.some(p => p.id === producto.id);
                            if (!existe) {
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
                            }
                        });
                        
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
                        // Similar a la función anterior
                        productosCocina.forEach(producto => {
                            const existe = cocinaData.some(p => p.id === producto.id);
                            if (!existe) {
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
                            }
                        });
                        
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
    }
    
    function showModalCrearProductoCocina() {
        const modalHTML = `
            <div class="modal" id="modal-crear-producto-cocina">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-plus"></i> Crear Producto en Cocina</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-container">
                            <div class="form-group">
                                <label for="nuevo-producto-cocina-nombre">
                                    <i class="fas fa-tag"></i> Nombre del Producto *
                                </label>
                                <input type="text" id="nuevo-producto-cocina-nombre" 
                                       placeholder="Ej: Pizza, Hamburguesa, Sopa..." required>
                            </div>
                            
                            <div class="form-group">
                                <label for="nuevo-producto-cocina-precio">
                                    <i class="fas fa-dollar-sign"></i> Precio *
                                </label>
                                <input type="number" id="nuevo-producto-cocina-precio" 
                                       placeholder="0.00" step="1.00" min="0" required>
                            </div>
                            
                            <div class="alert alert-warning" style="margin: 10px 0;">
                                <i class="fas fa-info-circle"></i>
                                <span>Este producto se agregará directamente a la cocina</span>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="btn-cancelar-crear-cocina">Cancelar</button>
                        <button class="btn btn-primary" id="btn-crear-producto-cocina-confirm">
                            <i class="fas fa-save"></i> Crear Producto
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);
        
        const modal = document.getElementById('modal-crear-producto-cocina');
        modal.style.display = 'flex';
        
        function cerrarModal() {
            modal.style.display = 'none';
            setTimeout(() => {
                modalContainer.remove();
            }, 300);
        }
        
        document.getElementById('btn-cancelar-crear-cocina').addEventListener('click', cerrarModal);
        modal.querySelector('.modal-close').addEventListener('click', cerrarModal);
        
        document.getElementById('btn-crear-producto-cocina-confirm').addEventListener('click', function() {
            const nombre = document.getElementById('nuevo-producto-cocina-nombre').value.trim();
            const precio = parseFloat(document.getElementById('nuevo-producto-cocina-precio').value) || 0;
            
            if (!nombre) {
                showNotification('El nombre del producto es requerido', 'error');
                return;
            }
            
            if (precio <= 0) {
                showNotification('El precio debe ser mayor a 0', 'error');
                return;
            }
            
            // Verificar si ya existe en productos de cocina
            if (productosCocina.some(p => p.nombre.toLowerCase() === nombre.toLowerCase())) {
                showNotification('Ya existe un producto con ese nombre en cocina', 'warning');
                return;
            }
            
            // Crear nuevo producto
            const nuevoProducto = {
                id: Date.now(),
                nombre: nombre,
                precio: precio,
                ubicacion: 'cocina',
                fechaCreacion: new Date().toISOString(),
                fechaActualizacion: new Date().toISOString()
            };
            
            // Agregar a productosCocina
            productosCocina.push(nuevoProducto);
            productosCocina.sort((a, b) => a.nombre.localeCompare(b.nombre));
            
            // Guardar en localStorage
            localStorage.setItem('ipb_cocina_products', JSON.stringify(productosCocina));
            
            // Agregar a cocinaData
            cocinaData.push({
                id: nuevoProducto.id,
                nombre: nuevoProducto.nombre,
                precio: nuevoProducto.precio,
                inicio: 0,
                entrada: 0,
                venta: 0,
                final: 0,
                vendido: 0,
                importe: 0,
                historial: [],
                ultimaActualizacion: obtenerHoraActual()
            });
            
            // Guardar y actualizar
            guardarDatosCocina();
            verificarProductosCocina();
            actualizarTablaCocina();
            actualizarResumenCocina();
            
            cerrarModal();
            showNotification('Producto creado en cocina exitosamente', 'success');
        });
        
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                cerrarModal();
            }
        });
    }
    
    function mostrarFormularioAgrego() {
        if (agregoForm) agregoForm.style.display = 'block';
        if (btnAgregarAgrego) btnAgregarAgrego.style.display = 'none';
        if (btnAgregarAgregoTop) btnAgregarAgregoTop.style.display = 'none';
    }
    
    function ocultarFormularioAgrego() {
        if (agregoForm) agregoForm.style.display = 'none';
        if (btnAgregarAgrego) btnAgregarAgrego.style.display = 'flex';
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
            hour12: false 
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
            producto.final = producto.venta; // Final inicia igual a venta (deshabilitado)
            producto.vendido = 0;
            producto.importe = 0;
            producto.historial = [];
            producto.ultimaActualizacion = obtenerHoraActual();
        });
        
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