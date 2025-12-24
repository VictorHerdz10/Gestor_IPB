// generar-pdf-historial.js - Versión corregida y completa

// Definir variables globales al inicio
const isCapacitor = window.Capacitor !== undefined;
const filesystem = isCapacitor ? window.Capacitor.Plugins?.Filesystem : null;
const share = isCapacitor ? window.Capacitor.Plugins?.Share : null;

const Directory = {
    Documents: 'DOCUMENTS',
    Data: 'DATA',
    Cache: 'CACHE'
};

// Definir funciones globales primero
window.showHistorialPDFOptionsModal = function () {
    // Verificar si hay un reporte seleccionado en el historial
    if (!window.historialIPV || !window.historialIPV.reporteSeleccionado) {
        showNotification('Selecciona un reporte del historial primero', 'warning');
        return;
    }

    const reporte = window.historialIPV.reporteSeleccionado;

    // Cerrar cualquier modal existente primero
    const existingModal = document.querySelector('.historial-pdf-export');
    if (existingModal) {
        existingModal.remove();
    }

    const modalHtml = `
        <div class="modal active pdf-export-modal historial-pdf-export">
            <div class="modal-overlay" id="historial-modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-file-pdf"></i> Exportar Reporte del Historial</h3>
                    <div class="modal-header-actions">
                        <button class="modal-close" id="historial-modal-close">&times;</button>
                    </div>
                </div>
                <div class="modal-body">
                    <div class="reporte-info">
                        <h4><i class="fas fa-info-circle"></i> Información del Reporte</h4>
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="info-label">Título:</span>
                                <span class="info-value">${reporte.titulo}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Fecha:</span>
                                <span class="info-value">${reporte.fecha}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Hora:</span>
                                <span class="info-value">${reporte.hora}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Ventas Totales:</span>
                                <span class="info-value amount">$${reporte.datos.ventas.ventasTotales.toLocaleString('es-ES')}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="pdf-progress" style="display: none;" id="historial-pdf-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" id="historial-progress-fill"></div>
                        </div>
                        <div class="progress-text" id="historial-progress-text">Preparando datos...</div>
                    </div>
                    
                    <div class="pdf-options" id="historial-pdf-options">
                        <p><i class="fas fa-info-circle"></i> Selecciona las secciones a incluir en el reporte:</p>
                        
                        <div class="option-checkbox">
                            <input type="checkbox" id="historial-opt-resumen" checked>
                            <label for="historial-opt-resumen">Resumen General</label>
                        </div>
                        
                        <div class="option-checkbox">
                            <input type="checkbox" id="historial-opt-salon" checked>
                            <label for="historial-opt-salon">Productos Salón</label>
                        </div>
                        
                        <div class="option-checkbox">
                            <input type="checkbox" id="historial-opt-cocina" checked>
                            <label for="historial-opt-cocina">Productos Cocina</label>
                        </div>
                        
                        <div class="option-checkbox">
                            <input type="checkbox" id="historial-opt-agregos" checked>
                            <label for="historial-opt-agregos">Agregos y Productos Compuestos</label>
                        </div>
                        
                        <div class="option-checkbox">
                            <input type="checkbox" id="historial-opt-financiero" checked>
                            <label for="historial-opt-financiero">Registros Financieros</label>
                        </div>
                        
                        <div class="option-checkbox">
                            <input type="checkbox" id="historial-opt-transferencias" checked>
                            <label for="historial-opt-transferencias">Transferencias</label>
                        </div>
                        
                        <div class="option-checkbox">
                            <input type="checkbox" id="historial-opt-billetes" checked>
                            <label for="historial-opt-billetes">Conteo de Billetes</label>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="historial-pdf-title">
                            <i class="fas fa-heading"></i> Título del Reporte
                        </label>
                        <input type="text" id="historial-pdf-title" class="form-input" 
                               value="${reporte.titulo}">
                    </div>

                    <div class="export-actions" id="historial-export-actions" style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                        <p><i class="fas fa-save"></i> Opciones de exportación:</p>
                        
                        <div class="action-buttons">
                            <button class="btn-action" id="historial-action-download">
                                <i class="fas fa-download"></i> Descargar PDF
                            </button>
                            
                            ${isCapacitor ? `
                            <button class="btn-action" id="historial-action-share">
                                <i class="fas fa-share-alt"></i> Compartir PDF
                            </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="historial-pdf-cancel">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Configurar event listeners después de que el modal esté en el DOM
    setupHistorialModalEvents();
};

