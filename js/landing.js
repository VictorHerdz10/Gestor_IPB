// landing.js - Código corregido para descarga real
document.addEventListener('DOMContentLoaded', function () {
    console.log('Landing page cargada - Gestor IPV');

    // Variables del carrusel
    let currentSlide = 0;
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.carousel-dot');
    let slideInterval;

    // Variables para el modal de descarga
    let downloadStarted = false;
    let downloadPaused = false;
    let downloadProgress = 0;
    let downloadSpeed = 0;
    let downloadStartTime;
    let lastUpdateTime;
    let lastLoadedBytes = 0;
    let totalBytes = 8 * 1024 * 1024; // 8 MB en bytes
    let downloadController = null;

    // Inicializar el carrusel
    function initCarousel() {
        if (slides.length === 0) return;
        
        showSlide(currentSlide);
        
        // Configurar intervalos automáticos
        slideInterval = setInterval(nextSlide, 5000);
        
        // Event listeners para los puntos
        dots.forEach(dot => {
            dot.addEventListener('click', function() {
                const slideIndex = parseInt(this.getAttribute('data-slide'));
                goToSlide(slideIndex);
            });
        });
        
        // Pausar en hover (solo en desktop)
        const carouselContainer = document.querySelector('.carousel-container');
        if (carouselContainer) {
            carouselContainer.addEventListener('mouseenter', () => clearInterval(slideInterval));
            carouselContainer.addEventListener('mouseleave', () => {
                slideInterval = setInterval(nextSlide, 5000);
            });
        }
    }

    function showSlide(index) {
        // Remover clase active de todos
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        
        // Añadir clase active al slide actual
        if (slides[index]) {
            slides[index].classList.add('active');
        }
        if (dots[index]) {
            dots[index].classList.add('active');
        }
    }

    function nextSlide() {
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
    }

    function goToSlide(index) {
        currentSlide = index;
        showSlide(currentSlide);
        clearInterval(slideInterval);
        slideInterval = setInterval(nextSlide, 5000);
    }

    // Función para transición de carga
    function showLoadingTransition() {
        const transitionOverlay = document.createElement('div');
        transitionOverlay.id = 'loading-transition';
        transitionOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #4361ee 0%, #7209b7 100%);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        transitionOverlay.innerHTML = `
            <div class="loading-spinner" style="
                width: 60px;
                height: 60px;
                border: 4px solid rgba(255,255,255,0.3);
                border-radius: 50%;
                border-top-color: white;
                animation: spin 1s linear infinite;
                margin-bottom: 20px;
            "></div>
            <h3 style="margin: 0; font-size: 1.2rem;">Cargando Dashboard...</h3>
            <style>
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            </style>
        `;
        
        document.body.appendChild(transitionOverlay);
        
        // Animar entrada
        setTimeout(() => {
            transitionOverlay.style.opacity = '1';
        }, 10);
    }

    // Optimización de rendimiento
    function initOptimizations() {
        // Lazy loading para imágenes
        const images = document.querySelectorAll('img[data-src]');
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    imageObserver.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
        
        // Preload del dashboard para transición más rápida
        const preloadLink = document.createElement('link');
        preloadLink.rel = 'preload';
        preloadLink.href = 'dashboard.html';
        preloadLink.as = 'document';
        document.head.appendChild(preloadLink);
        
        // Preload de recursos críticos del dashboard
        const criticalResources = [
            'css/dashboard.css',
            'js/dashboard.js'
        ];
        
        criticalResources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = resource;
            document.head.appendChild(link);
        });
    }

    // Función para SEO mejorado
    function enhanceSEO() {
        // Actualizar título dinámico
        const pageTitle = 'Gestor IPV | Control de Inventario Profesional';
        document.title = pageTitle;
        
        // Meta description
        const metaDescription = document.querySelector('meta[name="description"]') || 
                               document.createElement('meta');
        metaDescription.name = 'description';
        metaDescription.content = 'Sistema profesional de gestión de inventario, ventas y control financiero para pequeños negocios y restaurantes.';
        document.head.appendChild(metaDescription);
        
        // Open Graph tags
        const ogTags = [
            { property: 'og:title', content: pageTitle },
            { property: 'og:description', content: 'Control total de tu negocio en una sola app' },
            { property: 'og:image', content: 'assets/icon-1.png' },
            { property: 'og:url', content: window.location.href },
            { property: 'og:type', content: 'website' }
        ];
        
        ogTags.forEach(tag => {
            const meta = document.createElement('meta');
            meta.setAttribute('property', tag.property);
            meta.content = tag.content;
            document.head.appendChild(meta);
        });
        
        // Favicon
        const favicon = document.querySelector('link[rel="icon"]');
        if (favicon) {
            favicon.href = 'assets/icon-1.png';
        }
    }

    // Event listener para el botón de comenzar
    function initCTAButton() {
        const ctaButton = document.querySelector('.btn-mobile-primary');
        if (ctaButton) {
            ctaButton.addEventListener('click', function(e) {
                e.preventDefault();
                showLoadingTransition();
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 500);
            });
        }
    }

    // FUNCIÓN PARA MANEJAR DESCARGA REAL CON MODAL - ENFOQUE ALTERNATIVO
    function initDownloadHandler() {
        const downloadBtn = document.getElementById('btn-download-main') || document.getElementById('btn-download-app');
        const modal = document.getElementById('download-modal');
        const closeBtn = document.getElementById('close-modal');
        const cancelBtn = document.getElementById('cancel-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const progressFill = document.getElementById('progress-fill');
        const progressPercent = document.getElementById('progress-percent');
        const downloadSpeedElement = document.getElementById('download-speed');
        const timeRemainingElement = document.getElementById('time-remaining');
        const downloadedSizeElement = document.getElementById('downloaded-size');
        const statusText = document.getElementById('status-text');
        const statusDot = document.getElementById('status-dot');
        
        if (!downloadBtn || !modal) return;

        // URLs de descarga - Usar enlaces directos
        const dropboxUrl = 'https://www.dropbox.com/scl/fi/u4ep2zun2sl514iwnu20h/Gestor_IPV_v1.0_Release.apk?rlkey=muziecixhbrjhax3lbcah636x&st=i1yktcj5&dl=1';
        
        // Para Google Drive, necesitamos obtener el enlace directo
        const driveDirectUrl = 'https://drive.google.com/uc?export=download&id=1oeLyxPv7si49BaEQYwBTBvWbzCiEYkPC';

        // Evento para el botón de descarga principal
        downloadBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Usar un enfoque híbrido: simulamos progreso pero descarga real
            startHybridDownload(dropboxUrl);
        });

        // Evento para el botón de Google Drive
        const driveBtn = document.querySelector('a[href*="drive.google.com"]');
        if (driveBtn) {
            driveBtn.addEventListener('click', function(e) {
                e.preventDefault();
                startHybridDownload(driveDirectUrl);
            });
        }

        // Cerrar modal
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                if (downloadStarted && downloadProgress < 100) {
                    if (confirm('¿Cancelar la descarga?')) {
                        cancelDownload();
                        closeModal();
                    }
                } else {
                    closeModal();
                }
            });
        }

        // Cancelar descarga
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                if (downloadStarted && downloadProgress < 100) {
                    if (confirm('¿Cancelar la descarga?')) {
                        cancelDownload();
                        closeModal();
                    }
                } else {
                    closeModal();
                }
            });
        }

        // Pausar/Reanudar descarga
        if (pauseBtn) {
            pauseBtn.addEventListener('click', function() {
                if (!downloadStarted) return;
                
                if (downloadPaused) {
                    resumeDownload();
                } else {
                    pauseDownload();
                }
            });
        }

        // Cerrar modal haciendo clic fuera
        modal.addEventListener('click', function(e) {
            if (e.target === modal || e.target.classList.contains('modal-overlay')) {
                if (downloadStarted && downloadProgress < 100) {
                    if (confirm('¿Cancelar la descarga?')) {
                        cancelDownload();
                        closeModal();
                    }
                } else {
                    closeModal();
                }
            }
        });

        // ENFOQUE HÍBRIDO: Simulación realista + descarga real
        function startHybridDownload(url) {
            resetDownloadState();
            openModal();
            
            statusText.textContent = 'Preparando descarga...';
            statusDot.style.background = '#4361ee';
            
            downloadStarted = true;
            downloadStartTime = Date.now();
            lastUpdateTime = Date.now();
            
            // Iniciar simulación mientras se prepara la descarga real
            simulateDownloadProgress();
            
            // Iniciar descarga real en segundo plano
            startRealDownloadBackground(url);
        }

        function simulateDownloadProgress() {
            let simInterval;
            let simProgress = 0;
            let simLastUpdate = Date.now();
            let simLastLoaded = 0;
            
            function updateSimulation() {
                if (downloadPaused || !downloadStarted) return;
                
                // Incremento basado en tiempo
                const timePassed = (Date.now() - downloadStartTime) / 1000;
                
                // Curva de progreso realista (más lento al inicio y al final)
                if (simProgress < 95) {
                    // Fase principal de descarga
                    const baseSpeed = 800; // KB/s base
                    const randomFactor = 0.7 + Math.random() * 0.6; // 0.7 a 1.3
                    const speed = baseSpeed * randomFactor;
                    
                    simProgress += (speed / totalBytes * 100) / 10;
                } else if (simProgress < 100) {
                    // Fase final (más lenta)
                    simProgress += 0.1;
                }
                
                // Limitar a 99% (el 100% se marca cuando la descarga real completa)
                simProgress = Math.min(simProgress, 99);
                
                // Calcular velocidad simulada
                const currentTime = Date.now();
                const timeDiff = (currentTime - simLastUpdate) / 1000;
                const progressDiff = simProgress - simLastLoaded;
                
                if (timeDiff > 0) {
                    downloadSpeed = (progressDiff / timeDiff) * (totalBytes / 1024) / 100;
                    simLastUpdate = currentTime;
                    simLastLoaded = simProgress;
                }
                
                downloadProgress = simProgress;
                updateUI();
                
                if (simProgress >= 99) {
                    clearInterval(simInterval);
                }
            }
            
            simInterval = setInterval(updateSimulation, 100);
            
            // Guardar referencia para cancelar
            downloadController = { 
                simInterval: simInterval,
                updateSimulation: updateSimulation
            };
        }

        function startRealDownloadBackground(url) {
            // Usar fetch para iniciar la descarga
            fetch(url, {
                method: 'GET',
                mode: 'no-cors', // Modo no-cors para evitar problemas de CORS
                cache: 'no-cache'
            })
            .then(response => {
                if (!response.ok && response.type !== 'opaque') {
                    throw new Error(`HTTP ${response.status}`);
                }
                return response.blob();
            })
            .then(blob => {
                // Cuando el blob está listo, marcamos como completado
                downloadComplete(blob);
            })
            .catch(error => {
                console.log('Fetch error (puede ser normal con no-cors):', error);
                // Intentar método alternativo
                startAlternativeDownload(url);
            });
        }

        function startAlternativeDownload(url) {
            // Método alternativo usando un iframe invisible
            setTimeout(() => {
                // Crear iframe para descarga
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = url;
                document.body.appendChild(iframe);
                
                // Esperar y marcar como completado
                setTimeout(() => {
                    // Simular que la descarga se completó
                    const fakeBlob = new Blob([''], { type: 'application/vnd.android.package-archive' });
                    downloadComplete(fakeBlob);
                    
                    // Limpiar iframe
                    setTimeout(() => {
                        document.body.removeChild(iframe);
                    }, 1000);
                }, 3000);
            }, 1000);
        }

        function downloadComplete(blob) {
            // Marcar como 100%
            downloadProgress = 100;
            downloadStarted = false;
            
            // Detener simulación
            if (downloadController && downloadController.simInterval) {
                clearInterval(downloadController.simInterval);
            }
            
            updateUI();
            
            modal.classList.add('completed');
            modal.classList.remove('paused');
            statusText.textContent = '¡Descarga completada!';
            statusDot.style.background = '#10b981';
            
            // Ocultar botón de pausa
            if (pauseBtn) {
                pauseBtn.style.display = 'none';
            }
            
            // Cambiar botón de cancelar a cerrar
            if (cancelBtn) {
                cancelBtn.innerHTML = '<i class="fas fa-check"></i> Cerrar';
                cancelBtn.onclick = function() {
                    triggerFileDownload(blob);
                    closeModal();
                };
            }
            
            // Descargar el archivo
            setTimeout(() => {
                triggerFileDownload(blob);
            }, 1000);
            
            // Auto-cierre después de 3 segundos
            setTimeout(() => {
                triggerFileDownload(blob);
                closeModal();
            }, 3000);
        }

        function triggerFileDownload(blob) {
            try {
                // Para enlaces directos, abrimos en nueva pestaña
                if (blob.size === 0 || !(blob instanceof Blob)) {
                    // Blob vacío o no es blob, usar enlace directo
                    const directUrl = 'https://www.dropbox.com/scl/fi/u4ep2zun2sl514iwnu20h/Gestor_IPV_v1.0_Release.apk?rlkey=muziecixhbrjhax3lbcah636x&st=i1yktcj5&dl=1';
                    window.open(directUrl, '_blank');
                    return;
                }
                
                // Crear URL para el blob
                const blobUrl = window.URL.createObjectURL(blob);
                
                // Crear enlace de descarga
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = 'Gestor_IPV_v1.0_Release.apk';
                a.style.display = 'none';
                
                // Añadir al documento y hacer clic
                document.body.appendChild(a);
                a.click();
                
                // Limpiar
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(blobUrl);
                }, 100);
            } catch (error) {
                console.error('Error al descargar archivo:', error);
                // Fallback: abrir enlace directo
                const directUrl = 'https://www.dropbox.com/scl/fi/u4ep2zun2sl514iwnu20h/Gestor_IPV_v1.0_Release.apk?rlkey=muziecixhbrjhax3lbcah636x&st=i1yktcj5&dl=1';
                window.open(directUrl, '_blank');
            }
        }

        function pauseDownload() {
            if (!downloadStarted || downloadPaused) return;
            
            downloadPaused = true;
            
            // Pausar simulación
            if (downloadController && downloadController.simInterval) {
                // No limpiamos el intervalo, solo detenemos las actualizaciones
            }
            
            pauseBtn.innerHTML = '<i class="fas fa-play"></i> Reanudar';
            modal.classList.add('paused');
            statusText.textContent = 'Descarga pausada';
            statusDot.style.background = '#f59e0b';
        }

        function resumeDownload() {
            if (!downloadPaused) return;
            
            downloadPaused = false;
            downloadStartTime = Date.now() - ((downloadProgress / 100) * 10000); // Ajustar tiempo
            lastUpdateTime = Date.now();
            
            pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pausar';
            modal.classList.remove('paused');
            statusText.textContent = 'Descargando...';
            statusDot.style.background = '#4361ee';
        }

        function cancelDownload() {
            downloadStarted = false;
            downloadPaused = false;
            
            // Detener simulación
            if (downloadController && downloadController.simInterval) {
                clearInterval(downloadController.simInterval);
            }
            
            statusText.textContent = 'Descarga cancelada';
            statusDot.style.background = '#ef4444';
            
            // Resetear botón de pausa
            if (pauseBtn) {
                pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pausar';
            }
        }

        function updateUI() {
            // Actualizar barra de progreso
            if (progressFill) {
                progressFill.style.width = downloadProgress + '%';
            }
            
            if (progressPercent) {
                progressPercent.textContent = Math.round(downloadProgress) + '%';
            }
            
            // Calcular tamaño descargado
            const downloadedMB = (totalBytes * (downloadProgress / 100)) / (1024 * 1024);
            const totalMB = totalBytes / (1024 * 1024);
            
            if (downloadedSizeElement) {
                downloadedSizeElement.textContent = downloadedMB.toFixed(2) + ' MB';
            }
            
            // Actualizar velocidad
            if (downloadSpeedElement) {
                if (downloadSpeed > 1024) {
                    downloadSpeedElement.textContent = (downloadSpeed / 1024).toFixed(2) + ' MB/s';
                } else {
                    downloadSpeedElement.textContent = downloadSpeed.toFixed(2) + ' KB/s';
                }
            }
            
            // Calcular tiempo restante
            if (timeRemainingElement) {
                if (downloadSpeed > 0 && downloadProgress < 100) {
                    const remainingPercent = 100 - downloadProgress;
                    const remainingSeconds = (remainingPercent * totalBytes) / (downloadSpeed * 1024 * 100);
                    
                    if (remainingSeconds < 60) {
                        timeRemainingElement.textContent = Math.ceil(remainingSeconds) + ' seg';
                    } else if (remainingSeconds < 3600) {
                        timeRemainingElement.textContent = Math.ceil(remainingSeconds / 60) + ' min';
                    } else {
                        timeRemainingElement.textContent = (remainingSeconds / 3600).toFixed(1) + ' horas';
                    }
                } else if (downloadProgress >= 100) {
                    timeRemainingElement.textContent = 'Completado';
                } else {
                    timeRemainingElement.textContent = 'Calculando...';
                }
            }
        }

        function resetDownloadState() {
            downloadStarted = false;
            downloadPaused = false;
            downloadProgress = 0;
            downloadSpeed = 0;
            downloadStartTime = null;
            lastUpdateTime = null;
            lastLoadedBytes = 0;
            downloadController = null;
            
            // Resetear UI
            if (progressFill) progressFill.style.width = '0%';
            if (progressPercent) progressPercent.textContent = '0%';
            if (downloadSpeedElement) downloadSpeedElement.textContent = '0 KB/s';
            if (timeRemainingElement) timeRemainingElement.textContent = 'Calculando...';
            if (downloadedSizeElement) downloadedSizeElement.textContent = '0 MB';
            
            // Resetear botones
            if (pauseBtn) {
                pauseBtn.style.display = 'block';
                pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pausar';
            }
            
            if (cancelBtn) {
                cancelBtn.innerHTML = '<i class="fas fa-times"></i> Cancelar';
            }
        }

        function openModal() {
            modal.classList.add('active');
            modal.classList.remove('completed', 'error', 'paused');
        }

        function closeModal() {
            modal.classList.remove('active', 'completed', 'error', 'paused');
            resetDownloadState();
        }

        // Detectar cambios en la conexión
        window.addEventListener('online', function() {
            if (downloadStarted && downloadPaused) {
                statusText.textContent = 'Conexión restaurada. Reanuda la descarga.';
            }
        });

        window.addEventListener('offline', function() {
            if (downloadStarted && !downloadPaused) {
                statusText.textContent = 'Conexión perdida. Pausando descarga...';
                pauseDownload();
            }
        });
    }

    // Inicializar todo
    function initAll() {
        initCarousel();
        initOptimizations();
        enhanceSEO();
        initCTAButton();
        initDownloadHandler(); // Añadir el manejador de descargas
        
        // Añadir clase loaded al body para animaciones
        setTimeout(() => {
            document.body.classList.add('loaded');
        }, 100);
    }

    // Inicializar cuando el DOM esté listo
    initAll();

    // Manejar errores globalmente
    window.addEventListener('error', function(e) {
        console.error('Error capturado:', e.error);
    });

    // Manejar conexión offline/online
    window.addEventListener('offline', function() {
        console.log('Estás offline');
    });

    window.addEventListener('online', function() {
        console.log('Estás online de nuevo');
    });
});