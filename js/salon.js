// Control de Salón - VERSIÓN CORREGIDA
document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const salonTable = document.getElementById('salon-tbody');
    const salonSearch = document.getElementById('salon-search');
    const btnConfigurarSalida = document.getElementById('btn-configurar-salida');
    const btnFinalizarDia = document.getElementById('btn-finalizar-dia');
    const btnGuardarEntrada = document.getElementById('btn-guardar-entrada');
    const btnCancelarEntrada = document.getElementById('btn-cancelar-entrada');
    const entradaForm = document.getElementById('entrada-form');
    const selectProducto = document.getElementById('select-producto');
    const entradaCantidad = document.getElementById('entrada-cantidad');
    const salonEmptyState = document.getElementById('salon-empty-state');
    
    // Variables de estado
    let salonData = [];
    let productos = [];
    let autoSaveTimer = null;
    let lastSaveTime = null;
    
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
            
            actualizarSelectProductos();
            resolve();
        });
    }
    
    function actualizarSelectProductos() {
        if (!selectProducto) return;
        
        selectProducto.innerHTML = '<option value="">Seleccionar producto...</option>';
        
        productos.forEach(producto => {
            const option = document.createElement('option');
            option.value = producto.id;
            option.textContent = `${producto.nombre} - $${producto.precio.toFixed(2)}`;
            selectProducto.appendChild(option);
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
                    venta: 0,      // Calculado automáticamente
                    final: 0,
                    vendido: 0,    // Calculado automáticamente
                    importe: 0,    // Calculado automáticamente
                    historial: [],
                    ultimaActualizacion: new Date().toISOString()
                }));
                console.log('Datos iniciales creados:', salonData);
            }
            
            // Asegurar que todos los productos existan en salonData
            sincronizarConProductos();
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
                    ultimaActualizacion: new Date().toISOString()
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
        
        // CALCULOS CORREGIDOS:
        // venta = inicio + entrada
        const venta = producto.inicio + producto.entrada;
        
        // vendido = venta - final (no puede ser negativo)
        const vendido = Math.max(0, venta - producto.final);
        
        // importe = vendido * precio
        const importe = vendido * producto.precio;
        
        // Actualizar objeto producto con cálculos
        producto.venta = venta;
        producto.vendido = vendido;
        producto.importe = importe;
        
        // Formatear hora de última actualización
        const horaActualizacion = producto.ultimaActualizacion 
            ? new Date(producto.ultimaActualizacion).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            })
            : '--:--';
        
        row.innerHTML = `
            <td class="producto-cell">
                <span class="product-name">${producto.nombre}</span>
                <small class="product-update-time">${horaActualizacion}</small>
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
                       placeholder="0">
            </td>
            <td class="numeric-cell">
                <input type="number" 
                       min="0" 
                       value="${producto.entrada}" 
                       data-field="entrada" 
                       data-id="${producto.id}"
                       class="editable-input entrada-input"
                       placeholder="0">
            </td>
            <td class="calculated-cell">
                <span class="venta-display">${venta}</span>
            </td>
            <td class="numeric-cell">
                <input type="number" 
                       min="0" 
                       value="${producto.final}" 
                       data-field="final" 
                       data-id="${producto.id}"
                       class="editable-input final-input"
                       placeholder="0">
            </td>
            <td class="calculated-cell">
                <span class="vendido-display">${vendido}</span>
            </td>
            <td class="currency-cell">
                <span class="importe-display">$${importe.toFixed(2)}</span>
            </td>
            <td class="actions-cell">
                <button class="btn-action btn-entrada" 
                        data-id="${producto.id}"
                        title="Registrar entrada rápida">
                    <i class="fas fa-plus"></i>
                    <span class="btn-text">Entrada</span>
                </button>
            </td>
        `;
        
        // Agregar event listeners a los inputs editables
        const inputs = row.querySelectorAll('.editable-input');
        inputs.forEach(input => {
            // Guardar valor anterior para comparación
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
                    actualizarProductoDesdeInput(this);
                    
                    // Programar guardado automático
                    programarAutoSave();
                }
            });
            
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    this.blur();
                }
            });
        });
        
        // Botón de entrada rápida
        const btnEntrada = row.querySelector('.btn-entrada');
        btnEntrada.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            mostrarFormEntrada(id);
        });
        
        return row;
    }
    
    function actualizarProductoDesdeInput(input) {
        const id = parseInt(input.dataset.id);
        const field = input.dataset.field;
        const value = parseInt(input.value) || 0;
        
        const productoIndex = salonData.findIndex(p => p.id === id);
        if (productoIndex !== -1) {
            // Registrar cambio en historial
            const oldValue = salonData[productoIndex][field];
            
            if (value !== oldValue) {
                salonData[productoIndex][field] = value;
                salonData[productoIndex].ultimaActualizacion = new Date().toISOString();
                
                // Agregar al historial
                salonData[productoIndex].historial.push({
                    fecha: new Date().toISOString(),
                    campo: field,
                    valorAnterior: oldValue,
                    valorNuevo: value,
                    hora: new Date().toLocaleTimeString('es-ES')
                });
                
                console.log(`Producto ${id} actualizado: ${field} = ${value}`);
                
                // Recalcular toda la fila
                recalcularFila(id);
            }
        }
    }
    
    function recalcularFila(productoId) {
        const producto = salonData.find(p => p.id === productoId);
        if (!producto) return;
        
        const row = document.querySelector(`tr[data-id="${productoId}"]`);
        if (!row) return;
        
        // Recalcular valores
        const venta = producto.inicio + producto.entrada;
        const vendido = Math.max(0, venta - producto.final);
        const importe = vendido * producto.precio;
        
        // Actualizar producto
        producto.venta = venta;
        producto.vendido = vendido;
        producto.importe = importe;
        
        // Actualizar UI
        const ventaDisplay = row.querySelector('.venta-display');
        const vendidoDisplay = row.querySelector('.vendido-display');
        const importeDisplay = row.querySelector('.importe-display');
        const updateTime = row.querySelector('.product-update-time');
        
        if (ventaDisplay) ventaDisplay.textContent = venta;
        if (vendidoDisplay) vendidoDisplay.textContent = vendido;
        if (importeDisplay) importeDisplay.textContent = `$${importe.toFixed(2)}`;
        if (updateTime) {
            updateTime.textContent = new Date().toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        // Actualizar resumen general
        actualizarResumen();
    }
    
    function programarAutoSave() {
        // Cancelar timer anterior
        if (autoSaveTimer) {
            clearTimeout(autoSaveTimer);
        }
        
        // Programar nuevo guardado en 2 segundos
        autoSaveTimer = setTimeout(() => {
            guardarDatosSalon();
        }, 2000);
    }
    
    function guardarDatosSalon() {
        try {
            StorageManager.saveSalonData(salonData);
            lastSaveTime = new Date();
            
            // Mostrar indicador de guardado
            mostrarIndicadorGuardado();
            
            console.log('Datos guardados a las:', lastSaveTime.toLocaleTimeString());
        } catch (error) {
            console.error('Error guardando datos:', error);
            showNotification('Error al guardar datos', 'error');
        }
    }
    
    function mostrarIndicadorGuardado() {
        const saveIndicator = document.createElement('div');
        saveIndicator.className = 'save-indicator';
        saveIndicator.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>Guardado ${new Date().toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}</span>
        `;
        
        // Remover indicador anterior
        const oldIndicator = document.querySelector('.save-indicator');
        if (oldIndicator) oldIndicator.remove();
        
        // Agregar al contenedor
        const container = document.querySelector('.salon-table-container');
        if (container) {
            container.appendChild(saveIndicator);
            
            // Remover después de 3 segundos
            setTimeout(() => {
                saveIndicator.classList.add('fade-out');
                setTimeout(() => saveIndicator.remove(), 300);
            }, 3000);
        }
    }
    
    function actualizarResumen() {
        const totalProductos = salonData.length;
        const totalUnidadesVendidas = salonData.reduce((sum, p) => sum + p.vendido, 0);
        const totalImporte = salonData.reduce((sum, p) => sum + p.importe, 0);
        
        // Actualizar elementos del DOM
        const elementos = {
            'total-productos-salon': totalProductos,
            'total-unidades-vendidas': totalUnidadesVendidas,
            'total-importe-salon': `$${totalImporte.toFixed(2)}`,
            'total-ventas-salon': `$${totalImporte.toFixed(2)}`,
            'ultima-actualizacion': new Date().toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            })
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
                showConfirmationModal(
                    'Configurar Salida Final',
                    'Esta acción permitirá editar los valores de "Final" para todos los productos. ¿Continuar?',
                    'info',
                    function() {
                        const finalInputs = document.querySelectorAll('.final-input');
                        finalInputs.forEach(input => {
                            input.classList.add('focus-final');
                            input.style.backgroundColor = '#fff8e1';
                            input.style.borderColor = '#ffb300';
                        });
                        
                        showNotification('Modo edición de valores finales activado', 'info');
                    }
                );
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
                        // Calcular automáticamente los vendidos
                        salonData.forEach(producto => {
                            producto.vendido = Math.max(0, (producto.inicio + producto.entrada) - producto.final);
                            producto.importe = producto.vendido * producto.precio;
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
        
        // Entrada manual
        if (btnGuardarEntrada) {
            btnGuardarEntrada.addEventListener('click', function() {
                const productoId = parseInt(selectProducto.value);
                const cantidad = parseInt(entradaCantidad.value) || 0;
                
                if (!productoId) {
                    showNotification('Selecciona un producto', 'error');
                    return;
                }
                
                if (cantidad <= 0) {
                    showNotification('Ingresa una cantidad válida', 'error');
                    entradaCantidad.focus();
                    return;
                }
                
                // Buscar producto
                const productoIndex = salonData.findIndex(p => p.id === productoId);
                if (productoIndex === -1) {
                    showNotification('Producto no encontrado', 'error');
                    return;
                }
                
                // Registrar entrada
                const hora = new Date().toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                salonData[productoIndex].entrada += cantidad;
                salonData[productoIndex].ultimaActualizacion = new Date().toISOString();
                
                // Agregar al historial
                salonData[productoIndex].historial.push({
                    fecha: new Date().toISOString(),
                    tipo: 'entrada',
                    cantidad: cantidad,
                    hora: hora,
                    descripcion: `Entrada manual: ${cantidad} unidades`
                });
                
                // Actualizar interfaz
                actualizarTabla();
                guardarDatosSalon();
                actualizarResumen();
                
                // Limpiar formulario
                selectProducto.value = '';
                entradaCantidad.value = '';
                entradaForm.style.display = 'none';
                
                showNotification(`Entrada de ${cantidad} unidades registrada (${hora})`, 'success');
            });
        }
        
        // Cancelar entrada
        if (btnCancelarEntrada) {
            btnCancelarEntrada.addEventListener('click', function() {
                selectProducto.value = '';
                entradaCantidad.value = '';
                entradaForm.style.display = 'none';
            });
        }
    }
    
    function mostrarFormEntrada(productoId) {
        if (!entradaForm) return;
        
        selectProducto.value = productoId;
        entradaCantidad.value = '';
        entradaForm.style.display = 'block';
        
        // Enfocar el input de cantidad
        setTimeout(() => {
            if (entradaCantidad) entradaCantidad.focus();
        }, 100);
    }
    
    function mostrarCargando() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-state';
        loadingDiv.innerHTML = `
            <i class="fas fa-spinner"></i>
            <p>Cargando datos del salón...</p>
        `;
        
        if (salonTable) {
            salonTable.innerHTML = '';
            salonTable.appendChild(loadingDiv);
        }
    }
    
    function ocultarCargando() {
        const loadingDiv = document.querySelector('.loading-state');
        if (loadingDiv) loadingDiv.remove();
    }
    
    // Funciones disponibles globalmente
    window.actualizarSalonDesdeProductos = function() {
        console.log('Sincronizando salón con productos...');
        cargarProductos();
        sincronizarConProductos();
        actualizarTabla();
        guardarDatosSalon();
        actualizarResumen();
        
        showNotification('Salón sincronizado con productos actualizados', 'success');
    };
    
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
            producto.ultimaActualizacion = new Date().toISOString();
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