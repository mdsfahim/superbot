// ==========================================
// MASTER USER SYNC & REFERRAL ENGINE
// ==========================================

window.currentUser = null;
window.userRef = null;

// 👉 THE FIX: A universal UI refresher that updates whatever page is currently open!
window.updateAllUI = function() {
    // 1. Always update the Top Bar (Coins & Name)
    if (typeof window.updateTopBarUI === 'function') window.updateTopBarUI();
    
    // 2. If the Home page is currently on the screen, refresh its live stats!
    if (document.getElementById('home-stat-refs') && typeof window.initHomeLogic === 'function') {
        window.initHomeLogic();
    }
    
    // 3. If the Profile page is currently on the screen, refresh its live stats!
    if (document.getElementById('profile-page-balance') && typeof window.renderProfile === 'function') {
        window.renderProfile();
    }
};

window.syncUserData = async function() {
    
    // 1. SAFELY CONNECT TO TELEGRAM
    if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
        window.tg = window.Telegram.WebApp;
    }

    // 2. PARSE TELEGRAM DATA SAFELY
    let tgUser = null;
    let startParam = '';

    if (window.tg && window.tg.initDataUnsafe && window.tg.initDataUnsafe.user) {
        tgUser = window.tg.initDataUnsafe.user;
        startParam = window.tg.initDataUnsafe.start_param || '';
    } else {
        // Fallback for PC/Browser testing
        console.warn("Telegram WebApp not detected. Using test account.");
        tgUser = { id: 'test_123', first_name: 'Test', last_name: 'User' };
    }

    const userId = tgUser.id ? tgUser.id.toString() : 'unknown_id';

    // Pre-Initialize to stop "null" errors
    window.currentUser = {
        id: userId,
        name: `${tgUser.first_name} ${tgUser.last_name || ''}`.trim(),
        photoUrl: tgUser.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${tgUser.first_name}&backgroundColor=0088cc,10a37f`,
        balance: 0,
        totalReferrals: 0,
        completedTasks: [],
        streak: 1
    };

    // 3. CONNECT TO FIREBASE
    try {
        window.userRef = window.db.collection('users').doc(userId);
        const doc = await window.userRef.get();

        if (!doc.exists) {
            // ==========================================
            // BRAND NEW USER REGISTRATION
            // ==========================================
            let referrerId = null;
            let welcomeTitle = "Welcome to SUPERBOT!";
            let welcomeMsg = "You received a <b style='color: #ffcc00;'>500 🪙</b> signup bonus. Complete tasks to grow your wallet!";

            if (startParam.startsWith('ref_')) {
                referrerId = startParam.replace('ref_', '');
                
                if (referrerId !== userId) {
                    try {
                        // 1. Get the referrer's current stats
                        const refDoc = await window.db.collection('users').doc(referrerId).get();
                        
                        if (refDoc.exists) {
                            const newTotal = (refDoc.data().totalReferrals || 0) + 1;
                            
                            // 2. Reward the Referrer in Firebase
                            await window.db.collection('users').doc(referrerId).update({
                                balance: firebase.firestore.FieldValue.increment(1000),
                                totalReferrals: firebase.firestore.FieldValue.increment(1)
                            });

                            // 3. SEND DIRECT TELEGRAM MESSAGE TO THE REFERRER!
                            const botToken = "YOUR_BOT_TOKEN_HERE"; // ⚠️ PASTE YOUR BOT TOKEN HERE
                            
                            if (botToken !== "YOUR_BOT_TOKEN_HERE") {
                                const tgMsg = `🎉 *Great News!*\n\n*${tgUser.first_name}* just joined SUPERBOT using your referral link!\n\n👥 *Total Referrals:* ${newTotal}\n💰 *Reward:* +1,000 🪙 added to your balance!`;
                                
                                fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        chat_id: referrerId,
                                        text: tgMsg,
                                        parse_mode: "Markdown",
                                        reply_markup: {
                                            inline_keyboard: [[{ text: "🚀 Open App", url: "http://t.me/FPSearnbot/app" }]]
                                        }
                                    })
                                }).catch(err => console.error("Notification error:", err));
                            }
                            
                            // Customize the popup for the new user because they used a link
                            welcomeTitle = "You were invited!";
                            welcomeMsg = "You received a <b style='color: #ffcc00;'>500 🪙</b> bonus for using a referral link. Start earning now!";
                        }
                    } catch (e) { console.error("Failed to reward referrer", e); }
                }
            }

            // Create the new user
            window.currentUser.balance = 500;
            window.currentUser.invitedBy = referrerId;
            window.currentUser.isBanned = false;
            window.currentUser.lastLoginDate = getTodayDateString();
            window.currentUser.createdAt = firebase.firestore.FieldValue.serverTimestamp();

            await window.userRef.set(window.currentUser);
            
            // SHOW THE BEAUTIFUL HTML POPUP INSTEAD OF THE UGLY ALERT
            const welcomePopup = document.getElementById('welcome-popup');
            if (welcomePopup) {
                document.getElementById('welcome-title').innerHTML = welcomeTitle;
                document.getElementById('welcome-message').innerHTML = welcomeMsg;
                welcomePopup.style.display = 'flex';
                window.safeHaptic('success');
            }
            
            attachRealtimeListener();

        } else {
            // RETURNING USER
            const dbData = doc.data();
            window.currentUser = { ...window.currentUser, ...dbData, id: userId };

            if (window.currentUser.isBanned) {
                enforceBan();
                return; 
            }

            processDailyStreak();
            attachRealtimeListener();
        }

        // 👉 THE FIX: Call the UI refresher once initial Firebase data is loaded!
        window.updateAllUI();

    } catch (error) {
        console.error("Critical Sync Error:", error);
        window.safeAlert("Failed to sync with server. Your balance may not display correctly.");
    }
};

// ==========================================
// REAL-TIME DATABASE LISTENER
// ==========================================
function attachRealtimeListener() {
    if (!window.userRef) return;
    
    // This constantly watches Firebase for changes!
    window.userRef.onSnapshot((doc) => {
        if (doc.exists) {
            const userData = doc.data();

            if (userData.isBanned === true) {
                enforceBan();
                return; 
            }

            window.currentUser.balance = userData.balance || 0;
            window.currentUser.completedTasks = userData.completedTasks || []; 
            
            // 👉 THE FIX: Automatically refresh the screen if anything changes live!
            window.updateAllUI();
        }
    });
}

function enforceBan() {
    const bannedScreen = document.getElementById('banned-screen');
    if (bannedScreen) bannedScreen.style.display = 'flex';
    
    const topBar = document.querySelector('header');
    const appContent = document.getElementById('app-content');
    const bottomNav = document.getElementById('bottom-nav');
    
    if (topBar) topBar.style.display = 'none';
    if (appContent) appContent.style.display = 'none';
    if (bottomNav) bottomNav.style.display = 'none';
}

// ==========================================
// DAILY STREAK MECHANIC
// ==========================================
function getTodayDateString() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

async function processDailyStreak() {
    const today = getTodayDateString();
    
    if (window.currentUser.lastLoginDate !== today) {
        let newStreak = window.currentUser.streak || 0;
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;
        
        if (window.currentUser.lastLoginDate === yesterdayStr) {
            newStreak += 1; 
        } else {
            newStreak = 1; 
        }

        const dailyReward = Math.min(newStreak * 10, 100);

        window.currentUser.streak = newStreak;
        window.currentUser.lastLoginDate = today;
        window.currentUser.balance += dailyReward;

        await window.userRef.update({
            streak: newStreak,
            lastLoginDate: today,
            balance: firebase.firestore.FieldValue.increment(dailyReward)
        });

        if(typeof window.logTransaction === 'function') {
            window.logTransaction('Earn', dailyReward, `Daily Login: Day ${newStreak} 🔥`, '🎁');
        }

        window.safeAlert(`Day ${newStreak} Streak! You earned ${dailyReward} 🪙.`);
        window.updateAllUI();
    }
}

// ==========================================
// GLOBAL UTILITIES
// ==========================================
window.processTransaction = async function(amount, successMessage) {
    if (!window.currentUser || !window.userRef) return false;
    
    if (amount < 0 && window.currentUser.balance < Math.abs(amount)) {
        window.safeAlert("Insufficient balance!");
        window.safeHaptic('error');
        return false; 
    }

    try {
        await window.userRef.update({
            balance: firebase.firestore.FieldValue.increment(amount)
        });
        
        if (successMessage) {
            window.safeHaptic('success');
            window.safeAlert(successMessage);
        }
        return true;
    } catch (error) {
        console.error("Transaction Error:", error);
        window.safeAlert("Transaction failed. Check your connection.");
        return false;
    }
};

window.safeAlert = function(msg) {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.showAlert) {
        window.Telegram.WebApp.showAlert(msg);
    } else { alert(msg); }
};

window.safeHaptic = function(style) {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
        if(style === 'success' || style === 'error' || style === 'warning') {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred(style);
        } else {
            window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
        }
    }
};