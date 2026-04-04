// ==========================================
// UI MANAGERS & ROUTER
// ==========================================

window.updateTopBarUI = function() {
    const nameEl = document.querySelector('.user-name');
    const walletEl = document.querySelector('.wallet span:first-child');
    const storeBalanceEl = document.getElementById('store-page-balance'); 
    
    if (nameEl) nameEl.innerText = window.currentUser.name;
    if (walletEl) walletEl.innerText = window.currentUser.balance.toLocaleString();
    
    if (storeBalanceEl) storeBalanceEl.innerText = window.currentUser.balance.toLocaleString() + ' 🪙';
    
    window.calculateUserLevel(window.currentUser.balance);
};

window.calculateUserLevel = function(balance) {
    const levels = [
        { req: 50000, lvl: 5, color: '--lvl5-color' },
        { req: 15000, lvl: 4, color: '--lvl4-color' },
        { req: 5000,  lvl: 3, color: '--lvl3-color' },
        { req: 1000,  lvl: 2, color: '--lvl2-color' },
        { req: 0,     lvl: 1, color: '--lvl1-color' }
    ];

    let currentLevel = levels.find(l => balance >= l.req) || levels[4];

    const levelDisplay = document.getElementById('user-level-display');
    if (levelDisplay) levelDisplay.innerText = `Lvl ${currentLevel.lvl}`;
    document.documentElement.style.setProperty('--current-level-color', `var(${currentLevel.color})`);
};

window.navigateTo = async function(pageName, clickedElement, pushHistory = true) {
    
    if (pushHistory) {
        history.pushState({ view: 'main', page: pageName }, '', '?page=' + pageName);
    }

    // ==========================================
    // 🚀 TELEGRAM NATIVE BACK BUTTON LOGIC
    // ==========================================
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.BackButton) {
        if (pageName === 'home') {
            window.Telegram.WebApp.BackButton.hide(); // Hide on home so physical back closes app
        } else {
            window.Telegram.WebApp.BackButton.show(); // Show on other tabs
        }
    }

    const appContent = document.getElementById('app-content');
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.classList.remove('active');
        const icon = item.querySelector('ion-icon');
        if(icon && icon.hasAttribute('data-icon')) {
            icon.setAttribute('name', icon.getAttribute('data-icon') + '-outline');
        }
    });
    
    if(clickedElement) {
        clickedElement.classList.add('active');
        const activeIcon = clickedElement.querySelector('ion-icon');
        if(activeIcon && activeIcon.hasAttribute('data-icon')) {
            activeIcon.setAttribute('name', activeIcon.getAttribute('data-icon'));
        }
    }

    let skeletonHTML = '';

    if (pageName === 'earn') {
        const taskSkeleton = `
            <div style="display: flex; align-items: center; justify-content: space-between; background: var(--surface-color); padding: 15px; border-radius: 16px; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 15px; width: 70%;">
                    <div class="skeleton" style="width: 50px; height: 50px; border-radius: 12px; flex-shrink: 0;"></div>
                    <div style="width: 100%;">
                        <div class="skeleton" style="width: 70%; height: 16px; border-radius: 4px; margin-bottom: 8px;"></div>
                        <div class="skeleton" style="width: 40%; height: 12px; border-radius: 4px;"></div>
                    </div>
                </div>
                <div class="skeleton" style="width: 60px; height: 32px; border-radius: 50px;"></div>
            </div>`;
        skeletonHTML = `<div style="padding: 20px;">${taskSkeleton.repeat(4)}</div>`;

    } else if (pageName === 'store') {
        const balanceCardSkeleton = `
            <div style="background: var(--surface-color); padding: 20px; border-radius: 16px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <div class="skeleton" style="width: 100px; height: 14px; border-radius: 4px; margin-bottom: 12px;"></div>
                    <div class="skeleton" style="width: 160px; height: 32px; border-radius: 8px;"></div>
                </div>
                <div class="skeleton" style="width: 50px; height: 50px; border-radius: 50%;"></div>
            </div>`;
        skeletonHTML = `<div style="padding: 20px;">${balanceCardSkeleton}</div>`;
    } else if (pageName === 'profile') {
        skeletonHTML = `<div style="padding: 30px 20px; display: flex; flex-direction: column; align-items: center; gap: 15px;"><div class="skeleton" style="width: 100px; height: 100px; border-radius: 50%;"></div></div>`;
    } else {
        skeletonHTML = `<div style="display:flex; flex-direction:column; gap: 15px; padding: 20px;"><div class="skeleton" style="width: 100%; height: 140px; border-radius: 16px;"></div></div>`;
    }

    appContent.innerHTML = skeletonHTML;

    try {
        const [response] = await Promise.all([
            fetch(`pages/${pageName}.html`),
            new Promise(resolve => setTimeout(resolve, 300))
        ]);

        if (!response.ok) throw new Error("Page not found");
        
        const html = await response.text();
        appContent.innerHTML = html;
        
        if (pageName === 'home') { if (typeof window.initHomeLogic === 'function') window.initHomeLogic(); }
        if (pageName === 'earn') window.renderTasks();
        if (pageName === 'profile') window.renderProfile();
        if (pageName === 'store') window.renderStore();
        if (pageName === 'ads') window.initAdsLogic();
        if (pageName === 'game') window.initGameLogic();
        if (pageName === 'deposit') { if (typeof window.initDepositLogic === 'function') window.initDepositLogic(); }

    } catch (error) {
        appContent.innerHTML = `<div style="text-align:center; padding: 50px; color: var(--text-muted);">Page under construction.</div>`;
    }
};

