// ==========================================
// PROFILE & REFERRAL LOGIC
// ==========================================

window.renderProfile = function() {
    if (!window.currentUser) return;

    // 1. Setup Avatar and Name (Using Telegram Data)
    if (window.tg && window.tg.initDataUnsafe && window.tg.initDataUnsafe.user) {
        const tgUser = window.tg.initDataUnsafe.user;
        
        document.getElementById('profile-page-name').innerText = tgUser.first_name || 'User';
        document.getElementById('profile-page-id').innerText = `ID: ${tgUser.id}`;

        const avatarEl = document.getElementById('profile-page-avatar');
        if (tgUser.photo_url) {
            avatarEl.src = tgUser.photo_url;
        } else {
            avatarEl.src = `https://api.dicebear.com/7.x/initials/svg?seed=${tgUser.first_name}&backgroundColor=0088cc,10a37f`;
        }
    } else {
        // Fallback for PC browser testing
        document.getElementById('profile-page-name').innerText = window.currentUser.name || 'Test User';
        document.getElementById('profile-page-id').innerText = `ID: ${window.currentUser.id}`;
    }

    // 2. Setup Balance and Referrals
    document.getElementById('profile-page-balance').innerText = `${(window.currentUser.balance || 0).toLocaleString()} 🪙`;
    document.getElementById('profile-page-referrals').innerText = `${window.currentUser.totalReferrals || 0} 👥`;

    // 3. Setup User Level Box
    const levels = [
        { req: 50000, lvl: 5, color: '#ff3b30', title: 'Grandmaster' },
        { req: 15000, lvl: 4, color: '#a855f7', title: 'Elite' },
        { req: 5000,  lvl: 3, color: '#0a84ff', title: 'Pro' },
        { req: 1000,  lvl: 2, color: '#32d74b', title: 'Rookie' },
        { req: 0,     lvl: 1, color: '#8e8e93', title: 'Starter' }
    ];
    
    let currentLevel = levels.find(l => (window.currentUser.balance || 0) >= l.req) || levels[4];
    
    const lvlBox = document.getElementById('profile-page-level');
    lvlBox.innerText = `Level ${currentLevel.lvl} - ${currentLevel.title}`;
    lvlBox.style.color = currentLevel.color;
    lvlBox.style.border = `1px solid ${currentLevel.color}`;
    lvlBox.style.background = `${currentLevel.color}15`; // Adds 15% opacity background of the same color
};

// --- REFERRAL LINK GENERATOR ---
window.copyReferralLink = function() {
    if (!window.currentUser || !window.currentUser.id) return;

    // 1. Your exact bot username
    const botUsername = "FPSearnbot"; 
    
    // 2. THE FIX: Using Telegram's Direct App Link format
    // NOTE: Change "/app" to whatever short-name you gave your Mini App in BotFather
    const inviteLink = `https://t.me/${botUsername}/app?startapp=ref_${window.currentUser.id}`;
    
    const customMessage = `🚀 Join me on SUPERBOT and earn real money!\n\nUse my invite link to get a starting bonus: ${inviteLink}`;

    // Update UI Button securely
    const btn = document.getElementById('copy-status');
    btn.innerText = "Copied!";
    btn.style.background = "var(--success)";
    btn.style.color = "white";

    // Write to clipboard
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(customMessage);
    } else {
        // Fallback for older browsers
        let textArea = document.createElement("textarea");
        textArea.value = customMessage;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try { document.execCommand('copy'); } catch (err) {}
        textArea.remove();
    }

    window.safeHaptic('success');
    
    setTimeout(() => {
        if(btn) {
            btn.innerText = "Copy";
            btn.style.background = "var(--surface-light)";
            btn.style.color = "var(--text-muted)";
        }
    }, 2000);
};

// --- SUPPORT LINK ---
window.openSupport = function() {
    // Open your Telegram support group or admin chat
    const supportLink = "https://t.me/YourSupportChannel"; 
    
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.openTelegramLink) {
        window.Telegram.WebApp.openTelegramLink(supportLink);
    } else {
        window.open(supportLink, '_blank');
    }
};