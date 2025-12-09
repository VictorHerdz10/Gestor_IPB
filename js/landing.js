// Toggle del menú móvil con animaciones mejoradas
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const navbar = document.querySelector('.navbar');
    
    // Configurar scroll suave con velocidad controlada
    const configureSmoothScroll = () => {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                if (targetId === '#' || targetId === '#!') return;
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    // Calcular posición objetivo con offset del navbar
                    const navbarHeight = navbar.offsetHeight;
                    const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
                    
                    // Animación suave personalizada
                    const startPosition = window.pageYOffset;
                    const distance = targetPosition - startPosition;
                    const duration = 800; // Duración en ms (más lento)
                    let start = null;
                    
                    // Función de easing para movimiento más natural
                    const ease = (t, b, c, d) => {
                        t /= d / 2;
                        if (t < 1) return c / 2 * t * t + b;
                        t--;
                        return -c / 2 * (t * (t - 2) - 1) + b;
                    };
                    
                    const step = (timestamp) => {
                        if (!start) start = timestamp;
                        const progress = timestamp - start;
                        const percent = Math.min(progress / duration, 1);
                        
                        // Aplicar easing
                        const easePercent = ease(progress, 0, 1, duration);
                        window.scrollTo(0, startPosition + distance * easePercent);
                        
                        if (progress < duration) {
                            window.requestAnimationFrame(step);
                        }
                    };
                    
                    window.requestAnimationFrame(step);
                    
                    // Cerrar menú móvil si está abierto
                    if (window.innerWidth <= 768 && navLinks.classList.contains('active')) {
                        toggleMobileMenu();
                    }
                }
            });
        });
    };
    
    // Toggle del menú móvil
    const toggleMobileMenu = () => {
        if (window.innerWidth <= 768) {
            navLinks.classList.toggle('active');
            menuToggle.innerHTML = navLinks.classList.contains('active') 
                ? '<i class="fas fa-times"></i>' 
                : '<i class="fas fa-bars"></i>';
            
            // Prevenir scroll del body cuando el menú está abierto
            document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
        }
    };
    
    // Inicializar menú móvil
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleMobileMenu);
        
        // Cerrar menú al hacer clic en un enlace
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768 && navLinks.classList.contains('active')) {
                    toggleMobileMenu();
                }
            });
        });
    }
    
    // Navbar scroll effect
    const handleScroll = () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        
        // Animaciones al hacer scroll
        const elements = document.querySelectorAll('.feature-card, .step');
        elements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (elementTop < windowHeight * 0.85) {
                element.classList.add('fade-in-up');
            }
        });
    };
    
    // Configurar scroll suave
    configureSmoothScroll();
    
    // Event listeners
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('load', handleScroll);
    
    // Ajustar menú en resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            navLinks.classList.remove('active');
            menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
            document.body.style.overflow = '';
        }
    });
    
    // Efecto de hover en las cards con delay
    const cards = document.querySelectorAll('.feature-card, .step');
    cards.forEach((card, index) => {
        card.classList.add(`delay-${index % 4 + 1}`);
    });
    
    // Inicializar animaciones al cargar
    setTimeout(() => {
        handleScroll();
    }, 100);
});