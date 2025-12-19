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
        if (!url || !url.includes(this.CUSTOM_EXTENSION)) return;

        try {
            this.showNotification('Archivo de backup detectado', 'info');

            const fileName = url.split('/').pop();
            const filePath = decodeURIComponent(url);

            const confirm = await this.showConfirmationModal(
                'Archivo de Backup Detectado',
                `Se detectó el archivo de backup: ${fileName}\n\n¿Desea restaurar este backup?`,
                'info'
            );

            if (confirm) {
                await this.restoreFromFilePath(filePath);
            }

        } catch (error) {
            console.error('Error handling file open:', error);
            this.showError('Error al procesar el archivo: ' + error.message);
        }
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
                ultimoBackup.textContent = new Date(lastBackup).toLocaleString('es-ES');
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
            // Crear carpeta principal "Gestor IPV"
            await this.filesystem.mkdir({
                path: 'Gestor IPV',
                directory: this.Directory.Documents,
                recursive: true
            });

            // Crear subcarpeta "Backup"
            await this.filesystem.mkdir({
                path: 'Gestor IPV/Backup',
                directory: this.Directory.Documents,
                recursive: true
            });

            return 'Gestor IPV/Backup';
        } catch (error) {
            console.error('Error creando carpetas:', error);
            return null;
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

            // Recargar secciones si es necesario
            if (typeof window.productManager?.renderProducts === 'function') {
                window.productManager.renderProducts();
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

        } catch (error) {
            console.error('Error en restore de reportes:', error);
            this.showError('Error al restaurar reportes: ' + error.message);
        }
    }

    async backupDiaActual() {
        const confirm = await this.showConfirmationModal(
            'Backup del Día Actual',
            '¿Desea crear un backup de todos los datos del día actual?',
            'info'
        );

        if (!confirm) return;

        try {
            this.showProgressModal('Generando backup del día actual...');

            const backupData = {
                type: 'dia_actual',
                version: '1.0',
                timestamp: new Date().toISOString(),
                metadata: {
                    ...this.FILE_METADATA,
                    backupType: 'dia_actual',
                    itemCount: {
                        salon: StorageManager.getSalonData().length,
                        cocina: StorageManager.getCocinaData().length,
                        consumo: StorageManager.getConsumoData().length,
                        extracciones: StorageManager.getExtraccionesData().length,
                        transferencias: StorageManager.getTransferenciasData().length
                    }
                },
                data: {
                    salon: StorageManager.getSalonData(),
                    cocina: StorageManager.getCocinaData(),
                    consumo: StorageManager.getConsumoData(),
                    extracciones: StorageManager.getExtraccionesData(),
                    transferencias: StorageManager.getTransferenciasData(),
                    efectivo: JSON.parse(localStorage.getItem('ipb_efectivo_data') || '[]'),
                    billetes: JSON.parse(localStorage.getItem('ipb_billetes_registros') || '[]'),
                    dailyData: StorageManager.getDailyData()
                }
            };

            const jsonString = JSON.stringify(backupData, null, 2);

            if (this.isMobile) {
                const result = await this.saveBackupToDevice(jsonString, 'dia_actual');
                this.showSuccess(`Backup guardado en: ${result.fileName}`);
            } else {
                this.downloadBackup(jsonString, 'dia_actual');
                this.showSuccess('Backup descargado exitosamente');
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
            'Restore del Día',
            '⚠️ ADVERTENCIA: Esto reemplazará todos los datos del día actual. ¿Continuar?',
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

            // Restaurar datos del día
            if (backupData.data.salon) {
                StorageManager.saveSalonData(backupData.data.salon);
            }

            if (backupData.data.cocina) {
                StorageManager.saveCocinaData(backupData.data.cocina);
            }

            if (backupData.data.consumo) {
                StorageManager.saveConsumoData(backupData.data.consumo);
            }

            if (backupData.data.extracciones) {
                StorageManager.saveExtraccionesData(backupData.data.extracciones);
            }

            if (backupData.data.transferencias) {
                StorageManager.saveTransferenciasData(backupData.data.transferencias);
            }

            if (backupData.data.efectivo) {
                localStorage.setItem('ipb_efectivo_data', JSON.stringify(backupData.data.efectivo));
            }

            if (backupData.data.billetes) {
                localStorage.setItem('ipb_billetes_registros', JSON.stringify(backupData.data.billetes));
            }

            if (backupData.data.dailyData) {
                StorageManager.saveDailyData(backupData.data.dailyData);
            }

            this.showSuccess('Datos del día restaurados exitosamente');
            this.updateSystemInfo();
            this.updateStats();

            // Recargar secciones
            if (typeof window.updateSummary === 'function') {
                window.updateSummary();
            }

        } catch (error) {
            console.error('Error en restore del día:', error);
            this.showError('Error al restaurar datos del día: ' + error.message);
        }
    }

    async backupCompleto() {
        const confirm = await this.showConfirmationModal(
            'Backup Completo',
            '¿Desea crear un backup completo de todo el sistema?',
            'info'
        );

        if (!confirm) return;

        try {
            this.showProgressModal('Generando backup completo...');

            const backupData = {
                type: 'completo',
                version: '1.0',
                timestamp: new Date().toISOString(),
                metadata: {
                    ...this.FILE_METADATA,
                    backupType: 'completo',
                    itemCount: {
                        productos: StorageManager.getProducts().length + StorageManager.getCocinaProducts().length,
                        reportes: JSON.parse(localStorage.getItem('ipb_historial_reportes') || '[]').length,
                        registros: StorageManager.getConsumoData().length +
                            StorageManager.getExtraccionesData().length +
                            StorageManager.getTransferenciasData().length
                    }
                },
                data: {
                    productosSalon: StorageManager.getProducts(),
                    productosCocina: StorageManager.getCocinaProducts(),
                    salon: StorageManager.getSalonData(),
                    cocina: StorageManager.getCocinaData(),
                    consumo: StorageManager.getConsumoData(),
                    extracciones: StorageManager.getExtraccionesData(),
                    transferencias: StorageManager.getTransferenciasData(),
                    efectivo: JSON.parse(localStorage.getItem('ipb_efectivo_data') || '[]'),
                    billetes: JSON.parse(localStorage.getItem('ipb_billetes_registros') || '[]'),
                    dailyData: StorageManager.getDailyData(),
                    reportes: JSON.parse(localStorage.getItem('ipb_historial_reportes') || '[]'),
                    configuraciones: {
                        lastReset: localStorage.getItem('ipb_last_reset'),
                        tasasUSD: JSON.parse(localStorage.getItem('ipb_tasas_usd') || '{}')
                    }
                }
            };

            const jsonString = JSON.stringify(backupData, null, 2);

            if (this.isMobile) {
                const result = await this.saveBackupToDevice(jsonString, 'completo');
                this.showSuccess(`Backup completo guardado en: ${result.fileName}`);
            } else {
                this.downloadBackup(jsonString, 'completo');
                this.showSuccess('Backup completo descargado exitosamente');
            }

            this.addToHistory(backupData);
            this.updateSystemInfo();

        } catch (error) {
            console.error('Error en backup completo:', error);
            this.showError('Error al crear backup: ' + error.message);
        } finally {
            this.hideProgressModal();
        }
    }

    async restoreCompleto() {
        const confirm = await this.showConfirmationModal(
            'Restore Completo',
            '⚠️ ADVERTENCIA CRÍTICA: Esto reemplazará TODO el sistema. ¿Está absolutamente seguro?',
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

            // Confirmación final
            const finalConfirm = await this.showConfirmationModal(
                'CONFIRMACIÓN FINAL',
                'Esta acción NO se puede deshacer. ¿Continuar con el restore completo?',
                'error'
            );

            if (!finalConfirm) return;

            this.showProgressModal('Restaurando sistema completo...');

            // Restaurar todo el sistema
            const data = backupData.data;

            // Productos
            if (data.productosSalon) StorageManager.saveProducts(data.productosSalon);
            if (data.productosCocina) StorageManager.saveCocinaProducts(data.productosCocina);

            // Datos del día
            if (data.salon) StorageManager.saveSalonData(data.salon);
            if (data.cocina) StorageManager.saveCocinaData(data.cocina);
            if (data.consumo) StorageManager.saveConsumoData(data.consumo);
            if (data.extracciones) StorageManager.saveExtraccionesData(data.extracciones);
            if (data.transferencias) StorageManager.saveTransferenciasData(data.transferencias);
            if (data.efectivo) localStorage.setItem('ipb_efectivo_data', JSON.stringify(data.efectivo));
            if (data.billetes) localStorage.setItem('ipb_billetes_registros', JSON.stringify(data.billetes));
            if (data.dailyData) StorageManager.saveDailyData(data.dailyData);

            // Reportes
            if (data.reportes) localStorage.setItem('ipb_historial_reportes', JSON.stringify(data.reportes));

            // Configuraciones
            if (data.configuraciones) {
                if (data.configuraciones.lastReset) {
                    localStorage.setItem('ipb_last_reset', data.configuraciones.lastReset);
                }
                if (data.configuraciones.tasasUSD) {
                    localStorage.setItem('ipb_tasas_usd', JSON.stringify(data.configuraciones.tasasUSD));
                }
            }

            this.showSuccess('Sistema restaurado exitosamente. Recargando...');
            this.updateSystemInfo();

            // Recargar página después de 2 segundos
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error) {
            console.error('Error en restore completo:', error);
            this.showError('Error al restaurar sistema: ' + error.message);
        } finally {
            this.hideProgressModal();
        }
    }

    async saveBackupToDevice(jsonString, type) {
        if (!this.isMobile || !this.filesystem) {
            throw new Error('Sistema de archivos no disponible');
        }

        // Crear carpeta si no existe
        const backupFolder = await this.createBackupFolder();
        if (!backupFolder) {
            throw new Error('No se pudo crear la carpeta de backup');
        }

        // Generar nombre de archivo con extensión personalizada
        const date = new Date();
        const timestamp = date.toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' +
            date.getHours() + date.getMinutes();
        const fileName = `${type}_${timestamp}${this.CUSTOM_EXTENSION}`;
        const filePath = `${backupFolder}/${fileName}`;

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

        // Registrar en historial
        localStorage.setItem('ipb_last_backup', new Date().toISOString());

        // Guardar metadatos del archivo
        await this.setFileProperties(filePath, type);

        // Si está disponible, usar Share API para opción de compartir
        if (this.share) {
            try {
                // Guardar referencia para compartir
                await this.preferences?.set({
                    key: 'last_backup_shared',
                    value: filePath
                });
            } catch (error) {
                console.warn('No se pudo guardar referencia para compartir:', error);
            }
        }

        return { path: filePath, fileName, result };
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
        if (!this.isMobile || !this.share || !this.preferences) {
            this.showError('Compartir solo disponible en dispositivos móviles');
            return;
        }

        try {
            // Obtener el último backup guardado
            const lastBackup = await this.preferences.get({ key: 'last_backup_file' });

            if (!lastBackup || !lastBackup.value) {
                this.showError('No hay backups recientes para compartir');
                return;
            }

            // Leer el archivo
            const result = await this.filesystem.readFile({
                path: lastBackup.value,
                directory: this.Directory.Documents
            });

            // Convertir de base64 a Blob
            const binaryString = atob(result.data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const blob = new Blob([bytes.buffer], {
                type: 'application/octet-stream'
            });

            // Crear archivo temporal para compartir
            const fileName = lastBackup.value.split('/').pop();

            // Compartir usando Share API
            await this.share.share({
                title: 'Compartir Backup Gestor IPV',
                text: 'Backup de Gestor IPV - ' + fileName,
                files: [{
                    path: lastBackup.value,
                    mimeType: 'application/octet-stream',
                    fileName: fileName
                }],
                dialogTitle: 'Compartir backup'
            });

        } catch (error) {
            console.error('Error compartiendo backup:', error);
            this.showError('Error al compartir: ' + error.message);
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

            // Verificar si tiene la estructura mejorada
            if (data._header === this.MAGIC_HEADER) {
                return data;
            }

            // Si no tiene cabecera, podría ser un backup antiguo
            return data;
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
            '⚠️ ADVERTENCIA: Esto reemplazará todos los datos del día actual. ¿Continuar?',
            'warning'
        );

        if (!confirm) return;

        try {
            if (backupData.data.salon) StorageManager.saveSalonData(backupData.data.salon);
            if (backupData.data.cocina) StorageManager.saveCocinaData(backupData.data.cocina);
            if (backupData.data.consumo) StorageManager.saveConsumoData(backupData.data.consumo);
            if (backupData.data.extracciones) StorageManager.saveExtraccionesData(backupData.data.extracciones);
            if (backupData.data.transferencias) StorageManager.saveTransferenciasData(backupData.data.transferencias);
            if (backupData.data.efectivo) localStorage.setItem('ipb_efectivo_data', JSON.stringify(backupData.data.efectivo));
            if (backupData.data.billetes) localStorage.setItem('ipb_billetes_registros', JSON.stringify(backupData.data.billetes));
            if (backupData.data.dailyData) StorageManager.saveDailyData(backupData.data.dailyData);

            this.showSuccess('Datos del día restaurados exitosamente');
            this.updateSystemInfo();
            this.updateStats();

            if (typeof window.updateSummary === 'function') {
                window.updateSummary();
            }
        } catch (error) {
            throw error;
        }
    }

    async restoreCompletoFromData(backupData) {
        const confirm = await this.showConfirmationModal(
            'Restore Completo',
            '⚠️ ADVERTENCIA CRÍTICA: Esto reemplazará TODO el sistema. ¿Está absolutamente seguro?',
            'error'
        );

        if (!confirm) return;

        const finalConfirm = await this.showConfirmationModal(
            'CONFIRMACIÓN FINAL',
            'Esta acción NO se puede deshacer. ¿Continuar con el restore completo?',
            'error'
        );

        if (!finalConfirm) return;

        try {
            this.showProgressModal('Restaurando sistema completo...');

            const data = backupData.data;

            if (data.productosSalon) StorageManager.saveProducts(data.productosSalon);
            if (data.productosCocina) StorageManager.saveCocinaProducts(data.productosCocina);
            if (data.salon) StorageManager.saveSalonData(data.salon);
            if (data.cocina) StorageManager.saveCocinaData(data.cocina);
            if (data.consumo) StorageManager.saveConsumoData(data.consumo);
            if (data.extracciones) StorageManager.saveExtraccionesData(data.extracciones);
            if (data.transferencias) StorageManager.saveTransferenciasData(data.transferencias);
            if (data.efectivo) localStorage.setItem('ipb_efectivo_data', JSON.stringify(data.efectivo));
            if (data.billetes) localStorage.setItem('ipb_billetes_registros', JSON.stringify(data.billetes));
            if (data.dailyData) StorageManager.saveDailyData(data.dailyData);
            if (data.reportes) localStorage.setItem('ipb_historial_reportes', JSON.stringify(data.reportes));

            if (data.configuraciones) {
                if (data.configuraciones.lastReset) localStorage.setItem('ipb_last_reset', data.configuraciones.lastReset);
                if (data.configuraciones.tasasUSD) localStorage.setItem('ipb_tasas_usd', JSON.stringify(data.configuraciones.tasasUSD));
            }

            this.showSuccess('Sistema restaurado exitosamente. Recargando...');
            this.updateSystemInfo();

            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error) {
            throw error;
        } finally {
            this.hideProgressModal();
        }
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
            <div class="modal active">
                <div class="modal-overlay"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary modal-close">Cerrar</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.querySelector('.modal.active');
        const closeBtns = modal.querySelectorAll('.modal-close');
        const overlay = modal.querySelector('.modal-overlay');

        const closeModal = () => modal.remove();

        closeBtns.forEach(btn => btn.addEventListener('click', closeModal));
        overlay?.addEventListener('click', closeModal);
    }

    showInfoModal() {
        const modalHtml = `
            <div class="modal active">
                <div class="modal-overlay"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-info-circle"></i> Información de Backup & Restore</h3>
                        <button class="modal-close">&times;</button>
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
                        <button class="btn btn-primary modal-close">Entendido</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.querySelector('.modal.active');
        const closeBtns = modal.querySelectorAll('.modal-close');
        const overlay = modal.querySelector('.modal-overlay');

        const closeModal = () => modal.remove();

        closeBtns.forEach(btn => btn.addEventListener('click', closeModal));
        overlay?.addEventListener('click', closeModal);
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