function setupHistorialModalEvents() {
    const modal = document.querySelector('.historial-pdf-export');
    if (!modal) return;

    // Función para cerrar el modal
    function closeModal() {
        modal.remove();
    }

    // Event listeners para cerrar
    const closeBtn = document.getElementById('historial-modal-close');
    const cancelBtn = document.getElementById('historial-pdf-cancel');
    const overlay = document.getElementById('historial-modal-overlay');

    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }

    if (overlay) {
        overlay.addEventListener('click', closeModal);
    }

    // Event listeners para exportar
    const downloadBtn = document.getElementById('historial-action-download');
    const shareBtn = document.getElementById('historial-action-share');

    if (downloadBtn) {
        downloadBtn.addEventListener('click', handleHistorialDownload);
    }

    if (shareBtn) {
        shareBtn.addEventListener('click', handleHistorialShare);
    }

    // Permitir cerrar con ESC
    const escHandler = function (e) {
        if (e.key === 'Escape' && modal) {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

async function handleHistorialDownload() {
    const modal = document.querySelector('.historial-pdf-export');
    if (!modal || !window.historialIPV?.reporteSeleccionado) return;

    const reporte = window.historialIPV.reporteSeleccionado;
    const options = getHistorialExportOptions();

    // Mostrar progreso
    showHistorialProgress(true);

    try {
        const pdfBlob = await generateHistorialPDF(reporte.datos, options);
        await downloadHistorialPDF(pdfBlob, options.title);

        // Cerrar modal después de éxito
        modal.remove();
    } catch (error) {
        console.error('Error generando PDF del historial:', error);
        showNotification('Error al generar el PDF: ' + error.message, 'error');

        // Restaurar vista
        showHistorialProgress(false);
    }
}

async function handleHistorialShare() {
    const modal = document.querySelector('.historial-pdf-export');
    if (!modal || !window.historialIPV?.reporteSeleccionado) return;

    const reporte = window.historialIPV.reporteSeleccionado;
    const options = getHistorialExportOptions();

    // Mostrar progreso
    showHistorialProgress(true);

    try {
        const pdfBlob = await generateHistorialPDF(reporte.datos, options);
        await shareHistorialPDF(pdfBlob, options.title);

        // Cerrar modal después de éxito
        modal.remove();
    } catch (error) {
        console.error('Error compartiendo PDF del historial:', error);
        showNotification('Error al compartir PDF: ' + error.message, 'error');

        // Restaurar vista
        showHistorialProgress(false);
    }
}

function getHistorialExportOptions() {
    return {
        resumen: document.getElementById('historial-opt-resumen')?.checked ?? true,
        salon: document.getElementById('historial-opt-salon')?.checked ?? true,
        cocina: document.getElementById('historial-opt-cocina')?.checked ?? true,
        agregos: document.getElementById('historial-opt-agregos')?.checked ?? true,
        financiero: document.getElementById('historial-opt-financiero')?.checked ?? true,
        transferencias: document.getElementById('historial-opt-transferencias')?.checked ?? true,
        billetes: document.getElementById('historial-opt-billetes')?.checked ?? true,
        title: document.getElementById('historial-pdf-title')?.value || 'Reporte Histórico'
    };
}

function showHistorialProgress(show) {
    const optionsEl = document.getElementById('historial-pdf-options');
    const actionsEl = document.getElementById('historial-export-actions');
    const progressEl = document.getElementById('historial-pdf-progress');

    if (optionsEl) optionsEl.style.display = show ? 'none' : 'block';
    if (actionsEl) actionsEl.style.display = show ? 'none' : 'block';
    if (progressEl) progressEl.style.display = show ? 'block' : 'none';
}

function updateHistorialProgress(percent, message) {
    const progressFill = document.getElementById('historial-progress-fill');
    const progressText = document.getElementById('historial-progress-text');

    if (progressFill) {
        progressFill.style.width = percent + '%';
    }

    if (progressText) {
        progressText.textContent = message;
    }
}

// ========== FUNCIONES DE EXPORTACIÓN ==========

// 1. Descargar PDF (con apertura automática)
async function downloadHistorialPDF(pdfBlob, title) {
    updateHistorialProgress(95, 'Preparando PDF...');

    if (isCapacitor && filesystem) {
        // En Capacitor: Guardar y abrir
        try {
            const base64Data = await blobToBase64(pdfBlob);
            const fileName = `${title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;

            // Guardar en Documents
            await filesystem.writeFile({
                path: fileName,
                data: base64Data,
                directory: Directory.Documents,
                recursive: true
            });

            // Obtener URI para abrir
            const uriResult = await filesystem.getUri({
                path: fileName,
                directory: Directory.Documents
            });

            showNotification('PDF generado correctamente', 'success');

            // Intentar abrir el PDF
            setTimeout(() => {
                window.open(uriResult.uri, '_system');
            }, 500);

        } catch (error) {
            console.error('Error guardando con Capacitor:', error);
            // Fallback: descarga normal
            fallbackHistorialDownload(pdfBlob, title, true);
        }
    } else {
        // Navegador: descarga normal
        fallbackHistorialDownload(pdfBlob, title, true);
    }
}

// 2. Compartir PDF
async function shareHistorialPDF(pdfBlob, title) {
    if (!isCapacitor || !share) {
        showNotification('Función de compartir no disponible', 'error');
        return;
    }

    updateHistorialProgress(95, 'Preparando para compartir...');

    try {
        const base64Data = await blobToBase64(pdfBlob);
        const fileName = `${title.replace(/[^a-z0-9]/gi, '_')}.pdf`;

        // Guardar temporalmente en caché
        await filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache,
            recursive: true
        });

        // Obtener URI
        const uriResult = await filesystem.getUri({
            path: fileName,
            directory: Directory.Cache
        });

        // Compartir
        await share.share({
            title: title,
            text: 'Reporte histórico Gestor IPV',
            url: uriResult.uri,
            dialogTitle: 'Compartir PDF'
        });

        showNotification('PDF listo para compartir', 'success');

    } catch (error) {
        console.error('Error compartiendo:', error);
        showNotification('Error al compartir: ' + error.message, 'error');
    }
}

// Fallback para descarga en navegador
function fallbackHistorialDownload(pdfBlob, title, openAfter = false) {
    const url = URL.createObjectURL(pdfBlob);

    if (openAfter) {
        // Abrir en nueva pestaña
        window.open(url, '_blank');
        showNotification('PDF abierto en nueva pestaña', 'success');
    } else {
        // Descargar
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification('PDF descargado correctamente', 'success');
    }

    // Liberar memoria después de un tiempo
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// Convertir Blob a Base64
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// ========== CARGAR LIBRERÍAS ==========

// Cargar librerías cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function () {
    loadPDFLibraries().then(() => {
        console.log("Librerías PDF cargadas para historial");
    });
});

async function loadPDFLibraries() {
    // Cargar jsPDF
    if (typeof window.jspdf === 'undefined') {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    }

    // Cargar jsPDF AutoTable
    if (typeof window.jspdfAutoTable === 'undefined') {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js');
    }
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Función global para ser llamada desde historial.js
window.generatePDFWithData = async function (reportData, title) {
    // Cargar librerías si no están cargadas
    await loadPDFLibraries();

    const options = {
        resumen: true,
        salon: true,
        cocina: true,
        agregos: true,
        financiero: true,
        transferencias: true,
        billetes: true,
        title: title
    };

    const pdfBlob = await generateHistorialPDF(reportData, options);
    await downloadHistorialPDF(pdfBlob, title);
};
function obtenerGanancias() {
    // Intentar obtener de gananciasManager
    if (window.gananciasManager && window.gananciasManager.calcularGanancias) {
        const datosGanancias = window.gananciasManager.calcularGanancias();
        if (datosGanancias && datosGanancias.gananciaNeta) {
            return datosGanancias.gananciaNeta;
        }
    }
    return 0;
}


// ========== GENERACIÓN DEL PDF PARA HISTORIAL ==========
async function generateHistorialPDF(reportData, options) {
    updateHistorialProgress(20, 'Recopilando datos del historial...');

    updateHistorialProgress(40, 'Creando documento histórico...');

    // Crear nuevo documento PDF usando jsPDF global
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    let currentY = 20;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;
    const contentWidth = pageWidth - (margin * 2);

    // ========== PÁGINA 1: PORTADA ==========
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(options.title, pageWidth / 2, 40, { align: 'center' });

    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text('Reporte Histórico - Gestor IPV', pageWidth / 2, 55, { align: 'center' });

    const fechaReporte = new Date(window.historialIPV.reporteSeleccionado.timestamp);

    doc.setFontSize(14);
    doc.text(`Fecha original: ${fechaReporte.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })}`, pageWidth / 2, 70, { align: 'center' });

    doc.text(`Hora original: ${window.historialIPV.reporteSeleccionado.hora}`, pageWidth / 2, 80, { align: 'center' });

    doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })}`, pageWidth / 2, 90, { align: 'center' });

    doc.text(`Hora de generación: ${new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    })}`, pageWidth / 2, 100, { align: 'center' });

    // Línea decorativa
    doc.setDrawColor(155, 89, 182);
    doc.setLineWidth(0.5);
    doc.line(margin, 110, pageWidth - margin, 110);

    doc.setFontSize(12);
    doc.text('Sistema de Gestión IPV - Historial', pageWidth / 2, 120, { align: 'center' });

    updateHistorialProgress(60, 'Agregando resumen histórico...');

    // ========== PÁGINA 2: RESUMEN GENERAL ==========
    if (options.resumen) {
        doc.addPage();
        currentY = margin;

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('RESUMEN GENERAL HISTÓRICO', margin, currentY);
        currentY += 10;

        // Datos del resumen en tabla
        const summaryData = [
            ['Ventas Salón:', `$${reportData.ventas.ventasSalon.toFixed(0)}`],
            ['Ventas Cocina:', `$${reportData.ventas.ventasCocina.toFixed(0)}`],
            ['Total Ventas:', `$${reportData.ventas.ventasTotales.toFixed(0)}`],
            ['', ''],
            ['Consumo:', `$${reportData.financiero.consumoTotal.toFixed(0)}`],
            ['Extracciones:', `$${reportData.financiero.extraccionesTotal.toFixed(0)}`],
            ['Transferencias:', `$${reportData.financiero.transferenciasTotal.toFixed(0)}`],
            ['Efectivo:', `$${reportData.financiero.efectivoTotal.toFixed(0)}`],
            ['Dinero Real:', `$${reportData.ventas.dineroReal.toFixed(0)}`],
            ['', ''],
            ['Diferencia:', `$${reportData.ventas.diferencia.toFixed(0)}`],
            ['1% de Ventas:', `$${reportData.ventas.porciento.toFixed(0)}`],
            ['', ''], // Línea en blanco
            ['Ganancias del Día:', `$${obtenerGanancias().toFixed(0)}`]
        ];

        // Usar autoTable globalmente
        doc.autoTable({
            startY: currentY,
            head: [['Concepto', 'Monto']],
            body: summaryData,
            theme: 'grid',
            headStyles: {
                fillColor: [155, 89, 182],
                textColor: [255, 255, 255],
                fontSize: 11,
                fontStyle: 'bold'
            },
            bodyStyles: {
                fontSize: 11,
                cellPadding: 4
            },
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            columnStyles: {
                0: { cellWidth: contentWidth * 0.6 },
                1: { cellWidth: contentWidth * 0.4, halign: 'right' }
            },
            didParseCell: function (data) {
                // Resaltar filas importantes
                if (data.row.index === 2 || data.row.index === 8 || data.row.index === 10) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = [155, 89, 182];
                }

                if (data.row.index === 11) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = [40, 167, 69];
                }
                if (data.row.index === 13) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = [255, 153, 0]; // Color naranja
                }
            }
        });

        currentY = doc.lastAutoTable.finalY + 10;
    }

    updateHistorialProgress(70, 'Agregando productos salón...');

    // ========== PÁGINA 3: PRODUCTOS SALÓN ==========
    if (options.salon && reportData.productos.salon.length > 0) {
        doc.addPage();
        currentY = margin;

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('INVENTARIO SALÓN HISTÓRICO', margin, currentY);
        currentY += 10;

        // Tabla de productos salón ajustada
        const salonTableData = reportData.productos.salon.map(producto => [
            producto.nombre,
            `$${producto.precio.toFixed(0)}`,
            producto.inicio.toString(),
            producto.entrada.toString(),
            producto.venta.toString(),
            producto.final.toString(),
            producto.vendido.toString(),
            `$${producto.importe.toFixed(0)}`
        ]);

        doc.autoTable({
            startY: currentY,
            head: [['Producto', 'Precio', 'Inicio', 'Entrada', 'Venta', 'Final', 'Vendido', 'Importe']],
            body: salonTableData,
            theme: 'grid',
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: [255, 255, 255],
                fontSize: 9,
                fontStyle: 'bold'
            },
            bodyStyles: {
                fontSize: 10,
                cellPadding: 2
            },
            margin: { left: 10, right: 10 },
            tableWidth: contentWidth,
            styles: {
                overflow: 'linebreak',
                cellWidth: 'wrap'
            },
            columnStyles: {
                0: { cellWidth: 40 },
                1: { cellWidth: 20 },
                2: { cellWidth: 20 },
                3: { cellWidth: 20 },
                4: { cellWidth: 20 },
                5: { cellWidth: 20 },
                6: { cellWidth: 20 },
                7: { cellWidth: 30, halign: 'right' }
            },
            didParseCell: function (data) {
                // Resaltar totales en columna Importe
                if (data.column.index === 7 && data.cell.raw !== 'Importe') {
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });

        // Totales al final
        currentY = doc.lastAutoTable.finalY + 8;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total Productos: ${reportData.productos.salon.length}`, 10, currentY);
        doc.text(`Total Vendido: $${reportData.ventas.ventasSalon.toFixed(0)}`, pageWidth - 10, currentY, { align: 'right' });
    }

    updateHistorialProgress(80, 'Agregando productos cocina...');

    // ========== PÁGINA 4: PRODUCTOS COCINA ==========
    if (options.cocina && reportData.productos.cocina.length > 0) {
        doc.addPage();
        currentY = margin;

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('INVENTARIO COCINA HISTÓRICO', margin, currentY);
        currentY += 10;

        // Tabla de productos cocina ajustada
        const cocinaTableData = reportData.productos.cocina.map(producto => [
            producto.nombre,
            producto.precio === 0 ? 'Ingrediente' : `$${producto.precio.toFixed(0)}`,
            producto.inicio.toString(),
            producto.entrada.toString(),
            producto.venta.toString(),
            producto.final.toString(),
            producto.vendido.toString(),
            `$${producto.importe.toFixed(0)}`
        ]);

        doc.autoTable({
            startY: currentY,
            head: [['Producto', 'Precio', 'Inicio', 'Entrada', 'Venta', 'Final', 'Vendido', 'Importe']],
            body: cocinaTableData,
            theme: 'grid',
            headStyles: {
                fillColor: [230, 126, 34],
                textColor: [255, 255, 255],
                fontSize: 9,
                fontStyle: 'bold'
            },
            bodyStyles: {
                fontSize: 10,
                cellPadding: 2
            },
            margin: { left: 10, right: 10 },
            tableWidth: contentWidth,
            columnStyles: {
                0: { cellWidth: 40 },
                1: { cellWidth: 25 },
                2: { cellWidth: 20 },
                3: { cellWidth: 20 },
                4: { cellWidth: 20 },
                5: { cellWidth: 20 },
                6: { cellWidth: 20 },
                7: { cellWidth: 25, halign: 'right' }
            }
        });

        // Totales al final
        currentY = doc.lastAutoTable.finalY + 8;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total Productos: ${reportData.productos.cocina.length}`, 10, currentY);
        doc.text(`Total Importe: $${reportData.ventas.ventasCocinaProductos.toFixed(0)}`, pageWidth - 10, currentY, { align: 'right' });
    }

    updateHistorialProgress(85, 'Agregando agregos...');

    // ========== PÁGINA 5: AGREGOS Y PRODUCTOS COMPUESTOS ==========
    if (options.agregos && reportData.productos.agregos.length > 0) {
        doc.addPage();
        currentY = margin;

        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(155, 89, 182);
        doc.text('AGREGOS Y PRODUCTOS COMPUESTOS HISTÓRICOS', pageWidth / 2, currentY, { align: 'center' });

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Registro histórico de productos especiales', pageWidth / 2, currentY + 8, { align: 'center' });

        currentY += 20;

        // Resumen inicial
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('RESUMEN', margin, currentY);

        currentY += 8;

        doc.setFont('helvetica', 'normal');
        const summaryInfo = [
            `Total de Agregos: ${reportData.productos.agregos.length}`,
            `Monto Total: $${reportData.ventas.agregosTotal.toLocaleString('es-ES')}`,
            `Fecha: ${new Date(fechaReporte).toLocaleDateString('es-ES')}`
        ];

        summaryInfo.forEach((info, index) => {
            doc.text(info, margin + (index * 60), currentY);
        });

        currentY += 15;

        // Tabla de agregos
        let isFirstPage = true;

        reportData.productos.agregos.forEach((agrego, index) => {
            if (currentY > 240) {
                doc.addPage();
                currentY = margin;
                isFirstPage = false;
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(155, 89, 182);
                doc.text('AGREGOS Y PRODUCTOS COMPUESTOS (Continuación)', pageWidth / 2, currentY, { align: 'center' });
                currentY += 15;
            }

            // Información del agrego
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(`${index + 1}. ${agrego.nombre}`, margin + 5, currentY);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Cantidad: ${agrego.cantidad}`, pageWidth - margin - 40, currentY);
            currentY += 8;

            // Ingredientes
            if (agrego.ingredientes && agrego.ingredientes.length > 0) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('Ingredientes:', margin + 5, currentY);
                currentY += 5;
                doc.setFont('helvetica', 'normal');
                agrego.ingredientes.forEach(ingrediente => {
                    doc.text(`• ${ingrediente.nombre}: ${ingrediente.cantidadTotal} ${ingrediente.unidad || 'unidades'}`, margin + 10, currentY);
                    currentY += 5;
                });
            }

            // Información financiera
            doc.setFont('helvetica', 'bold');
            doc.text('Precio unitario:', margin + 5, currentY);
            doc.setFont('helvetica', 'normal');
            doc.text(`$${agrego.precio.toLocaleString('es-ES')}`, margin + 50, currentY);
            currentY += 5;

            doc.setFont('helvetica', 'bold');
            doc.text('Monto total:', margin + 5, currentY);
            doc.setFont('helvetica', 'normal');
            doc.text(`$${agrego.montoTotal.toLocaleString('es-ES')}`, margin + 50, currentY);
            currentY += 10;

            // Línea separadora
            if (index < reportData.productos.agregos.length - 1) {
                doc.setDrawColor(200, 200, 200);
                doc.line(margin, currentY, pageWidth - margin, currentY);
                currentY += 15;
            }
        });

        // Resumen final
        currentY += 10;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(155, 89, 182);
        doc.text('RESUMEN FINAL DE COCINA HISTÓRICO', margin, currentY);
        currentY += 10;

        const totalGeneralCocina = reportData.ventas.ventasCocinaProductos + reportData.ventas.agregosTotal;
        const resumenData = [
            ['Productos básicos de cocina:', `$${reportData.ventas.ventasCocinaProductos.toLocaleString('es-ES')}`],
            ['Agregos y productos compuestos:', `$${reportData.ventas.agregosTotal.toLocaleString('es-ES')}`],
            ['TOTAL GENERAL COCINA:', `$${totalGeneralCocina.toLocaleString('es-ES')}`]
        ];

        doc.autoTable({
            startY: currentY,
            head: [['Concepto', 'Valor']],
            body: resumenData,
            theme: 'grid',
            headStyles: {
                fillColor: [230, 126, 34],
                textColor: [255, 255, 255],
                fontSize: 10,
                fontStyle: 'bold'
            },
            bodyStyles: {
                fontSize: 11,
                cellPadding: 4
            },
            margin: { left: margin, right: margin },
            tableWidth: contentWidth * 0.8,
            columnStyles: {
                0: { cellWidth: contentWidth * 0.8 * 0.7, fontStyle: 'bold' },
                1: {
                    cellWidth: contentWidth * 0.8 * 0.3,
                    halign: 'right',
                    fontStyle: 'bold'
                }
            },
            didParseCell: function (data) {
                if (data.row.index === 2) {
                    data.cell.styles.fillColor = [255, 248, 230];
                    data.cell.styles.textColor = [230, 126, 34];
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fontSize = 12;
                }
            }
        });
    }

    updateHistorialProgress(90, 'Agregando registros financieros...');

    // ========== PÁGINA 6: REGISTROS FINANCIEROS ==========
    if (options.financiero) {
        doc.addPage();
        currentY = margin;

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('REGISTROS FINANCIEROS HISTÓRICOS', margin, currentY);
        currentY += 10;

        // Consumo
        if (reportData.financiero.consumo.length > 0) {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('CONSUMO', margin, currentY);
            currentY += 8;

            const consumoTableData = reportData.financiero.consumo.map(registro => [
                registro.descripcion,
                `$${registro.monto.toFixed(0)}`
            ]);

            doc.autoTable({
                startY: currentY,
                head: [['Descripción', 'Monto']],
                body: consumoTableData,
                theme: 'grid',
                headStyles: {
                    fillColor: [108, 117, 125],
                    textColor: [255, 255, 255],
                    fontSize: 9,
                    fontStyle: 'bold'
                },
                bodyStyles: {
                    fontSize: 9,
                    cellPadding: 3
                },
                margin: { left: margin, right: margin },
                tableWidth: contentWidth
            });

            currentY = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(`Total Consumo: $${reportData.financiero.consumoTotal.toFixed(0)}`, pageWidth - margin, currentY, { align: 'right' });
            currentY += 10;
        }

        // Extracciones
        if (reportData.financiero.extracciones.length > 0) {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('EXTRACCIONES', margin, currentY);
            currentY += 8;

            const extraccionesTableData = reportData.financiero.extracciones.map(registro => [
                registro.descripcion,
                `$${registro.monto.toFixed(0)}`
            ]);

            doc.autoTable({
                startY: currentY,
                head: [['Descripción', 'Monto']],
                body: extraccionesTableData,
                theme: 'grid',
                headStyles: {
                    fillColor: [255, 193, 7],
                    textColor: [0, 0, 0],
                    fontSize: 9,
                    fontStyle: 'bold'
                },
                bodyStyles: {
                    fontSize: 9,
                    cellPadding: 3
                },
                margin: { left: margin, right: margin },
                tableWidth: contentWidth
            });

            currentY = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(`Total Extracciones: $${reportData.financiero.extraccionesTotal.toFixed(0)}`, pageWidth - margin, currentY, { align: 'right' });
            currentY += 10;
        }

        // Transferencias
        if (options.transferencias && reportData.financiero.transferencias.length > 0) {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('TRANSFERENCIAS', margin, currentY);
            currentY += 8;

            const transferenciasTableData = reportData.financiero.transferencias.map(registro => [
                registro.notas || 'Transferencia bancaria',
                `$${registro.monto.toFixed(0)}`
            ]);

            doc.autoTable({
                startY: currentY,
                head: [['Descripción', 'Monto']],
                body: transferenciasTableData,
                theme: 'grid',
                headStyles: {
                    fillColor: [40, 167, 69],
                    textColor: [255, 255, 255],
                    fontSize: 9,
                    fontStyle: 'bold'
                },
                bodyStyles: {
                    fontSize: 9,
                    cellPadding: 3
                },
                margin: { left: margin, right: margin },
                tableWidth: contentWidth
            });

            currentY = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(`Total Transferencias: $${reportData.financiero.transferenciasTotal.toFixed(0)}`, pageWidth - margin, currentY, { align: 'right' });
        }
    }

    updateHistorialProgress(95, 'Agregando conteo de billetes...');

    // ========== PÁGINA 7: CONTEO DE BILLETES ==========
    if (options.billetes && reportData.billetes.registros.length > 0) {
        doc.addPage();
        currentY = margin;

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('CONTEO DE BILLETES HISTÓRICO', margin, currentY);
        currentY += 10;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Registros del día: ${reportData.billetes.registros.length}`, margin, currentY);
        currentY += 8;

        // Mostrar cada registro
        reportData.billetes.registros.forEach((registro, index) => {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(`Registro ${index + 1} - ${registro.hora}`, margin, currentY);
            currentY += 6;

            let destinoTexto = '';
            switch (registro.destino) {
                case 'extraccion':
                    destinoTexto = '(Extracción)';
                    break;
                case 'efectivo':
                    destinoTexto = '(Efectivo)';
                    break;
                default:
                    destinoTexto = '(Registro)';
            }

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(destinoTexto, margin + 50, currentY - 6);
            currentY += 5;

            // Billetes CUP
            const billetesCUPData = [];
            Object.entries(registro.billetesCUP || {})
                .sort((a, b) => b[0] - a[0])
                .forEach(([valor, cantidad]) => {
                    if (cantidad > 0) {
                        const total = cantidad * parseInt(valor);
                        billetesCUPData.push([
                            `$${valor} CUP`,
                            cantidad.toString(),
                            `$${total.toLocaleString('es-ES')}`
                        ]);
                    }
                });

            if (billetesCUPData.length > 0) {
                doc.autoTable({
                    startY: currentY,
                    head: [['Denominación', 'Cantidad', 'Total']],
                    body: billetesCUPData,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [52, 152, 219],
                        textColor: [255, 255, 255],
                        fontSize: 8,
                        fontStyle: 'bold'
                    },
                    bodyStyles: {
                        fontSize: 8,
                        cellPadding: 2
                    },
                    margin: { left: margin, right: margin },
                    tableWidth: contentWidth * 0.8
                });

                currentY = doc.lastAutoTable.finalY + 5;
            }

            // Billetes USD
            const billetesUSDData = [];
            Object.entries(registro.billetesUSD || {})
                .sort((a, b) => b[0] - a[0])
                .forEach(([valor, cantidad]) => {
                    if (cantidad > 0) {
                        const totalUSD = cantidad * parseInt(valor);
                        const tasa = registro.tasasUSD?.[valor] || 400;
                        const totalCUP = totalUSD * tasa;
                        billetesUSDData.push([
                            `$${valor} USD`,
                            cantidad.toString(),
                            `${tasa} CUP`,
                            `$${totalCUP.toLocaleString('es-ES')} CUP`
                        ]);
                    }
                });

            if (billetesUSDData.length > 0) {
                doc.autoTable({
                    startY: currentY,
                    head: [['Denominación', 'Cantidad', 'Tasa', 'Total en CUP']],
                    body: billetesUSDData,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [155, 89, 182],
                        textColor: [255, 255, 255],
                        fontSize: 8,
                        fontStyle: 'bold'
                    },
                    bodyStyles: {
                        fontSize: 8,
                        cellPadding: 2
                    },
                    margin: { left: margin, right: margin },
                    tableWidth: contentWidth * 0.9
                });

                currentY = doc.lastAutoTable.finalY + 5;
            }

            // Resumen del registro
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('Resumen del registro:', margin, currentY);
            currentY += 6;

            doc.setFont('helvetica', 'normal');
            doc.text(`Total CUP: $${registro.totales.totalCUP.toLocaleString('es-ES')} CUP`, margin + 10, currentY);
            currentY += 5;

            doc.text(`Total USD en CUP: $${registro.totales.totalUSDCUP.toLocaleString('es-ES')} CUP`, margin + 10, currentY);
            currentY += 5;

            doc.setFont('helvetica', 'bold');
            doc.text(`Gran Total: $${registro.totales.granTotal.toLocaleString('es-ES')} CUP`, margin + 10, currentY);
            currentY += 10;

            if (index < reportData.billetes.registros.length - 1) {
                doc.setDrawColor(200, 200, 200);
                doc.line(margin, currentY, pageWidth - margin, currentY);
                currentY += 10;
            }

            if (currentY > 250) {
                doc.addPage();
                currentY = margin;
            }
        });
    }

    updateHistorialProgress(98, 'Finalizando documento histórico...');

    // ========== PÁGINA FINAL: FIRMAS ==========
    doc.addPage();
    currentY = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('CONTROL Y FIRMAS', pageWidth / 2, currentY, { align: 'center' });

    currentY += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'italic');
    doc.text('(Datos históricos - Para fines de consulta y archivo)', pageWidth / 2, currentY, { align: 'center' });

    currentY += 20;

    // Firma Administrador
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ADMINISTRADOR / RESPONSABLE:', margin, currentY);
    currentY += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Nombre:', margin, currentY);
    doc.line(margin + 25, currentY + 2, margin + 100, currentY + 2);

    doc.text('Firma:', margin + 110, currentY);
    doc.line(margin + 130, currentY + 2, pageWidth - margin, currentY + 2);
    currentY += 20;

    // Turno Saliente
    doc.setFont('helvetica', 'bold');
    doc.text('TURNO SALIENTE HISTÓRICO:', margin, currentY);
    currentY += 7;

    doc.setFont('helvetica', 'normal');
    doc.text('Nombre:', margin, currentY);
    doc.line(margin + 25, currentY + 2, margin + 100, currentY + 2);

    doc.text('Firma:', margin + 110, currentY);
    doc.line(margin + 130, currentY + 2, pageWidth - margin, currentY + 2);
    currentY += 20;

    // Turno Entrante
    doc.setFont('helvetica', 'bold');
    doc.text('TURNO ENTRANTE HISTÓRICO:', margin, currentY);
    currentY += 7;

    doc.setFont('helvetica', 'normal');
    doc.text('Nombre:', margin, currentY);
    doc.line(margin + 25, currentY + 2, margin + 100, currentY + 2);

    doc.text('Firma:', margin + 110, currentY);
    doc.line(margin + 130, currentY + 2, pageWidth - margin, currentY + 2);
    currentY += 30;

    // Observaciones
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVACIONES:', margin, currentY);
    currentY += 10;

    doc.setFont('helvetica', 'normal');
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    const obsHeight = 60;
    doc.rect(margin, currentY, contentWidth, obsHeight);

    for (let i = 1; i <= 5; i++) {
        doc.line(margin, currentY + (i * 10), pageWidth - margin, currentY + (i * 10));
    }

    // Número de páginas
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin - 25, doc.internal.pageSize.height - 10);
        doc.text(`IPV - Historial - ${new Date().getFullYear()}`, margin, doc.internal.pageSize.height - 10);
    }

    updateHistorialProgress(100, 'Generando PDF histórico...');

    // Convertir PDF a Blob
    const pdfBlob = doc.output('blob');
    return pdfBlob;
}

