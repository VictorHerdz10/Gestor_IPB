// backup.js - Gestión de Backup & Restore con Capacitor
class BackupManager {
    constructor() {
        this.isMobile = window.Capacitor !== undefined;
        this.Directory = {
            Documents: 'DOCUMENTS',
            Data: 'DATA',
            Cache: 'CACHE',
            External: 'EXTERNAL',
            ExternalStorage: 'EXTERNAL_STORAGE'
        };
        this.filesystem = this.isMobile ? window.Capacitor.Plugins?.Filesystem : null;
        this.share = this.isMobile ? window.Capacitor.Plugins?.Share : null;
        this.app = this.isMobile ? window.Capacitor.Plugins?.App : null;
        this.preferences = this.isMobile ? window.Capacitor.Plugins?.Preferences : null;
        this.backupHistory = [];

        // Configuración de extensión personalizada
        this.CUSTOM_EXTENSION = '.ipvbak';
        this.MAGIC_HEADER = 'IPV_BACKUP_v1.0';
        this.FILE_SIGNATURE = 'GestorIPV_Backup_Format';
        this.APP_IDENTIFIER = 'com.gestoripv.backup';

        // Metadatos del archivo
        this.FILE_METADATA = {
            creator: 'Gestor IPV Backup System',
            version: '1.0',
            minimumAppVersion: '1.0',
            requiredPermissions: ['read', 'write'],
            encryptionSupported: false,
            compressionSupported: true,
            maxFileSize: 10485760 // 10MB
        };

        this.init();
    }

    init() {
        this.bindEvents();
        this.loadBackupHistory();
        this.updateSystemInfo();
        this.detectPlatform();
        this.checkFileAssociation();
    }

    detectPlatform() {
        const platformEl = document.getElementById('plataforma-actual');
        if (platformEl) {
            if (this.isMobile) {
                platformEl.textContent = 'Dispositivo Móvil';
                platformEl.style.color = 'var(--success-color)';
                platformEl.style.fontWeight = '600';
                this.setupMobileFileHandling();
            } else {
                platformEl.textContent = 'Navegador Web';
                platformEl.style.color = 'var(--info-color)';
            }
        }
    }

    async setupMobileFileHandling() {
        if (!this.isMobile || !this.app) return;

        try {
            // Escuchar eventos de apertura de archivo (deep linking)
            this.app.addListener('appUrlOpen', async (data) => {
                console.log('App opened with URL:', data.url);
                await this.handleFileOpen(data.url);
            });

            // Escuchar eventos cuando la app vuelve a primer plano
            this.app.addListener('appStateChange', async (state) => {
                if (state.isActive) {
                    await this.checkPendingFileOperations();
                }
            });

            // Registrar asociación de archivo
            await this.registerFileAssociation();

        } catch (error) {
            console.warn('Error setting up mobile file handling:', error);
        }
    }

    async registerFileAssociation() {
        if (!this.isMobile || !this.preferences) return;

        try {
            console.log('Registrando asociación para archivos .ipvbak');

            // Guardar configuración en preferences
            await this.preferences.set({
                key: 'file_association_registered',
                value: 'true'
            });

            // Guardar el MIME type personalizado
            await this.preferences.set({
                key: 'custom_mime_type',
                value: 'application/vnd.gestoripv.backup'
            });

            // Guardar configuración de la app
            await this.preferences.set({
                key: 'app_config',
                value: JSON.stringify({
                    appName: 'Gestor IPV',
                    backupExtension: this.CUSTOM_EXTENSION,
                    supportedFileTypes: [this.CUSTOM_EXTENSION, '.json'],
                    version: '1.0'
                })
            });

            console.log('Asociación de archivos registrada exitosamente');

        } catch (error) {
            console.warn('No se pudo registrar asociación de archivo:', error);
        }
    }

    async handleFileOpen(url) {
        console.log('📂 Archivo recibido en handleFileOpen:', url);

        // Verificar que la URL no esté vacía
        if (!url || url.trim() === '') {
            console.warn('URL vacía recibida');
            return;
        }

        // Verificar si estamos en la página correcta (dashboard)
        if (!window.location.pathname.includes('dashboard.html')) {
            console.warn('No estamos en dashboard, redirigiendo...');

            // Guardar en sessionStorage y redirigir
            sessionStorage.setItem('pending_backup_file', url);

            // Si estamos en index.html, redirigir a dashboard
            if (window.location.pathname.includes('index.html') ||
                window.location.pathname === '/' ||
                window.location.pathname.endsWith('index.html')) {
                window.location.href = `dashboard.html?file=${encodeURIComponent(url)}`;
            } else {
                // Si no estamos en index, ir directamente
                window.location.href = `dashboard.html`;
            }
            return;
        }

        try {
            let fileUri = url;
            let fileName = null; // Inicializar como null
            let isContentUri = false;
            let originalFileName = null; // Guardar el nombre original

            // Normalizar la URL
            if (url.includes('appUrlOpen:')) {
                // URL viene de Capacitor App plugin
                fileUri = url.replace('appUrlOpen:', '');
            }

            console.log('URI procesada:', fileUri);

            // Determinar tipo de URI y extraer información
            if (fileUri.startsWith('content://')) {
                isContentUri = true;

                // Para content URIs, intentamos extraer el nombre real
                try {
                    // Los content URIs suelen tener el nombre en el final
                    const uriParts = fileUri.split('/');
                    let potentialName = uriParts[uriParts.length - 1];

                    // Limpiar query parameters
                    if (potentialName.includes('?')) {
                        potentialName = potentialName.split('?')[0];
                    }

                    // Decodificar caracteres especiales
                    potentialName = decodeURIComponent(potentialName);

                    // Verificar si parece un nombre de archivo válido
                    if (potentialName && potentialName.includes('.')) {
                        originalFileName = potentialName;

                        // Si ya termina en .ipvbak, usarlo directamente
                        if (potentialName.toLowerCase().endsWith('.ipvbak')) {
                            fileName = potentialName;
                        } else {
                            // Si no termina en .ipvbak, mostrarlo tal cual pero con advertencia
                            fileName = potentialName;
                            console.log('Archivo no termina en .ipvbak:', fileName);
                        }
                    }
                } catch (e) {
                    console.warn('No se pudo extraer nombre del archivo:', e);
                }

                // Si no se pudo determinar el nombre
                if (!fileName) {
                    fileName = 'archivo_recibido.ipvbak';
                }

            } else if (fileUri.startsWith('file://')) {
                // URI de archivo local - aquí SÍ podemos obtener el nombre real
                const decodedPath = decodeURIComponent(fileUri);
                originalFileName = decodedPath.split('/').pop() || '';

                // Usar el nombre real del archivo
                fileName = originalFileName;

                // Si no tiene extensión .ipvbak, mantener el nombre pero mostrar advertencia
                if (!fileName.toLowerCase().endsWith('.ipvbak')) {
                    console.log('Archivo local sin extensión .ipvbak:', fileName);
                }

            } else if (fileUri.startsWith('gestoripv://')) {
                // Deep link personalizado - intentar extraer info
                try {
                    const base64Path = fileUri.replace('gestoripv://open/backup/', '');
                    const decodedPath = atob(base64Path);
                    originalFileName = decodedPath.split('/').pop() || '';
                    fileName = originalFileName;
                } catch (e) {
                    console.warn('Error decodificando deep link:', e);
                    fileName = 'backup_desde_deeplink.ipvbak';
                }
            } else {
                // URL no reconocida
                console.warn('Tipo de URL no reconocido:', fileUri);
                fileName = 'archivo_desconocido.ipvbak';
            }

            console.log('Nombre del archivo detectado:', fileName);
            console.log('Nombre original:', originalFileName);

            // Verificar extensión PERO permitir abrir igual
            const hasCorrectExtension = fileName.toLowerCase().endsWith('.ipvbak');

            if (!hasCorrectExtension) {
                // Mostrar advertencia pero permitir continuar
                const warning = await this.showConfirmationModal(
                    '⚠️ Extensión no reconocida',
                    `El archivo "${fileName}" no tiene la extensión .ipvbak.\n\n` +
                    `¿Desea intentar abrirlo de todos modos?\n\n` +
                    `Nota: Esto podría no funcionar si el archivo no es un backup válido.`,
                    'warning'
                );

                if (!warning) {
                    this.showNotification('Operación cancelada', 'info');
                    return;
                }
            }

            this.showNotification(`📂 Archivo detectado: ${fileName}`, 'info');

            // Método mejorado para leer el archivo
            let backupData;

            if (this.isMobile) {
                backupData = await this.readBackupFileMobile(fileUri, fileName, isContentUri);
            } else {
                backupData = await this.readBackupFileWeb(fileUri);
            }

            if (!backupData) {
                // Intentar analizar el archivo aunque no sea JSON válido
                const forceOpen = await this.showConfirmationModal(
                    'Archivo no reconocido',
                    `No se pudo leer "${fileName}" como backup válido.\n\n` +
                    `¿Desea intentar analizarlo de otra manera?`,
                    'warning'
                );

                if (forceOpen) {
                    // Crear un objeto de backup básico con la información que tenemos
                    backupData = {
                        type: 'desconocido',
                        timestamp: new Date().toISOString(),
                        metadata: {
                            fileName: fileName,
                            originalName: originalFileName,
                            sourceUri: fileUri
                        },
                        data: {}
                    };
                } else {
                    return;
                }
            }

            // Verificar estructura del backup
            if (!backupData.type) {
                // Intentar inferir tipo basado en el nombre del archivo
                backupData.type = this.inferBackupTypeFromFileName(fileName) ||
                    this.inferBackupTypeFromData(backupData) ||
                    'desconocido';
            }

            const backupType = backupData.type;
            const backupDate = backupData.timestamp ?
                new Date(backupData.timestamp).toLocaleDateString('es-ES') :
                'Fecha desconocida';

            const typeLabels = {
                'productos': '📦 Productos',
                'reportes': '📊 Reportes',
                'dia_actual': '📅 Día Actual',
                'completo': '💾 Completo',
                'desconocido': '❓ Desconocido'
            };

            const typeLabel = typeLabels[backupType] || backupType;

            const confirm = await this.showConfirmationModal(
                '📂 Backup Detectado',
                `<div style="text-align: left; padding: 10px 0;">
            <p><strong>Archivo:</strong> ${fileName}</p>
            ${originalFileName && originalFileName !== fileName ?
                    `<p><strong>Original:</strong> ${originalFileName}</p>` : ''}
            <p><strong>Tipo detectado:</strong> ${typeLabel}</p>
            <p><strong>Fecha:</strong> ${backupDate}</p>
            <p><strong>Fuente:</strong> ${isContentUri ? 'Otra App' : 'Archivo Local'}</p>
            ${!hasCorrectExtension ?
                    '<p style="color: #e74c3c; font-weight: bold;">⚠️ Advertencia: Extensión no es .ipvbak</p>' : ''}
            ${backupType === 'dia_actual' || backupType === 'completo' ?
                    '<p style="color: #e67e22; font-weight: bold;">📋 Se cargarán TODOS los datos del día</p>' : ''}
        </div>
        <p>¿Desea restaurar este backup?</p>`,
                hasCorrectExtension ? 'info' : 'warning'
            );

            if (confirm) {
                // Cerrar index.html y abrir dashboard si estamos en index
                if (window.location.pathname.includes('index.html')) {
                    // Redirigir al dashboard
                    window.location.href = 'dashboard.html';

                    // Esperar un momento para que cargue el dashboard antes de restaurar
                    setTimeout(async () => {
                        await this.restoreBackupByType(backupData, backupType, fileUri);
                    }, 1000);
                } else {
                    // Ya estamos en dashboard, restaurar directamente
                    await this.restoreBackupByType(backupData, backupType, fileUri);
                }
            }

        } catch (error) {
            console.error('Error en handleFileOpen:', error);
            this.showError('Error al procesar el archivo: ' + error.message);
        }
    }

    // Nueva función para leer archivos en móvil
    async readBackupFileMobile(uri, fileName, isContentUri) {
        try {
            if (!this.isMobile || !this.filesystem) {
                throw new Error('Filesystem no disponible');
            }

            let base64Data;

            if (isContentUri) {
                // Para content URIs, usar un enfoque diferente
                console.log('Leyendo content URI:', uri);

                // Intentar con Capacitor Filesystem
                try {
                    // Primero intentar copiar el archivo a un lugar accesible
                    const tempFileName = `temp_${Date.now()}.ipvbak`;

                    // Leer el contenido (esto podría requerir permisos adicionales)
                    const result = await fetch(uri);
                    if (!result.ok) throw new Error('No se pudo leer el contenido');

                    const blob = await result.blob();
                    const reader = new FileReader();

                    return new Promise((resolve) => {
                        reader.onload = async (e) => {
                            const text = e.target.result;
                            const data = this.parseBackupFile(text);
                            resolve(data);
                        };
                        reader.readAsText(blob);
                    });

                } catch (fetchError) {
                    console.warn('Error con fetch, intentando método alternativo:', fetchError);

                    // Método alternativo: mostrar selector de archivo
                    return await this.selectBackupFile();
                }

            } else {
                // Para file URIs
                let filePath = uri;

                // Limpiar file:// si existe
                if (filePath.startsWith('file://')) {
                    filePath = filePath.replace('file://', '');
                }

                // Decodificar caracteres especiales
                filePath = decodeURIComponent(filePath);

                console.log('Leyendo archivo local:', filePath);

                // Intentar leer con Filesystem
                const result = await this.filesystem.readFile({
                    path: filePath,
                    directory: this.Directory.Documents
                });

                const text = atob(result.data);
                return this.parseBackupFile(text);
            }

        } catch (error) {
            console.error('Error en readBackupFileMobile:', error);

            // Fallback: usar el método web
            return await this.readBackupFileWeb(uri);
        }
    }

