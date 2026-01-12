// historial.js - Gestión simplificada del historial de reportes IPV

class HistorialIPV {
    constructor() {
        this.KEY_HISTORIAL = 'ipb_historial_reportes';
        this.reportes = this.cargarHistorial();
        this.reporteSeleccionado = null;

        this.init();
    }

    init() {
        this.cargarAniosFiltro();
        this.bindEvents();
        this.mostrarListaReportes();
    }

    cargarHistorial() {
        const historial = localStorage.getItem(this.KEY_HISTORIAL);
        return historial ? JSON.parse(historial) : [];
    }

    guardarHistorial() {
        localStorage.setItem(this.KEY_HISTORIAL, JSON.stringify(this.reportes));
    }

    async guardarReporteActual(titulo = null) {
        try {
            const datos = await this.recopilarDatosActuales();

            // ========== VALIDAR SI ES DUPLICADO ==========
            if (window.validateDuplicateReport) {
                const esDuplicado = !window.validateDuplicateReport(datos);

                if (esDuplicado) {
                    // Mostrar confirmación para sobrescribir
                    const confirmar = await this.mostrarConfirmacionDuplicado(titulo);
                    if (!confirmar) {
                        showNotification('❌ Reporte no guardado (duplicado)', 'warning');
                        return null;
                    }
                }
            }
            // ============================================

            const reporte = {
                id: Date.now(),
                fecha: new Date().toISOString().split('T')[0],
                hora: new Date().toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                }),
                titulo: titulo || `Reporte IPV - ${new Date().toLocaleDateString('es-ES')}`,
                datos: datos,
                timestamp: Date.now()
            };

            this.reportes.unshift(reporte);

            if (this.reportes.length > 100) {
                this.reportes = this.reportes.slice(0, 100);
            }

            this.guardarHistorial();
            this.mostrarListaReportes();
            this.cargarAniosFiltro();

            this.seleccionarReporte(reporte.id);

