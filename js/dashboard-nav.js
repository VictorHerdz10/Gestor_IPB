// dashboard-nav.js - Sistema de navegación unificada para dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Solo ejecutar en dashboard
    if (!window.location.pathname.includes('dashboard.html')) return;
    
    
});
function setupSimplifiedNavListeners(navElement) {
    const navItems = navElement.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Quitar clase active de todos
            navItems.forEach(navItem => navItem.classList.remove('active'));
            
            // Agregar active al clickeado
            this.classList.add('active');
            
            // Si es volver al landing
            if (href.includes('index.html')) {
                e.preventDefault();
                navigateToLanding();
                return;
            }
            
            // Si ya estamos en dashboard, prevenir recarga
            if (href === 'dashboard.html' && window.location.href.includes('dashboard.html')) {
                e.preventDefault();
                // Solo scroll al inicio
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
        });
    });
}

async function navigateToLanding() {
    // Crear transición simple
    const transition = document.createElement('div');
    transition.id = 'loading-transition';
    transition.style.cssText = `
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
    
    transition.innerHTML = `
        <div class="loading-spinner" style="
            width: 60px;
            height: 60px;
            border: 4px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
        "></div>
        <h3 style="margin: 0; font-size: 1.2rem;">Volviendo al inicio...</h3>
        <style>
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        </style>
    `;
    
    document.body.appendChild(transition);
    
    // Mostrar transición
    setTimeout(() => {
        transition.style.opacity = '1';
    }, 10);
    
    // Esperar y redirigir
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 800);
}


// Agregar estilos CSS para la barra en dashboard
const style = document.createElement('style');
style.textContent = `
    
`;
document.head.appendChild(style);