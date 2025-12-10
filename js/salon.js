// Control de Salón - VERSIÓN MEJORADA Y RESPONSIVA
document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const salonTable = document.getElementById('salon-tbody');
    const salonSearch = document.getElementById('salon-search');
    const btnConfigurarSalida = document.getElementById('btn-configurar-salida');
    const btnFinalizarDia = document.getElementById('btn-finalizar-dia');
    const btnSincronizarProductos = document.getElementById('btn-sincronizar-productos');
    const btnSincronizarEmpty = document.getElementById('btn-sincronizar-empty');
    const salonEmptyState = document.getElementById('salon-empty-state');
    const saveIndicator = document.getElementById('save-indicator');
    
    // Variables de estado
    let salonData = [];
    let productos = [];
    let autoSaveTimer = null;
    let editingFinalEnabled = false;
    
    // Inicializar
    initSalon();
    
    async function initSalon() {
        try {
            mostrarCargando();
            await cargarProductos();
            await cargarDatosSalon();
            setupEventListeners();
            actualizarTabla();
            actualizarResumen();
            ocultarCargando();
            
            console.log('Salón inicializado correctamente:', {
                productos: productos.length,
                salonData: salonData.length
            });
        } catch (error) {
            console.error('Error inicializando salón:', error);
            showNotification('Error al cargar datos del salón', 'error');
        }
    }
    
    function cargarProductos() {
        return new Promise((resolve) => {
            productos = StorageManager.getProducts();
            
            // Ordenar alfabéticamente
            productos.sort((a, b) => a.nombre.localeCompare(b.nombre));
            resolve();
        });
    }
    
    function cargarDatosSalon() {
        return new Promise((resolve) => {
            const datosGuardados = StorageManager.getSalonData();
            
            if (datosGuardados.length > 0) {
                salonData = datosGuardados;
                console.log('Datos cargados del almacenamiento:', salonData);
            } else {
                // Crear datos iniciales desde productos
                salonData = productos.map(producto => ({
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
                console.log('Datos iniciales creados:', salonData);
            }
            
            // Sincronizar con productos actuales
            sincronizarConProductos();
            
            // Asegurar que final tenga un valor inicial válido
            actualizarFinalesIniciales();
            
            resolve();
        });
    }
    
    function sincronizarConProductos() {
        const productosIds = productos.map(p => p.id);
        const salonIds = salonData.map(p => p.id);
        
        // Agregar productos nuevos
        productos.forEach(producto => {
            if (!salonIds.includes(producto.id)) {
                salonData.push({
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
                console.log('Producto agregado al salón:', producto.nombre);
            }
        });
        
        // Eliminar productos que ya no existen
        salonData = salonData.filter(item => productosIds.includes(item.id));
        
        // Actualizar nombres y precios
        salonData.forEach(item => {
            const productoActual = productos.find(p => p.id === item.id);
            if (productoActual) {
                item.nombre = productoActual.nombre;
                item.precio = productoActual.precio;
            }
        });
    }
    
    function actualizarFinalesIniciales() {
        salonData.forEach(producto => {
            // Si el final es 0 y no estamos en modo edición, establecerlo igual a venta
            if (producto.final === 0 && producto.venta > 0) {
                producto.final = producto.venta;
                console.log(`Final inicializado para ${producto.nombre}: ${producto.final}`);
            }
        });
    }
    
    function actualizarTabla() {
        if (!salonTable) return;
        
        salonTable.innerHTML = '';
        
        if (salonData.length === 0) {
            if (salonEmptyState) salonEmptyState.style.display = 'block';
            return;
        }
        
        if (salonEmptyState) salonEmptyState.style.display = 'none';
        
        salonData.forEach((producto, index) => {
            const row = crearFilaProducto(producto, index);
            salonTable.appendChild(row);
        });
        
        console.log('Tabla actualizada con', salonData.length, 'productos');
    }
    
    function crearFilaProducto(producto, index) {
        const row = document.createElement('tr');
        row.dataset.id = producto.id;
        row.dataset.index = index;
        
        // Calcular valores automáticamente
        recalcularProducto(producto);
        
        // Determinar el valor a mostrar en el campo final
        let valorFinal = producto.final;
        
        // Si el modo de edición está deshabilitado Y el final es 0 Y hay ventas disponibles
        // Mostrar el total de ventas como valor inicial
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
        const inputs = row.querySelectorAll('.editable-input:not(:disabled)');
        inputs.forEach(input => {
            // Guardar valor anterior para comparación
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
                    actualizarProductoDesdeInput(this);
                    
                    // Programar guardado automático
                    programarAutoSave();
                    
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
                    actualizarProductoDesdeInput(this, true);
                }
            });
            
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    this.blur();
                }
            });
        });
        
        return row;
    }
    
    function recalcularProducto(producto) {
        // CORREGIDO: venta = inicio + entrada (total disponible para vender)
        producto.venta = producto.inicio + producto.entrada;
        
        // Si el final no ha sido establecido y hay ventas disponibles, establecerlo igual a venta
        if (!editingFinalEnabled && producto.final === 0 && producto.venta > 0) {
            producto.final = producto.venta;
        }
        
        // CORREGIDO: vendido = venta - final (lo que se vendió)
        producto.vendido = Math.max(0, producto.venta - producto.final);
        
        // CORREGIDO: importe = vendido * precio
        producto.importe = producto.vendido * producto.precio;
        
        return producto;
    }
    
    function actualizarProductoDesdeInput(input, realTime = false) {
        const id = parseInt(input.dataset.id);
        const field = input.dataset.field;
        const value = parseInt(input.value) || 0;
        
        const productoIndex = salonData.findIndex(p => p.id === id);
        if (productoIndex !== -1) {
            const producto = salonData[productoIndex];
            const oldValue = producto[field];
            
            if (value !== oldValue) {
                // Actualizar valor
                producto[field] = value;
                producto.ultimaActualizacion = obtenerHoraActual();
                
                // Recalcular todos los valores derivados
                recalcularProducto(producto);
                
                // Agregar al historial
                producto.historial.push({
                    fecha: new Date().toISOString(),
                    hora: obtenerHoraActual(),
                    campo: field,
                    valorAnterior: oldValue,
                    valorNuevo: value,
                    accion: 'modificación'
                });
                
                // Actualizar UI si es en tiempo real
                if (realTime) {
                    actualizarFilaUI(id);
                } else {
                    // Si no es tiempo real, actualizar toda la fila
                    actualizarFilaCompleta(id);
                }
                
                console.log(`Producto ${id} actualizado: ${field} = ${value}`, {
                    venta: producto.venta,
                    final: producto.final,
                    vendido: producto.vendido,
                    importe: producto.importe
                });
            }
        }
    }
    
    function actualizarFilaUI(productoId) {
        const producto = salonData.find(p => p.id === productoId);
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
        actualizarResumen();
    }
    
    function actualizarFilaCompleta(productoId) {
        const productoIndex = salonData.findIndex(p => p.id === productoId);
        if (productoIndex === -1) return;
        
        const row = document.querySelector(`tr[data-id="${productoId}"]`);
        if (!row) return;
        
        // Reemplazar la fila completa
        const newRow = crearFilaProducto(salonData[productoIndex], productoIndex);
        row.parentNode.replaceChild(newRow, row);
        
        // Actualizar resumen general
        actualizarResumen();
    }
    
    function programarAutoSave() {
        // Cancelar timer anterior
        if (autoSaveTimer) {
            clearTimeout(autoSaveTimer);
        }
        
        // Programar nuevo guardado en 1.5 segundos
        autoSaveTimer = setTimeout(() => {
            guardarDatosSalon();
        }, 1500);
    }
    
    function guardarDatosSalon() {
        try {
            StorageManager.saveSalonData(salonData);
            mostrarIndicadorGuardado();
            
            console.log('Datos guardados a las:', obtenerHoraActual());
        } catch (error) {
            console.error('Error guardando datos:', error);
            showNotification('Error al guardar datos', 'error');
        }
    }
    
    function mostrarIndicadorGuardado() {
        if (!saveIndicator) return;
        
        const saveTime = saveIndicator.querySelector('#save-time');
        if (saveTime) {
            saveTime.textContent = `Guardado ${obtenerHoraActual()}`;
        }
        
        saveIndicator.style.display = 'flex';
        
        // Ocultar después de 3 segundos
        setTimeout(() => {
            saveIndicator.classList.add('fade-out');
            setTimeout(() => {
                saveIndicator.style.display = 'none';
                saveIndicator.classList.remove('fade-out');
            }, 300);
        }, 3000);
    }
    
    function actualizarResumen() {
        const totalProductos = salonData.length;
        const totalUnidadesVendidas = salonData.reduce((sum, p) => sum + p.vendido, 0);
        const totalImporte = salonData.reduce((sum, p) => sum + p.importe, 0);
        
        // Actualizar elementos del DOM
        const elementos = {
            'total-productos-salon': totalProductos,
            'total-unidades-vendidas': `${totalUnidadesVendidas} unidades`,
            'total-importe-salon': `$${totalImporte.toFixed(2)}`,
            'total-ventas-salon': `$${totalImporte.toFixed(2)}`,
            'ultima-actualizacion': obtenerHoraActual()
        };
        
        Object.entries(elementos).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
        
        // Actualizar resumen general del dashboard
        if (typeof window.updateSummary === 'function') {
            window.updateSummary();
        }
        
        console.log('Resumen actualizado:', { totalProductos, totalUnidadesVendidas, totalImporte });
    }
    
    function setupEventListeners() {
        // Búsqueda
        if (salonSearch) {
            salonSearch.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase().trim();
                const rows = salonTable.querySelectorAll('tr');
                let visibleCount = 0;
                
                rows.forEach(row => {
                    const productName = row.querySelector('.product-name');
                    if (productName) {
                        const match = productName.textContent.toLowerCase().includes(searchTerm);
                        row.style.display = match ? '' : 'none';
                        if (match) visibleCount++;
                    }
                });
                
                // Mostrar/ocultar empty state según resultados
                if (salonEmptyState) {
                    salonEmptyState.style.display = visibleCount === 0 ? 'block' : 'none';
                }
            });
        }
        
        // Configurar salida (final)
        if (btnConfigurarSalida) {
            btnConfigurarSalida.addEventListener('click', function() {
                editingFinalEnabled = !editingFinalEnabled;
                
                if (editingFinalEnabled) {
                    // Habilitar edición de finales
                    const finalInputs = document.querySelectorAll('.final-input');
                    finalInputs.forEach(input => {
                        input.disabled = false;
                        input.classList.add('editing-enabled');
                        
                        // Si el valor es 0, establecerlo igual al total de ventas
                        if (parseInt(input.value) === 0) {
                            const id = parseInt(input.dataset.id);
                            const producto = salonData.find(p => p.id === id);
                            if (producto && producto.venta > 0) {
                                input.value = producto.venta;
                                actualizarProductoDesdeInput(input, false);
                            }
                        }
                    });
                    
                    this.innerHTML = '<i class="fas fa-times"></i><span class="btn-text">Cancelar Edición</span>';
                    this.classList.remove('btn-warning');
                    this.classList.add('btn-secondary');
                    
                    showNotification('Modo edición de valores finales activado', 'info');
                } else {
                    // Deshabilitar edición de finales
                    const finalInputs = document.querySelectorAll('.final-input');
                    finalInputs.forEach(input => {
                        input.disabled = true;
                        input.classList.remove('editing-enabled');
                    });
                    
                    this.innerHTML = '<i class="fas fa-sliders-h"></i><span class="btn-text">Editar Final</span>';
                    this.classList.remove('btn-secondary');
                    this.classList.add('btn-warning');
                    
                    showNotification('Modo edición desactivado', 'info');
                }
                
                // Actualizar tabla para reflejar cambios
                actualizarTabla();
            });
        }
        
        // Finalizar día
        if (btnFinalizarDia) {
            btnFinalizarDia.addEventListener('click', function() {
                showConfirmationModal(
                    'Finalizar Día en Salón',
                    '¿Estás seguro de finalizar el día? Se calcularán automáticamente los productos vendidos.',
                    'warning',
                    function() {
                        // Recalcular todos los productos
                        salonData.forEach(producto => {
                            recalcularProducto(producto);
                        });
                        
                        // Guardar cambios
                        guardarDatosSalon();
                        
                        // Actualizar interfaz
                        actualizarTabla();
                        actualizarResumen();
                        
                        showNotification('Día finalizado correctamente', 'success');
                    }
                );
            });
        }
        
        // Sincronizar productos
        if (btnSincronizarProductos) {
            btnSincronizarProductos.addEventListener('click', function() {
                sincronizarProductos();
            });
        }
        
        if (btnSincronizarEmpty) {
            btnSincronizarEmpty.addEventListener('click', function() {
                sincronizarProductos();
            });
        }
    }
    
    function sincronizarProductos() {
        console.log('Sincronizando salón con productos...');
        cargarProductos();
        sincronizarConProductos();
        actualizarFinalesIniciales();
        actualizarTabla();
        guardarDatosSalon();
        actualizarResumen();
        
        showNotification('Salón sincronizado con productos actualizados', 'success');
    }
    
    function mostrarCargando() {
        if (!salonTable) return;
        
        salonTable.innerHTML = `
            <tr>
                <td colspan="8" class="loading-state">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Cargando datos del salón...</p>
                </td>
            </tr>
        `;
    }
    
    function ocultarCargando() {
        const loadingDiv = document.querySelector('.loading-state');
        if (loadingDiv) loadingDiv.remove();
    }
    
    function obtenerHoraActual() {
        const now = new Date();
        return now.toLocaleString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }
    
    // Funciones disponibles globalmente
    window.actualizarSalonDesdeProductos = sincronizarProductos;
    
    window.getSalonVentasTotal = function() {
        return salonData.reduce((sum, p) => sum + p.importe, 0);
    };
    
    window.resetSalonDia = function() {
        salonData.forEach(producto => {
            producto.inicio = producto.final; // El final del día anterior es el inicio del nuevo
            producto.entrada = 0;
            producto.venta = 0;
            producto.final = 0;
            producto.vendido = 0;
            producto.importe = 0;
            producto.historial = [];
            producto.ultimaActualizacion = obtenerHoraActual();
        });
        
        guardarDatosSalon();
        actualizarTabla();
        actualizarResumen();
        
        console.log('Salón reseteado para nuevo día');
    };
    
    // Exponer datos para depuración
    window.salonData = salonData;
});

// Inicializar cuando se carga la sección de salón
document.addEventListener('DOMContentLoaded', function() {
    // Escuchar cambios en la navegación
    const salonLinks = document.querySelectorAll('a[data-section="salon"]');
    salonLinks.forEach(link => {
        link.addEventListener('click', function() {
            // Recargar productos cuando se entra a la sección
            setTimeout(() => {
                if (typeof window.actualizarSalonDesdeProductos === 'function') {
                    window.actualizarSalonDesdeProductos();
                }
            }, 500);
        });
    });
});