// pdf-export.js - Sistema de exportación a PDF para IPV (Versión Corregida)
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

    function showPDFOptionsModal() {
        const modalHtml = `
            <div class="modal active pdf-modal">
                <div class="modal-overlay"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-file-pdf"></i> Exportar a PDF</h3>
                        <button class="modal-close">&times;</button>
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
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="pdf-cancel">
                            Cancelar
                        </button>
                        <button class="btn btn-success" id="pdf-generate">
                            <i class="fas fa-file-pdf"></i> Generar PDF
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.querySelector('.pdf-modal');
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
                title: document.getElementById('pdf-title').value || `Reporte IPV - ${new Date().toLocaleDateString('es-ES')}`
            };

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
        doc.text('Sistema de Gestión IPV - www.gestoripv.com', pageWidth / 2, 100, { align: 'center' });

        updateProgress(60, 'Agregando resumen...');

        // ========== PÁGINA 2: RESUMEN GENERAL (TABLA ORIGINAL) ==========
        if (options.resumen) {
            doc.addPage();
            currentY = margin;

            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('RESUMEN GENERAL', margin, currentY);
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
                ['1% de Ventas:', `$${reportData.ventas.porciento.toFixed(0)}`]
            ];

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
                }
            });

            currentY = doc.lastAutoTable.finalY + 10;
        }

        updateProgress(70, 'Agregando productos salón...');

        // ========== PÁGINA 3: PRODUCTOS SALÓN ==========
        if (options.salon && reportData.productos.salon.length > 0) {
            doc.addPage();
            currentY = margin;

            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('INVENTARIO SALÓN', margin, currentY);
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

        updateProgress(80, 'Agregando productos cocina...');

        // ========== PÁGINA 4: PRODUCTOS COCINA ==========
        if (options.cocina && reportData.productos.cocina.length > 0) {
            doc.addPage();
            currentY = margin;

            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('INVENTARIO COCINA', margin, currentY);
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

        updateProgress(85, 'Agregando agregos...');

        // ========== PÁGINA 5: AGREGOS Y PRODUCTOS COMPUESTOS (DISEÑO MEJORADO) ==========
        if (options.agregos && reportData.productos.agregos.length > 0) {
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

                        const ingredienteText = `• ${ingrediente.nombre}: ${ingrediente.cantidad} ${ingrediente.unidad || 'unidades'}`;

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
            if (reportData.financiero.consumo.length > 0) {
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('CONSUMO', margin, currentY);
                currentY += 8;

                // Tabla de consumo
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

                // Total consumo
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

                // Tabla de extracciones
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

                // Total extracciones
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text(`Total Extracciones: $${reportData.financiero.extraccionesTotal.toFixed(0)}`, pageWidth - margin, currentY, { align: 'right' });
                currentY += 10;
            }

            // Transferencias si está habilitado
            if (options.transferencias && reportData.financiero.transferencias.length > 0) {
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('TRANSFERENCIAS', margin, currentY);
                currentY += 8;

                // Tabla de transferencias
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

                // Total transferencias
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text(`Total Transferencias: $${reportData.financiero.transferenciasTotal.toFixed(0)}`, pageWidth - margin, currentY, { align: 'right' });
            }
        }

        updateProgress(95, 'Agregando conteo de billetes...');

        // ========== PÁGINA 7: CONTEO DE BILLETES (REGISTROS DEL DÍA) ==========
        if (options.billetes && reportData.billetes.registros.length > 0) {
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

        // ========== PÁGINA FINAL: FIRMAS MEJORADAS ==========
        doc.addPage();
        currentY = 20;

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('CONTROL Y FIRMAS', pageWidth / 2, currentY, { align: 'center' });

        currentY += 25;

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
        doc.text('TURNO SALIENTE:', margin, currentY);
        currentY += 7;

        doc.setFont('helvetica', 'normal');
        doc.text('Nombre:', margin, currentY);
        doc.line(margin + 25, currentY + 2, margin + 100, currentY + 2);

        doc.text('Firma:', margin + 110, currentY);
        doc.line(margin + 130, currentY + 2, pageWidth - margin, currentY + 2);
        currentY += 20;

        // Turno Entrante
        doc.setFont('helvetica', 'bold');
        doc.text('TURNO ENTRANTE:', margin, currentY);
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
        // Cuadro para observaciones
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        const obsHeight = 60;
        doc.rect(margin, currentY, contentWidth, obsHeight);

        // Líneas horizontales
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
            doc.text(`IPV - ${new Date().getFullYear()} | ${new Date().toLocaleDateString('es-ES')}`, margin, doc.internal.pageSize.height - 10);
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

        registros.forEach(registro => {
            // Sumar billetes CUP
            Object.entries(registro.billetesCUP || {}).forEach(([valor, cantidad]) => {
                totales.cup[valor] = (totales.cup[valor] || 0) + cantidad;
            });

            // Sumar billetes USD
            Object.entries(registro.billetesUSD || {}).forEach(([valor, cantidad]) => {
                totales.usd[valor] = (totales.usd[valor] || 0) + cantidad;
            });
        });

        return totales;
    }

    async function collectReportData() {
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
        const productosBaseSalon = storage.getProducts();
        const productosBaseCocina = storage.getCocinaProducts();

        // Datos del día
        const salonData = storage.getSalonData();
        const cocinaData = storage.getCocinaData();

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
        const today = new Date().toISOString().split('T')[0];
        const agregos = JSON.parse(localStorage.getItem(`cocina_agregos`) || '[]');

        // Datos financieros
        const consumoData = storage.getConsumoData();
        const extraccionesData = storage.getExtraccionesData();
        const transferenciasData = storage.getTransferenciasData();

        // Efectivo
        const efectivoData = JSON.parse(localStorage.getItem('ipb_efectivo_data') || '[]');
        const efectivoHoy = efectivoData.filter(item => item.fecha === today);

        // Billetes
        const billetesRegistros = JSON.parse(localStorage.getItem('ipb_billetes_registros') || '[]');
        const billetesHoy = billetesRegistros.filter(r => r.fecha === today);

        // Calcular ventas
        const ventasSalon = productosSalon.reduce((sum, p) => sum + (p.importe || 0), 0);
        const ventasCocinaProductos = productosCocina.reduce((sum, p) => sum + (p.importe || 0), 0);
        const agregosTotal = agregos.reduce((sum, a) => sum + (a.montoTotal || 0), 0);
        const ventasCocina = ventasCocinaProductos + agregosTotal;
        const ventasTotales = ventasSalon + ventasCocina;

        // Calcular dinero real
        const consumoTotal = consumoData.reduce((sum, c) => sum + (c.monto || 0), 0);
        const extraccionesTotal = extraccionesData.reduce((sum, e) => sum + (e.monto || 0), 0);
        const transferenciasTotal = transferenciasData.reduce((sum, t) => sum + (t.monto || 0), 0);
        const efectivoTotal = efectivoHoy.reduce((sum, e) => sum + (e.monto || 0), 0);
        const dineroReal = consumoTotal + extraccionesTotal + transferenciasTotal + efectivoTotal;

        // Calcular diferencia
        const diferencia = dineroReal - ventasTotales;

        // Calcular porciento (según tu fórmula)
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
                efectivo: efectivoHoy,
                efectivoTotal
            },
            billetes: {
                registros: billetesHoy
            }
        };
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
});