window.openSubPage = async function(folder, file, title, pushHistory = true) {
    
    if (pushHistory) {
        history.pushState({ view: 'sub', folder: folder, file: file, title: title }, '', '?view=' + file);
    }

    // ==========================================
    // 🚀 TELEGRAM NATIVE BACK BUTTON LOGIC
    // ==========================================
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.BackButton) {
        window.Telegram.WebApp.BackButton.show(); // Always show inside a popup!
    }

    const container = document.getElementById('subpage-container');
    const contentArea = document.getElementById('subpage-content');
    const titleArea = document.getElementById('subpage-title');
    
    if (!container) return;
    titleArea.innerText = title;
    
    contentArea.innerHTML = `
        <div style="display:flex; flex-direction:column; gap: 15px; padding: 20px;">
            <div class="skeleton" style="width: 100%; height: 60px; border-radius: 12px;"></div>
            <div class="skeleton" style="width: 100%; height: 120px; border-radius: 12px;"></div>
        </div>`;
    
    container.classList.add('open');

    try {
        const [response] = await Promise.all([
            fetch(`additional/${folder}/${file}.html`),
            new Promise(resolve => setTimeout(resolve, 300))
        ]);

        if (!response.ok) throw new Error("File not found");
        const html = await response.text();
        contentArea.innerHTML = html;
        
        if (file === 'deposit' && typeof window.initDepositLogic === 'function') window.initDepositLogic();
        if (file === 'transactions' && typeof window.initTransactionsLogic === 'function') window.initTransactionsLogic();
        if (folder === 'games' && typeof window[`init_${file}`] === 'function') window[`init_${file}`]();

    } catch (error) {
        contentArea.innerHTML = `<div style="text-align:center; padding-top: 50px; color: #ff3b30;"><p>Screen under construction.</p></div>`;
    }
};

window.closeSubPage = function() {
    history.back();
};

window.hideSubpageForce = function() {
    const container = document.getElementById('subpage-container');
    if (container) container.classList.remove('open');
    setTimeout(() => {
        const contentArea = document.getElementById('subpage-content');
        if (contentArea) contentArea.innerHTML = '';
    }, 300);
};

// ==========================================
// 3. THE SYSTEM BACK BUTTON LISTENER
// ==========================================
window.addEventListener('popstate', (event) => {
    const state = event.state;
    
    if (state) {
        if (state.view === 'main') {
            const container = document.getElementById('subpage-container');
            if (container && container.classList.contains('open')) {
                window.hideSubpageForce();
            }
            
            let targetBtn = null;
            document.querySelectorAll('.nav-item').forEach(b => {
                if (b.getAttribute('onclick') && b.getAttribute('onclick').includes("'" + state.page + "'")) {
                    targetBtn = b;
                }
            });

            window.navigateTo(state.page, targetBtn, false);
            
        } else if (state.view === 'sub') {
            window.openSubPage(state.folder, state.file, state.title, false);
        }
    } else {
        window.hideSubpageForce();
        const firstNavBtn = document.querySelectorAll('.nav-item')[0];
        if (firstNavBtn) window.navigateTo('home', firstNavBtn, false);
    }
});

// ==========================================
// 4. BIND TELEGRAM BUTTON TO ROUTER
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.BackButton) {
        // When Telegram detects a physical back swipe or top-left back button press:
        window.Telegram.WebApp.BackButton.onClick(() => {
            history.back(); // Trigger our router's popstate logic!
        });
    }
});