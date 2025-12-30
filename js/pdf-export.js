// pdf-export.js - Sistema de exportación a PDF para IPV (Versión Corregida y Mejorada)
document.addEventListener('DOMContentLoaded', function () {
    const exportPdfBtn = document.getElementById('export-pdf-btn');

    if (!exportPdfBtn) return;

    // Cargar librerías CDN
    loadPDFLibraries().then(() => {
        exportPdfBtn.addEventListener('click', function () {
            showPDFOptionsModal();
        });
    });

    async function loadPDFLibraries() {
        // Cargar jsPDF
        if (typeof window.jspdf === 'undefined') {
            await loadScript('./js/jspdf/jspdf.umd.min.js');
        }

        // Cargar jsPDF AutoTable
        if (typeof window.jspdfAutoTable === 'undefined') {
            await loadScript('./js/jspdf/jspdf.plugin.autotable.min.js');
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

    function showPDFOptionsModal() {
        const modalHtml = `
    <div class="modal active pdf-export-modal">
        <div class="modal-overlay"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-file-pdf"></i> Exportar a PDF</h3>
                <div class="modal-header-actions">
                    <button class="modal-close">&times;</button>
                </div>
            </div>
            <div class="modal-body">
                <div class="pdf-progress" style="display: none;" id="pdf-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress-fill"></div>
                    </div>
                    <div class="progress-text" id="progress-text">Preparando datos...</div>
                </div>
                
                <div class="pdf-options" id="pdf-options">
                    <p><i class="fas fa-info-circle"></i> Selecciona las secciones a incluir en el reporte:</p>
                    
                    <div class="option-checkbox">
                        <input type="checkbox" id="opt-resumen" checked>
                        <label for="opt-resumen">Resumen General</label>
                    </div>
                    
                    <div class="option-checkbox">
                        <input type="checkbox" id="opt-salon" checked>
                        <label for="opt-salon">Productos Salón</label>
                    </div>
                    
                    <div class="option-checkbox">
                        <input type="checkbox" id="opt-cocina" checked>
                        <label for="opt-cocina">Productos Cocina</label>
                    </div>
                    
                    <div class="option-checkbox">
                        <input type="checkbox" id="opt-agregos" checked>
                        <label for="opt-agregos">Agregos y Productos Compuestos</label>
                    </div>
                    
                    <div class="option-checkbox">
                        <input type="checkbox" id="opt-financiero" checked>
                        <label for="opt-financiero">Registros Financieros</label>
                    </div>
                    
                    <div class="option-checkbox">
                        <input type="checkbox" id="opt-transferencias" checked>
                        <label for="opt-transferencias">Transferencias</label>
                    </div>
                    
                    <div class="option-checkbox">
                        <input type="checkbox" id="opt-billetes" checked>
                        <label for="opt-billetes">Conteo de Billetes</label>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="pdf-title">
                        <i class="fas fa-heading"></i> Título del Reporte
                    </label>
                    <input type="text" id="pdf-title" class="form-input" 
                           value="Reporte IPV - ${new Date().toLocaleDateString('es-ES')}">
                </div>

                <!-- SECCIÓN MEJORADA: FIRMAS Y RESPONSABLES -->
                <div class="form-section" style="margin-top: 25px; border-top: 1px solid #eee; padding-top: 20px;">
                    <h4 style="margin-bottom: 20px; color: var(--primary-color);">
                        <i class="fas fa-signature"></i> Firmas y Responsables
                    </h4>
                    
                    <div class="form-group">
                        <label for="firma-administrador">
                            <i class="fas fa-user-tie"></i> Administrador / Responsable
                        </label>
                        <input type="text" id="firma-administrador" class="form-input" 
                               placeholder="Nombre del administrador/responsable">
                    </div>
                    
                    <div class="form-group">
                        <label for="firma-turno-saliente">
                            <i class="fas fa-sign-out-alt"></i> Turno Saliente
                        </label>
                        <input type="text" id="firma-turno-saliente" class="form-input" 
                               placeholder="Nombre del turno saliente">
                    </div>
                    
                    <div class="form-group">
                        <label for="firma-turno-entrante">
                            <i class="fas fa-sign-in-alt"></i> Turno Entrante
                        </label>
                        <input type="text" id="firma-turno-entrante" class="form-input" 
                               placeholder="Nombre del turno entrante">
                    </div>
                </div>

                <div class="export-actions" id="export-actions" style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                    <p><i class="fas fa-save"></i> Opciones de exportación:</p>
                    
                    <div class="action-buttons">
                        <button class="btn-action" id="pdf-generate">
                            <i class="fas fa-download"></i> Generar y Descargar PDF
                        </button>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" id="pdf-cancel">
                    Cancelar
                </button>
            </div>
        </div>
    </div>
`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.querySelector('.pdf-export-modal');
        const cancelBtn = document.getElementById('pdf-cancel');
        const generateBtn = document.getElementById('pdf-generate');
        const closeBtn = modal.querySelector('.modal-close');

        function closeModal() {
            modal.remove();
        }

        closeBtn.addEventListener('click', closeModal);
        modal.querySelector('.modal-overlay').addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);

        generateBtn.addEventListener('click', async function () {
            const options = {
                resumen: document.getElementById('opt-resumen').checked,
                salon: document.getElementById('opt-salon').checked,
                cocina: document.getElementById('opt-cocina').checked,
                agregos: document.getElementById('opt-agregos').checked,
                financiero: document.getElementById('opt-financiero').checked,
                transferencias: document.getElementById('opt-transferencias').checked,
                billetes: document.getElementById('opt-billetes').checked,
                title: document.getElementById('pdf-title').value || `Reporte IPV - ${new Date().toLocaleDateString('es-ES')}`,
                // Nuevos campos para firmas
                firmaAdministrador: document.getElementById('firma-administrador').value || '',
                firmaTurnoSaliente: document.getElementById('firma-turno-saliente').value || '',
                firmaTurnoEntrante: document.getElementById('firma-turno-entrante').value || ''
            };

            // Validar que al menos una sección esté seleccionada
            if (!options.resumen && !options.salon && !options.cocina && !options.agregos && 
                !options.financiero && !options.transferencias && !options.billetes) {
                showNotification('Selecciona al menos una sección para exportar', 'error');
                return;
            }

            // Mostrar progreso
            document.getElementById('pdf-options').style.display = 'none';
            document.getElementById('pdf-progress').style.display = 'block';

            try {
                await generatePDF(options);
                closeModal();
            } catch (error) {
                console.error('Error generando PDF:', error);
                showNotification('Error al generar el PDF: ' + error.message, 'error');

                // Restaurar vista
                document.getElementById('pdf-options').style.display = 'block';
                document.getElementById('pdf-progress').style.display = 'none';
            }
        });

        updateProgress(10, 'Preparando datos...');
    }

    function updateProgress(percent, message) {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');

        if (progressFill) {
            progressFill.style.width = percent + '%';
        }

        if (progressText) {
            progressText.textContent = message;
        }
    }

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

    async function generatePDF(options) {
        updateProgress(20, 'Recopilando datos...');

        // Recopilar todos los datos necesarios
        const reportData = await collectReportData();

        updateProgress(40, 'Creando documento...');

        // Crear nuevo documento PDF
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
        doc.text('Reporte Diario - Gestor IPV', pageWidth / 2, 55, { align: 'center' });

        doc.setFontSize(14);
        doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}`, pageWidth / 2, 70, { align: 'center' });

        doc.text(`Hora de generación: ${new Date().toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        })}`, pageWidth / 2, 80, { align: 'center' });

        // Línea decorativa
        doc.setDrawColor(74, 108, 247);
        doc.setLineWidth(0.5);
        doc.line(margin, 90, pageWidth - margin, 90);

        doc.setFontSize(12);
        doc.text('Sistema de Gestión IPV - https://gestoripv.netlify.app', pageWidth / 2, 100, { align: 'center' });

        updateProgress(60, 'Agregando resumen...');

        // ========== PÁGINA 2: RESUMEN GENERAL ==========
        if (options.resumen) {
            doc.addPage();
            currentY = margin;

            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('RESUMEN GENERAL', margin, currentY);
            currentY += 10;

            // CORRECCIÓN: Array de summaryData con comas correctas
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
                ['', ''],
                ['Ganancias del Día:', `$${obtenerGanancias().toFixed(0)}`]
            ];

            // Validar que los datos existan antes de crear la tabla
            if (summaryData && summaryData.length > 0) {
                doc.autoTable({
                    startY: currentY,
                    head: [['Concepto', 'Monto']],
                    body: summaryData,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [74, 108, 247],
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
                            data.cell.styles.textColor = [74, 108, 247];
                        }

                        if (data.row.index === 11) { // 1% de Ventas
                            data.cell.styles.fontStyle = 'bold';
                            data.cell.styles.textColor = [40, 167, 69];
                        }
                        
                        if (data.row.index === 13) { // Ganancias del Día
                            data.cell.styles.fontStyle = 'bold';
                            data.cell.styles.textColor = [255, 153, 0];
                        }
                    }
                });

                currentY = doc.lastAutoTable.finalY + 10;
            }
        }

        updateProgress(70, 'Agregando productos salón...');

        // ========== PÁGINA 3: PRODUCTOS SALÓN ==========
        if (options.salon && reportData.productos.salon && reportData.productos.salon.length > 0) {
            doc.addPage();
            currentY = margin;

            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('INVENTARIO SALÓN', margin, currentY);
            currentY += 10;

            // Validar datos antes de crear tabla
            const salonTableData = reportData.productos.salon
                .filter(producto => producto && producto.nombre)
                .map(producto => [
                    producto.nombre || '',
                    `$${(producto.precio || 0).toFixed(0)}`,
                    (producto.inicio || 0).toString(),
                    (producto.entrada || 0).toString(),
                    (producto.venta || 0).toString(),
                    (producto.final || 0).toString(),
                    (producto.vendido || 0).toString(),
                    `$${(producto.importe || 0).toFixed(0)}`
                ]);

            if (salonTableData.length > 0) {
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
                        0: { cellWidth: 40 }, // Producto
                        1: { cellWidth: 20 }, // Precio
                        2: { cellWidth: 20 }, // Inicio
                        3: { cellWidth: 20 }, // Entrada
                        4: { cellWidth: 20 }, // Venta
                        5: { cellWidth: 20 }, // Final
                        6: { cellWidth: 20 }, // Vendido
                        7: {
                            cellWidth: 30, // Importe
                            halign: 'right'
                        }
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
        }

        updateProgress(80, 'Agregando productos cocina...');

        // ========== PÁGINA 4: PRODUCTOS COCINA ==========
        if (options.cocina && reportData.productos.cocina && reportData.productos.cocina.length > 0) {
            doc.addPage();
            currentY = margin;

            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('INVENTARIO COCINA', margin, currentY);
            currentY += 10;

            // Validar datos antes de crear tabla
            const cocinaTableData = reportData.productos.cocina
                .filter(producto => producto && producto.nombre)
                .map(producto => [
                    producto.nombre || '',
                    producto.precio === 0 ? 'Ingrediente' : `$${(producto.precio || 0).toFixed(0)}`,
                    (producto.inicio || 0).toString(),
                    (producto.entrada || 0).toString(),
                    (producto.venta || 0).toString(),
                    (producto.final || 0).toString(),
                    (producto.vendido || 0).toString(),
                    `$${(producto.importe || 0).toFixed(0)}`
                ]);

            if (cocinaTableData.length > 0) {
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
                        7: {
                            cellWidth: 25,
                            halign: 'right'
                        }
                    }
                });

                // Totales al final
                currentY = doc.lastAutoTable.finalY + 8;
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(`Total Productos: ${reportData.productos.cocina.length}`, 10, currentY);
                doc.text(`Total Importe: $${reportData.ventas.ventasCocinaProductos.toFixed(0)}`, pageWidth - 10, currentY, { align: 'right' });
            }
        }

        updateProgress(85, 'Agregando agregos...');

        // ========== PÁGINA 5: AGREGOS Y PRODUCTOS COMPUESTOS (DISEÑO MEJORADO) ==========
        if (options.agregos && reportData.productos.agregos && reportData.productos.agregos.length > 0) {
            doc.addPage();
            currentY = margin;

            // Título con estilo mejorado
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(74, 108, 247);
            doc.text('AGREGOS Y PRODUCTOS COMPUESTOS', pageWidth / 2, currentY, { align: 'center' });

            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text('Registro diario de productos especiales', pageWidth / 2, currentY + 8, { align: 'center' });

            currentY += 20;

            // Línea decorativa
            doc.setDrawColor(74, 108, 247);
            doc.setLineWidth(0.5);
            doc.line(margin, currentY, pageWidth - margin, currentY);

            currentY += 15;

            // Resumen inicial
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('RESUMEN', margin, currentY);

            currentY += 8;

            doc.setFont('helvetica', 'normal');
            const summaryInfo = [
                `Total de Agregos: ${reportData.productos.agregos.length}`,
                `Monto Total: $${reportData.ventas.agregosTotal.toLocaleString('es-ES')}`,
                `Fecha: ${new Date().toLocaleDateString('es-ES')}`
            ];

            summaryInfo.forEach((info, index) => {
                doc.text(info, margin + (index * 60), currentY);
            });

            currentY += 15;

            // Tabla de agregos mejorada
            let isFirstPage = true;

            reportData.productos.agregos.forEach((agrego, index) => {
                // Si estamos cerca del final de la página, crear nueva
                if (currentY > 240) {
                    doc.addPage();
                    currentY = margin;
                    isFirstPage = false;

                    // Repetir encabezado en páginas siguientes
                    doc.setFontSize(14);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(74, 108, 247);
                    doc.text('AGREGOS Y PRODUCTOS COMPUESTOS (Continuación)', pageWidth / 2, currentY, { align: 'center' });
                    currentY += 15;
                }

                // Card-style container para cada agrego
                doc.setDrawColor(220, 220, 220);
                doc.setLineWidth(0.3);
                doc.rect(margin, currentY, contentWidth, 45);

                // Header del card
                doc.setFillColor(240, 248, 255);
                doc.rect(margin, currentY, contentWidth, 10, 'F');

                // Número y nombre del agrego
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(74, 108, 247);
                doc.text(`${index + 1}. ${agrego.nombre}`, margin + 5, currentY + 7);

                // Información básica en el lado derecho
                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'normal');
                doc.text(`Cantidad: ${agrego.cantidad}`, pageWidth - margin - 40, currentY + 7);

                currentY += 15;

                // Detalles del agrego en dos columnas
                const columnWidth = contentWidth / 2 - 5;

                // Columna izquierda: Ingredientes
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('Ingredientes:', margin + 5, currentY);
                currentY += 5;

                doc.setFont('helvetica', 'normal');
                if (agrego.ingredientes && agrego.ingredientes.length > 0) {
                    agrego.ingredientes.forEach((ingrediente, i) => {
                        if (currentY > 240) {
                            doc.addPage();
                            currentY = margin;
                        }

                        const ingredienteText = `• ${ingrediente.nombre}: ${ingrediente.cantidadTotal} ${ingrediente.unidad || 'unidades'}`;

                        // Verificar si el texto cabe en la línea
                        const textWidth = doc.getStringUnitWidth(ingredienteText) * doc.internal.getFontSize() / doc.internal.scaleFactor;

                        if (textWidth > columnWidth - 10) {
                            // Dividir texto en múltiples líneas
                            const words = ingredienteText.split(' ');
                            let line = '';
                            let lineCount = 0;

                            for (let word of words) {
                                const testLine = line + word + ' ';
                                const testWidth = doc.getStringUnitWidth(testLine) * doc.internal.getFontSize() / doc.internal.scaleFactor;

                                if (testWidth > columnWidth - 15 && line !== '') {
                                    doc.text(line, margin + 10, currentY);
                                    currentY += 4;
                                    line = word + ' ';
                                    lineCount++;
                                } else {
                                    line = testLine;
                                }
                            }

                            if (line !== '') {
                                doc.text(line, margin + 10, currentY);
                                currentY += 4;
                            }

                            if (lineCount > 0) {
                                currentY += (lineCount * 4);
                            }
                        } else {
                            doc.text(ingredienteText, margin + 10, currentY);
                            currentY += 4;
                        }
                    });
                } else {
                    doc.text('No hay ingredientes especificados', margin + 10, currentY);
                    currentY += 4;
                }

                // Volver a la misma línea para la columna derecha
                currentY -= (4 * (agrego.ingredientes?.length || 1)) + 1;

                // Columna derecha: Información financiera
                doc.setFont('helvetica', 'bold');
                doc.text('Información:', margin + columnWidth + 15, currentY);
                currentY += 5;

                doc.setFont('helvetica', 'normal');
                doc.text(`Precio unitario: $${agrego.precio.toLocaleString('es-ES')}`, margin + columnWidth + 20, currentY);
                currentY += 4;

                doc.text(`Monto total: $${agrego.montoTotal.toLocaleString('es-ES')}`, margin + columnWidth + 20, currentY);
                currentY += 8;

                // Notas (si existen)
                if (agrego.notas) {
                    doc.setFont('helvetica', 'italic');
                    doc.setTextColor(100, 100, 100);
                    doc.text('Notas:', margin + 5, currentY);
                    currentY += 4;

                    // Manejar notas largas
                    const notesText = agrego.notas;
                    const notesWidth = doc.getStringUnitWidth(notesText) * doc.internal.getFontSize() / doc.internal.scaleFactor;

                    if (notesWidth > contentWidth - 20) {
                        // Dividir notas en múltiples líneas
                        const words = notesText.split(' ');
                        let line = '';

                        for (let word of words) {
                            const testLine = line + word + ' ';
                            const testWidth = doc.getStringUnitWidth(testLine) * doc.internal.getFontSize() / doc.internal.scaleFactor;

                            if (testWidth > contentWidth - 25 && line !== '') {
                                doc.text(`  ${line}`, margin + 10, currentY);
                                currentY += 4;
                                line = word + ' ';
                            } else {
                                line = testLine;
                            }
                        }

                        if (line !== '') {
                            doc.text(`  ${line}`, margin + 10, currentY);
                            currentY += 4;
                        }
                    } else {
                        doc.text(`  ${notesText}`, margin + 10, currentY);
                        currentY += 4;
                    }

                    doc.setTextColor(0, 0, 0);
                    doc.setFont('helvetica', 'normal');
                }

                // Espacio entre cards
                currentY += 15;
            });

            // Totales al final de la página
            doc.setDrawColor(74, 108, 247);
            doc.setLineWidth(0.8);
            doc.line(margin, currentY, pageWidth - margin, currentY);

            currentY += 10;

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(74, 108, 247);

            const totalsInfo = [
                `Total Agregos: ${reportData.productos.agregos.length}`,
                `Valor Total: $${reportData.ventas.agregosTotal.toLocaleString('es-ES')}`,
                `Promedio por Agrego: $${Math.round(reportData.ventas.agregosTotal / reportData.productos.agregos.length).toLocaleString('es-ES')}`
            ];

            // Mostrar totales en una línea
            const totalSpacing = contentWidth / totalsInfo.length;

            totalsInfo.forEach((info, index) => {
                doc.text(info, margin + (index * totalSpacing) + (totalSpacing / 2), currentY, { align: 'center' });
            });

            currentY += 15;

            // ========== RESUMEN FINAL DE AGREGOS CON TOTAL COCINA ==========

            // Calcular el total general (cocina + agregos)
            const totalGeneralCocina = reportData.ventas.ventasCocinaProductos + reportData.ventas.agregosTotal;

            // Línea divisoria
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.line(margin, currentY, pageWidth - margin, currentY);

            currentY += 15;

            // Título del resumen
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(74, 108, 247);
            doc.text('RESUMEN FINAL DE COCINA', margin, currentY);

            currentY += 10;

            // Tabla de resumen
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
                    fillColor: [230, 126, 34], // Naranja de cocina
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
                    // Resaltar la última fila (total general)
                    if (data.row.index === 2) {
                        data.cell.styles.fillColor = [255, 248, 230]; // Fondo naranja claro
                        data.cell.styles.textColor = [230, 126, 34]; // Texto naranja
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fontSize = 12;
                    }

                    // Resaltar la primera fila (productos básicos)
                    if (data.row.index === 0) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.textColor = [60, 60, 60];
                    }

                    // Resaltar la segunda fila (agregos)
                    if (data.row.index === 1) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.textColor = [74, 108, 247]; // Azul
                    }
                }
            });

            currentY = doc.lastAutoTable.finalY + 15;

            // Nota explicativa
            doc.setFontSize(9);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(100, 100, 100);
            doc.text('Nota: El total general de cocina incluye tanto los productos básicos como los agregos', margin, currentY);
            doc.text('y productos compuestos preparados durante el día.', margin, currentY + 4);
        }

        updateProgress(90, 'Agregando registros financieros...');

        // ========== PÁGINA 6: REGISTROS FINANCIEROS MEJORADOS ==========
        if (options.financiero) {
            doc.addPage();
            currentY = margin;

            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('REGISTROS FINANCIEROS', margin, currentY);
            currentY += 10;

            // Consumo
            if (reportData.financiero.consumo && reportData.financiero.consumo.length > 0) {
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('CONSUMO', margin, currentY);
                currentY += 8;

                // Validar datos
                const consumoTableData = reportData.financiero.consumo
                    .filter(registro => registro && registro.descripcion)
                    .map(registro => [
                        registro.descripcion || '',
                        `$${(registro.monto || 0).toFixed(0)}`
                    ]);

                if (consumoTableData.length > 0) {
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

                    // Total consumo
                    doc.setFontSize(11);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`Total Consumo: $${reportData.financiero.consumoTotal.toFixed(0)}`, pageWidth - margin, currentY, { align: 'right' });
                    currentY += 10;
                }
            }

            // Extracciones
            if (reportData.financiero.extracciones && reportData.financiero.extracciones.length > 0) {
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('EXTRACCIONES', margin, currentY);
                currentY += 8;

                // Validar datos
                const extraccionesTableData = reportData.financiero.extracciones
                    .filter(registro => registro && registro.descripcion)
                    .map(registro => [
                        registro.descripcion || '',
                        `$${(registro.monto || 0).toFixed(0)}`
                    ]);

                if (extraccionesTableData.length > 0) {
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

                    // Total extracciones
                    doc.setFontSize(11);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`Total Extracciones: $${reportData.financiero.extraccionesTotal.toFixed(0)}`, pageWidth - margin, currentY, { align: 'right' });
                    currentY += 10;
                }
            }

            // Transferencias si está habilitado
            if (options.transferencias && reportData.financiero.transferencias && reportData.financiero.transferencias.length > 0) {
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('TRANSFERENCIAS', margin, currentY);
                currentY += 8;

                // Validar datos
                const transferenciasTableData = reportData.financiero.transferencias
                    .filter(registro => registro)
                    .map(registro => [
                        registro.notas || 'Transferencia bancaria',
                        `$${(registro.monto || 0).toFixed(0)}`
                    ]);

                if (transferenciasTableData.length > 0) {
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

                    // Total transferencias
                    doc.setFontSize(11);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`Total Transferencias: $${reportData.financiero.transferenciasTotal.toFixed(0)}`, pageWidth - margin, currentY, { align: 'right' });
                }
            }
        }

        updateProgress(95, 'Agregando conteo de billetes...');

        // ========== PÁGINA 7: CONTEO DE BILLETES (REGISTROS DEL DÍA) ==========
        if (options.billetes && reportData.billetes.registros && reportData.billetes.registros.length > 0) {
            doc.addPage();
            currentY = margin;

            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('CONTEO DE BILLETES', margin, currentY);
            currentY += 10;

            // Lista de registros del día con su hora
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`Registros del día: ${reportData.billetes.registros.length}`, margin, currentY);
            currentY += 8;

            // Mostrar cada registro
            reportData.billetes.registros.forEach((registro, index) => {
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text(`Registro ${index + 1} - ${registro.hora}    `, margin, currentY);
                currentY += 6;

                // Determinar destino
                let destinoTexto = '';
                switch (registro.destino) {
                    case 'extraccion':
                        destinoTexto = '     (Extracción)';
                        break;
                    case 'efectivo':
                        destinoTexto = '     (Efectivo)';
                        break;
                    default:
                        destinoTexto = '     (Registro)';
                }

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                doc.text(destinoTexto, margin + 50, currentY - 6);
                currentY += 5;

                // Tabla de billetes CUP para este registro
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

                // Tabla de billetes USD para este registro
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

                // Línea separadora
                if (index < reportData.billetes.registros.length - 1) {
                    doc.setDrawColor(200, 200, 200);
                    doc.line(margin, currentY, pageWidth - margin, currentY);
                    currentY += 10;
                }

                // Si se va a salir de la página, crear nueva
                if (currentY > 250) {
                    doc.addPage();
                    currentY = margin;
                }
            });

            // RESUMEN TOTAL DE BILLETES DEL DÍA
            currentY += 5;
            doc.setDrawColor(74, 108, 247);
            doc.setLineWidth(0.5);
            doc.line(margin, currentY, pageWidth - margin, currentY);
            currentY += 10;

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('RESUMEN TOTAL DEL DÍA', margin, currentY);
            currentY += 10;

            // Calcular totales del día
            const totalesDia = calcularTotalesBilletesDia(reportData.billetes.registros);

            // Tabla de totales CUP del día
            const totalCUPData = [];
            let totalCUP = 0;

            Object.entries(totalesDia.cup)
                .sort((a, b) => b[0] - a[0])
                .forEach(([valor, cantidad]) => {
                    if (cantidad > 0) {
                        const total = cantidad * parseInt(valor);
                        totalCUP += total;
                        totalCUPData.push([
                            `$${valor} CUP`,
                            cantidad.toString(),
                            `$${total.toLocaleString('es-ES')}`
                        ]);
                    }
                });

            if (totalCUPData.length > 0) {
                doc.autoTable({
                    startY: currentY,
                    head: [['Denominación', 'Cantidad Total', 'Total CUP']],
                    body: totalCUPData,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [41, 128, 185],
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

                currentY = doc.lastAutoTable.finalY + 5;
            }

            // Total CUP del día
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(`Total CUP del día: $${totalCUP.toLocaleString('es-ES')} CUP`, pageWidth - margin, currentY, { align: 'right' });
            currentY += 10;

            // Tabla de totales USD del día
            const totalUSDData = [];
            let totalUSDCUP = 0;

            Object.entries(totalesDia.usd)
                .sort((a, b) => b[0] - a[0])
                .forEach(([valor, cantidad]) => {
                    if (cantidad > 0) {
                        const totalUSD = cantidad * parseInt(valor);
                        const tasaPromedio = 400; // Tasa promedio para el resumen
                        const totalCUPUSD = totalUSD * tasaPromedio;
                        totalUSDCUP += totalCUPUSD;
                        totalUSDData.push([
                            `$${valor} USD`,
                            cantidad.toString(),
                            `$${totalCUPUSD.toLocaleString('es-ES')} CUP`
                        ]);
                    }
                });

            if (totalUSDData.length > 0) {
                doc.autoTable({
                    startY: currentY,
                    head: [['Denominación', 'Cantidad Total', 'Total en CUP']],
                    body: totalUSDData,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [155, 89, 182],
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

                currentY = doc.lastAutoTable.finalY + 5;
            }

            // Total USD en CUP del día
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(`Total USD en CUP: $${totalUSDCUP.toLocaleString('es-ES')} CUP`, pageWidth - margin, currentY, { align: 'right' });
            currentY += 10;

            // Gran total del día
            const granTotalDia = totalCUP + totalUSDCUP;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(74, 108, 247);
            doc.text(`GRAN TOTAL DEL DÍA: $${granTotalDia.toLocaleString('es-ES')} CUP`, pageWidth / 2, currentY, { align: 'center' });
            doc.setTextColor(0, 0, 0);
        }

        updateProgress(98, 'Preparando firmas...');

        // ========== PÁGINA FINAL: FIRMAS MEJORADAS CON DISEÑO PROFESIONAL ==========
        doc.addPage();
        currentY = 20;

        // Título principal centrado
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(74, 108, 247);
        doc.text('CONTROL Y AUTORIZACIONES', pageWidth / 2, currentY, { align: 'center' });
        
        // Línea decorativa bajo el título
        doc.setDrawColor(74, 108, 247);
        doc.setLineWidth(0.8);
        doc.line(margin + 10, currentY + 5, pageWidth - margin - 10, currentY + 5);

        currentY += 25;

        // Función para dibujar sección de firma con diseño profesional
        function dibujarSeccionFirma(titulo, nombre, margin, currentY) {
            // Marco decorativo para la sección
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.3);
            doc.rect(margin, currentY, contentWidth, 40);
            
            // Fondo sutil para el título
            doc.setFillColor(248, 249, 250);
            doc.rect(margin, currentY, contentWidth, 12, 'F');
            
            // Título de la sección
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(74, 108, 247);
            doc.text(titulo, margin + 5, currentY + 8);
            
            currentY += 18;
            
            // Nombre en grande y centrado
            if (nombre && nombre.trim() !== '') {
                doc.setFontSize(18); // Tamaño más grande
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                
                // Centrar el nombre horizontalmente
                const nombreWidth = doc.getStringUnitWidth(nombre) * doc.internal.getFontSize() / doc.internal.scaleFactor;
                const xPos = margin + (contentWidth - nombreWidth) / 2;
                
                doc.text(nombre, xPos, currentY);
                currentY += 10;
                
                // Línea para firma más ancha
                const lineStart = margin + 20;
                const lineEnd = pageWidth - margin - 20;
                const lineY = currentY + 2;
                
                doc.setDrawColor(74, 108, 247);
                doc.setLineWidth(0.8); // Línea más gruesa
                doc.line(lineStart, lineY, lineEnd, lineY);
                
                // Texto "Firma" centrado bajo la línea
                doc.setFontSize(10);
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(100, 100, 100);
                doc.text('Firma', (lineStart + lineEnd) / 2, lineY + 6, { align: 'center' });
            } else {
                // Si no hay nombre, mostrar línea más larga para firma
                const lineStart = margin + 20;
                const lineEnd = pageWidth - margin - 20;
                const lineY = currentY + 8;
                
                doc.setDrawColor(150, 150, 150);
                doc.setLineWidth(0.5);
                doc.line(lineStart, lineY, lineEnd, lineY);
                
                // Texto "Nombre y Firma" centrado
                doc.setFontSize(10);
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(100, 100, 100);
                doc.text('Nombre y Firma', (lineStart + lineEnd) / 2, lineY + 6, { align: 'center' });
            }
            
            return currentY + 25; // Retornar nueva posición Y
        }

        // Firma Administrador - Diseño profesional
        currentY = dibujarSeccionFirma(
            'ADMINISTRADOR / RESPONSABLE', 
            options.firmaAdministrador, 
            margin, 
            currentY
        );

        // Firma Turno Saliente - Diseño profesional
        currentY = dibujarSeccionFirma(
            'TURNO SALIENTE', 
            options.firmaTurnoSaliente, 
            margin, 
            currentY
        );

        // Firma Turno Entrante - Diseño profesional
        currentY = dibujarSeccionFirma(
            'TURNO ENTRANTE', 
            options.firmaTurnoEntrante, 
            margin, 
            currentY
        );

        currentY += 15;

        // Observaciones con diseño mejorado
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(74, 108, 247);
        doc.text('OBSERVACIONES Y NOTAS:', margin, currentY);
        currentY += 10;

        // Cuadro para observaciones con diseño profesional
        doc.setDrawColor(220, 220, 220);
        doc.setFillColor(255, 255, 255);
        doc.setLineWidth(0.5);
        const obsHeight = 50;
        doc.rect(margin, currentY, contentWidth, obsHeight, 'FD');
        
        // Líneas horizontales guía
        doc.setDrawColor(240, 240, 240);
        for (let i = 1; i <= 4; i++) {
            doc.line(margin, currentY + (i * 10), pageWidth - margin, currentY + (i * 10));
        }

        // Número de páginas en todas las páginas
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(100, 100, 100);
            doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin - 25, doc.internal.pageSize.height - 10);
            doc.text(`Reporte IPV - ${new Date().getFullYear()}`, margin, doc.internal.pageSize.height - 10);
            
            // Sello de confidencialidad en la primera página
            if (i === 1) {
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text('CONFIDENCIAL', pageWidth / 2, doc.internal.pageSize.height - 20, { align: 'center' });
            }
        }

        updateProgress(100, 'Finalizando documento...');

        // Guardar PDF
        const fileName = `Reporte_IPV_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);

        showNotification('PDF generado y descargado correctamente', 'success');

        return true;
    }

    // Función para calcular totales de billetes del día
    function calcularTotalesBilletesDia(registros) {
        const totales = {
            cup: {},
            usd: {}
        };

        if (!registros || !Array.isArray(registros)) {
            return totales;
        }

        registros.forEach(registro => {
            if (registro && registro.billetesCUP) {
                Object.entries(registro.billetesCUP || {}).forEach(([valor, cantidad]) => {
                    if (cantidad > 0) {
                        totales.cup[valor] = (totales.cup[valor] || 0) + cantidad;
                    }
                });
            }

            if (registro && registro.billetesUSD) {
                Object.entries(registro.billetesUSD || {}).forEach(([valor, cantidad]) => {
                    if (cantidad > 0) {
                        totales.usd[valor] = (totales.usd[valor] || 0) + cantidad;
                    }
                });
            }
        });

        return totales;
    }

    async function collectReportData() {
        try {
            // Obtener datos del StorageManager
            const storage = window.StorageManager || {
                getProducts: () => JSON.parse(localStorage.getItem('ipb_products') || '[]'),
                getCocinaProducts: () => JSON.parse(localStorage.getItem('ipb_cocina_products') || '[]'),
                getSalonData: () => JSON.parse(localStorage.getItem('ipb_salon') || '[]'),
                getCocinaData: () => JSON.parse(localStorage.getItem('ipb_cocina') || '[]'),
                getConsumoData: () => JSON.parse(localStorage.getItem('ipb_consumo_data') || '[]'),
                getExtraccionesData: () => JSON.parse(localStorage.getItem('ipb_extracciones') || '[]'),
                getTransferenciasData: () => JSON.parse(localStorage.getItem('ipb_transferencias_data') || '[]')
            };

            // Productos
            const productosBaseSalon = storage.getProducts() || [];
            const productosBaseCocina = storage.getCocinaProducts() || [];

            // Datos del día
            const salonData = storage.getSalonData() || [];
            const cocinaData = storage.getCocinaData() || [];

            // Fusionar datos base con datos del día
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

            // Agregos de cocina
            const agregos = JSON.parse(localStorage.getItem(`cocina_agregos`) || '[]');

            // Datos financieros
            const consumoData = storage.getConsumoData() || [];
            const extraccionesData = storage.getExtraccionesData() || [];
            const transferenciasData = storage.getTransferenciasData() || [];

            // Efectivo
            const efectivoData = JSON.parse(localStorage.getItem('ipb_efectivo_data') || '[]');
            const efectivoHoy = efectivoData || [];

            // Billetes
            const billetesHoy = JSON.parse(localStorage.getItem('ipb_billetes_registros') || '[]');

            // Calcular ventas con validación
            const ventasSalon = productosSalon.reduce((sum, p) => sum + (p.importe || 0), 0) || 0;
            const ventasCocinaProductos = productosCocina.reduce((sum, p) => sum + (p.importe || 0), 0) || 0;
            const agregosTotal = agregos.reduce((sum, a) => sum + (a.montoTotal || 0), 0) || 0;
            const ventasCocina = ventasCocinaProductos + agregosTotal;
            const ventasTotales = ventasSalon + ventasCocina;

            // Calcular dinero real con validación
            const consumoTotal = consumoData.reduce((sum, c) => sum + (c.monto || 0), 0) || 0;
            const extraccionesTotal = extraccionesData.reduce((sum, e) => sum + (e.monto || 0), 0) || 0;
            const transferenciasTotal = transferenciasData.reduce((sum, t) => sum + (t.monto || 0), 0) || 0;
            const efectivoTotal = efectivoHoy.reduce((sum, e) => sum + (e.monto || 0), 0) || 0;
            const dineroReal = consumoTotal + extraccionesTotal + transferenciasTotal + efectivoTotal;

            // Calcular diferencia
            const diferencia = dineroReal - ventasTotales;

            // Calcular porciento (según tu fórmula)
            const dineroAPorcentuar = ventasTotales - consumoTotal;
            const porciento = Math.floor(dineroAPorcentuar / 10000) * 100;

            return {
                productos: {
                    salon: productosSalon || [],
                    cocina: productosCocina || [],
                    agregos: agregos || []
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
                    consumo: consumoData || [],
                    consumoTotal,
                    extracciones: extraccionesData || [],
                    extraccionesTotal,
                    transferencias: transferenciasData || [],
                    transferenciasTotal,
                    efectivo: efectivoHoy || [],
                    efectivoTotal
                },
                billetes: {
                    registros: billetesHoy || []
                }
            };
        } catch (error) {
            console.error('Error recopilando datos:', error);
            return {
                productos: { salon: [], cocina: [], agregos: [] },
                ventas: {
                    ventasSalon: 0,
                    ventasCocina: 0,
                    ventasCocinaProductos: 0,
                    agregosTotal: 0,
                    ventasTotales: 0,
                    dineroReal: 0,
                    diferencia: 0,
                    porciento: 0
                },
                financiero: {
                    consumo: [],
                    consumoTotal: 0,
                    extracciones: [],
                    extraccionesTotal: 0,
                    transferencias: [],
                    transferenciasTotal: 0,
                    efectivo: [],
                    efectivoTotal: 0
                },
                billetes: {
                    registros: []
                }
            };
        }
    }

    function showNotification(message, type = 'info') {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            // Crear notificación simple
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

            // Agregar estilos de animación si no existen
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
    
    // Agregar estilos CSS mejorados
    const style = document.createElement('style');
    style.textContent = `
    /* Estilos para la sección de firmas */
    .form-section {
        background: #f8f9fa;
        border-radius: 10px;
        padding: 20px;
        margin-bottom: 25px;
        border: 1px solid #e9ecef;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    
    .form-section h4 {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 1.2rem;
        color: var(--primary-color);
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 2px solid var(--primary-light);
    }
    
    .form-group {
        margin-bottom: 18px;
    }
    
    .form-group label {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
        font-weight: 600;
        color: var(--dark-color);
        font-size: 1rem;
    }
    
    .form-group label i {
        color: var(--primary-color);
        width: 20px;
        text-align: center;
        font-size: 1.1rem;
    }
    
    .form-input {
        width: 100%;
        padding: 12px 15px;
        border: 2px solid #e1e5e9;
        border-radius: 8px;
        font-size: 1rem;
        transition: all 0.3s;
        background: white;
        font-weight: 500;
    }
    
    .form-input:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 4px rgba(74, 108, 247, 0.15);
        transform: translateY(-1px);
    }
    
    .form-input::placeholder {
        color: #8a94a6;
        opacity: 0.8;
        font-weight: normal;
    }
    
    /* Estilos para el modal de exportación */
    .pdf-export-modal .action-buttons {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin-top: 15px;
    }
    
    .pdf-export-modal .btn-action {
        flex: 1;
        min-width: 140px;
        padding: 14px;
        background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
        color: white;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        font-weight: 600;
        font-size: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        transition: all 0.3s ease;
        letter-spacing: 0.5px;
    }
    
    .pdf-export-modal .btn-action:hover {
        transform: translateY(-3px);
        box-shadow: 0 6px 20px rgba(74, 108, 247, 0.25);
    }
    
    .pdf-export-modal .btn-action i {
        font-size: 1.2rem;
    }
    
    .option-checkbox {
        display: flex;
        align-items: center;
        margin: 10px 0;
        padding: 12px 15px;
        border-radius: 8px;
        transition: all 0.3s;
        background: white;
        border: 1px solid #e1e5e9;
    }
    
    .option-checkbox:hover {
        background: #f8f9fa;
        border-color: var(--primary-light);
        transform: translateX(5px);
    }
    
    .option-checkbox input[type="checkbox"] {
        margin-right: 15px;
        width: 20px;
        height: 20px;
        cursor: pointer;
        accent-color: var(--primary-color);
    }
    
    .option-checkbox label {
        cursor: pointer;
        font-weight: 600;
        color: var(--dark-color);
        font-size: 1rem;
        flex: 1;
    }
    
    .pdf-progress {
        padding: 30px;
        text-align: center;
        background: #f8f9fa;
        border-radius: 10px;
        margin: 20px 0;
    }
    
    .progress-bar {
        width: 100%;
        height: 12px;
        background: #e0e0e0;
        border-radius: 6px;
        overflow: hidden;
        margin: 25px 0;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
        border-radius: 6px;
        transition: width 0.4s ease;
        box-shadow: 0 2px 4px rgba(74, 108, 247, 0.3);
    }
    
    .progress-text {
        color: var(--gray-dark);
        font-size: 1rem;
        margin-top: 15px;
        font-weight: 500;
    }
    
    /* Animaciones */
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    .pdf-export-modal .modal-content {
        animation: fadeIn 0.3s ease;
    }
`;
    document.head.appendChild(style);
});