            showNotification('✅ Reporte guardado en el historial', 'success');
            return reporte;

        } catch (error) {
            console.error('Error guardando reporte:', error);
            showNotification('❌ Error al guardar el reporte: ' + error.message, 'error');
            return null;
        }
    }

    // Agregar esta función después de guardarReporteActual
    mostrarConfirmacionDuplicado(titulo) {
        return new Promise((resolve) => {
            const modalHtml = `
            <div class="modal active">
                <div class="modal-overlay"></div>
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header bg-warning">
                        <h3><i class="fas fa-exclamation-triangle"></i> Reporte Similar Encontrado</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Ya existe un reporte de hoy con datos similares.</p>
                        <p><strong>¿Deseas guardar este reporte de todas formas?</strong></p>
                        <p><small>Título propuesto: "${titulo || 'Reporte del día'}"</small></p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="cancelar-duplicado">Cancelar</button>
                        <button class="btn btn-primary" id="confirmar-duplicado">
                            <i class="fas fa-save"></i> Guardar de todas formas
                        </button>
                    </div>
                </div>
            </div>
        `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);

            const modal = document.querySelector('.modal:last-child');

            modal.querySelector('.modal-close').addEventListener('click', () => {
                modal.remove();
                resolve(false);
            });

            modal.querySelector('#cancelar-duplicado').addEventListener('click', () => {
                modal.remove();
                resolve(false);
            });

            modal.querySelector('.modal-overlay').addEventListener('click', () => {
                modal.remove();
                resolve(false);
            });

            modal.querySelector('#confirmar-duplicado').addEventListener('click', () => {
                modal.remove();
                resolve(true);
            });
        });
    }

    async recopilarDatosActuales() {
        const storage = window.StorageManager || {
            getProducts: () => JSON.parse(localStorage.getItem('ipb_products') || '[]'),
            getCocinaProducts: () => JSON.parse(localStorage.getItem('ipb_cocina_products') || '[]'),
            getSalonData: () => JSON.parse(localStorage.getItem('ipb_salon') || '[]'),
            getCocinaData: () => JSON.parse(localStorage.getItem('ipb_cocina') || '[]'),
            getConsumoData: () => JSON.parse(localStorage.getItem('ipb_consumo_data') || '[]'),
            getExtraccionesData: () => JSON.parse(localStorage.getItem('ipb_extracciones') || '[]'),
            getTransferenciasData: () => JSON.parse(localStorage.getItem('ipb_transferencias_data') || '[]')
        };

        const productosBaseSalon = storage.getProducts();
        const salonData = storage.getSalonData();
        const productosSalon = productosBaseSalon.map(productoBase => {
            const datosDia = salonData.find(p => p.id === productoBase.id) || {};
            return {
                ...productoBase,
                inicio: datosDia.inicio || 0,
                entrada: datosDia.entrada || 0,
                venta: datosDia.venta || 0,
                final: datosDia.final || 0,
                vendido: datosDia.vendido || 0,
                importe: (datosDia.importe || 0)
            };
        });

        const productosBaseCocina = storage.getCocinaProducts();
        const cocinaData = storage.getCocinaData();
        const productosCocina = productosBaseCocina.map(productoBase => {
            const datosDia = cocinaData.find(p => p.id === productoBase.id) || {};
            return {
                ...productoBase,
                inicio: datosDia.inicio || 0,
                entrada: datosDia.entrada || 0,
                venta: datosDia.venta || 0,
                final: datosDia.final || 0,
                vendido: datosDia.vendido || 0,
                importe: (datosDia.importe || 0)
            };
        });

        const agregos = JSON.parse(localStorage.getItem('cocina_agregos') || '[]');
        const consumoData = storage.getConsumoData();
        const extraccionesData = storage.getExtraccionesData();
        const transferenciasData = storage.getTransferenciasData();
        const efectivoData = JSON.parse(localStorage.getItem('ipb_efectivo_data') || '[]');
        const billetesData = JSON.parse(localStorage.getItem('ipb_billetes_registros') || '[]');

        const ventasSalon = productosSalon.reduce((sum, p) => sum + (p.importe || 0), 0);
        const ventasCocinaProductos = productosCocina.reduce((sum, p) => sum + (p.importe || 0), 0);
        const agregosTotal = agregos.reduce((sum, a) => sum + (a.montoTotal || a.monto || 0), 0);
        const ventasCocina = ventasCocinaProductos + agregosTotal;
        const ventasTotales = ventasSalon + ventasCocina;

        const consumoTotal = consumoData.reduce((sum, c) => sum + (c.monto || 0), 0);
        const extraccionesTotal = extraccionesData.reduce((sum, e) => sum + (e.monto || 0), 0);
        const transferenciasTotal = transferenciasData.reduce((sum, t) => sum + (t.monto || 0), 0);
        const efectivoTotal = efectivoData.reduce((sum, e) => sum + (e.monto || 0), 0);
        const dineroReal = consumoTotal + extraccionesTotal + transferenciasTotal + efectivoTotal;

        const diferencia = dineroReal - ventasTotales;
        const dineroAPorcentuar = ventasTotales - consumoTotal;
        const porciento = Math.floor(dineroAPorcentuar / 10000) * 100;

        return {
            productos: {
                salon: productosSalon,
                cocina: productosCocina,
                agregos: agregos
            },
            ventas: {
                ventasSalon,
                ventasCocina,
                ventasCocinaProductos,
                agregosTotal,
                ventasTotales,
                dineroReal,
                diferencia,
                porciento
            },
            financiero: {
                consumo: consumoData,
                consumoTotal,
                extracciones: extraccionesData,
                extraccionesTotal,
                transferencias: transferenciasData,
                transferenciasTotal,
                efectivo: efectivoData,
                efectivoTotal
            },
            billetes: {
                registros: billetesData
            }
        };
    }

    cargarAniosFiltro() {
        const selectAnio = document.getElementById('filtro-ano');
        if (!selectAnio) return;

        selectAnio.innerHTML = '<option value="">Todos los años</option>';

        const anios = new Set();
        this.reportes.forEach(reporte => {
            const fecha = new Date(reporte.timestamp);
            anios.add(fecha.getFullYear().toString());
        });

        const anioActual = new Date().getFullYear();
        for (let i = anioActual - 2; i <= anioActual + 1; i++) {
            anios.add(i.toString());
        }

        Array.from(anios)
            .sort((a, b) => b - a)
            .forEach(anio => {
                const option = document.createElement('option');
                option.value = anio;
                option.textContent = anio;
                selectAnio.appendChild(option);
            });
    }

    bindEvents() {

        // Botón limpiar filtros
        document.getElementById('btn-limpiar-filtros')?.addEventListener('click', () => {
            this.limpiarFiltros();
        });

        // Filtros
        const filtroIds = ['filtro-fecha', 'filtro-mes', 'filtro-ano', 'filtro-busqueda'];
        filtroIds.forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => {
                this.aplicarFiltros();
            });
        });

        document.getElementById('filtro-busqueda')?.addEventListener('input', () => {
            this.aplicarFiltros();
        });

        // Delegación de eventos
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-deseleccionar')) {
                e.stopPropagation();
                this.deseleccionarReporte();
            }
            else if (e.target.closest('.reporte-card') && !e.target.closest('.reporte-btn')) {
                const card = e.target.closest('.reporte-card');
                const id = parseInt(card.dataset.id);
                this.seleccionarReporte(id);
            }
            else if (e.target.closest('#btn-exportar-reporte')) {
                this.exportarReporte();
            } else if (e.target.closest('#btn-eliminar-reporte')) {
                this.eliminarReporte();
            }
        });
    }

    promptGuardarReporte() {
        const tituloPredeterminado = `Reporte IPV - ${new Date().toLocaleDateString('es-ES')}`;

        const modalHtml = `
            <div class="modal active modal-historial" id="modal-guardar-reporte">
                <div class="modal-overlay"></div>
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-save"></i> Guardar Reporte en Historial</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="reporte-titulo">
                                <i class="fas fa-heading"></i> Título del Reporte
                            </label>
                            <input type="text" id="reporte-titulo" class="form-control" 
                                   value="${tituloPredeterminado}" 
                                   placeholder="Ingrese un título descriptivo"
                                   autofocus>
                        </div>
                        <div class="alert alert-info" style="margin-top: 1rem;">
                            <i class="fas fa-info-circle"></i>
                            <span>Se guardarán todos los datos actuales del sistema en el historial.</span>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="cancelar-guardar">Cancelar</button>
                        <button class="btn btn-primary" id="confirmar-guardar">
                            <i class="fas fa-save"></i> Guardar Reporte
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('modal-guardar-reporte');
        const tituloInput = modal.querySelector('#reporte-titulo');

        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.querySelector('#cancelar-guardar').addEventListener('click', () => modal.remove());
        modal.querySelector('.modal-overlay').addEventListener('click', () => modal.remove());

        modal.querySelector('#confirmar-guardar').addEventListener('click', async () => {
            const titulo = tituloInput.value.trim() || tituloPredeterminado;
            const reporte = await this.guardarReporteActual(titulo);
            if (reporte) {
                modal.remove();
            }
        });

        tituloInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                modal.querySelector('#confirmar-guardar').click();
            }
        });
    }

    mostrarListaReportes(filtrados = null) {
        const lista = document.getElementById('historial-list');
        const totalElement = document.getElementById('total-reportes');
        const emptyState = document.getElementById('historial-empty-state');
        const listWrapper = document.querySelector('.historial-list-wrapper');

        if (!lista) return;

        const reportesAMostrar = filtrados || this.reportes;
        totalElement.textContent = reportesAMostrar.length;

        if (reportesAMostrar.length === 0) {
            emptyState.style.display = 'block';
            listWrapper.style.display = 'none';
            lista.innerHTML = '';
            return;
        }

        emptyState.style.display = 'none';
        listWrapper.style.display = 'block';

        lista.innerHTML = reportesAMostrar.map(reporte => {
            const fecha = new Date(reporte.timestamp);
            const fechaFormateada = fecha.toLocaleDateString('es-ES', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            const seleccionado = this.reporteSeleccionado?.id === reporte.id ? 'seleccionado' : '';

            return `
                <div class="reporte-card ${seleccionado}" data-id="${reporte.id}">
                    ${seleccionado ? '<button class="btn-deseleccionar" title="Deseleccionar">×</button>' : ''}
                    ${seleccionado ? '<span class="seleccion-indicator"><i class="fas fa-check"></i></span>' : ''}
                    
                    <div class="reporte-card-header">
                        <div class="reporte-fecha">
                            <i class="far fa-calendar"></i>
                            ${fechaFormateada}
                        </div>
                        <div class="reporte-hora">
                            <i class="far fa-clock"></i>
                            ${reporte.hora}
                        </div>
                    </div>
                    
                    <div class="reporte-card-body">
                        <div class="reporte-item">
                            <span class="reporte-item-label">Ventas Totales</span>
                            <span class="reporte-item-valor amount">
                                $${reporte.datos.ventas.ventasTotales.toLocaleString('es-ES')}
                            </span>
                        </div>
                        <div class="reporte-item">
                            <span class="reporte-item-label">Dinero Real</span>
                            <span class="reporte-item-valor amount">
                                $${reporte.datos.ventas.dineroReal.toLocaleString('es-ES')}
                            </span>
                        </div>
                        <div class="reporte-item">
                            <span class="reporte-item-label">Diferencia</span>
                            <span class="reporte-item-valor ${reporte.datos.ventas.diferencia >= 0 ? 'amount' : 'negative'}">
                                $${Math.abs(reporte.datos.ventas.diferencia).toLocaleString('es-ES')}
                            </span>
                        </div>
                        <div class="reporte-item">
                            <span class="reporte-item-label">1% Ventas</span>
                            <span class="reporte-item-valor amount">
                                $${reporte.datos.ventas.porciento.toLocaleString('es-ES')}
                            </span>
                        </div>
                    </div>
                    
                    <div class="reporte-card-footer">
                        <div class="reporte-titulo" title="${reporte.titulo}">
                            ${reporte.titulo.length > 40 ? reporte.titulo.substring(0, 40) + '...' : reporte.titulo}
                        </div>
                    </div>
                    
                </div>
            `;
        }).join('');
    }

    seleccionarReporte(id) {
        if (this.reporteSeleccionado?.id === id) {
            this.deseleccionarReporte();
            return;
        }

        this.reporteSeleccionado = this.reportes.find(r => r.id === id);
        this.mostrarListaReportes();
        this.mostrarDetalleReporte();
    }

    deseleccionarReporte() {
        this.reporteSeleccionado = null;
        this.mostrarListaReportes();
        this.ocultarDetalleReporte();
    }

    mostrarDetalleReporte() {
        const detalleContainer = document.getElementById('detalle-container');
        const detalleContent = document.getElementById('detalle-content');

        if (!this.reporteSeleccionado) {
            this.ocultarDetalleReporte();
            return;
        }

        const reporte = this.reporteSeleccionado;
        const fecha = new Date(reporte.timestamp);

        detalleContent.innerHTML = `
            <div class="detalle-card">
                <h4><i class="fas fa-info-circle"></i> Información General</h4>
                <div class="detalle-info">
                    <div class="detalle-info-item">
                        <span class="detalle-info-label">Título:</span>
                        <span class="detalle-info-valor">${reporte.titulo}</span>
                    </div>
                    <div class="detalle-info-item">
                        <span class="detalle-info-label">Fecha:</span>
                        <span class="detalle-info-valor">${fecha.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}</span>
                    </div>
                    <div class="detalle-info-item">
                        <span class="detalle-info-label">Hora:</span>
                        <span class="detalle-info-valor">${reporte.hora}</span>
                    </div>
                    <div class="detalle-info-item">
                        <span class="detalle-info-label">ID:</span>
                        <span class="detalle-info-valor">${reporte.id}</span>
                    </div>
                </div>
            </div>
            
            <div class="detalle-card">
                <h4><i class="fas fa-chart-bar"></i> Resumen Financiero</h4>
                <div class="detalle-info">
                    <div class="detalle-info-item">
                        <span class="detalle-info-label">Ventas Salón:</span>
                        <span class="detalle-info-valor amount">$${reporte.datos.ventas.ventasSalon.toLocaleString('es-ES')}</span>
                    </div>
                    <div class="detalle-info-item">
                        <span class="detalle-info-label">Ventas Cocina:</span>
                        <span class="detalle-info-valor amount">$${reporte.datos.ventas.ventasCocina.toLocaleString('es-ES')}</span>
                    </div>
                    <div class="detalle-info-item">
                        <span class="detalle-info-label">Agregos Total:</span>
                        <span class="detalle-info-valor amount">$${reporte.datos.ventas.agregosTotal.toLocaleString('es-ES')}</span>
                    </div>
                    <div class="detalle-info-item">
                        <span class="detalle-info-label">Ventas Totales:</span>
                        <span class="detalle-info-valor amount">$${reporte.datos.ventas.ventasTotales.toLocaleString('es-ES')}</span>
                    </div>
                    <div class="detalle-info-item">
                        <span class="detalle-info-label">Consumo Total:</span>
                        <span class="detalle-info-valor">$${reporte.datos.financiero.consumoTotal.toLocaleString('es-ES')}</span>
                    </div>
                    <div class="detalle-info-item">
                        <span class="detalle-info-label">Extracciones Total:</span>
                        <span class="detalle-info-valor">$${reporte.datos.financiero.extraccionesTotal.toLocaleString('es-ES')}</span>
                    </div>
                    <div class="detalle-info-item">
                        <span class="detalle-info-label">Transferencias Total:</span>
                        <span class="detalle-info-valor">$${reporte.datos.financiero.transferenciasTotal.toLocaleString('es-ES')}</span>
                    </div>
                    <div class="detalle-info-item">
                        <span class="detalle-info-label">Efectivo Total:</span>
                        <span class="detalle-info-valor">$${reporte.datos.financiero.efectivoTotal.toLocaleString('es-ES')}</span>
                    </div>
                    <div class="detalle-info-item">
                        <span class="detalle-info-label">Dinero Real:</span>
                        <span class="detalle-info-valor amount">$${reporte.datos.ventas.dineroReal.toLocaleString('es-ES')}</span>
                    </div>
                    <div class="detalle-info-item">
                        <span class="detalle-info-label">Diferencia:</span>
                        <span class="detalle-info-valor ${reporte.datos.ventas.diferencia >= 0 ? 'amount' : 'negative'}">
                            $${Math.abs(reporte.datos.ventas.diferencia).toLocaleString('es-ES')}
                        </span>
                    </div>
                    <div class="detalle-info-item">
                        <span class="detalle-info-label">1% de Ventas:</span>
                        <span class="detalle-info-valor amount">$${reporte.datos.ventas.porciento.toLocaleString('es-ES')}</span>
                    </div>
                </div>
            </div>
            
            <div class="detalle-acciones">
                <button class="btn btn-primary" id="btn-exportar-reporte">
                    <i class="fas fa-file-pdf"></i> Generar PDF
                </button>
                <button class="btn btn-danger" id="btn-eliminar-reporte">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        `;

        detalleContainer.style.display = 'block';
        detalleContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    ocultarDetalleReporte() {
        const detalleContainer = document.getElementById('detalle-container');
        if (detalleContainer) {
            detalleContainer.style.display = 'none';
        }
    }

    aplicarFiltros() {
        const filtroFecha = document.getElementById('filtro-fecha')?.value || '';
        const filtroMes = document.getElementById('filtro-mes')?.value || '';
        const filtroAno = document.getElementById('filtro-ano')?.value || '';
        const filtroBusqueda = document.getElementById('filtro-busqueda')?.value.toLowerCase() || '';

        let reportesFiltrados = this.reportes;

        if (filtroFecha) {
            reportesFiltrados = reportesFiltrados.filter(reporte => {
                const reporteFecha = new Date(reporte.timestamp).toISOString().split('T')[0];
                return reporteFecha === filtroFecha;
            });
        }

        if (filtroMes) {
            reportesFiltrados = reportesFiltrados.filter(reporte => {
                const fecha = new Date(reporte.timestamp);
                const mesReporte = String(fecha.getMonth() + 1).padStart(2, '0');
                return mesReporte === filtroMes;
            });
        }

        if (filtroAno) {
            reportesFiltrados = reportesFiltrados.filter(reporte => {
                const fecha = new Date(reporte.timestamp);
                return fecha.getFullYear().toString() === filtroAno;
            });
        }

        if (filtroBusqueda) {
            reportesFiltrados = reportesFiltrados.filter(reporte => {
                return (
                    reporte.titulo.toLowerCase().includes(filtroBusqueda) ||
                    reporte.fecha.includes(filtroBusqueda) ||
                    reporte.hora.includes(filtroBusqueda) ||
                    reporte.id.toString().includes(filtroBusqueda)
                );
            });
        }

        if (this.reporteSeleccionado && !reportesFiltrados.find(r => r.id === this.reporteSeleccionado.id)) {
            this.deseleccionarReporte();
        }

        this.mostrarListaReportes(reportesFiltrados);
    }

    limpiarFiltros() {
        document.getElementById('filtro-fecha').value = '';
        document.getElementById('filtro-mes').value = '';
        document.getElementById('filtro-ano').value = '';
        document.getElementById('filtro-busqueda').value = '';
        this.mostrarListaReportes();
    }

    exportarReporte() {
        if (!this.reporteSeleccionado) {
            showNotification('Selecciona un reporte primero', 'warning');
            return;
        }

        // Siempre cargar el generador de PDF dinámicamente
        this.cargarPDFGenerator().then(() => {
            if (typeof window.showHistorialPDFOptionsModal === 'function') {
                window.showHistorialPDFOptionsModal();
            } else {
                // Si aún no está disponible, intentar un enfoque alternativo
                console.error('Función showHistorialPDFOptionsModal no disponible');
                this.generarPDFDirecto();
            }
        }).catch(error => {
            console.error('Error cargando generador de PDF:', error);
            showNotification('❌ Error al cargar el generador de PDF', 'error');
        });
    }

    // Método alternativo para generar PDF directamente
    generarPDFDirecto() {
        if (!this.reporteSeleccionado) return;

        const reporte = this.reporteSeleccionado;
        showNotification(`Generando PDF para: ${reporte.titulo}`, 'info');

        // Aquí puedes implementar la generación directa de PDF
        // o redirigir a una función alternativa
        console.log('Generando PDF directo para reporte:', reporte.id);
    }

    // Modificar cargarPDFGenerator para ser más robusto
    cargarPDFGenerator() {
        return new Promise((resolve, reject) => {
            // Verificar si ya está cargado
            if (typeof window.showHistorialPDFOptionsModal === 'function') {
                console.log('Generador de PDF ya cargado');
                resolve();
                return;
            }

            // Verificar si el script ya está en el DOM
            const existingScript = document.querySelector('script[src*="generar-pdf-historial.js"]');
            if (existingScript) {
                // Si el script ya existe pero la función no está disponible,
                // intentar inicializarlo manualmente
                console.log('Script ya cargado, esperando inicialización...');
                setTimeout(() => {
                    if (typeof window.showHistorialPDFOptionsModal === 'function') {
                        resolve();
                    } else {
                        reject(new Error('Función no disponible después de cargar script'));
                    }
                }, 1000);
                return;
            }

            // Crear y cargar script
            const script = document.createElement('script');
            script.src = 'js/generar-pdf-historial.js';

            script.onload = () => {
                console.log('Generador de PDF para historial cargado exitosamente');
                // Dar tiempo a que se inicialice
                setTimeout(() => {
                    if (typeof window.showHistorialPDFOptionsModal === 'function') {
                        resolve();
                    } else {
                        reject(new Error('Función no disponible después de cargar'));
                    }
                }, 500);
            };

            script.onerror = (error) => {
                console.error('Error cargando generador de PDF:', error);
                reject(new Error('Error cargando script'));
            };

            document.head.appendChild(script);
        });
    }

    eliminarReporte() {
        if (!this.reporteSeleccionado) {
            showNotification('Selecciona un reporte primero', 'warning');
            return;
        }

        const titulo = this.reporteSeleccionado.titulo;

        window.showConfirmationModal(
            'Eliminar Reporte',
            `¿Estás seguro de eliminar el reporte "${titulo}"?<br><br>
            <strong>Fecha:</strong> ${new Date(this.reporteSeleccionado.timestamp).toLocaleDateString('es-ES')}<br>
            <strong>Hora:</strong> ${this.reporteSeleccionado.hora}<br>
            <strong>ID:</strong> ${this.reporteSeleccionado.id}`,
            'warning',
            () => {
                this.reportes = this.reportes.filter(r => r.id !== this.reporteSeleccionado.id);
                this.guardarHistorial();
                this.deseleccionarReporte();
                this.cargarAniosFiltro();
                showNotification(`✅ Reporte "${titulo}" eliminado`, 'success');
            }
        );
    }
}


// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const historialSection = document.getElementById('historial-section');

    if (historialSection) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (historialSection.classList.contains('active')) {
                        if (!window.historialIPV) {
                            window.historialIPV = new HistorialIPV();
                        } else {
                            window.historialIPV.mostrarListaReportes();
                        }
                    }
                }
            });
        });

        observer.observe(historialSection, { attributes: true });

        if (historialSection.classList.contains('active')) {
            window.historialIPV = new HistorialIPV();
        }
    }

    // Función auxiliar para notificaciones
    if (typeof window.showNotification !== 'function') {
        window.showNotification = function (message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
                color: white;
                border-radius: 5px;
                z-index: 9999;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: slideIn 0.3s ease;
                display: flex;
                align-items: center;
                gap: 10px;
            `;

            const icon = type === 'success' ? 'fa-check-circle' :
                type === 'error' ? 'fa-exclamation-circle' :
                    type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';

            notification.innerHTML = `
                <i class="fas ${icon}"></i>
                <span>${message}</span>
            `;

            document.body.appendChild(notification);

            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }, 3000);

            if (!document.querySelector('#notification-styles')) {
                const style = document.createElement('style');
                style.id = 'notification-styles';
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
        };
    }

    // Inicializar si ya estamos en la sección de Historial
    const historialSeccion = document.getElementById('historial-section');
    if (historialSeccion && historialSeccion.classList.contains('active')) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (historialSection.classList.contains('active')) {
                        if (!window.historialIPV) {
                            window.historialIPV = new HistorialIPV();
                        } else {
                            window.historialIPV.mostrarListaReportes();
                        }
                    }
                }
            });
        });

        observer.observe(historialSection, { attributes: true });

        if (historialSection.classList.contains('active')) {
            window.historialIPV = new HistorialIPV();
        }
    }

    // Inicializar cuando se haga clic en el enlace del sidebar
    document.addEventListener('click', function (e) {
        const link = e.target.closest('a[data-section="historial"]');
        if (link) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        if (historialSection.classList.contains('active')) {
                            if (!window.historialIPV) {
                                window.historialIPV = new HistorialIPV();
                            } else {
                                window.historialIPV.mostrarListaReportes();
                            }
                        }
                    }
                });
            });

            observer.observe(historialSection, { attributes: true });

            if (historialSection.classList.contains('active')) {
                window.historialIPV = new HistorialIPV();
            }
        }
    });
});


window.historialIPV = new HistorialIPV();