    // Función para leer archivos en web
    async readBackupFileWeb(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('No se pudo leer el archivo');

            const text = await response.text();
            return this.parseBackupFile(text);
        } catch (error) {
            console.error('Error en readBackupFileWeb:', error);
            return null;
        }
    }

    // Función para inferir tipo de backup
    inferBackupType(backupData) {
        if (backupData.productosSalon || backupData.productosCocina) return 'productos';
        if (backupData.reportes && Array.isArray(backupData.reportes)) return 'reportes';
        if (backupData.salon || backupData.cocina || backupData.consumo) return 'dia_actual';
        if (backupData._metadata && backupData._metadata.backupType === 'completo') return 'completo';

        // Verificar por estructura de datos
        const keys = Object.keys(backupData);
        if (keys.includes('productosSalon') && keys.includes('reportes')) return 'completo';

        return 'desconocido';
    }

    // Función para obtener resumen del backup
    getBackupSummary(backupData) {
        if (!backupData.data) return 'Sin datos';

        const data = backupData.data;
        let summary = [];

        if (data.productosSalon) summary.push(`${data.productosSalon.length} productos salón`);
        if (data.productosCocina) summary.push(`${data.productosCocina.length} productos cocina`);
        if (Array.isArray(data.reportes)) summary.push(`${data.reportes.length} reportes`);
        if (data.salon) summary.push(`${data.salon.length} registros salón`);
        if (data.cocina) summary.push(`${data.cocina.length} registros cocina`);

        return summary.length > 0 ? summary.join(', ') : 'Datos detectados';
    }

    // Nueva función para inferir tipo basado en el nombre del archivo
    inferBackupTypeFromFileName(fileName) {
        if (!fileName) return null;

        const lowerName = fileName.toLowerCase();

        if (lowerName.includes('producto') || lowerName.includes('productos')) return 'productos';
        if (lowerName.includes('reporte') || lowerName.includes('reportes')) return 'reportes';
        if (lowerName.includes('dia') || lowerName.includes('diario') || lowerName.includes('actual')) return 'dia_actual';
        if (lowerName.includes('completo') || lowerName.includes('full') || lowerName.includes('total')) return 'completo';
        if (lowerName.includes('backup') || lowerName.includes('respaldo')) return 'desconocido'; // Podría ser cualquiera

        return null;
    }

    // Función mejorada para inferir tipo basado en datos
    inferBackupTypeFromData(backupData) {
        // Verificar estructura de datos
        if (backupData.productosSalon || backupData.productosCocina) {
            return 'productos';
        }

        if (backupData.reportes && Array.isArray(backupData.reportes)) {
            return 'reportes';
        }

        if (backupData.salon || backupData.cocina || backupData.consumo) {
            return 'dia_actual';
        }

        if (backupData._metadata && backupData._metadata.backupType) {
            return backupData._metadata.backupType;
        }

        // Verificar múltiples tipos de datos
        const hasProducts = backupData.productosSalon || backupData.productosCocina;
        const hasReports = backupData.reportes && Array.isArray(backupData.reportes);
        const hasDayData = backupData.salon || backupData.cocina;

        if (hasProducts && hasReports && hasDayData) {
            return 'completo';
        }

        return 'desconocido';
    }

    async analyzeBackupFileByUrl(url) {
        try {
            // Intentar fetch si es una URL accesible
            const response = await fetch(url);
            if (!response.ok) throw new Error('No se pudo leer el archivo');

            const text = await response.text();
            return this.parseBackupFile(text);

        } catch (error) {
            console.error('Error en analyzeBackupFileByUrl:', error);

            // Si no se puede leer, intentar determinar por el nombre
            const fileName = url.split('/').pop() || '';

            // Inferir tipo por nombre de archivo
            if (fileName.includes('productos')) return { type: 'productos' };
            if (fileName.includes('reportes')) return { type: 'reportes' };
            if (fileName.includes('dia_actual') || fileName.includes('dia')) return { type: 'dia_actual' };
            if (fileName.includes('completo')) return { type: 'completo' };

            return { type: 'desconocido' };
        }
    }

    async restoreBackupByType(backupData, backupType, filePath) {
        try {
            this.showProgressModal(`Restaurando backup de ${this.getTypeLabel(backupType)}...`);

            switch (backupType) {
                case 'productos':
                    await this.restoreProductosFromData(backupData);
                    break;

                case 'reportes':
                    await this.restoreReportesFromData(backupData);
                    break;

                case 'dia_actual':
                    await this.restoreDiaActualFromData(backupData);
                    break;

                case 'completo':
                    await this.restoreCompletoFromData(backupData);
                    break;

                default:
                    await this.showBackupTypeSelector(backupData);
                    break;
            }

            // Guardar referencia del último archivo abierto
            if (this.preferences && filePath) {
                await this.preferences.set({
                    key: 'last_opened_backup',
                    value: JSON.stringify({
                        path: filePath,
                        type: backupType,
                        timestamp: new Date().toISOString()
                    })
                });
            }

        } catch (error) {
            console.error('Error en restoreBackupByType:', error);
            this.showError('Error al restaurar: ' + error.message);
        } finally {
            this.hideProgressModal();
        }
    }

    async showBackupTypeSelector(backupData) {
        const modalHtml = `
        <div class="modal active" id="backup-type-modal">
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-question-circle"></i> Seleccionar Tipo de Backup</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>No se pudo determinar el tipo de backup automáticamente.</p>
                    <p>Por favor seleccione el tipo:</p>
                    
                    <div class="backup-type-options">
                        <button class="btn btn-outline-primary btn-block mb-2" data-type="productos">
                            <i class="fas fa-box"></i> Productos
                        </button>
                        <button class="btn btn-outline-primary btn-block mb-2" data-type="reportes">
                            <i class="fas fa-chart-bar"></i> Reportes
                        </button>
                        <button class="btn btn-outline-primary btn-block mb-2" data-type="dia_actual">
                            <i class="fas fa-calendar-day"></i> Día Actual
                        </button>
                        <button class="btn btn-outline-primary btn-block" data-type="completo">
                            <i class="fas fa-database"></i> Completo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        return new Promise((resolve) => {
            const modal = document.getElementById('backup-type-modal');
            const closeModal = () => modal.remove();

            // Event listeners para botones de tipo
            document.querySelectorAll('.backup-type-options button').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const type = e.target.closest('button').dataset.type;
                    closeModal();

                    try {
                        // Asignar tipo y restaurar
                        backupData.type = type;
                        await this.restoreBackupByType(backupData, type, null);
                        resolve(true);
                    } catch (error) {
                        this.showError('Error: ' + error.message);
                        resolve(false);
                    }
                });
            });

            // Cerrar modal
            modal.querySelector('.modal-overlay').addEventListener('click', closeModal);
            modal.querySelector('.modal-close').addEventListener('click', closeModal);

            // Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') closeModal();
            });
        });
    }



    async checkPendingFileOperations() {
        if (!this.isMobile || !this.preferences) return;

        try {
            const pendingOp = await this.preferences.get({ key: 'pending_file_operation' });

            if (pendingOp && pendingOp.value) {
                const operation = JSON.parse(pendingOp.value);

                if (operation.type === 'restore' && operation.filePath) {
                    const confirm = await this.showConfirmationModal(
                        'Operación Pendiente',
                        `Se detectó una operación de restore pendiente para: ${operation.fileName}\n\n¿Continuar?`,
                        'info'
                    );

                    if (confirm) {
                        await this.restoreFromFilePath(operation.filePath);
                    }

                    // Limpiar operación pendiente
                    await this.preferences.remove({ key: 'pending_file_operation' });
                }
            }

        } catch (error) {
            console.warn('Error checking pending operations:', error);
        }
    }

    bindEvents() {
        // Botones de backup
        document.getElementById('btn-backup-productos')?.addEventListener('click', () => this.backupProductos());
        document.getElementById('btn-restore-productos')?.addEventListener('click', () => this.restoreProductos());

        document.getElementById('btn-backup-reportes')?.addEventListener('click', () => this.backupReportes());
        document.getElementById('btn-restore-reportes')?.addEventListener('click', () => this.restoreReportes());

        document.getElementById('btn-backup-dia')?.addEventListener('click', () => this.backupDiaActual());
        document.getElementById('btn-restore-dia')?.addEventListener('click', () => this.restoreDiaActual());

        document.getElementById('btn-backup-completo')?.addEventListener('click', () => this.backupCompleto());
        document.getElementById('btn-restore-completo')?.addEventListener('click', () => this.restoreCompleto());

        // Botones de información y refresh
        document.getElementById('btn-informacion-backup')?.addEventListener('click', () => this.showInfoModal());
        document.getElementById('btn-refresh-history')?.addEventListener('click', () => this.refreshHistory());

        // Botón de verificación de archivos
        document.getElementById('btn-verify-backup')?.addEventListener('click', () => this.verifyBackupFile());

        // Botón para compartir backup (móvil)
        document.getElementById('btn-share-backup')?.addEventListener('click', () => this.shareBackupFile());

        // Inicializar stats
        this.updateStats();
    }

    async updateSystemInfo() {
        const totalProductos = document.getElementById('total-backup-productos');
        const totalReportes = document.getElementById('total-backup-reportes');
        const ultimoBackup = document.getElementById('ultimo-backup');

        if (totalProductos) {
            const productosSalon = StorageManager.getProducts().length;
            const productosCocina = StorageManager.getCocinaProducts().length;
            totalProductos.textContent = productosSalon + productosCocina;
        }

        if (totalReportes) {
            const historialData = JSON.parse(localStorage.getItem('ipb_historial_reportes') || '[]');
            totalReportes.textContent = historialData.length;
        }

        if (ultimoBackup) {
            const lastBackup = localStorage.getItem('ipb_last_backup');
            if (lastBackup) {
                ultimoBackup.textContent = new Date(lastBackup).toLocaleString('es-ES', {
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
            }
        }
    }

    updateStats() {
        // Productos
        const productosSalon = StorageManager.getProducts();
        const productosCocina = StorageManager.getCocinaProducts();

        document.getElementById('stats-productos-salon').textContent = productosSalon.length;
        document.getElementById('stats-productos-cocina').textContent = productosCocina.length;

        // Reportes
        const historialData = JSON.parse(localStorage.getItem('ipb_historial_reportes') || '[]');
        document.getElementById('stats-reportes-total').textContent = historialData.length;

        if (historialData.length > 0) {
            const ultimo = historialData[historialData.length - 1];
            document.getElementById('stats-reportes-fecha').textContent =
                new Date(ultimo.timestamp).toLocaleDateString('es-ES');
        }

        // Día actual
        const ventasTotal = parseFloat(document.getElementById('total-ventas')?.textContent.replace('$', '') || 0);
        document.getElementById('stats-dia-ventas').textContent = `$${ventasTotal.toFixed(0)}`;

        // Calcular total de registros del día
        const consumoData = StorageManager.getConsumoData();
        const extraccionesData = StorageManager.getExtraccionesData();
        const transferenciasData = StorageManager.getTransferenciasData();
        const totalRegistros = consumoData.length + extraccionesData.length + transferenciasData.length;
        document.getElementById('stats-dia-registros').textContent = totalRegistros;
    }

    async createBackupFolder() {
        if (!this.isMobile || !this.filesystem) return null;

        try {
            const folderPath = 'Gestor IPV/Backup';

            // PRIMERO: Intentar listar el directorio para ver si ya existe
            try {
                await this.filesystem.readdir({
                    path: folderPath,
                    directory: this.Directory.Documents
                });

                // Si llega aquí, la carpeta YA EXISTE
                console.log('✅ Carpeta de backup ya existe, usando:', folderPath);
                return folderPath;

            } catch (readError) {
                // Si hay error al leer, la carpeta NO EXISTE, entonces crearla
                console.log('📁 Carpeta no existe, creando:', folderPath);

                // Crear carpeta principal "Gestor IPV" si no existe
                try {
                    await this.filesystem.mkdir({
                        path: 'Gestor IPV',
                        directory: this.Directory.Documents,
                        recursive: true
                    });
                } catch (mkdir1Error) {
                    // Ignorar si ya existe
                    console.log('Carpeta "Gestor IPV" ya existe o error:', mkdir1Error.message);
                }

                // Crear subcarpeta "Backup"
                await this.filesystem.mkdir({
                    path: folderPath,
                    directory: this.Directory.Documents,
                    recursive: true
                });

                console.log('✅ Carpeta creada exitosamente:', folderPath);
                return folderPath;
            }

        } catch (error) {
            console.error('Error creando/verificando carpeta:', error);

            // Intentar método alternativo: usar solo "Backup" si "Gestor IPV/Backup" falla
            try {
                const simplePath = 'Backup';
                await this.filesystem.mkdir({
                    path: simplePath,
                    directory: this.Directory.Documents,
                    recursive: true
                });
                console.log('✅ Carpeta alternativa creada:', simplePath);
                return simplePath;
            } catch (fallbackError) {
                console.error('Error con método alternativo:', fallbackError);
                return null;
            }
        }
    }

    async backupProductos() {
        const confirm = await this.showConfirmationModal(
            'Backup de Productos',
            '¿Desea crear un backup de todos los productos (Salón y Cocina)?',
            'info'
        );

        if (!confirm) return;

        try {
            this.showProgressModal('Generando backup de productos...');

            const backupData = {
                type: 'productos',
                version: '1.0',
                timestamp: new Date().toISOString(),
                metadata: {
                    ...this.FILE_METADATA,
                    backupType: 'productos',
                    itemCount: {
                        productosSalon: StorageManager.getProducts().length,
                        productosCocina: StorageManager.getCocinaProducts().length
                    }
                },
                data: {
                    productosSalon: StorageManager.getProducts(),
                    productosCocina: StorageManager.getCocinaProducts()
                }
            };

            const jsonString = JSON.stringify(backupData, null, 2);

            if (this.isMobile) {
                const result = await this.saveBackupToDevice(jsonString, 'productos');
                this.showSuccess(`Backup guardado en: ${result.fileName}`);
            } else {
                this.downloadBackup(jsonString, 'productos');
                this.showSuccess('Backup descargado exitosamente');
            }

            this.addToHistory(backupData);
            this.updateSystemInfo();

        } catch (error) {
            console.error('Error en backup de productos:', error);
            this.showError('Error al crear backup: ' + error.message);
        } finally {
            this.hideProgressModal();
        }
    }

    async restoreProductos() {
        const confirm = await this.showConfirmationModal(
            'Restore de Productos',
            '⚠️ ADVERTENCIA: Esto reemplazará todos los productos actuales. ¿Continuar?',
            'warning'
        );

        if (!confirm) return;

        try {
            const backupData = await this.selectBackupFile('productos');
            if (!backupData) return;

            if (backupData.type !== 'productos') {
                this.showError('El archivo seleccionado no es un backup de productos');
                return;
            }

            // Restaurar productos
            if (backupData.data.productosSalon) {
                StorageManager.saveProducts(backupData.data.productosSalon);
            }

            if (backupData.data.productosCocina) {
                StorageManager.saveCocinaProducts(backupData.data.productosCocina);
            }

            this.showSuccess('Productos restaurados exitosamente');
            this.updateSystemInfo();
            this.updateStats();
            this.triggerProductUpdate();

            // Recargar secciones si es necesario
            if (typeof window.productManager?.renderProducts === 'function') {
                window.productManager.renderProducts();
            }

            // DISPARAR EVENTO GLOBAL
            document.dispatchEvent(new CustomEvent('restoreCompleted', {
                detail: { type: 'productos' }
            }));

            // ACTUALIZAR SECCIONES VISIBLES
            if (typeof window.updateAllVisibleSections === 'function') {
                window.updateAllVisibleSections('Productos');
            }


        } catch (error) {
            console.error('Error en restore de productos:', error);
            this.showError('Error al restaurar productos: ' + error.message);
        }
    }

    async backupReportes() {
        const confirm = await this.showConfirmationModal(
            'Backup de Reportes',
            '¿Desea crear un backup de todos los reportes históricos?',
            'info'
        );

        if (!confirm) return;

        try {
            this.showProgressModal('Generando backup de reportes...');

            const historialData = JSON.parse(localStorage.getItem('ipb_historial_reportes') || '[]');

            const backupData = {
                type: 'reportes',
                version: '1.0',
                timestamp: new Date().toISOString(),
                metadata: {
                    ...this.FILE_METADATA,
                    backupType: 'reportes',
                    itemCount: {
                        reportes: historialData.length
                    }
                },
                data: historialData
            };

            const jsonString = JSON.stringify(backupData, null, 2);

            if (this.isMobile) {
                const result = await this.saveBackupToDevice(jsonString, 'reportes');
                this.showSuccess(`Backup guardado en: ${result.fileName}`);
            } else {
                this.downloadBackup(jsonString, 'reportes');
                this.showSuccess('Backup descargado exitosamente');
            }

            this.addToHistory(backupData);
            this.updateSystemInfo();

        } catch (error) {
            console.error('Error en backup de reportes:', error);
            this.showError('Error al crear backup: ' + error.message);
        } finally {
            this.hideProgressModal();
        }
    }

    async restoreReportes() {
        const confirm = await this.showConfirmationModal(
            'Restore de Reportes',
            '⚠️ ADVERTENCIA: Esto reemplazará todos los reportes históricos. ¿Continuar?',
            'warning'
        );

        if (!confirm) return;

        try {
            const backupData = await this.selectBackupFile('reportes');
            if (!backupData) return;

            if (backupData.type !== 'reportes') {
                this.showError('El archivo seleccionado no es un backup de reportes');
                return;
            }

            // Restaurar reportes
            localStorage.setItem('ipb_historial_reportes', JSON.stringify(backupData.data));

            this.showSuccess('Reportes restaurados exitosamente');
            this.updateSystemInfo();

            // Actualizar historial si está visible
            if (typeof window.historialIPV?.cargarHistorial === 'function') {
                window.historialIPV.cargarHistorial();
            }

            // DISPARAR EVENTO GLOBAL
            document.dispatchEvent(new CustomEvent('restoreCompleted', {
                detail: { type: 'reportes' }
            }));

        } catch (error) {
            console.error('Error en restore de reportes:', error);
            this.showError('Error al restaurar reportes: ' + error.message);
        }
    }
    async backupDiaActual() {
        const confirm = await this.showConfirmationModal(
            'Backup del Día Actual',
            '¿Desea crear un backup de TODOS los datos del día actual?\n\n' +
            '📦 Incluye TODOS los productos actuales\n' +
            '🏪 Incluye todos los datos de ventas del día\n' +
            '💰 Incluye todos los registros financieros\n\n' +
            '⚠️ Al restaurar, TODOS los datos actuales serán REEMPLAZADOS.',
            'info'
        );

        if (!confirm) return;

        try {
            this.showProgressModal('Generando backup COMPLETO del día actual...');

            // Obtener datos ACTUALES de ventas del día (esto es lo que falta)
            const salonDataActual = StorageManager.getSalonData(); // Esto incluye venta, vendido, importe
            const cocinaDataActual = StorageManager.getCocinaData(); // Esto incluye venta, vendido, importe

            const backupData = {
                type: 'dia_actual',
                version: '1.0',
                timestamp: new Date().toISOString(),
                metadata: {
                    ...this.FILE_METADATA,
                    backupType: 'dia_actual',
                    note: 'Incluye TODOS los productos actuales y datos de ventas del día para reemplazo completo',
                    itemCount: {
                        productosSalon: StorageManager.getProducts().length,
                        productosCocina: StorageManager.getCocinaProducts().length,
                        salon: salonDataActual.length,
                        cocina: cocinaDataActual.length,
                        agregos: JSON.parse(localStorage.getItem('cocina_agregos') || '[]').length,
                        consumo: StorageManager.getConsumoData().length,
                        extracciones: StorageManager.getExtraccionesData().length,
                        transferencias: StorageManager.getTransferenciasData().length,
                        efectivo: JSON.parse(localStorage.getItem('ipb_efectivo_data') || '[]').length,
                        billetes: JSON.parse(localStorage.getItem('ipb_billetes_registros') || '[]').length
                    }
                },
                data: {
                    // PRODUCTOS BASE
                    productosSalon: StorageManager.getProducts(),
                    productosCocina: StorageManager.getCocinaProducts(),

                    // DATOS DE VENTAS DEL DÍA ACTUAL (¡ESTO ES LO IMPORTANTE!)
                    salon: salonDataActual, // Ahora SÍ guarda venta, vendido, importe
                    cocina: cocinaDataActual, // Ahora SÍ guarda venta, vendido, importe

                    // DATOS ADICIONALES DE COCINA
                    agregos: JSON.parse(localStorage.getItem('cocina_agregos') || '[]'),

                    // DATOS FINANCIEROS
                    consumo: StorageManager.getConsumoData(),
                    extracciones: StorageManager.getExtraccionesData(),
                    transferencias: StorageManager.getTransferenciasData(),
                    efectivo: JSON.parse(localStorage.getItem('ipb_efectivo_data') || '[]'),
                    billetes: JSON.parse(localStorage.getItem('ipb_billetes_registros') || '[]'),
                    conteoBilletes: JSON.parse(localStorage.getItem('ipb_conteo_billetes') || '[]'),

                    // CONFIGURACIÓN
                    dailyData: StorageManager.getDailyData(),
                    configuracionDia: {
                        fecha: new Date().toISOString().split('T')[0],
                        tasasUSD: JSON.parse(localStorage.getItem('ipb_tasas_usd') || '{}'),
                        efectivoInicial: localStorage.getItem('ipb_efectivo_inicial') || '0',
                        lastReset: localStorage.getItem('ipb_last_reset')
                    },

                    // HISTORIALES RELACIONADOS
                    historialCocina: JSON.parse(localStorage.getItem('cocina_historial') || '[]'),
                    historialSalon: JSON.parse(localStorage.getItem('salon_historial') || '[]'),
                    gastos: JSON.parse(localStorage.getItem("ipb_gastos_extras") || '[]'),
                    preciosCompra: JSON.parse(localStorage.getItem("ipb_precios_compra") || '[]')
                }
            };

            const jsonString = JSON.stringify(backupData, null, 2);

            if (this.isMobile) {
                const result = await this.saveBackupToDevice(jsonString, 'dia_actual');
                this.showSuccess(`✅ Backup del dia actual guardado`);
            } else {
                this.downloadBackup(jsonString, 'dia_actual');
                this.showSuccess(`✅ Backup del dia actual descargado`);
            }

            this.addToHistory(backupData);
            this.updateSystemInfo();

        } catch (error) {
            console.error('Error en backup del día:', error);
            this.showError('Error al crear backup: ' + error.message);
        } finally {
            this.hideProgressModal();
        }
    }

    async restoreDiaActual() {
        const confirm = await this.showConfirmationModal(
            'Restore del Día Actual<br><br>',
            '⚠️ ADVERTENCIA: Esto reemplazará TODOS los datos del día actual.\n\n<br>' +
            '📦 Incluye TODOS los productos actuales\n<br>' +
            '🏪 Incluye todos los datos de ventas del día\n<br>' +
            '💰 Incluye todos los registros financieros\n\n<br><br>' +
            '¿Continuar?',
            'warning'
        );

        if (!confirm) return;

        try {
            const backupData = await this.selectBackupFile('dia_actual');
            if (!backupData) return;

            if (backupData.type !== 'dia_actual') {
                this.showError('El archivo seleccionado no es un backup del día actual');
                return;
            }

            // Calcular estadísticas para confirmación adicional
            const ventasSalon = backupData.data?.salon?.length || 0;
            const ventasCocina = backupData.data?.cocina?.length || 0;
            const totalVentasSalon = backupData.data?.salon?.reduce((sum, item) => sum + (parseFloat(item.importe) || 0), 0) || 0;
            const totalVentasCocina = backupData.data?.cocina?.reduce((sum, item) => sum + (parseFloat(item.importe) || 0), 0) || 0;

            const finalConfirm = await this.showConfirmationModal(
                'Confirmación Final - Restore del Día',
                `Estas seguro de restablecer los datos:\n\n` +
                `⚠️ Todos los datos actuales serán reemplazados.\n\n` +
                `¿Continuar?`,
                'warning'
            );

            if (!finalConfirm) return;

            this.showProgressModal('Restaurando datos del día actual...');

            // ==================== 1. PRODUCTOS BASE ====================
            if (backupData.data.productosSalon && Array.isArray(backupData.data.productosSalon)) {
                console.log(`📦 Restaurando ${backupData.data.productosSalon.length} productos de salón`);
                StorageManager.saveProducts(backupData.data.productosSalon);
            }

            if (backupData.data.productosCocina && Array.isArray(backupData.data.productosCocina)) {
                console.log(`👨‍🍳 Restaurando ${backupData.data.productosCocina.length} productos de cocina`);
                StorageManager.saveCocinaProducts(backupData.data.productosCocina);
            }

            // ==================== 2. DATOS DE VENTAS (¡CRÍTICO!) ====================
            if (backupData.data.salon && Array.isArray(backupData.data.salon)) {
                console.log(`🏪 Restaurando ${backupData.data.salon.length} ventas de salón`);

                // Sincronizar IDs con productos actuales
                const productosActualesSalon = StorageManager.getProducts();
                const datosSalonValidados = backupData.data.salon.map(item => {
                    // Buscar producto correspondiente
                    let productoCorrespondiente = productosActualesSalon.find(p => p.id === item.id);

                    if (!productoCorrespondiente) {
                        productoCorrespondiente = productosActualesSalon.find(p =>
                            p.nombre.toLowerCase() === item.nombre.toLowerCase()
                        );
                    }

                    const productoFinal = productoCorrespondiente || { id: item.id, nombre: item.nombre, precio: item.precio };

                    return {
                        id: productoFinal.id,
                        nombre: productoFinal.nombre,
                        precio: parseFloat(productoFinal.precio) || 0,
                        inicio: parseInt(item.inicio) || 0,
                        entrada: parseInt(item.entrada) || 0,
                        venta: parseInt(item.venta) || 0,
                        final: parseInt(item.final) || 0,
                        finalEditado: Boolean(item.finalEditado) || false,
                        vendido: parseInt(item.vendido) || 0,
                        importe: parseFloat(item.importe) || 0,
                        historial: Array.isArray(item.historial) ? item.historial : [],
                        ultimaActualizacion: item.ultimaActualizacion || new Date().toLocaleTimeString('es-ES')
                    };
                });

                StorageManager.saveSalonData(datosSalonValidados);
                console.log(`💰 Total ventas salón: $${totalVentasSalon.toFixed(2)}`);
            }

            if (backupData.data.cocina && Array.isArray(backupData.data.cocina)) {
                console.log(`🍳 Restaurando ${backupData.data.cocina.length} ventas de cocina`);

                // Sincronizar IDs con productos actuales de cocina
                const productosActualesCocina = StorageManager.getCocinaProducts();
                const datosCocinaValidados = backupData.data.cocina.map(item => {
                    let productoCorrespondiente = productosActualesCocina.find(p => p.id === item.id);

                    if (!productoCorrespondiente) {
                        productoCorrespondiente = productosActualesCocina.find(p =>
                            p.nombre.toLowerCase() === item.nombre.toLowerCase()
                        );
                    }

                    const productoFinal = productoCorrespondiente || { id: item.id, nombre: item.nombre, precio: item.precio };

                    return {
                        id: productoFinal.id,
                        nombre: productoFinal.nombre,
                        precio: parseFloat(productoFinal.precio) || 0,
                        inicio: parseInt(item.inicio) || 0,
                        entrada: parseInt(item.entrada) || 0,
                        venta: parseInt(item.venta) || 0,
                        final: parseInt(item.final) || 0,
                        finalEditado: Boolean(item.finalEditado) || false,
                        vendido: parseInt(item.vendido) || 0,
                        importe: parseFloat(item.importe) || 0,
                        historial: Array.isArray(item.historial) ? item.historial : [],
                        ultimaActualizacion: item.ultimaActualizacion || new Date().toLocaleTimeString('es-ES')
                    };
                });

                StorageManager.saveCocinaData(datosCocinaValidados);
                console.log(`💰 Total ventas cocina: $${totalVentasCocina.toFixed(2)}`);
            }

            // ==================== 3. DATOS FINANCIEROS ====================
            if (backupData.data.consumo && Array.isArray(backupData.data.consumo)) {
                StorageManager.saveConsumoData(backupData.data.consumo);
                console.log(`💵 Consumo restaurado: ${backupData.data.consumo.length} registros`);
            }

            if (backupData.data.extracciones && Array.isArray(backupData.data.extracciones)) {
                StorageManager.saveExtraccionesData(backupData.data.extracciones);
                console.log(`💰 Extracciones restauradas: ${backupData.data.extracciones.length} registros`);
            }

            if (backupData.data.transferencias && Array.isArray(backupData.data.transferencias)) {
                StorageManager.saveTransferenciasData(backupData.data.transferencias);
                console.log(`🔄 Transferencias restauradas: ${backupData.data.transferencias.length} registros`);
            }

            if (backupData.data.efectivo && Array.isArray(backupData.data.efectivo)) {
                localStorage.setItem('ipb_efectivo_data', JSON.stringify(backupData.data.efectivo));
                console.log(`💵 Efectivo restaurado: ${backupData.data.efectivo.length} registros`);
            }

            if (backupData.data.billetes && Array.isArray(backupData.data.billetes)) {
                localStorage.setItem('ipb_billetes_registros', JSON.stringify(backupData.data.billetes));
                console.log(`💵 Billetes restaurados: ${backupData.data.billetes.length} registros`);
            }

            // ==================== 4. DATOS ADICIONALES DE COCINA ====================
            if (backupData.data.agregos && Array.isArray(backupData.data.agregos)) {
                localStorage.setItem('cocina_agregos', JSON.stringify(backupData.data.agregos));
                console.log(`➕ Agregos cocina: ${backupData.data.agregos.length}`);
            }

            // ==================== 5. CONFIGURACIONES ====================
            if (backupData.data.dailyData && typeof backupData.data.dailyData === 'object') {
                StorageManager.saveDailyData(backupData.data.dailyData);
            }

            if (backupData.data.configuracionDia) {
                if (backupData.data.configuracionDia.tasasUSD && typeof backupData.data.configuracionDia.tasasUSD === 'object') {
                    localStorage.setItem('ipb_tasas_usd', JSON.stringify(backupData.data.configuracionDia.tasasUSD));
                }
                if (backupData.data.configuracionDia.efectivoInicial) {
                    localStorage.setItem('ipb_efectivo_inicial', backupData.data.configuracionDia.efectivoInicial.toString());
                }
                if (backupData.data.configuracionDia.lastReset) {
                    localStorage.setItem('ipb_last_reset', backupData.data.configuracionDia.lastReset);
                }
                console.log(`⚙️ Configuraciones restauradas`);
            }

            // ==================== 6. HISTORIALES ====================
            if (backupData.data.historialCocina && Array.isArray(backupData.data.historialCocina)) {
                localStorage.setItem('cocina_historial', JSON.stringify(backupData.data.historialCocina));
            }

            if (backupData.data.historialSalon && Array.isArray(backupData.data.historialSalon)) {
                localStorage.setItem('salon_historial', JSON.stringify(backupData.data.historialSalon));
            }

            if (backupData.data.gastos && Array.isArray(backupData.data.gastos)) {
                localStorage.setItem('ipb_gastos_extras', JSON.stringify(backupData.data.gastos));
            }
            if (backupData.data.preciosCompra && Array.isArray(backupData.data.preciosCompra)) {
                localStorage.setItem('ipb_precios_compra', JSON.stringify(backupData.data.preciosCompra));
            }

            this.showSuccess(`✅ Todos los datos del día han sido restaurados`);

            this.updateSystemInfo();
            this.updateStats();

            // ==================== 7. ACTUALIZAR TODAS LAS UI ====================
            setTimeout(() => {
                console.log('🔄 Actualizando todas las UI después del restore...');

                // Forzar recarga de productos
                if (typeof window.forceReloadProducts === 'function') {
                    window.forceReloadProducts();
                }

                // Actualizar cocina
                if (typeof window.cargarDatosCocina === 'function') {
                    setTimeout(() => window.cargarDatosCocina(), 400);
                }

                // Actualizar resumen
                if (typeof window.updateSummary === 'function') {
                    setTimeout(() => window.updateSummary(), 300);
                }

                // Actualizar todas las secciones visibles
                if (typeof window.updateAllVisibleSections === 'function') {
                    setTimeout(() => {
                        window.updateAllVisibleSections('Dia actual');
                    }, 500);
                }

                // Disparar evento global
                document.dispatchEvent(new CustomEvent('restoreCompleted', {
                    detail: {
                        type: 'dia_actual',
                        timestamp: new Date().toISOString(),
                        datos: {
                            productosSalon: backupData.data?.productosSalon?.length || 0,
                            productosCocina: backupData.data?.productosCocina?.length || 0,
                            ventasSalon: ventasSalon,
                            ventasCocina: ventasCocina
                        }
                    }
                }));

                window.location.reload()


            }, 1500);

        } catch (error) {
            console.error('❌ Error en restore del día:', error);
            this.showError('Error al restaurar datos del día: ' + error.message);
        } finally {
            this.hideProgressModal();
        }
    }

    async backupCompleto() {
        const confirm = await this.showConfirmationModal(
            'Backup Completo',
            '¿Desea crear un backup completo de todo el sistema?\n\n<br><br>' +
            '📦 Incluye TODOS los productos (Salón y Cocina)\n<br>' +
            '🏪 Incluye todos los datos de ventas del día actual\n<br>' +
            '📊 Incluye todos los reportes históricos\n<br>' +
            '💰 Incluye todos los registros financieros\n<br>' +
            '⚙️ Incluye todas las configuraciones\n<br>' +
            '👤 Incluye todos los usuarios\n<br>' +
            '📋 Incluye todos los datos adicionales\n\n<br>' +
            '⚠️ Este backup contiene TODO su sistema para restaurar completamente.',
            'info'
        );

        if (!confirm) return;

        try {
            this.showProgressModal('Generando backup completo del sistema...');

            // Obtener datos ACTUALES
            const salonDataActual = StorageManager.getSalonData();
            const cocinaDataActual = StorageManager.getCocinaData();

            // Obtener TODAS las claves posibles
            const backupData = {
                type: 'completo',
                version: '1.0',
                timestamp: new Date().toISOString(),
                metadata: {
                    ...this.FILE_METADATA,
                    backupType: 'completo',
                    note: 'Backup completo del sistema incluyendo TODOS los datos',
                    itemCount: {
                        productosSalon: StorageManager.getProducts().length,
                        productosCocina: StorageManager.getCocinaProducts().length,
                        salon: salonDataActual.length,
                        cocina: cocinaDataActual.length,
                        agregos: JSON.parse(localStorage.getItem('cocina_agregos') || '[]').length,
                        consumo: StorageManager.getConsumoData().length,
                        extracciones: StorageManager.getExtraccionesData().length,
                        transferencias: StorageManager.getTransferenciasData().length,
                        efectivo: JSON.parse(localStorage.getItem('ipb_efectivo_data') || '[]').length,
                        billetes: JSON.parse(localStorage.getItem('ipb_billetes_registros') || '[]').length,
                        reportes: JSON.parse(localStorage.getItem('ipb_historial_reportes') || '[]').length,
                        reportesCocina: JSON.parse(localStorage.getItem('ipb_historial_reportes_cocina') || '[]').length,
                        usuarios: JSON.parse(localStorage.getItem('ipv_users') || '[]').length,
                        gastos: JSON.parse(localStorage.getItem('ipb_gastos_extras') || '[]').length,
                        pedidos: JSON.parse(localStorage.getItem('ipb_pedidos') || '[]').length,
                        mesas: JSON.parse(localStorage.getItem('ipb_mesas') || '[]').length,
                        clientes: JSON.parse(localStorage.getItem('ipb_clientes') || '[]').length
                    },
                    ventasDelDia: {
                        totalSalon: salonDataActual.reduce((sum, item) => sum + (parseFloat(item.importe) || 0), 0).toFixed(2),
                        totalCocina: cocinaDataActual.reduce((sum, item) => sum + (parseFloat(item.importe) || 0), 0).toFixed(2),
                        fecha: new Date().toISOString().split('T')[0]
                    }
                },
                data: {
                    // ============= 1. PRODUCTOS BASE =============
                    productosSalon: StorageManager.getProducts(),
                    productosCocina: StorageManager.getCocinaProducts(),

                    // ============= 2. VENTAS DEL DÍA =============
                    salon: salonDataActual,
                    cocina: cocinaDataActual,

                    // ============= 3. DATOS DE COCINA =============
                    agregos: JSON.parse(localStorage.getItem('cocina_agregos') || '[]'),

                    // ============= 4. DATOS FINANCIEROS =============
                    consumo: StorageManager.getConsumoData(),
                    extracciones: StorageManager.getExtraccionesData(),
                    transferencias: StorageManager.getTransferenciasData(),
                    efectivo: JSON.parse(localStorage.getItem('ipb_efectivo_data') || '[]'),
                    billetes: JSON.parse(localStorage.getItem('ipb_billetes_registros') || '[]'),
                    conteoBilletes: JSON.parse(localStorage.getItem('ipb_conteo_billetes') || '[]'),

                    // ============= 5. DAILY DATA =============
                    dailyData: StorageManager.getDailyData(),

                    // ============= 6. REPORTES HISTÓRICOS =============
                    reportes: JSON.parse(localStorage.getItem('ipb_historial_reportes') || '[]'),
                    reportesCocina: JSON.parse(localStorage.getItem('ipb_historial_reportes_cocina') || '[]'),

                    // ============= 7. CONFIGURACIONES =============
                    configuraciones: {
                        lastReset: localStorage.getItem('ipb_last_reset'),
                        tasasUSD: JSON.parse(localStorage.getItem('ipb_tasas_usd') || '{}'),
                        efectivoInicial: localStorage.getItem('ipb_efectivo_inicial') || '0',
                        fechaActual: new Date().toISOString().split('T')[0],
                        totalProductos: StorageManager.getProducts().length + StorageManager.getCocinaProducts().length,
                        totalReportes: JSON.parse(localStorage.getItem('ipb_historial_reportes') || '[]').length +
                            JSON.parse(localStorage.getItem('ipb_historial_reportes_cocina') || '[]').length,
                        notificationChannelCreated: localStorage.getItem('gestor_ipv_notification_channel_created'),
                        notificationsEnabled: localStorage.getItem('gestor_ipv_notifications_enabled'),
                        autoBackupSchedule: localStorage.getItem('gestor_ipv_auto_backup_schedule'),
                        sidebarCollapsed: localStorage.getItem('sidebar-collapsed'),
                        currentTheme: localStorage.getItem('gestor-ipv-theme'),
                        lastActiveTab: localStorage.getItem('last-active-tab')
                    },

                    // ============= 8. DATOS ADICIONALES =============
                    gastos: JSON.parse(localStorage.getItem('ipb_gastos_extras') || '[]'),
                    preciosCompra: JSON.parse(localStorage.getItem('ipb_precios_compra') || '[]'),

                    // ============= 9. SISTEMA DE USUARIOS =============
                    auth: {
                        usuarios: JSON.parse(localStorage.getItem('ipv_users') || '[]'),
                        currentUser: localStorage.getItem('ipv_current_user'),
                        token: localStorage.getItem('ipv_token')
                    },

                    // ============= 10. DATOS ESPECÍFICOS DE VENTAS =============
                    ventasEspecificas: {
                        ventasPorHora: JSON.parse(localStorage.getItem('ipb_ventas_por_hora') || '[]'),
                        productosMasVendidos: JSON.parse(localStorage.getItem('ipb_productos_mas_vendidos') || '[]')
                    },

                    // ============= 11. DATOS DE PEDIDOS =============
                    pedidos: JSON.parse(localStorage.getItem('ipb_pedidos') || '[]'),

                    // ============= 12. DATOS DE INVENTARIO =============
                    inventario: {
                        historial: JSON.parse(localStorage.getItem('ipb_inventario_historial') || '[]'),
                        ajustes: JSON.parse(localStorage.getItem('ipb_inventario_ajustes') || '[]')
                    },

                    // ============= 13. DATOS DE MESAS =============
                    mesas: JSON.parse(localStorage.getItem('ipb_mesas') || '[]'),

                    // ============= 14. DATOS DE CLIENTES =============
                    clientes: JSON.parse(localStorage.getItem('ipb_clientes') || '[]'),

                    // ============= 15. CONFIGURACIÓN DE IMPRESORA =============
                    printerConfig: JSON.parse(localStorage.getItem('ipb_printer_config') || '{}'),

                    // ============= 16. DATOS DE SINCRONIZACIÓN =============
                    sincronizacion: {
                        ultimaSincronizacion: localStorage.getItem('ipb_ultima_sincronizacion'),
                        datosPendientes: JSON.parse(localStorage.getItem('ipb_datos_pendientes') || '[]')
                    },

                    // ============= 17. CACHE =============
                    cache: {
                        productosCache: localStorage.getItem('ipb_productos_cache'),
                        reportesCache: localStorage.getItem('ipb_reportes_cache'),
                        estadisticasCache: localStorage.getItem('ipb_estadisticas_cache')
                    },

                    // ============= 18. DATOS DE AUDITORÍA =============
                    auditoria: {
                        logsAcciones: JSON.parse(localStorage.getItem('ipb_logs_acciones') || '[]'),
                        cambiosProductos: JSON.parse(localStorage.getItem('ipb_cambios_productos') || '[]')
                    },

                    // ============= 19. VARIABLES GLOBALES =============
                    variablesGlobales: {
                        appVersion: localStorage.getItem('app_version'),
                        deviceId: localStorage.getItem('device_id'),
                        installationDate: localStorage.getItem('installation_date'),
                        lastUpdateCheck: localStorage.getItem('last_update_check')
                    },

                    // ============= 20. NOTIFICACIONES =============
                    notificaciones: {
                        pending: JSON.parse(localStorage.getItem('gestor_ipv_notifications_pending') || '[]'),
                        scheduled: JSON.parse(localStorage.getItem('gestor_ipv_notifications_scheduled') || '[]')
                    },

                    // ============= 21. HISTORIAL DE CAMBIOS =============
                    historialCambios: {
                        productos: JSON.parse(localStorage.getItem('ipb_historial_cambios_productos') || '[]'),
                        precios: JSON.parse(localStorage.getItem('ipb_historial_cambios_precios') || '[]')
                    },

                    // ============= 22. CONFIGURACIÓN DEL SISTEMA =============
                    systemConfig: {
                        idioma: localStorage.getItem('ipb_idioma'),
                        moneda: localStorage.getItem('ipb_moneda'),
                        zonaHoraria: localStorage.getItem('ipb_zona_horaria'),
                        formatoFecha: localStorage.getItem('ipb_formato_fecha')
                    },

                    // ============= 23. ESTADÍSTICAS =============
                    estadisticas: {
                        totalVentas: localStorage.getItem('ipb_total_ventas'),
                        ventasPromedio: localStorage.getItem('ipb_ventas_promedio'),
                        productosPopulares: JSON.parse(localStorage.getItem('ipb_productos_populares') || '[]'),
                        horasPico: JSON.parse(localStorage.getItem('ipb_horas_pico') || '[]')
                    },

                    // ============= 24. RESERVAS =============
                    reservas: JSON.parse(localStorage.getItem('ipb_reservas') || '[]'),

                    // ============= 25. PROMOCIONES =============
                    promociones: JSON.parse(localStorage.getItem('ipb_promociones') || '[]'),

                    // ============= 26. PROVEEDORES =============
                    proveedores: JSON.parse(localStorage.getItem('ipb_proveedores') || '[]'),

                    // ============= 27. COMPRAS =============
                    compras: JSON.parse(localStorage.getItem('ipb_compras') || '[]'),

                    // ============= 28. PRODUCTOS COMPUESTOS =============
                    productosCompuestos: JSON.parse(localStorage.getItem('ipb_productos_compuestos') || '[]'),

                    // ============= 29. AVATARES =============
                    avatares: await this.recopilarAvataresLocalStorage(),

                    // ============= 30. AGREGAR CABECERA MÁGICA =============
                    _header: this.MAGIC_HEADER,
                    _signature: this.FILE_SIGNATURE,
                    _appIdentifier: this.APP_IDENTIFIER
                }
            };

            // AGREGAR CABECERA MÁGICA AL NIVEL PRINCIPAL TAMBIÉN
            backupData._header = this.MAGIC_HEADER;
            backupData._signature = this.FILE_SIGNATURE;
            backupData._appIdentifier = this.APP_IDENTIFIER;

            const jsonString = JSON.stringify(backupData, null, 2);

            if (this.isMobile) {
                const result = await this.saveBackupToDevice(jsonString, 'completo');
                this.showSuccess(`✅ Backup COMPLETO guardado`);
            } else {
                this.downloadBackup(jsonString, 'completo');
                this.showSuccess(`✅ Backup COMPLETO descargado`);
            }

            this.addToHistory(backupData);
            this.updateSystemInfo();

        } catch (error) {
            console.error('Error en backup completo:', error);
            this.showError('Error al crear backup completo: ' + error.message);
        } finally {
            this.hideProgressModal();
        }
    }

    // MÉTODO AUXILIAR PARA RECOPILAR AVATARES DESDE LOCALSTORAGE
    async recopilarAvataresLocalStorage() {
        const avatares = {};
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('ipv_avatar_') || key.includes('avatar'))) {
                    avatares[key] = localStorage.getItem(key);
                }
            }
            return avatares;
        } catch (error) {
            console.error('Error recopilando avatares:', error);
            return {};
        }
    }

    async restoreCompleto() {
        const confirm = await this.showConfirmationModal(
            'Restore Completo del Sistema<br>',
            '⚠️ ADVERTENCIA CRÍTICA: Esto reemplazará TODO el sistema.\n\n<br><br>' +
            '📦 Productos: Salón y Cocina\n<br>' +
            '🏪 Ventas del día: Datos actuales de ventas\n<br>' +
            '📊 Reportes: Historial completo\n<br>' +
            '💰 Finanzas: Consumo, extracciones, transferencias\n<br>' +
            '⚙️ Configuraciones: Tasas, reset, iniciales\n<br>' +
            '👤 Usuarios: Todos los usuarios\n<br>' +
            '📋 Todos los datos adicionales\n\n<br>' +
            '¿Está absolutamente seguro?',
            'error'
        );

        if (!confirm) return;

        try {
            const backupData = await this.selectBackupFile('completo');
            if (!backupData) return;

            if (backupData.type !== 'completo') {
                this.showError('El archivo seleccionado no es un backup completo');
                return;
            }

            // Calcular estadísticas
            const ventasSalon = backupData.data?.salon?.length || 0;
            const ventasCocina = backupData.data?.cocina?.length || 0;
            const productosSalonCount = backupData.data?.productosSalon?.length || 0;
            const productosCocinaCount = backupData.data?.productosCocina?.length || 0;
            const reportesCount = backupData.data?.reportes?.length || 0;
            const usuariosCount = backupData.data?.auth?.usuarios?.length || 0;

            const finalConfirm = await this.showConfirmationModal(
                'CONFIRMACIÓN FINAL - Restore Completo',
                `📊 RESUMEN DEL BACKUP:\n\n` +
                `📦 Productos Salón: ${productosSalonCount}\n` +
                `👨‍🍳 Productos Cocina: ${productosCocinaCount}\n` +
                `🏪 Ventas Salón: ${ventasSalon}\n` +
                `🍳 Ventas Cocina: ${ventasCocina}\n` +
                `📊 Reportes: ${reportesCount}\n` +
                `👤 Usuarios: ${usuariosCount}\n\n` +
                `⚠️ Esta acción NO se puede deshacer. ¿Continuar con el restore completo?`,
                'error'
            );

            if (!finalConfirm) return;

            this.showProgressModal('Restaurando sistema completo...');

            const data = backupData.data;

            console.log('🔄 Iniciando restore completo del sistema...');

            // ==================== 1. PRODUCTOS BASE ====================
            if (data.productosSalon && Array.isArray(data.productosSalon)) {
                console.log(`📦 Restaurando ${data.productosSalon.length} productos de salón`);
                StorageManager.saveProducts(data.productosSalon);
            }

            if (data.productosCocina && Array.isArray(data.productosCocina)) {
                console.log(`👨‍🍳 Restaurando ${data.productosCocina.length} productos de cocina`);
                StorageManager.saveCocinaProducts(data.productosCocina);
            }

            // ==================== 2. VENTAS DEL DÍA ====================
            if (data.salon && Array.isArray(data.salon)) {
                console.log(`🏪 Restaurando ${data.salon.length} ventas de salón`);
                const productosActualesSalon = StorageManager.getProducts();
                const datosSalonValidados = data.salon.map(item => {
                    let productoCorrespondiente = productosActualesSalon.find(p => p.id === item.id);
                    if (!productoCorrespondiente) {
                        productoCorrespondiente = productosActualesSalon.find(p =>
                            p.nombre.toLowerCase() === item.nombre?.toLowerCase()
                        );
                    }
                    const productoFinal = productoCorrespondiente || { id: item.id, nombre: item.nombre, precio: item.precio };

                    return {
                        id: productoFinal.id,
                        nombre: productoFinal.nombre,
                        precio: parseFloat(productoFinal.precio) || 0,
                        inicio: parseInt(item.inicio) || 0,
                        entrada: parseInt(item.entrada) || 0,
                        venta: parseInt(item.venta) || 0,
                        final: parseInt(item.final) || 0,
                        finalEditado: Boolean(item.finalEditado) || false,
                        vendido: parseInt(item.vendido) || 0,
                        importe: parseFloat(item.importe) || 0,
                        historial: Array.isArray(item.historial) ? item.historial : [],
                        ultimaActualizacion: item.ultimaActualizacion || new Date().toLocaleTimeString('es-ES')
                    };
                });
                StorageManager.saveSalonData(datosSalonValidados);
            }

            if (data.cocina && Array.isArray(data.cocina)) {
                console.log(`🍳 Restaurando ${data.cocina.length} ventas de cocina`);
                const productosActualesCocina = StorageManager.getCocinaProducts();
                const datosCocinaValidados = data.cocina.map(item => {
                    let productoCorrespondiente = productosActualesCocina.find(p => p.id === item.id);
                    if (!productoCorrespondiente) {
                        productoCorrespondiente = productosActualesCocina.find(p =>
                            p.nombre.toLowerCase() === item.nombre?.toLowerCase()
                        );
                    }
                    const productoFinal = productoCorrespondiente || { id: item.id, nombre: item.nombre, precio: item.precio };

                    return {
                        id: productoFinal.id,
                        nombre: productoFinal.nombre,
                        precio: parseFloat(productoFinal.precio) || 0,
                        inicio: parseInt(item.inicio) || 0,
                        entrada: parseInt(item.entrada) || 0,
                        venta: parseInt(item.venta) || 0,
                        final: parseInt(item.final) || 0,
                        finalEditado: Boolean(item.finalEditado) || false,
                        vendido: parseInt(item.vendido) || 0,
                        importe: parseFloat(item.importe) || 0,
                        historial: Array.isArray(item.historial) ? item.historial : [],
                        ultimaActualizacion: item.ultimaActualizacion || new Date().toLocaleTimeString('es-ES')
                    };
                });
                StorageManager.saveCocinaData(datosCocinaValidados);
            }

            // ==================== 3. AGREGOS CON VALIDACIÓN ====================
            if (data.agregos && Array.isArray(data.agregos)) {
                console.log(`➕ Restaurando ${data.agregos.length} agregos`);
                const agregosLimpios = data.agregos.map(agrego => ({
                    ...agrego,
                    precio: parseFloat(agrego.precio) || 0,
                    montoTotal: parseFloat(agrego.montoTotal) || 0,
                    ingredientes: (agrego.ingredientes || []).map(ing => ({
                        ...ing,
                        cantidadPorUnidad: parseInt(ing.cantidadPorUnidad) || 1,
                        cantidadTotal: parseInt(ing.cantidadTotal) || 0
                    }))
                }));
                localStorage.setItem('cocina_agregos', JSON.stringify(agregosLimpios));
            }

            // ==================== 4. DATOS FINANCIEROS ====================
            if (data.consumo && Array.isArray(data.consumo)) {
                StorageManager.saveConsumoData(data.consumo);
            }
            if (data.extracciones && Array.isArray(data.extracciones)) {
                StorageManager.saveExtraccionesData(data.extracciones);
            }
            if (data.transferencias && Array.isArray(data.transferencias)) {
                StorageManager.saveTransferenciasData(data.transferencias);
            }
            if (data.efectivo && Array.isArray(data.efectivo)) {
                localStorage.setItem('ipb_efectivo_data', JSON.stringify(data.efectivo));
            }
            if (data.billetes && Array.isArray(data.billetes)) {
                localStorage.setItem('ipb_billetes_registros', JSON.stringify(data.billetes));
            }
            if (data.conteoBilletes && Array.isArray(data.conteoBilletes)) {
                localStorage.setItem('ipb_conteo_billetes', JSON.stringify(data.conteoBilletes));
            }
            if (data.dailyData && typeof data.dailyData === 'object') {
                StorageManager.saveDailyData(data.dailyData);
            }

            // ==================== 5. REPORTES ====================
            if (data.reportes && Array.isArray(data.reportes)) {
                localStorage.setItem('ipb_historial_reportes', JSON.stringify(data.reportes));
            }
            if (data.reportesCocina && Array.isArray(data.reportesCocina)) {
                localStorage.setItem('ipb_historial_reportes_cocina', JSON.stringify(data.reportesCocina));
            }

            // ==================== 6. CONFIGURACIONES ====================
            if (data.configuraciones) {
                if (data.configuraciones.lastReset) {
                    localStorage.setItem('ipb_last_reset', data.configuraciones.lastReset);
                }
                if (data.configuraciones.tasasUSD) {
                    localStorage.setItem('ipb_tasas_usd', JSON.stringify(data.configuraciones.tasasUSD));
                }
                if (data.configuraciones.efectivoInicial) {
                    localStorage.setItem('ipb_efectivo_inicial', data.configuraciones.efectivoInicial.toString());
                }
                if (data.configuraciones.notificationChannelCreated) {
                    localStorage.setItem('gestor_ipv_notification_channel_created', data.configuraciones.notificationChannelCreated);
                }
                if (data.configuraciones.notificationsEnabled) {
                    localStorage.setItem('gestor_ipv_notifications_enabled', data.configuraciones.notificationsEnabled);
                }
                if (data.configuraciones.autoBackupSchedule) {
                    localStorage.setItem('gestor_ipv_auto_backup_schedule', data.configuraciones.autoBackupSchedule);
                }
                if (data.configuraciones.sidebarCollapsed !== undefined) {
                    localStorage.setItem('sidebar-collapsed', data.configuraciones.sidebarCollapsed);
                }
                if (data.configuraciones.currentTheme) {
                    localStorage.setItem('gestor-ipv-theme', data.configuraciones.currentTheme);
                }
                if (data.configuraciones.lastActiveTab) {
                    localStorage.setItem('last-active-tab', data.configuraciones.lastActiveTab);
                }
            }

            // ==================== 7. DATOS ADICIONALES ====================
            if (data.gastos && Array.isArray(data.gastos)) {
                localStorage.setItem('ipb_gastos_extras', JSON.stringify(data.gastos));
            }
            if (data.preciosCompra && Array.isArray(data.preciosCompra)) {
                localStorage.setItem('ipb_precios_compra', JSON.stringify(data.preciosCompra));
            }

            // ==================== 8. USUARIOS ====================
            if (data.auth) {
                if (data.auth.usuarios && Array.isArray(data.auth.usuarios)) {
                    localStorage.setItem('ipv_users', JSON.stringify(data.auth.usuarios));
                }
                if (data.auth.currentUser) {
                    localStorage.setItem('ipv_current_user', data.auth.currentUser);
                }
                if (data.auth.token) {
                    localStorage.setItem('ipv_token', data.auth.token);
                }
            }

            // ==================== 9. DATOS ESPECÍFICOS ====================
            if (data.ventasEspecificas) {
                if (data.ventasEspecificas.ventasPorHora) {
                    localStorage.setItem('ipb_ventas_por_hora', JSON.stringify(data.ventasEspecificas.ventasPorHora));
                }
                if (data.ventasEspecificas.productosMasVendidos) {
                    localStorage.setItem('ipb_productos_mas_vendidos', JSON.stringify(data.ventasEspecificas.productosMasVendidos));
                }
            }

            // ==================== 10. RESTAURAR DATOS ADICIONALES ====================
            // Función auxiliar para restaurar datos adicionales
            const restaurarDato = (clave, valor) => {
                if (valor !== undefined && valor !== null) {
                    localStorage.setItem(clave, JSON.stringify(valor));
                    console.log(`💾 Restaurado: ${clave}`);
                }
            };

            // Restaurar todos los datos adicionales
            if (data.pedidos) restaurarDato('ipb_pedidos', data.pedidos);
            if (data.inventario) {
                if (data.inventario.historial) restaurarDato('ipb_inventario_historial', data.inventario.historial);
                if (data.inventario.ajustes) restaurarDato('ipb_inventario_ajustes', data.inventario.ajustes);
            }
            if (data.mesas) restaurarDato('ipb_mesas', data.mesas);
            if (data.clientes) restaurarDato('ipb_clientes', data.clientes);
            if (data.printerConfig) restaurarDato('ipb_printer_config', data.printerConfig);
            if (data.sincronizacion) {
                if (data.sincronizacion.ultimaSincronizacion) {
                    localStorage.setItem('ipb_ultima_sincronizacion', data.sincronizacion.ultimaSincronizacion);
                }
                if (data.sincronizacion.datosPendientes) {
                    restaurarDato('ipb_datos_pendientes', data.sincronizacion.datosPendientes);
                }
            }
            if (data.cache) {
                if (data.cache.productosCache) localStorage.setItem('ipb_productos_cache', data.cache.productosCache);
                if (data.cache.reportesCache) localStorage.setItem('ipb_reportes_cache', data.cache.reportesCache);
                if (data.cache.estadisticasCache) localStorage.setItem('ipb_estadisticas_cache', data.cache.estadisticasCache);
            }
            if (data.auditoria) {
                if (data.auditoria.logsAcciones) restaurarDato('ipb_logs_acciones', data.auditoria.logsAcciones);
                if (data.auditoria.cambiosProductos) restaurarDato('ipb_cambios_productos', data.auditoria.cambiosProductos);
            }
            if (data.variablesGlobales) {
                if (data.variablesGlobales.appVersion) localStorage.setItem('app_version', data.variablesGlobales.appVersion);
                if (data.variablesGlobales.deviceId) localStorage.setItem('device_id', data.variablesGlobales.deviceId);
                if (data.variablesGlobales.installationDate) localStorage.setItem('installation_date', data.variablesGlobales.installationDate);
                if (data.variablesGlobales.lastUpdateCheck) localStorage.setItem('last_update_check', data.variablesGlobales.lastUpdateCheck);
            }
            if (data.notificaciones) {
                if (data.notificaciones.pending) restaurarDato('gestor_ipv_notifications_pending', data.notificaciones.pending);
                if (data.notificaciones.scheduled) restaurarDato('gestor_ipv_notifications_scheduled', data.notificaciones.scheduled);
            }
            if (data.historialCambios) {
                if (data.historialCambios.productos) restaurarDato('ipb_historial_cambios_productos', data.historialCambios.productos);
                if (data.historialCambios.precios) restaurarDato('ipb_historial_cambios_precios', data.historialCambios.precios);
            }
            if (data.systemConfig) {
                if (data.systemConfig.idioma) localStorage.setItem('ipb_idioma', data.systemConfig.idioma);
                if (data.systemConfig.moneda) localStorage.setItem('ipb_moneda', data.systemConfig.moneda);
                if (data.systemConfig.zonaHoraria) localStorage.setItem('ipb_zona_horaria', data.systemConfig.zonaHoraria);
                if (data.systemConfig.formatoFecha) localStorage.setItem('ipb_formato_fecha', data.systemConfig.formatoFecha);
            }
            if (data.estadisticas) {
                if (data.estadisticas.totalVentas) localStorage.setItem('ipb_total_ventas', data.estadisticas.totalVentas);
                if (data.estadisticas.ventasPromedio) localStorage.setItem('ipb_ventas_promedio', data.estadisticas.ventasPromedio);
                if (data.estadisticas.productosPopulares) restaurarDato('ipb_productos_populares', data.estadisticas.productosPopulares);
                if (data.estadisticas.horasPico) restaurarDato('ipb_horas_pico', data.estadisticas.horasPico);
            }
            if (data.reservas) restaurarDato('ipb_reservas', data.reservas);
            if (data.promociones) restaurarDato('ipb_promociones', data.promociones);
            if (data.proveedores) restaurarDato('ipb_proveedores', data.proveedores);
            if (data.compras) restaurarDato('ipb_compras', data.compras);
            if (data.productosCompuestos) restaurarDato('ipb_productos_compuestos', data.productosCompuestos);

            // ==================== 11. AVATARES ====================
            if (data.avatares && typeof data.avatares === 'object') {
                for (const [key, avatarData] of Object.entries(data.avatares)) {
                    localStorage.setItem(key, avatarData);
                }
            }

            this.showSuccess(`✅ Sistema completo restaurado exitosamente. Actualizando interfaz...`);
            this.updateSystemInfo();

            // ==================== 12. ACTUALIZAR UI ====================
            setTimeout(() => {
                console.log('🔄 Actualizando todas las UI después del restore...');

                // Forzar recarga completa
                if (typeof window.forceReloadProducts === 'function') {
                    window.forceReloadProducts();
                }
                if (typeof window.actualizarSalonDesdeProductos === 'function') {
                    setTimeout(() => window.actualizarSalonDesdeProductos(), 300);
                }
                if (typeof window.cargarDatosCocina === 'function') {
                    setTimeout(() => window.cargarDatosCocina(), 400);
                }
                if (typeof window.historialIPV?.cargarHistorial === 'function') {
                    setTimeout(() => window.historialIPV.cargarHistorial(), 500);
                }
                if (typeof window.updateAllVisibleSections === 'function') {
                    setTimeout(() => window.updateAllVisibleSections('Completo'), 600);
                }
                if (typeof window.updateSummary === 'function') {
                    setTimeout(() => window.updateSummary(), 300);
                }

                // Disparar evento global
                document.dispatchEvent(new CustomEvent('restoreCompleted', {
                    detail: {
                        type: 'completo',
                        timestamp: new Date().toISOString(),
                        datos: {
                            productosSalon: productosSalonCount,
                            productosCocina: productosCocinaCount,
                            ventasSalon: ventasSalon,
                            ventasCocina: ventasCocina,
                            reportes: reportesCount,
                            usuarios: usuariosCount
                        }
                    }
                }));

                console.log('✅ Restore completo finalizado exitosamente');
                window.location.reload();

            }, 1500);

        } catch (error) {
            console.error('❌ Error en restore completo:', error);
            this.showError('Error al restaurar sistema: ' + error.message);
        } finally {
            this.hideProgressModal();
        }
    }

    async saveBackupToDevice(jsonString, type) {
        if (!this.isMobile || !this.filesystem) {
            throw new Error('Sistema de archivos no disponible');
        }

        try {
            // Obtener carpeta de backup (puede que ya exista)
            const backupFolder = await this.createBackupFolder();
            if (!backupFolder) {
                throw new Error('No se pudo acceder a la carpeta de backup');
            }

            // Generar nombre de archivo
            const date = new Date();
            const timestamp = date.toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' +
                date.getHours() + date.getMinutes();
            const fileName = `${type}_${timestamp}${this.CUSTOM_EXTENSION}`;
            const filePath = `${backupFolder}/${fileName}`;

            console.log(`Guardando backup en: ${filePath}`);

            // Agregar cabecera mágica y firma
            const enhancedData = this.createEnhancedBackupData(jsonString, type);

            // Convertir a base64
            const base64Data = btoa(unescape(encodeURIComponent(enhancedData)));

            // Guardar archivo
            const result = await this.filesystem.writeFile({
                path: filePath,
                data: base64Data,
                directory: this.Directory.Documents,
                recursive: true
            });

            console.log('✅ Backup guardado exitosamente');

            // Registrar en historial
            localStorage.setItem('ipb_last_backup', new Date().toISOString());

            // Guardar metadatos del archivo
            await this.setFileProperties(filePath, type);

            return { path: filePath, fileName, result };

        } catch (error) {
            console.error('Error en saveBackupToDevice:', error);

            // Si el error es específico de carpeta, intentar método directo
            if (error.message.includes('folder') || error.message.includes('directory') ||
                error.message.includes('mkdir') || error.message.includes('exist')) {

                console.log('Intentando método de guardado directo...');

                try {
                    // Guardar directamente en Documents sin subcarpeta
                    const date = new Date();
                    const timestamp = date.toISOString().replace(/[:.]/g, '-').split('T')[0];
                    const fileName = `${type}_${timestamp}${this.CUSTOM_EXTENSION}`;

                    const enhancedData = this.createEnhancedBackupData(jsonString, type);
                    const base64Data = btoa(unescape(encodeURIComponent(enhancedData)));

                    const result = await this.filesystem.writeFile({
                        path: fileName,
                        data: base64Data,
                        directory: this.Directory.Documents,
                        recursive: true
                    });

                    console.log('✅ Backup guardado directamente en Documents');
                    localStorage.setItem('ipb_last_backup', new Date().toISOString());

                    return {
                        path: fileName,
                        fileName,
                        result,
                        note: 'Guardado directamente en Documents'
                    };

                } catch (directError) {
                    throw new Error(`No se pudo guardar el backup: ${directError.message}`);
                }
            }

            throw error;
        }
    }
    createEnhancedBackupData(jsonString, type) {
        const backupData = JSON.parse(jsonString);

        // Crear estructura mejorada con cabecera mágica
        const enhancedData = {
            _header: this.MAGIC_HEADER,
            _signature: this.FILE_SIGNATURE,
            _appIdentifier: this.APP_IDENTIFIER,
            _metadata: {
                ...backupData.metadata,
                fileExtension: this.CUSTOM_EXTENSION,
                createdTimestamp: new Date().toISOString(),
                fileSize: jsonString.length,
                protected: true,
                deviceInfo: this.getDeviceInfo()
            },
            ...backupData
        };

        return JSON.stringify(enhancedData, null, 2);
    }

    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenSize: `${window.screen.width}x${window.screen.height}`,
            isMobile: this.isMobile,
            timestamp: new Date().toISOString()
        };
    }

    async setFileProperties(filePath, type) {
        try {
            console.log(`Archivo guardado con propiedades especiales: ${filePath}`);

            // Guardar información de asociación
            if (this.preferences) {
                await this.preferences.set({
                    key: 'last_backup_file',
                    value: filePath
                });

                // Guardar metadatos adicionales
                await this.preferences.set({
                    key: 'backup_metadata',
                    value: JSON.stringify({
                        type: type,
                        timestamp: new Date().toISOString(),
                        path: filePath,
                        extension: this.CUSTOM_EXTENSION
                    })
                });
            }
        } catch (error) {
            console.warn('No se pudieron establecer propiedades del archivo:', error);
        }
    }

    async shareBackupFile() {
        if (!this.isMobile || !this.share) {
            this.showError('Compartir solo disponible en dispositivos móviles');
            return;
        }

        try {
            this.showProgressModal('Preparando archivo para compartir...');

            // Buscar el archivo más reciente en la carpeta de backups
            const backupFolder = 'Gestor IPV/Backup';
            let latestFile = null;
            let latestTime = 0;

            try {
                // Listar archivos en la carpeta de backup
                const dirResult = await this.filesystem.readdir({
                    path: backupFolder,
                    directory: this.Directory.Documents
                });

                if (dirResult.files && dirResult.files.length > 0) {
                    // Buscar el archivo más reciente con extensión .ipvbak
                    for (const file of dirResult.files) {
                        if (file.name.endsWith(this.CUSTOM_EXTENSION)) {
                            const fileStat = await this.filesystem.stat({
                                path: `${backupFolder}/${file.name}`,
                                directory: this.Directory.Documents
                            });

                            if (fileStat.mtime && fileStat.mtime > latestTime) {
                                latestTime = fileStat.mtime;
                                latestFile = file.name;
                            }
                        }
                    }
                }
            } catch (error) {
                console.warn('No se pudo leer directorio:', error);
            }

            if (!latestFile) {
                this.hideProgressModal();
                this.showError('No se encontraron archivos de backup. Cree uno primero.');
                return;
            }

            const filePath = `${backupFolder}/${latestFile}`;

            // Obtener información del archivo
            const fileStat = await this.filesystem.stat({
                path: filePath,
                directory: this.Directory.Documents
            });

            if (!fileStat || !fileStat.uri) {
                this.hideProgressModal();
                throw new Error('No se pudo obtener la URI del archivo');
            }

            // Convertir timestamp a fecha legible
            const fileDate = new Date(latestTime);
            const dateStr = fileDate.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            // Método 1: Intentar compartir con parámetros simplificados
            try {
                this.hideProgressModal();

                // Solo pasar parámetros esenciales como strings
                await this.share.share({
                    title: 'Backup Gestor IPV',  // Solo string
                    text: `Backup creado el ${dateStr}`,  // Solo string
                    url: fileStat.uri,  // Solo string
                    dialogTitle: 'Compartir backup'  // Solo string
                });

                this.showSuccess('Archivo compartido exitosamente');
                return;

            } catch (shareError) {
                console.log('Método 1 falló, intentando método 2:', shareError);

                // Método 2: Intentar con solo el parámetro obligatorio
                try {
                    await this.share.share({
                        title: 'Backup Gestor IPV',
                        text: `Backup del sistema Gestor IPV (${dateStr})`,
                        url: fileStat.uri
                    });

                    this.showSuccess('Archivo compartido exitosamente');
                    return;

                } catch (shareError2) {
                    console.log('Método 2 falló, intentando método 3:', shareError2);

                    // Método 3: Intentar con solo la URL (mínimo requerido)
                    try {
                        await this.share.share({
                            url: fileStat.uri
                        });

                        this.showSuccess('Archivo compartido exitosamente');
                        return;

                    } catch (shareError3) {
                        console.log('Método 3 falló:', shareError3);

                        // Método 4: Leer y convertir a base64 para compartir como datos
                        try {
                            const readResult = await this.filesystem.readFile({
                                path: filePath,
                                directory: this.Directory.Documents
                            });

                            // Crear un archivo temporal con un nombre único
                            const tempFileName = `temp_${Date.now()}${this.CUSTOM_EXTENSION}`;
                            const tempPath = `${backupFolder}/${tempFileName}`;

                            await this.filesystem.writeFile({
                                path: tempPath,
                                data: readResult.data,
                                directory: this.Directory.Documents,
                                recursive: true
                            });

                            const tempStat = await this.filesystem.stat({
                                path: tempPath,
                                directory: this.Directory.Documents
                            });

                            // Compartir con parámetros mínimos
                            await this.share.share({
                                title: 'Backup Gestor IPV',
                                url: tempStat.uri
                            });

                            // Limpiar temporal después de 10 segundos
                            setTimeout(async () => {
                                try {
                                    await this.filesystem.deleteFile({
                                        path: tempPath,
                                        directory: this.Directory.Documents
                                    });
                                } catch (e) {
                                    console.warn('No se pudo eliminar archivo temporal:', e);
                                }
                            }, 10000);

                            this.showSuccess('Archivo compartido exitosamente');

                        } catch (finalError) {
                            throw new Error(`No se pudo compartir: ${finalError.message}`);
                        }
                    }
                }
            }

        } catch (error) {
            this.hideProgressModal();
            console.error('Error al compartir:', error);

            // Mostrar mensaje más amigable
            if (error.message.includes('JSONObject') || error.message.includes('JSON')) {
                this.showError('Error de formato. Por favor, cree un nuevo backup e intente nuevamente.');
            } else if (error.message.includes('permission') || error.message.includes('PERMISSION')) {
                this.showError('Permiso denegado. Verifique los permisos de la aplicación.');
            } else if (error.message.includes('no app') || error.message.includes('No app')) {
                this.showError('No hay aplicaciones disponibles para compartir.');
            } else {
                this.showError('Error al compartir: ' + error.message);
            }
        }
    }

    downloadBackup(jsonString, type) {
        const date = new Date();
        const timestamp = date.toISOString().split('T')[0];

        // Usar extensión personalizada
        const fileName = `${type}_${timestamp}${this.CUSTOM_EXTENSION}`;

        // Agregar cabecera mágica y firma
        const enhancedData = this.createEnhancedBackupData(jsonString, type);

        const blob = new Blob([enhancedData], {
            type: 'application/octet-stream'
        });

        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;

        // Agregar atributos personalizados
        link.setAttribute('data-file-type', 'gestoripv-backup');
        link.setAttribute('data-app-identifier', this.APP_IDENTIFIER);

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        // Registrar en historial
        localStorage.setItem('ipb_last_backup', new Date().toISOString());
    }

    async selectBackupFile(expectedType) {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';

            // Solo aceptar archivos con nuestra extensión personalizada
            input.accept = this.CUSTOM_EXTENSION;

            input.style.display = 'none';

            input.onchange = async (event) => {
                const file = event.target.files[0];
                if (!file) {
                    resolve(null);
                    return;
                }

                try {
                    // Verificar extensión
                    if (!file.name.endsWith(this.CUSTOM_EXTENSION)) {
                        this.showError(`Por favor seleccione un archivo con extensión ${this.CUSTOM_EXTENSION}`);
                        resolve(null);
                        return;
                    }

                    const text = await file.text();
                    const backupData = this.parseBackupFile(text);

                    if (!backupData) {
                        this.showError('Archivo de backup inválido o corrupto');
                        resolve(null);
                        return;
                    }

                    // Verificar cabecera mágica
                    if (!this.verifyBackupHeader(backupData)) {
                        this.showError('Este archivo no es un backup válido de Gestor IPV');
                        resolve(null);
                        return;
                    }

                    if (expectedType && backupData.type !== expectedType) {
                        this.showError(`Este archivo es un backup de tipo: ${this.getTypeLabel(backupData.type)}`);
                        resolve(null);
                        return;
                    }

                    resolve(backupData);
                } catch (error) {
                    this.showError('Error al leer el archivo: ' + error.message);
                    resolve(null);
                } finally {
                    document.body.removeChild(input);
                }
            };

            document.body.appendChild(input);
            input.click();
        });
    }


    parseBackupFile(text) {
        try {
            const data = JSON.parse(text);

            // Verificar estructura básica
            if (data && typeof data === 'object') {
                // Si tiene cabecera mágica, es formato nuevo
                if (data._header === this.MAGIC_HEADER) {
                    return data;
                }

                // Si no tiene cabecera pero tiene estructura conocida
                if (data.type && data.data) {
                    return data; // Formato antiguo pero válido
                }

                // Intentar inferir tipo por contenido
                if (data.productosSalon || data.productosCocina) {
                    data.type = 'productos';
                    return data;
                }
                if (Array.isArray(data) && data[0] && data[0].timestamp) {
                    // Podría ser reportes
                    return { type: 'reportes', data: data };
                }
            }

            return null;
        } catch (error) {
            console.error('Error parsing backup file:', error);
            return null;
        }
    }

    verifyBackupHeader(backupData) {
        return backupData._header === this.MAGIC_HEADER &&
            backupData._signature === this.FILE_SIGNATURE &&
            backupData._appIdentifier === this.APP_IDENTIFIER;
    }

    async verifyBackupFile() {
        try {
            const backupData = await this.selectBackupFile();
            if (!backupData) return;

            const isValid = this.verifyBackupHeader(backupData);

            if (isValid) {
                const metadata = backupData._metadata || {};
                const infoHtml = `
                    <div class="verification-result success">
                        <h4><i class="fas fa-check-circle"></i> Archivo de Backup Válido</h4>
                        <div class="verification-details">
                            <p><strong>Tipo:</strong> ${this.getTypeLabel(backupData.type)}</p>
                            <p><strong>Creado:</strong> ${new Date(metadata.createdTimestamp || backupData.timestamp).toLocaleString('es-ES')}</p>
                            <p><strong>Tamaño:</strong> ${metadata.fileSize ? (metadata.fileSize / 1024).toFixed(2) + ' KB' : 'Desconocido'}</p>
                            <p><strong>Versión:</strong> ${backupData.version || '1.0'}</p>
                            <p><strong>Protegido:</strong> ${metadata.protected ? 'Sí' : 'No'}</p>
                            <p><strong>Dispositivo:</strong> ${metadata.deviceInfo?.isMobile ? 'Móvil' : 'Escritorio'}</p>
                        </div>
                    </div>
                `;

                this.showCustomModal('Verificación de Backup', infoHtml);
            } else {
                this.showError('El archivo no es un backup válido de Gestor IPV');
            }
        } catch (error) {
            console.error('Error verificando archivo:', error);
            this.showError('Error al verificar el archivo');
        }
    }

    async restoreFromFilePath(filePath) {
        try {
            if (!this.isMobile || !this.filesystem) {
                this.showError('Restauración solo disponible en dispositivos móviles');
                return;
            }

            // Guardar operación pendiente (en caso de que la app se cierre)
            if (this.preferences) {
                await this.preferences.set({
                    key: 'pending_file_operation',
                    value: JSON.stringify({
                        type: 'restore',
                        filePath: filePath,
                        fileName: filePath.split('/').pop(),
                        timestamp: new Date().toISOString()
                    })
                });
            }

            // Leer archivo desde la ruta
            const result = await this.filesystem.readFile({
                path: filePath,
                directory: this.Directory.Documents
            });

            const text = atob(result.data);
            const backupData = this.parseBackupFile(text);

            if (!backupData || !this.verifyBackupHeader(backupData)) {
                this.showError('Archivo de backup inválido');
                return;
            }

            // Determinar tipo de restore basado en los datos
            switch (backupData.type) {
                case 'productos':
                    await this.restoreProductosFromData(backupData);
                    break;
                case 'reportes':
                    await this.restoreReportesFromData(backupData);
                    break;
                case 'dia_actual':
                    await this.restoreDiaActualFromData(backupData);
                    break;
                case 'completo':
                    await this.restoreCompletoFromData(backupData);
                    break;
                default:
                    this.showError('Tipo de backup no reconocido');
            }

            // Limpiar operación pendiente después de éxito
            if (this.preferences) {
                await this.preferences.remove({ key: 'pending_file_operation' });
            }

        } catch (error) {
            console.error('Error restaurando desde ruta:', error);
            this.showError('Error al restaurar: ' + error.message);
        }
    }

    async restoreProductosFromData(backupData) {
        const confirm = await this.showConfirmationModal(
            'Restore de Productos',
            '⚠️ ADVERTENCIA: Esto reemplazará todos los productos actuales. ¿Continuar?',
            'warning'
        );

        if (!confirm) return;

        try {
            // Restaurar productos
            if (backupData.data.productosSalon) {
                StorageManager.saveProducts(backupData.data.productosSalon);
            }

            if (backupData.data.productosCocina) {
                StorageManager.saveCocinaProducts(backupData.data.productosCocina);
            }

            this.showSuccess('Productos restaurados exitosamente');
            this.updateSystemInfo();
            this.updateStats();

            if (typeof window.productManager?.renderProducts === 'function') {
                window.productManager.renderProducts();
            }
        } catch (error) {
            throw error;
        }
    }

    async restoreReportesFromData(backupData) {
        const confirm = await this.showConfirmationModal(
            'Restore de Reportes',
            '⚠️ ADVERTENCIA: Esto reemplazará todos los reportes históricos. ¿Continuar?',
            'warning'
        );

        if (!confirm) return;

        try {
            localStorage.setItem('ipb_historial_reportes', JSON.stringify(backupData.data));
            this.showSuccess('Reportes restaurados exitosamente');
            this.updateSystemInfo();

            if (typeof window.historialIPV?.cargarHistorial === 'function') {
                window.historialIPV.cargarHistorial();
            }
        } catch (error) {
            throw error;
        }
    }

    async restoreDiaActualFromData(backupData) {
        const confirm = await this.showConfirmationModal(
            'Restore del Día',
            '⚠️ ADVERTENCIA: Esto reemplazará TODOS los datos del día actual, incluyendo productos y ventas.\n\n' +
            '📦 PRODUCTOS: Se reemplazarán TODOS sus productos actuales con los del backup.\n' +
            '🏪 SALÓN: Todos los datos de ventas del salón (venta, vendido, importe) serán reemplazados.\n' +
            '👨‍🍳 COCINA: Todos los datos de ventas de cocina (venta, vendido, importe) serán reemplazados.\n' +
            '💰 FINANCIEROS: Consumo, extracciones, transferencias, efectivo y billetes serán reemplazados.\n\n' +
            '¿Continuar?',
            'warning'
        );

        if (!confirm) return;

        try {
            this.showProgressModal('Restaurando todos los datos del día...');

            const data = backupData.data || backupData;

            // 1. REEMPLAZAR PRODUCTOS BASE
            if (data.productosSalon) {
                console.log(`📦 Reemplazando ${StorageManager.getProducts().length} productos de salón con ${data.productosSalon.length} del backup`);
                StorageManager.saveProducts(data.productosSalon);
            }

            if (data.productosCocina) {
                console.log(`👨‍🍳 Reemplazando ${StorageManager.getCocinaProducts().length} productos de cocina con ${data.productosCocina.length} del backup`);
                StorageManager.saveCocinaProducts(data.productosCocina);
            }

            // 2. REEMPLAZAR DATOS DE VENTAS DEL DÍA (¡ESTO ES CRÍTICO!)
            if (data.salon) {
                console.log(`🏪 Reemplazando ${StorageManager.getSalonData().length} registros de salón con ${data.salon.length} del backup`);

                // Obtener productos actuales para sincronizar
                const productosActualesSalon = StorageManager.getProducts();
                const datosSalonParaGuardar = [];

                // Sincronizar cada dato del backup con los productos actuales
                data.salon.forEach(datoBackup => {
                    // Buscar producto correspondiente por ID
                    let productoCorrespondiente = productosActualesSalon.find(p => p.id === datoBackup.id);

                    // Si no se encuentra por ID, buscar por nombre exacto
                    if (!productoCorrespondiente) {
                        productoCorrespondiente = productosActualesSalon.find(p =>
                            p.nombre.toLowerCase() === datoBackup.nombre.toLowerCase()
                        );
                    }

                    if (productoCorrespondiente) {
                        // Usar el ID y datos actuales del producto
                        datosSalonParaGuardar.push({
                            ...datoBackup,
                            id: productoCorrespondiente.id,
                            nombre: productoCorrespondiente.nombre,
                            precio: productoCorrespondiente.precio
                        });
                    } else {
                        // Si no hay producto correspondiente, usar datos del backup directamente
                        datosSalonParaGuardar.push(datoBackup);
                        console.warn(`⚠️ Producto salón no encontrado: ${datoBackup.nombre} (ID: ${datoBackup.id})`);
                    }
                });

                StorageManager.saveSalonData(datosSalonParaGuardar);

                // Mostrar suma de ventas para verificar
                const totalVentasSalon = datosSalonParaGuardar.reduce((sum, item) => sum + (parseFloat(item.importe) || 0), 0);
                console.log(`💰 Total ventas salón en backup: $${totalVentasSalon.toFixed(2)}`);
            }

            if (data.cocina) {
                console.log(`🍳 Reemplazando ${StorageManager.getCocinaData().length} registros de cocina con ${data.cocina.length} del backup`);

                // Mismo proceso para cocina
                const productosActualesCocina = StorageManager.getCocinaProducts();
                const datosCocinaParaGuardar = [];

                data.cocina.forEach(datoBackup => {
                    let productoCorrespondiente = productosActualesCocina.find(p => p.id === datoBackup.id);

                    if (!productoCorrespondiente) {
                        productoCorrespondiente = productosActualesCocina.find(p =>
                            p.nombre.toLowerCase() === datoBackup.nombre.toLowerCase()
                        );
                    }

                    if (productoCorrespondiente) {
                        datosCocinaParaGuardar.push({
                            ...datoBackup,
                            id: productoCorrespondiente.id,
                            nombre: productoCorrespondiente.nombre,
                            precio: productoCorrespondiente.precio
                        });
                    } else {
                        datosCocinaParaGuardar.push(datoBackup);
                        console.warn(`⚠️ Producto cocina no encontrado: ${datoBackup.nombre}`);
                    }
                });

                StorageManager.saveCocinaData(datosCocinaParaGuardar);

                const totalVentasCocina = datosCocinaParaGuardar.reduce((sum, item) => sum + (parseFloat(item.importe) || 0), 0);
                console.log(`💰 Total ventas cocina en backup: $${totalVentasCocina.toFixed(2)}`);
            }

            // 3. REEMPLAZAR AGREGOS DE COCINA
            if (data.agregos) {
                localStorage.setItem('cocina_agregos', JSON.stringify(data.agregos));
                console.log(`➕ Agregos cocina restaurados: ${data.agregos.length}`);
            }

            // 4. REEMPLAZAR DATOS FINANCIEROS
            if (data.consumo) {
                StorageManager.saveConsumoData(data.consumo);
                console.log(`💵 Consumo restaurado: ${data.consumo.length} registros`);
            }

            if (data.extracciones) {
                StorageManager.saveExtraccionesData(data.extracciones);
                console.log(`💰 Extracciones restauradas: ${data.extracciones.length} registros`);
            }

            if (data.transferencias) {
                StorageManager.saveTransferenciasData(data.transferencias);
                console.log(`🔄 Transferencias restauradas: ${data.transferencias.length} registros`);
            }

            if (data.efectivo) {
                localStorage.setItem('ipb_efectivo_data', JSON.stringify(data.efectivo));
                console.log(`💵 Efectivo restaurado: ${data.efectivo.length} registros`);
            }

            if (data.billetes) {
                localStorage.setItem('ipb_billetes_registros', JSON.stringify(data.billetes));
                console.log(`💵 Billetes restaurados: ${data.billetes.length} registros`);
            }

            if (data.conteoBilletes) {
                localStorage.setItem('ipb_conteo_billetes', JSON.stringify(data.conteoBilletes));
            }

            if (data.dailyData) {
                StorageManager.saveDailyData(data.dailyData);
                console.log(`📅 Daily Data restaurado`);
            }

            // 5. REEMPLAZAR CONFIGURACIONES
            if (data.configuracionDia) {
                if (data.configuracionDia.tasasUSD) {
                    localStorage.setItem('ipb_tasas_usd', JSON.stringify(data.configuracionDia.tasasUSD));
                }
                if (data.configuracionDia.efectivoInicial) {
                    localStorage.setItem('ipb_efectivo_inicial', data.configuracionDia.efectivoInicial.toString());
                }
                if (data.configuracionDia.lastReset) {
                    localStorage.setItem('ipb_last_reset', data.configuracionDia.lastReset);
                }
                console.log(`⚙️ Configuraciones restauradas`);
            }

            // 6. REEMPLAZAR HISTORIALES
            if (data.historialCocina) {
                localStorage.setItem('cocina_historial', JSON.stringify(data.historialCocina));
            }
            if (data.historialSalon) {
                localStorage.setItem('salon_historial', JSON.stringify(data.historialSalon));
            }

            if (data.gastos) {
                localStorage.setItem('ipb_gastos_extras', JSON.stringify(data.gastos));
            }
            if (data.preciosCompra) {
                localStorage.setItem('ipb_precios_compra', JSON.stringify(data.preciosCompra));
            }

            this.showSuccess('✅ TODOS los datos del día han sido REEMPLAZADOS exitosamente');
            this.updateSystemInfo();
            this.updateStats();

            // 7. ACTUALIZAR TODAS LAS UI
            setTimeout(() => {
                console.log('🔄 Actualizando todas las UI después del restore del día...');

                // Forzar recarga de productos
                if (typeof window.forceReloadProducts === 'function') {
                    window.forceReloadProducts();
                }

                // Actualizar salón
                if (typeof window.actualizarSalonDesdeProductos === 'function') {
                    setTimeout(() => window.actualizarSalonDesdeProductos(), 400);
                }

                // Actualizar cocina
                if (typeof window.cargarDatosCocina === 'function') {
                    setTimeout(() => window.cargarDatosCocina(), 500);
                }

                // Actualizar resumen
                if (typeof window.updateSummary === 'function') {
                    setTimeout(() => window.updateSummary(), 300);
                }

                // Actualizar todas las secciones visibles
                if (typeof window.updateAllVisibleSections === 'function') {
                    setTimeout(() => {
                        window.updateAllVisibleSections('Dia actual');
                    }, 600);
                }

                // Disparar evento global
                document.dispatchEvent(new CustomEvent('restoreCompleted', {
                    detail: {
                        type: 'dia_actual',
                        timestamp: new Date().toISOString(),
                        datos: {
                            productosSalon: data.productosSalon?.length || 0,
                            productosCocina: data.productosCocina?.length || 0,
                            ventasSalon: data.salon?.length || 0,
                            ventasCocina: data.cocina?.length || 0
                        }
                    }
                }));

                window.location.reload()

            }, 1500);

        } catch (error) {
            console.error('❌ Error en restore del día:', error);
            this.showError('Error al restaurar datos del día: ' + error.message);
        } finally {
            this.hideProgressModal();
        }
    }

    async restoreCompletoFromData(backupData) {
        const confirm = await this.showConfirmationModal(
            'Restore Completo del Sistema',
            '⚠️ ADVERTENCIA CRÍTICA: Esto reemplazará TODO el sistema.\n\n' +
            '📦 Productos: Salón y Cocina\n' +
            '🏪 Ventas del día: Datos actuales de ventas (venta, vendido, importe)\n' +
            '📊 Reportes: Historial completo\n' +
            '💰 Finanzas: Consumo, extracciones, transferencias, efectivo, billetes\n' +
            '⚙️ Configuraciones: Tasas, reset, iniciales\n\n' +
            '¿Está absolutamente seguro?',
            'error'
        );

        if (!confirm) return;

        const ventasSalon = backupData.data?.salon?.length || 0;
        const ventasCocina = backupData.data?.cocina?.length || 0;
        const totalVentasSalon = backupData.data?.salon?.reduce((sum, item) => sum + (parseFloat(item.importe) || 0), 0) || 0;
        const totalVentasCocina = backupData.data?.cocina?.reduce((sum, item) => sum + (parseFloat(item.importe) || 0), 0) || 0;

        const finalConfirm = await this.showConfirmationModal(
            'CONFIRMACIÓN FINAL - Backup Completo<br>',
            '✅ Se remplasaran todos los datos actuales guardados :<br>' +
            '⚠️ Esta acción NO se puede deshacer. ¿Continuar con el restore completo?',
            'error'
        );

        if (!finalConfirm) return;

        try {
            this.showProgressModal('Restaurando sistema completo...');

            const data = backupData.data;

            // 1. PRODUCTOS BASE
            if (data.productosSalon) {
                StorageManager.saveProducts(data.productosSalon);
                console.log('✅ Productos salón restaurados:', data.productosSalon.length);
            }
            if (data.productosCocina) {
                StorageManager.saveCocinaProducts(data.productosCocina);
                console.log('✅ Productos cocina restaurados:', data.productosCocina.length);
            }

            // 2. DATOS DE VENTAS DEL DÍA (¡CRÍTICO!)
            if (data.salon) {
                // Sincronizar IDs con productos actuales
                const productosActualesSalon = StorageManager.getProducts();
                const datosSalonParaGuardar = data.salon.map(item => {
                    let productoCorrespondiente = productosActualesSalon.find(p => p.id === item.id);

                    if (!productoCorrespondiente) {
                        productoCorrespondiente = productosActualesSalon.find(p =>
                            p.nombre.toLowerCase() === item.nombre.toLowerCase()
                        );
                    }

                    const productoFinal = productoCorrespondiente || { id: item.id, nombre: item.nombre, precio: item.precio };

                    return {
                        ...item,
                        id: productoFinal.id,
                        nombre: productoFinal.nombre,
                        precio: parseFloat(productoFinal.precio) || 0,
                        inicio: parseInt(item.inicio) || 0,
                        entrada: parseInt(item.entrada) || 0,
                        venta: parseInt(item.venta) || 0,
                        final: parseInt(item.final) || 0,
                        finalEditado: Boolean(item.finalEditado) || false,
                        vendido: parseInt(item.vendido) || 0,
                        importe: parseFloat(item.importe) || 0,
                        historial: Array.isArray(item.historial) ? item.historial : [],
                        ultimaActualizacion: item.ultimaActualizacion || new Date().toLocaleTimeString('es-ES')
                    };
                });

                StorageManager.saveSalonData(datosSalonParaGuardar);
                console.log('✅ Ventas salón restauradas:', data.salon.length);
                console.log('   Total importe salón: $' + totalVentasSalon.toFixed(2));
            }

            if (data.cocina) {
                // Sincronizar IDs con productos actuales de cocina
                const productosActualesCocina = StorageManager.getCocinaProducts();
                const datosCocinaParaGuardar = data.cocina.map(item => {
                    let productoCorrespondiente = productosActualesCocina.find(p => p.id === item.id);

                    if (!productoCorrespondiente) {
                        productoCorrespondiente = productosActualesCocina.find(p =>
                            p.nombre.toLowerCase() === item.nombre.toLowerCase()
                        );
                    }

                    const productoFinal = productoCorrespondiente || { id: item.id, nombre: item.nombre, precio: item.precio };

                    return {
                        ...item,
                        id: productoFinal.id,
                        nombre: productoFinal.nombre,
                        precio: parseFloat(productoFinal.precio) || 0,
                        inicio: parseInt(item.inicio) || 0,
                        entrada: parseInt(item.entrada) || 0,
                        venta: parseInt(item.venta) || 0,
                        final: parseInt(item.final) || 0,
                        finalEditado: Boolean(item.finalEditado) || false,
                        vendido: parseInt(item.vendido) || 0,
                        importe: parseFloat(item.importe) || 0,
                        historial: Array.isArray(item.historial) ? item.historial : [],
                        ultimaActualizacion: item.ultimaActualizacion || new Date().toLocaleTimeString('es-ES')
                    };
                });

                StorageManager.saveCocinaData(datosCocinaParaGuardar);
                console.log('✅ Ventas cocina restauradas:', data.cocina.length);
                console.log('   Total importe cocina: $' + totalVentasCocina.toFixed(2));
            }

            // 3. DATOS ADICIONALES DE COCINA
            if (data.agregos) {
                localStorage.setItem('cocina_agregos', JSON.stringify(data.agregos));
                console.log('✅ Agregos cocina restaurados:', data.agregos.length);
            }

            // 4. DATOS FINANCIEROS
            if (data.consumo) StorageManager.saveConsumoData(data.consumo);
            if (data.extracciones) StorageManager.saveExtraccionesData(data.extracciones);
            if (data.transferencias) StorageManager.saveTransferenciasData(data.transferencias);
            if (data.efectivo) localStorage.setItem('ipb_efectivo_data', JSON.stringify(data.efectivo));
            if (data.billetes) localStorage.setItem('ipb_billetes_registros', JSON.stringify(data.billetes));
            if (data.conteoBilletes) localStorage.setItem('ipb_conteo_billetes', JSON.stringify(data.conteoBilletes));
            if (data.dailyData) StorageManager.saveDailyData(data.dailyData);

            // 5. REPORTES HISTÓRICOS
            if (data.reportes) {
                localStorage.setItem('ipb_historial_reportes', JSON.stringify(data.reportes));
                console.log('✅ Reportes históricos restaurados:', data.reportes.length);
            }

            // 6. CONFIGURACIONES
            if (data.configuraciones) {
                if (data.configuraciones.lastReset) {
                    localStorage.setItem('ipb_last_reset', data.configuraciones.lastReset);
                }
                if (data.configuraciones.tasasUSD) {
                    localStorage.setItem('ipb_tasas_usd', JSON.stringify(data.configuraciones.tasasUSD));
                }
                if (data.configuraciones.efectivoInicial) {
                    localStorage.setItem('ipb_efectivo_inicial', data.configuraciones.efectivoInicial);
                }
                console.log('✅ Configuraciones restauradas');
            }

            // 7. HISTORIALES ADICIONALES
            if (data.historialBilletes) {
                localStorage.setItem('ipb_historial_billetes', JSON.stringify(data.historialBilletes));
            }
            if (data.historialConsumo) {
                localStorage.setItem('ipb_historial_consumo', JSON.stringify(data.historialConsumo));
            }
            if (data.historialCocina) {
                localStorage.setItem('cocina_historial', JSON.stringify(data.historialCocina));
            }
            if (data.historialSalon) {
                localStorage.setItem('salon_historial', JSON.stringify(data.historialSalon));
            }

            if (data.gastos) {
                localStorage.setItem('ipb_gastos_extras', JSON.stringify(data.gastos));
                console.log('✅ Reportes históricos restaurados:', data.gastos.length);
            }
            if (data.preciosCompra) {
                localStorage.setItem('ipb_precios_compra', JSON.stringify(data.preciosCompra));
                console.log('✅ Reportes históricos restaurados:', data.preciosCompra.length);
            }

            this.showSuccess('✅ Sistema completo restaurado exitosamente. Actualizando interfaz...');
            this.updateSystemInfo();

            // Actualizar TODAS las UI
            setTimeout(() => {
                // Forzar recarga completa de productos y ventas
                if (typeof window.forceReloadProducts === 'function') {
                    window.forceReloadProducts();
                }

                // Actualizar salón
                if (typeof window.actualizarSalonDesdeProductos === 'function') {
                    setTimeout(() => window.actualizarSalonDesdeProductos(), 300);
                }

                // Actualizar cocina
                if (typeof window.cargarDatosCocina === 'function') {
                    setTimeout(() => window.cargarDatosCocina(), 400);
                }

                // Actualizar historial de reportes
                if (typeof window.historialIPV?.cargarHistorial === 'function') {
                    setTimeout(() => window.historialIPV.cargarHistorial(), 500);
                }

                // Actualizar todas las secciones visibles
                if (typeof window.updateAllVisibleSections === 'function') {
                    setTimeout(() => {
                        window.updateAllVisibleSections('Completo');
                    }, 600);
                }

                // Actualizar resumen
                if (typeof window.updateSummary === 'function') {
                    setTimeout(() => window.updateSummary(), 300);
                }

                // Disparar evento global
                document.dispatchEvent(new CustomEvent('restoreCompleted', {
                    detail: {
                        type: 'completo',
                        timestamp: new Date().toISOString(),
                        datos: {
                            productosSalon: data.productosSalon?.length || 0,
                            productosCocina: data.productosCocina?.length || 0,
                            ventasSalon: ventasSalon,
                            ventasCocina: ventasCocina,
                            reportes: data.reportes?.length || 0
                        }
                    }
                }));

                window.location.reload();

            }, 1500);

        } catch (error) {
            console.error('❌ Error en restore completo:', error);
            this.showError('Error al restaurar sistema: ' + error.message);
        } finally {
            this.hideProgressModal();
        }
    }

    updateAllUIsAfterRestore(type) {
        console.log(`🔄 Actualizando todas las UI después de restore tipo: ${type}`);

        // Disparar evento global para que todos los módulos se actualicen
        document.dispatchEvent(new CustomEvent('restoreCompleted', {
            detail: {
                type: type,
                timestamp: new Date().toISOString()
            }
        }));

        // 1. Actualizar resumen principal
        if (typeof window.updateSummary === 'function') {
            setTimeout(() => window.updateSummary(), 100);
        }

        // 2. Actualizar productos si es necesario
        if (type === 'productos' || type === 'completo') {
            if (typeof window.productManager?.renderProducts === 'function') {
                setTimeout(() => window.productManager.renderProducts(), 200);
            }
            if (typeof window.forceReloadProducts === 'function') {
                setTimeout(() => window.forceReloadProducts(), 200);
            }
        }

        // 3. Actualizar salón
        if (type === 'dia_actual' || type === 'completo') {
            if (typeof window.actualizarSalonDesdeProductos === 'function') {
                setTimeout(() => window.actualizarSalonDesdeProductos(), 300);
            }
            if (typeof window.cargarDatosSalon === 'function') {
                setTimeout(() => window.cargarDatosSalon(), 300);
            }
        }

        // 4. Actualizar cocina
        if (type === 'dia_actual' || type === 'completo') {
            if (typeof window.cargarDatosCocina === 'function') {
                setTimeout(() => window.cargarDatosCocina(), 400);
            }
            if (typeof window.actualizarTablaCocina === 'function') {
                setTimeout(() => window.actualizarTablaCocina(), 400);
            }
            if (typeof window.cargarAgregos === 'function') {
                setTimeout(() => window.cargarAgregos(), 450);
            }
        }

        // 5. Actualizar consumo
        if (type === 'dia_actual' || type === 'completo') {
            if (typeof window.cargarConsumo === 'function') {
                setTimeout(() => window.cargarConsumo(), 500);
            }
            if (typeof window.actualizarConsumo === 'function') {
                setTimeout(() => window.actualizarConsumo(), 500);
            }
        }

        // 6. Actualizar extracciones
        if (type === 'dia_actual' || type === 'completo') {
            if (typeof window.cargarExtracciones === 'function') {
                setTimeout(() => window.cargarExtracciones(), 550);
            }
        }

        // 7. Actualizar transferencias
        if (type === 'dia_actual' || type === 'completo') {
            if (typeof window.cargarTransferencias === 'function') {
                setTimeout(() => window.cargarTransferencias(), 600);
            }
        }

        // 8. Actualizar efectivo
        if (type === 'dia_actual' || type === 'completo') {
            if (typeof window.cargarEfectivo === 'function') {
                setTimeout(() => window.cargarEfectivo(), 650);
            }
        }

        // 9. Actualizar billetes
        if (type === 'dia_actual' || type === 'completo') {
            if (typeof window.cargarBilletes === 'function') {
                setTimeout(() => window.cargarBilletes(), 700);
            }
            if (typeof window.actualizarContadorBilletes === 'function') {
                setTimeout(() => window.actualizarContadorBilletes(), 700);
            }
        }

        // 10. Actualizar historial
        if (type === 'reportes' || type === 'completo') {
            if (typeof window.historialIPV?.cargarHistorial === 'function') {
                setTimeout(() => window.historialIPV.cargarHistorial(), 800);
            }
            if (typeof window.cargarHistorial === 'function') {
                setTimeout(() => window.cargarHistorial(), 800);
            }
        }

        // 11. Actualizar backup stats
        if (typeof window.backupManager?.updateStats === 'function') {
            setTimeout(() => window.backupManager.updateStats(), 900);
        }

        // 12. Actualizar todas las secciones visibles
        if (typeof window.updateAllVisibleSections === 'function') {
            setTimeout(() => window.updateAllVisibleSections(type), 1000);
        }

        // 13. Mostrar notificación final
        setTimeout(() => {
            this.showSuccess(`✅ Restauración tipo "${type}" completada. Todas las UI actualizadas.`);
        }, 1500);
    }
    async loadBackupHistory() {
        try {
            const history = JSON.parse(localStorage.getItem('ipb_backup_history') || '[]');
            this.backupHistory = history;
            this.renderBackupHistory();
        } catch (error) {
            console.error('Error cargando historial de backups:', error);
        }
    }

    addToHistory(backupData) {
        const historyItem = {
            id: Date.now(),
            type: backupData.type,
            timestamp: new Date().toISOString(),
            size: JSON.stringify(backupData).length,
            data: {
                version: backupData.version,
                items: this.getBackupItemCount(backupData)
            }
        };

        this.backupHistory.unshift(historyItem);

        // Mantener solo los últimos 50 backups
        if (this.backupHistory.length > 50) {
            this.backupHistory = this.backupHistory.slice(0, 50);
        }

        localStorage.setItem('ipb_backup_history', JSON.stringify(this.backupHistory));
        this.renderBackupHistory();
    }

    getBackupItemCount(backupData) {
        switch (backupData.type) {
            case 'productos':
                const salonCount = backupData.data.productosSalon?.length || 0;
                const cocinaCount = backupData.data.productosCocina?.length || 0;
                return { productos: salonCount + cocinaCount };

            case 'reportes':
                return { reportes: backupData.data.length || 0 };

            case 'dia_actual':
                return {
                    salon: backupData.data.salon?.length || 0,
                    cocina: backupData.data.cocina?.length || 0,
                    registros: (backupData.data.consumo?.length || 0) +
                        (backupData.data.extracciones?.length || 0) +
                        (backupData.data.transferencias?.length || 0)
                };

            case 'completo':
                return {
                    productos: (backupData.data.productosSalon?.length || 0) +
                        (backupData.data.productosCocina?.length || 0),
                    reportes: backupData.data.reportes?.length || 0,
                    registros: (backupData.data.consumo?.length || 0) +
                        (backupData.data.extracciones?.length || 0) +
                        (backupData.data.transferencias?.length || 0)
                };

            default:
                return {};
        }
    }

    renderBackupHistory() {
        const historyList = document.getElementById('backup-history-list');
        if (!historyList) return;

        if (this.backupHistory.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>No hay backups guardados</p>
                </div>
            `;
            return;
        }

        historyList.innerHTML = this.backupHistory.map(item => this.createHistoryItemHTML(item)).join('');

        // Agregar event listeners a los botones de acción
        this.backupHistory.forEach(item => {
            const deleteBtn = document.getElementById(`delete-${item.id}`);

            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => this.deleteFromHistory(item.id));
            }
        });
    }

    createHistoryItemHTML(item) {
        const date = new Date(item.timestamp);
        const typeLabels = {
            'productos': 'Productos',
            'reportes': 'Reportes',
            'dia_actual': 'Día Actual',
            'completo': 'Completo'
        };

        const typeColors = {
            'productos': '#3498db',
            'reportes': '#9b59b6',
            'dia_actual': '#e67e22',
            'completo': '#2ecc71'
        };

        const sizeKB = Math.round(item.size / 1024);

        return `
            <div class="backup-item" style="border-left-color: ${typeColors[item.type]}">
                <div class="backup-item-header">
                    <div class="backup-title">${typeLabels[item.type]}</div>
                    <div class="backup-date">${date.toLocaleDateString('es-ES')} ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div class="backup-item-body">
                    <div class="backup-info">
                        <i class="fas fa-database"></i>
                        <span>${sizeKB} KB</span>
                    </div>
                    <div class="backup-info">
                        <i class="fas fa-box"></i>
                        <span>${this.formatItemCount(item.data.items)}</span>
                    </div>
                </div>
                <div class="backup-actions">
                    <button class="btn btn-danger btn-sm" id="delete-${item.id}">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
    }

    formatItemCount(items) {
        if (!items) return '0 items';

        const parts = [];
        if (items.productos) parts.push(`${items.productos} productos`);
        if (items.reportes) parts.push(`${items.reportes} reportes`);
        if (items.registros) parts.push(`${items.registros} registros`);
        if (items.salon) parts.push(`${items.salon} salón`);
        if (items.cocina) parts.push(`${items.cocina} cocina`);

        return parts.join(', ') || '0 items';
    }

    async deleteFromHistory(id) {
        const confirm = await this.showConfirmationModal(
            'Eliminar del Historial',
            '¿Desea eliminar este registro del historial de backups?',
            'warning'
        );

        if (!confirm) return;

        this.backupHistory = this.backupHistory.filter(item => item.id !== id);
        localStorage.setItem('ipb_backup_history', JSON.stringify(this.backupHistory));
        this.renderBackupHistory();
        this.showSuccess('Registro eliminado del historial');
    }

    async restoreFromHistory(id) {
        const item = this.backupHistory.find(item => item.id === id);
        if (!item) return;

        const confirm = await this.showConfirmationModal(
            'Restore desde Historial',
            `¿Desea restaurar el backup de tipo "${this.getTypeLabel(item.type)}" creado el ${new Date(item.timestamp).toLocaleDateString('es-ES')}?`,
            'info'
        );

        if (!confirm) return;

        // Mostrar que esta funcionalidad requiere el archivo físico
        this.showError('Para restaurar desde el historial, necesita el archivo físico del backup.');
    }
    triggerProductUpdate() {
        if (typeof window.forceReloadProducts === 'function') {
            setTimeout(() => {
                window.forceReloadProducts();
                console.log('✅ Productos actualizados con force reload');
            }, 300);
        } else if (typeof window.productManager?.renderProducts === 'function') {
            setTimeout(() => {
                window.productManager.renderProducts();
                console.log('✅ Productos actualizados');
            }, 300);
        }
    }

    triggerSalonUpdate() {
        // Actualizar salón si está visible
        if (typeof window.actualizarSalonDesdeProductos === 'function') {
            setTimeout(() => {
                window.actualizarSalonDesdeProductos();
                console.log('✅ Salón actualizado después de restore');
            }, 400);
        }
    }

    triggerCocinaUpdate() {
        // Actualizar cocina si está visible
        if (typeof window.cargarDatosCocina === 'function') {
            setTimeout(() => {
                window.cargarDatosCocina();
                if (typeof window.actualizarTablaCocina === 'function') {
                    window.actualizarTablaCocina();
                }
                console.log('✅ Cocina actualizada después de restore');
            }, 500);
        }
    }

    triggerAllUpdates() {
        // Disparar todos los eventos de actualización
        this.triggerProductUpdate();
        this.triggerSalonUpdate();
        this.triggerCocinaUpdate();

        // Actualizar otras secciones si existen
        setTimeout(() => {
            if (typeof window.updateSummary === 'function') {
                window.updateSummary();
            }
            if (typeof window.actualizarResumen === 'function') {
                window.actualizarResumen();
            }
            if (typeof window.cargarHistorial === 'function') {
                window.cargarHistorial();
            }
        }, 1000);
    }

    refreshHistory() {
        this.loadBackupHistory();
        this.updateSystemInfo();
        this.updateStats();
        this.showSuccess('Historial actualizado');
    }

    checkFileAssociation() {
        if (!this.isMobile || !this.preferences) return;

        this.preferences.get({ key: 'file_association_registered' })
            .then((result) => {
                if (result.value === 'true') {
                    console.log('Asociación de archivos .ipvbak registrada');
                }
            })
            .catch(() => {
                // No hay preferencia guardada
            });
    }

    showCustomModal(title, content) {
        const modalHtml = `
        <div class="modal active" id="backup-custom-modal">
            <div class="modal-overlay" id="backup-modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" id="backup-modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" id="backup-modal-close-btn">Cerrar</button>
                </div>
            </div>
        </div>
    `;

        // Primero eliminar cualquier modal existente
        const existingModal = document.querySelector('#backup-custom-modal');
        if (existingModal) existingModal.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Agregar event listeners con delegación
        setTimeout(() => {
            const closeModal = () => {
                const modal = document.querySelector('#backup-custom-modal');
                if (modal) modal.remove();
            };

            // Botón X
            const closeBtn = document.querySelector('#backup-modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', closeModal);
            }

            // Botón Cerrar
            const closeBtn2 = document.querySelector('#backup-modal-close-btn');
            if (closeBtn2) {
                closeBtn2.addEventListener('click', closeModal);
            }

            // Overlay
            const overlay = document.querySelector('#backup-modal-overlay');
            if (overlay) {
                overlay.addEventListener('click', closeModal);
            }

            // También cerrar con Escape
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    closeModal();
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
        }, 10);
    }

    showInfoModal() {
        const modalHtml = `
        <div class="modal active" id="backup-info-modal">
            <div class="modal-overlay" id="backup-info-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-info-circle"></i> Información de Backup & Restore</h3>
                    <button class="modal-close" id="backup-info-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="backup-alert info">
                        <i class="fas fa-info-circle"></i>
                        <div>
                            <strong>Funcionalidades disponibles:</strong>
                            <ul style="margin-top: 10px; padding-left: 20px;">
                                <li><strong>Productos:</strong> Backup/Restore de productos de Salón y Cocina</li>
                                <li><strong>Reportes:</strong> Backup/Restore de todos los reportes históricos</li>
                                <li><strong>Día Actual:</strong> Backup/Restore de datos del día en curso</li>
                                <li><strong>Completo:</strong> Backup/Restore de todo el sistema</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="backup-alert success" style="margin-top: 15px;">
                        <i class="fas fa-shield-alt"></i>
                        <div>
                            <strong>Características de seguridad:</strong>
                            <ul style="margin-top: 10px; padding-left: 20px;">
                                <li><strong>Extensión personalizada:</strong> ${this.CUSTOM_EXTENSION}</li>
                                <li><strong>Cabecera mágica:</strong> Verificación de integridad</li>
                                <li><strong>Asociación de archivos:</strong> Solo abre con Gestor IPV (móvil)</li>
                                <li><strong>Metadatos:</strong> Información detallada del backup</li>
                                <li><strong>Verificación:</strong> Herramienta para validar archivos de backup</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="backup-alert warning" style="margin-top: 15px;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <div>
                            <strong>Recomendaciones de seguridad:</strong>
                                <ul style="margin-top: 10px; padding-left: 20px;">
                                <li>Realice backups regularmente</li>
                                <li>Guarde los archivos de backup en un lugar seguro</li>
                                <li>Verifique el tipo de backup antes de restaurar</li>
                                <li>El restore completo reemplaza TODO el sistema</li>
                                <li>En dispositivos móviles, los backups se guardan en "Gestor IPV/Backup"</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div style="margin-top: 20px; font-size: 0.9rem; color: var(--gray-dark);">
                        <p><i class="fas fa-mobile-alt"></i> <strong>Dispositivos móviles:</strong> Los backups se guardan en la carpeta "Gestor IPV/Backup" y están asociados a la aplicación. Puede compartirlos desde la app.</p>
                        <p><i class="fas fa-desktop"></i> <strong>Navegador web:</strong> Los backups se descargan automáticamente con extensión ${this.CUSTOM_EXTENSION}</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" id="backup-info-close-btn">Entendido</button>
                </div>
            </div>
        </div>
    `;

        // Eliminar modal existente
        const existingModal = document.querySelector('#backup-info-modal');
        if (existingModal) existingModal.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Agregar event listeners
        setTimeout(() => {
            const closeModal = () => {
                const modal = document.querySelector('#backup-info-modal');
                if (modal) modal.remove();
            };

            // Botón X
            const closeBtn = document.querySelector('#backup-info-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', closeModal);
            }

            // Botón Entendido
            const closeBtn2 = document.querySelector('#backup-info-close-btn');
            if (closeBtn2) {
                closeBtn2.addEventListener('click', closeModal);
            }

            // Overlay
            const overlay = document.querySelector('#backup-info-overlay');
            if (overlay) {
                overlay.addEventListener('click', closeModal);
            }

            // Cerrar con Escape
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    closeModal();
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
        }, 10);
    }

    getTypeLabel(type) {
        const labels = {
            'productos': 'Productos',
            'reportes': 'Reportes',
            'dia_actual': 'Día Actual',
            'completo': 'Completo'
        };
        return labels[type] || type;
    }

    showProgressModal(message) {
        const modalHtml = `
            <div class="modal active backup-modal">
                <div class="modal-overlay"></div>
                <div class="modal-content">
                    <div class="modal-backup-header">
                        <i class="fas fa-spinner fa-spin"></i>
                        <h3>${message}</h3>
                    </div>
                    <div class="backup-progress">
                        <div class="progress-circle">
                            <svg viewBox="0 0 100 100">
                                <circle class="progress-circle-bg" cx="50" cy="50" r="45"></circle>
                                <circle class="progress-circle-fill" cx="50" cy="50" r="45" 
                                        stroke-dasharray="283" stroke-dashoffset="283"></circle>
                            </svg>
                            <div class="progress-percent">0%</div>
                        </div>
                        <div class="progress-text">Procesando...</div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.startProgressAnimation();
    }

    startProgressAnimation() {
        const progressFill = document.querySelector('.progress-circle-fill');
        const percentText = document.querySelector('.progress-percent');

        if (!progressFill || !percentText) return;

        let progress = 0;
        const interval = setInterval(() => {
            progress += 1;
            const offset = 283 - (283 * progress) / 100;
            progressFill.style.strokeDashoffset = offset;
            percentText.textContent = `${progress}%`;

            if (progress >= 95) {
                clearInterval(interval);
            }
        }, 50);
    }

    hideProgressModal() {
        const modal = document.querySelector('.backup-modal');
        if (modal) modal.remove();
    }

    async showConfirmationModal(title, message, type = 'warning') {
        return new Promise((resolve) => {
            if (typeof window.showConfirmationModal === 'function') {
                window.showConfirmationModal(
                    title,
                    message,
                    type,
                    () => resolve(true),
                    () => resolve(false)
                );
            } else {
                resolve(confirm(`${title}\n\n${message}`));
            }
        });
    }

    showSuccess(message) {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, 'success');
        } else {
            alert(message);
        }
    }

    showError(message) {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, 'error');
        } else {
            alert('ERROR: ' + message);
        }
    }

    showNotification(message, type) {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 5px;
                color: white;
                font-weight: 500;
                z-index: 10000;
                animation: slideIn 0.3s ease;
            `;

            if (type === 'success') {
                notification.style.backgroundColor = '#2ecc71';
            } else if (type === 'error') {
                notification.style.backgroundColor = '#e74c3c';
            } else if (type === 'info') {
                notification.style.backgroundColor = '#3498db';
            } else {
                notification.style.backgroundColor = '#f39c12';
            }

            notification.textContent = message;
            document.body.appendChild(notification);

            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
    }
}

// CSS adicional para la interfaz
const backupCSS = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .verification-result {
        padding: 20px;
        border-radius: 8px;
        margin: 10px 0;
    }
    
    .verification-result.success {
        background-color: #d4edda;
        border: 1px solid #c3e6cb;
        color: #155724;
    }
    
    .verification-result.error {
        background-color: #f8d7da;
        border: 1px solid #f5c6cb;
        color: #721c24;
    }
    
    .verification-details {
        margin-top: 15px;
    }
    
    .verification-details p {
        margin: 5px 0;
        padding: 3px 0;
        border-bottom: 1px dashed #ccc;
    }
    
    .backup-alert {
        padding: 15px;
        border-radius: 6px;
        display: flex;
        align-items: flex-start;
        gap: 10px;
    }
    
    .backup-alert.info {
        background-color: #e7f3fe;
        border: 1px solid #b8daff;
        color: #004085;
    }
    
    .backup-alert.success {
        background-color: #e7f7ef;
        border: 1px solid #b8e6cf;
        color: #155724;
    }
    
    .backup-alert.warning {
        background-color: #fff3cd;
        border: 1px solid #ffeaa7;
        color: #856404;
    }
    
    .backup-alert.error {
        background-color: #f8d7da;
        border: 1px solid #f5c6cb;
        color: #721c24;
    }
    
    .file-association-info {
        padding: 10px;
        background: #f8f9fa;
        border-radius: 5px;
        margin: 10px 0;
        font-size: 0.9em;
    }
    
    .backup-item {
        background: white;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 10px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        border-left: 4px solid #3498db;
        transition: transform 0.2s;
    }
    
    .backup-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }
    
    .backup-item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }
    
    .backup-title {
        font-weight: 600;
        font-size: 1.1em;
        color: #2c3e50;
    }
    
    .backup-date {
        font-size: 0.85em;
        color: #7f8c8d;
    }
    
    .backup-item-body {
        display: flex;
        gap: 15px;
        margin-bottom: 15px;
    }
    
    .backup-info {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 0.9em;
        color: #34495e;
    }
    
    .backup-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
    }
    
    .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: #95a5a6;
    }
    
    .empty-state i {
        font-size: 3em;
        margin-bottom: 15px;
        display: block;
    }
    
    .modal-backup-header {
        text-align: center;
        margin-bottom: 20px;
    }
    
    .modal-backup-header i {
        font-size: 2.5em;
        color: #3498db;
        margin-bottom: 10px;
        display: block;
    }
    
    .backup-progress {
        text-align: center;
    }
    
    .progress-circle {
        position: relative;
        width: 100px;
        height: 100px;
        margin: 0 auto 15px;
    }
    
    .progress-circle svg {
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
    }
    
    .progress-circle-bg {
        fill: none;
        stroke: #ecf0f1;
        stroke-width: 8;
    }
    
    .progress-circle-fill {
        fill: none;
        stroke: #3498db;
        stroke-width: 8;
        stroke-linecap: round;
        transition: stroke-dashoffset 0.3s;
    }
    
    .progress-percent {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 1.2em;
        font-weight: 600;
        color: #2c3e50;
    }
    
    .progress-text {
        color: #7f8c8d;
        font-size: 0.9em;
    }
`;

const backupStyle = document.createElement('style');
backupStyle.textContent = backupCSS;
document.head.appendChild(backupStyle);

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const duplicateModals = document.querySelectorAll('.confirmation-modal, .modal.active');
    duplicateModals.forEach(modal => modal.remove());
    if (document.getElementById('backup-section')) {
        window.backupManager = new BackupManager();
        // Agregar botones adicionales si no existen
        const backupHeader = document.querySelector('#backup-section .section-header');
        if (backupHeader) {
            // Botón de verificación
            if (!document.getElementById('btn-verify-backup')) {
                const verifyBtn = document.createElement('button');
                verifyBtn.id = 'btn-verify-backup';
                verifyBtn.className = 'btn btn-info btn-sm';
                verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> Verificar Backup';
                backupHeader.appendChild(verifyBtn);
            }

            // Botón para compartir (solo en móvil)
            if (window.Capacitor && !document.getElementById('btn-share-backup')) {
                const shareBtn = document.createElement('button');
                shareBtn.id = 'btn-share-backup';
                shareBtn.className = 'btn btn-success btn-sm';
                shareBtn.innerHTML = '<i class="fas fa-share-alt"></i> Compartir';
                backupHeader.appendChild(shareBtn);
            }

            // Re-bind events para incluir los nuevos botones
            window.backupManager.bindEvents();
        }
    }
});