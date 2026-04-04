// ==========================================
// HOME DASHBOARD LOGIC
// ==========================================

window.smartActionTarget = 'earn'; // Default target for the banner

window.initHomeLogic = function() {
    if (!window.currentUser) return;

    // 1. Time-based Greeting
    const hour = new Date().getHours();
    let greeting = "Good Evening,";
    if (hour < 12) greeting = "Good Morning,";
    else if (hour < 17) greeting = "Good Afternoon,";
    
    document.getElementById('home-greeting-time').innerText = greeting;
    document.getElementById('home-user-name').innerText = window.currentUser.name || window.currentUser.firstName || 'User';

    // 2. Update the Streak UI (DYNAMIC MESSAGES)
    const streak = window.currentUser.streak || 1;
    const streakBox = document.getElementById('home-streak-text');
    
    if (streakBox) {
        const streakMessages = [
            `You have logged in ${streak} day${streak > 1 ? 's' : ''} in a row!`,
            `You're on fire! 🔥 A solid ${streak}-day streak!`,
            `Amazing dedication! This is day ${streak} of your streak.`,
            `${streak} days of non-stop earning! Keep it up.`,
            `Don't break the chain! Your streak is at ${streak} today.`,
            `Consistency is key! 🗝️ ${streak} days and counting.`,
            `Day ${streak} unlocked! Ready to multiply your coins?`
        ];

        // Pick a random message from the list
        const randomMsg = streakMessages[Math.floor(Math.random() * streakMessages.length)];
        streakBox.innerText = randomMsg;
    }

    // 3. Load Real Stats
    document.getElementById('home-stat-refs').innerText = window.currentUser.totalReferrals || 0;
    
    const completedTasks = window.currentUser.completedTasks ? window.currentUser.completedTasks.length : 0;
    document.getElementById('home-stat-tasks').innerText = completedTasks;

    // 4. Smart Banner Logic (Adapts based on user behavior)
    const bannerTitle = document.getElementById('smart-banner-title');
    const bannerDesc = document.getElementById('smart-banner-desc');
    const bannerBox = document.getElementById('home-smart-banner');

    if (window.currentUser.balance < 500) {
        // Low balance: Push them to earn
        bannerTitle.innerText = "Maximize Earnings 💰";
        bannerDesc.innerText = "Complete tasks to grow your wallet.";
        bannerBox.style.background = "linear-gradient(135deg, var(--accent-color) 0%, #3b82f6 100%)";
        window.smartActionTarget = 'earn';
    } else if (window.currentUser.balance > 5000) {
        // High balance: Push them to spend
        bannerTitle.innerText = "The Store is Open! 🛍️";
        bannerDesc.innerText = "You have coins to spend. Treat yourself.";
        bannerBox.style.background = "linear-gradient(135deg, #ff9500 0%, #ffcc00 100%)";
        window.smartActionTarget = 'store';
    } else {
        // Medium balance: Push them to games
        bannerTitle.innerText = "Play & Multiply 🎮";
        bannerDesc.innerText = "Try your luck in the Game Arcade.";
        bannerBox.style.background = "linear-gradient(135deg, #34c759 0%, #32d74b 100%)";
        window.smartActionTarget = 'game';
    }
};

window.triggerSmartAction = function() {
    // Find the correct navigation button element to highlight it
    const navItems = document.querySelectorAll('.nav-item');
    let targetElement = navItems[1]; // Default to earn
    
    if (window.smartActionTarget === 'store') targetElement = navItems[2];
    if (window.smartActionTarget === 'game') targetElement = navItems[3];

    // Trigger the router with pushHistory enabled
    window.navigateTo(window.smartActionTarget, targetElement);
};