function showNotification(message, type = 'info') {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            border-radius: 5px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease;
        `;

        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span style="margin-left: 10px;">${message}</span>
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
    }
}

// Agregar estilos CSS para el modal de historial
const styleNoti = document.createElement('style');
styleNoti.textContent = `
    .historial-pdf-export .action-buttons {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 10px;
    }
    
    .historial-pdf-export .btn-action {
        flex: 1;
        min-width: 120px;
        padding: 12px;
        background: var(--primary-color);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.3s ease;
    }
    
    .historial-pdf-export .btn-action:hover {
        background: var(--secondary-color);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    .historial-pdf-export .btn-action i {
        font-size: 1.1rem;
    }
    
    .historial-pdf-export .option-checkbox {
        display: flex;
        align-items: center;
        margin: 8px 0;
        padding: 8px;
        border-radius: 5px;
        transition: background 0.3s;
    }
    
    .historial-pdf-export .option-checkbox:hover {
        background: #f8f9fa;
    }
    
    .historial-pdf-export .option-checkbox input[type="checkbox"] {
        margin-right: 10px;
        width: 18px;
        height: 18px;
        cursor: pointer;
    }
    
    .historial-pdf-export .option-checkbox label {
        cursor: pointer;
        font-weight: 500;
        color: var(--dark-color);
    }
    
    .historial-pdf-export .pdf-progress {
        padding: 20px;
        text-align: center;
    }
    
    .historial-pdf-export .progress-bar {
        width: 100%;
        height: 10px;
        background: #e0e0e0;
        border-radius: 5px;
        overflow: hidden;
        margin: 20px 0;
    }
    
    .historial-pdf-export .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #9b59b6, #8e44ad);
        border-radius: 5px;
        transition: width 0.3s ease;
    }
    
    .historial-pdf-export .progress-text {
        color: var(--gray-dark);
        font-size: 0.95rem;
        margin-top: 10px;
    }
    
    .historial-pdf-export .reporte-info {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 20px;
        border-left: 4px solid #9b59b6;
    }
    
    .historial-pdf-export .reporte-info h4 {
        margin-top: 0;
        margin-bottom: 15px;
        color: #9b59b6;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .historial-pdf-export .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 10px;
    }
    
    .historial-pdf-export .info-item {
        display: flex;
        flex-direction: column;
    }
    
    .historial-pdf-export .info-label {
        font-size: 0.85rem;
        color: #6c757d;
        font-weight: 500;
    }
    
    .historial-pdf-export .info-value {
        font-weight: 500;
        font-size: 1rem;
    }
    
    .historial-pdf-export .info-value.amount {
        color: #28a745;
        font-weight: bold;
    }
`;
document.head.appendChild(styleNoti);