// js/layout.js
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const mainNav = document.getElementById('main-nav'); // A nav principal

    function toggleSidebar() {
        document.body.classList.toggle('sidebar-open');
    }

    if (menuToggle) {
        menuToggle.addEventListener('click', toggleSidebar);
    }
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', toggleSidebar);
    }

    // --- NOVO: LÓGICA PARA SUBMENUS ---
    const submenuToggles = document.querySelectorAll('.nav-link-toggle');
    
    submenuToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault(); // Prevenir navegação do link pai
            
            // Encontra o item pai e o submenu
            const parentItem = this.closest('.nav-item-submenu');
            const submenu = parentItem.querySelector('.submenu');
            
            // Fecha outros submenus abertos
            document.querySelectorAll('.nav-item-submenu.open').forEach(openItem => {
                if (openItem !== parentItem) {
                    openItem.classList.remove('open');
                    openItem.querySelector('.submenu').classList.remove('open');
                }
            });
            
            // Alterna (toggle) o submenu atual
            parentItem.classList.toggle('open');
            submenu.classList.toggle('open');
        });
    });
    // --- FIM DA LÓGICA DE SUBMENUS ---

    // Lógica do botão "Sair" (movido do inline script para cá)
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (window.sistemaAuth && typeof window.sistemaAuth.fazerLogout === 'function') {
                window.sistemaAuth.fazerLogout();
            } else {
                // Fallback
                localStorage.removeItem('usuarioLogado');
                window.location.href = 'login.html';
            }
        });
    }
    
    // Lógica do Título da Página (Bônus, mas muito bom)
    // Encontra o link 'active' e define o título da página
    const pageTitle = document.getElementById('page-title');
    if (pageTitle && mainNav) {
        // Tenta encontrar um link ativo num item singular
        let activeLink = mainNav.querySelector('.nav-item-single .nav-link.active');
        
        // Se não encontrar, tenta encontrar num submenu (para quando criar as páginas)
        if (!activeLink) {
             activeLink = mainNav.querySelector('.submenu-link.active');
        }

        if (activeLink) {
            // Pega o texto do link, removendo emojis se houver
            const linkText = activeLink.textContent.trim();
            pageTitle.textContent = linkText;
        } else {
            // Verifica se o link de Usuários (que não está no submenu) está ativo
             activeLink = mainNav.querySelector('a.nav-link.active[href="gerenciamento-usuarios.html"]');
             if (activeLink) {
                 pageTitle.textContent = "Usuários";
             } else {
                 pageTitle.textContent = "Dashboard"; // Fallback
             }
        }
    }
});