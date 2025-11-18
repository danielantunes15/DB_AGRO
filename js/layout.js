// js/layout.js
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const mainNav = document.getElementById('main-nav'); // A nav principal
    
    // NOVO: Elemento do link SAAS
    const saasLinkContainer = document.getElementById('saas-link-container');

    function toggleSidebar() {
        document.body.classList.toggle('sidebar-open');
    }

    if (menuToggle) {
        menuToggle.addEventListener('click', toggleSidebar);
    }
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', toggleSidebar);
    }

    // --- NOVO: LÓGICA DE VISIBILIDADE DO PAINEL SAAS (APÓS AUTH.JS) ---
    // Verifica a permissão e mostra o link de Gerenciamento Central
    if (window.sistemaAuth && saasLinkContainer) {
        // Garantimos que o perfil foi carregado (o auth.js já chamou carregarSessaoEPerfil)
        window.sistemaAuth.carregarSessaoEPerfil().then(() => {
            if (window.sistemaAuth.isSuperAdmin()) {
                saasLinkContainer.style.display = 'block';
            } else {
                saasLinkContainer.style.display = 'none';
            }
        // Catch é desnecessário aqui, pois o auth.js já lida com o redirecionamento.
        });
    }
    // --- FIM DA LÓGICA DE VISIBILIDADE ---


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
    
        // ATUALIZADO: Não executa a lógica de título se estivermos no painel SAAS
        // O painel SAAS (gerenciamento-saas.js) agora controla o próprio título.
        if (mainNav.querySelector('.saas-nav-link')) {
            // Se encontrarmos um 'saas-nav-link', significa que estamos no painel SAAS.
            // Deixamos o 'gerenciamento-saas.js' cuidar do título.
            // Apenas definimos o título inicial:
            pageTitle.textContent = "Visão Geral";
            return;
        }

        // Lógica de título para o resto do site (index, cadastros, etc.)
        let activeLink = mainNav.querySelector('.nav-item-single .nav-link.active');
        
        if (!activeLink) {
             activeLink = mainNav.querySelector('.submenu-link.active');
        }

        if (activeLink) {
            const linkText = activeLink.textContent.trim();
            pageTitle.textContent = linkText;
        } else {
             activeLink = mainNav.querySelector('a.nav-link.active[href="gerenciamento-usuarios.html"]');
             if (activeLink) {
                 pageTitle.textContent = "Usuários";
             } else {
                 pageTitle.textContent = "Dashboard"; // Fallback
             }
        }
    }
});