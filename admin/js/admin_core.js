// ==========================================
// ADMIN CORE ENGINE & FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyAIy5CYDeeYgHjJ9QBtlOFnM6Dy5eZu3AA",
    authDomain: "m-c-bot.firebaseapp.com",
    projectId: "m-c-bot",
    storageBucket: "m-c-bot.firebasestorage.app",
    messagingSenderId: "390271091201",
    appId: "1:390271091201:web:c04f9c143e4c851abcf600"
};

if (!firebase.apps.length) { 
    firebase.initializeApp(firebaseConfig); 
}
const db = firebase.firestore();
const auth = firebase.auth();

// Check if Admin is already logged in
auth.onAuthStateChanged((user) => {
    const loginScreen = document.getElementById('admin-login-screen');
    if (user) {
        // Logged in! Hide the login screen.
        if(loginScreen) loginScreen.style.display = 'none';
    } else {
        // Not logged in. Show the login screen.
        if(loginScreen) loginScreen.style.display = 'flex';
    }
});

window.adminLogin = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('admin-login-btn');
    btn.innerText = "Verifying...";
    btn.disabled = true;

    const email = document.getElementById('admin-email').value.trim();
    const pass = document.getElementById('admin-pass').value;

    try {
        await auth.signInWithEmailAndPassword(email, pass);
        // Success! onAuthStateChanged will automatically hide the screen.
    } catch (error) {
        let errorMsg = "Login Failed: " + error.message;
        
        // Custom, human-readable error messages
        if (error.code === 'auth/too-many-requests') {
            errorMsg = "🚨 Device temporarily blocked due to too many failed attempts! Please wait 10 minutes or switch to Mobile Data/VPN to try again.";
        } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMsg = "❌ Incorrect email or password. Make sure you created this user in the Firebase AUTHENTICATION tab, not the Database.";
        } else if (error.code === 'auth/invalid-email') {
            errorMsg = "❌ Invalid email format.";
        }

        alert(errorMsg);
        
        // Reset the button
        btn.innerText = "Access Dashboard";
        btn.disabled = false;
    }
};
// ==========================================
// 1. ADMIN ROUTER & HISTORY MANAGEMENT
// ==========================================

// Added 'pushHistory' parameter to track system navigation
window.loadAdminPage = async function(pageName, btnElement, pushHistory = true) {
    
    // 1. Log the navigation to the device's history
    if (pushHistory) {
        history.pushState({ view: 'main', page: pageName }, '', '?page=' + pageName);
    }

    // Handle Sidebar Active States
    if(btnElement) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btnElement.classList.add('active');
        
        // Auto-close sidebar on mobile after clicking a link
        if(window.innerWidth <= 768) {
            const sidebar = document.getElementById('admin-sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if(sidebar) sidebar.classList.remove('open');
            if(overlay) overlay.classList.remove('open');
        }
    }

    const contentBox = document.getElementById('admin-content');
    contentBox.innerHTML = `<div style="text-align: center; padding: 50px; color: var(--text-muted);">
        <div class="skeleton" style="width: 50px; height: 50px; border-radius: 50%; margin: 0 auto 20px;"></div>
        Loading data...
    </div>`;

    try {
        const response = await fetch(`admin_pages/${pageName}.html`);
        if (!response.ok) throw new Error("File missing");
        contentBox.innerHTML = await response.text();

        // Trigger page-specific data fetching
        if (pageName === 'dashboard') loadDashboardData();
        if (pageName === 'users') loadUsersList();
        if (pageName === 'tasks') {
            window.loadAdminTasks();
            if (typeof window.loadAdSettings === 'function') window.loadAdSettings();
        }
        if (pageName === 'store') window.loadAdminStore();
        if (pageName === 'ads') window.switchRequestTab('withdrawals');
        
        // THE NEW TRIGGER FOR DEPOSITS
        if (pageName === 'deposits') window.switchDepositTab('requests');
        if (pageName === 'games') window.loadAdminGames();

    } catch (err) {
        showSystemError("Failed to load layout module.");
    }
};

window.closeAdminSubpage = function() {
    // Instead of manually hiding the box, we trigger the system Back button.
    // Our event listener below will catch this and smoothly close the UI.
    history.back();
};

function showSystemError(msg) {
    const statusBox = document.getElementById('sys-status');
    if(statusBox) {
        statusBox.style.background = 'rgba(255, 69, 58, 0.1)';
        statusBox.style.borderColor = 'var(--danger)';
        statusBox.style.color = 'var(--danger)';
        statusBox.innerHTML = `<ion-icon name="warning" style="font-size: 1.5rem;"></ion-icon><div><h4 style="margin: 0; margin-bottom: 4px;">System Error</h4><span style="font-size: 0.85rem;">${msg}</span></div>`;
    }
}

// ==========================================
// 2. DASHBOARD LOGIC
// ==========================================
async function loadDashboardData() {
    try {
        const usersSnap = await db.collection('users').get();
        let totalCoins = 0;
        let activeToday = 0;
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        usersSnap.forEach(doc => {
            const data = doc.data();
            totalCoins += (data.balance || 0);
            if(data.createdAt && data.createdAt.toDate() > yesterday) {
                activeToday++;
            }
        });

        const usersEl = document.getElementById('dash-total-users');
        const coinsEl = document.getElementById('dash-total-coins');
        const activeEl = document.getElementById('dash-active-today');
        
        if (usersEl) usersEl.innerText = usersSnap.size;
        if (coinsEl) coinsEl.innerText = totalCoins.toLocaleString() + ' 🪙';
        if (activeEl) activeEl.innerText = `${activeToday} Active Today`;

        const withdrawSnap = await db.collection('withdrawals').where('status', '==', 'Pending').get();
        const withdrawEl = document.getElementById('dash-withdraw-count');
        const badgeEl = document.getElementById('dash-pending-badge');
        
        if (withdrawEl) withdrawEl.innerText = withdrawSnap.size;
        if (badgeEl) {
            if(withdrawSnap.size > 0) {
                badgeEl.innerText = `${withdrawSnap.size} Needs Action`;
                badgeEl.style.display = 'block';
            } else {
                badgeEl.style.display = 'none';
            }
        }

        // Fetch real counts from Firebase
        const tasksSnap = await db.collection('tasks').get();
        const storeSnap = await db.collection('store').get();
        
        const tasksEl = document.getElementById('dash-tasks-available');
        const storeEl = document.getElementById('dash-store-count');
        
        if (tasksEl) tasksEl.innerText = tasksSnap.size;
        if (storeEl) storeEl.innerText = storeSnap.size;

    } catch (err) {
        console.error(err);
        showSystemError("Firebase connection failed. Check your rules or internet connection.");
    }
}

// ==========================================
// 3. USERS MANAGER LOGIC
// ==========================================
window.allUsersCache = [];

async function loadUsersList() {
    try {
        const usersSnap = await db.collection('users').orderBy('createdAt', 'desc').limit(50).get();
        const listContainer = document.getElementById('admin-user-list');
        window.allUsersCache = [];
        let html = '';

        usersSnap.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            window.allUsersCache.push(data);

            const joinedDate = data.createdAt ? data.createdAt.toDate().toLocaleDateString() : 'Unknown';
            
            // THE FIX: Reading the correct "name" field
            const userName = data.name || data.firstName || 'Unnamed';
            const initial = userName.charAt(0).toUpperCase();

            // THE FIX: Loading the real profile picture
            const avatarHtml = data.photoUrl ? 
                `<img src="${data.photoUrl}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex-shrink: 0;">` :
                `<div style="width: 40px; height: 40px; border-radius: 50%; background: var(--accent-color); display: flex; justify-content: center; align-items: center; font-weight: bold; flex-shrink: 0;">${initial}</div>`;

            html += `
                <div class="user-list-grid" style="padding: 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); align-items: center;">
                    <div style="display: flex; align-items: center; gap: 12px; overflow: hidden;">
                        ${avatarHtml}
                        <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            <div style="font-weight: bold; margin-bottom: 2px;">${userName}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">ID: ${doc.id.substring(0,8)}...</div>
                        </div>
                    </div>
                    <div style="color: #ffcc00; font-weight: bold;">${(data.balance || 0).toLocaleString()}</div>
                    <div class="hide-mobile" style="font-size: 0.85rem; color: var(--text-muted);">${joinedDate}</div>
                    <button onclick="openUserProfile('${doc.id}')" style="background: rgba(255,255,255,0.05); color: white; border: none; padding: 10px; border-radius: 8px; cursor: pointer; display: flex; justify-content: center;"><ion-icon name="chevron-forward-outline"></ion-icon></button>
                </div>
            `;
        });

        if(html === '') html = `<div style="padding: 30px; text-align: center; color: var(--text-muted);">No users found.</div>`;
        listContainer.innerHTML = html;

    } catch (err) {
        document.getElementById('admin-user-list').innerHTML = `<div style="padding: 30px; text-align: center; color: var(--danger);">Failed to load users.</div>`;
    }
}

// ==========================================
// 4. DETAILED USER PROFILE OVERLAY
// ==========================================

window.openUserProfile = function(userId, pushHistory = true) {
    if (pushHistory) {
        history.pushState({ view: 'sub', page: 'user_profile', userId: userId }, '', '?user=' + userId);
    }

    const user = window.allUsersCache.find(u => u.id === userId);
    if(!user) return;

    const subpage = document.getElementById('admin-subpage');
    const content = document.getElementById('admin-subpage-content');
    
    const joinedDate = user.createdAt ? user.createdAt.toDate().toLocaleString() : 'Unknown';
    
    // THE FIX: Applying the same fixes to the sub-profile popup!
    const userName = user.name || user.firstName || 'Unnamed User';
    const initial = userName.charAt(0).toUpperCase();

    const isBanned = user.isBanned === true;
    const banText = isBanned ? 'Unban User' : 'Ban User';
    const banColor = isBanned ? 'var(--success)' : 'var(--danger)';
    const banBg = isBanned ? 'rgba(50, 215, 75, 0.1)' : 'rgba(255, 69, 58, 0.1)';

    const avatarHtml = user.photoUrl ? 
        `<img src="${user.photoUrl}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; flex-shrink: 0; border: 3px solid ${isBanned ? 'var(--danger)' : 'var(--accent-color)'}">` :
        `<div style="width: 80px; height: 80px; border-radius: 50%; background: ${isBanned ? 'var(--danger)' : 'var(--accent-color)'}; display: flex; justify-content: center; align-items: center; font-size: 2rem; font-weight: bold; flex-shrink: 0;">${initial}</div>`;

    content.innerHTML = `
        <div class="profile-header-box" style="background: var(--surface-color); padding: 30px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 20px; margin-bottom: 20px;">
            ${avatarHtml}
            <div style="overflow: hidden; width: 100%;">
                <h2 style="margin: 0; margin-bottom: 5px; word-wrap: break-word;">
                    ${userName} 
                    ${isBanned ? '<span style="color: var(--danger); font-size: 0.9rem; border: 1px solid var(--danger); padding: 2px 6px; border-radius: 4px; margin-left: 10px;">BANNED</span>' : ''}
                </h2>
                <div style="color: var(--text-muted); font-family: monospace; font-size: 0.85rem; word-wrap: break-word;">UID: ${user.id}</div>
                <div style="color: var(--text-muted); font-size: 0.85rem; margin-top: 5px;">Referred By: ${user.invitedBy || 'None'}</div>
            </div>
        </div>

        <div class="responsive-grid" style="margin-bottom: 20px;">
            <div style="background: var(--surface-color); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                <div style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 5px;">Current Balance</div>
                <div style="font-size: 2rem; font-weight: bold; color: #ffcc00;">${(user.balance || 0).toLocaleString()} 🪙</div>
            </div>
            <div style="background: var(--surface-color); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                <div style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 5px;">Total Referrals</div>
                <div style="font-size: 2rem; font-weight: bold;">${user.totalReferrals || 0}</div>
            </div>
            <div style="background: var(--surface-color); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                <div style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 5px;">Account Created</div>
                <div style="font-size: 1.2rem; font-weight: bold; margin-top: 10px;">${joinedDate}</div>
            </div>
        </div>
        
        <h3 style="margin-top: 30px;">Admin Actions</h3>
        <div class="profile-action-btns" style="display: flex; gap: 15px;">
            <button onclick="window.adjustUserBalance('${user.id}')" style="flex: 1; background: var(--accent-color); color: white; border: none; padding: 12px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">Add/Deduct Balance</button>
            <button onclick="window.toggleUserBan('${user.id}', ${isBanned})" style="flex: 1; background: ${banBg}; color: ${banColor}; border: 1px solid ${banColor}; padding: 12px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">${banText}</button>
        </div>
    `;

    subpage.classList.add('open');
};

// ==========================================
// 4.5. ADMIN CONTROL FUNCTIONS (NEW)
// ==========================================

window.adjustUserBalance = async function(userId) {
    const input = prompt("Enter amount to add (e.g., 500) or deduct (e.g., -500):");
    
    // Cancel if they hit cancel or type nothing
    if (input === null || input.trim() === '') return;

    const amount = parseInt(input);
    if (isNaN(amount)) {
        alert("Invalid input! Please enter a number.");
        return;
    }

    const actionText = amount >= 0 ? 'ADD' : 'DEDUCT';
    if (confirm(`Are you sure you want to ${actionText} ${Math.abs(amount)} coins for this user?`)) {
        try {
            // Update in Firebase
            await db.collection('users').doc(userId).update({
                balance: firebase.firestore.FieldValue.increment(amount)
            });
            
            // Update local cache so we don't have to reload the whole database
            const user = window.allUsersCache.find(u => u.id === userId);
            if (user) user.balance = (user.balance || 0) + amount;
            
            // Seamlessly refresh the open profile screen
            window.openUserProfile(userId, false);
            alert(`Success! ${Math.abs(amount)} coins ${amount >= 0 ? 'added' : 'deducted'}.`);
            
        } catch (error) {
            console.error(error);
            alert("Failed to update balance. Check your internet connection.");
        }
    }
};

window.toggleUserBan = async function(userId, currentlyBanned) {
    const actionText = currentlyBanned ? "UNBAN" : "BAN";
    
    if (confirm(`Are you sure you want to ${actionText} this user?`)) {
        try {
            // Update the isBanned flag in Firebase
            await db.collection('users').doc(userId).update({
                isBanned: !currentlyBanned
            });
            
            // Update local cache
            const user = window.allUsersCache.find(u => u.id === userId);
            if (user) user.isBanned = !currentlyBanned;
            
            // Seamlessly refresh the open profile screen
            window.openUserProfile(userId, false);
            
        } catch (error) {
            console.error(error);
            alert("Failed to change ban status.");
        }
    }
};

// ==========================================
// 5. SYSTEM BACK BUTTON LISTENER
// ==========================================
window.addEventListener('popstate', (event) => {
    const state = event.state;
    
    if (state) {
        if (state.view === 'main') {
            // If the profile overlay is open, slide it closed securely
            const subpage = document.getElementById('admin-subpage');
            if (subpage.classList.contains('open')) {
                subpage.classList.remove('open');
            }
            
            // Determine which sidebar button should be highlighted
            let targetBtn = null;
            document.querySelectorAll('.nav-btn').forEach(b => {
                if (b.getAttribute('onclick') && b.getAttribute('onclick').includes("'" + state.page + "'")) {
                    targetBtn = b;
                }
            });

            // If we are navigating to a completely different main tab, load it (without pushing history again)
            const currentActive = document.querySelector('.nav-btn.active');
            if (currentActive !== targetBtn) {
                window.loadAdminPage(state.page, targetBtn, false);
            }
            
        } else if (state.view === 'sub' && state.page === 'user_profile') {
            // They went forward into a profile
            window.openUserProfile(state.userId, false);
        }
    } else {
        // Fallback: If history gets lost, snap back to the dashboard safely
        document.getElementById('admin-subpage').classList.remove('open');
        window.loadAdminPage('dashboard', document.querySelectorAll('.nav-btn')[0], false);
    }
});

// ==========================================
// 6. INITIAL BOOT UP
// ==========================================
window.onload = () => {
    // Replace the initial empty URL state with the Dashboard so the back button knows where to stop
    history.replaceState({ view: 'main', page: 'dashboard' }, '', '?page=dashboard');
    
    const firstNavBtn = document.querySelectorAll('.nav-btn')[0];
    if (firstNavBtn) {
        // Load the dashboard but pass 'false' so we don't duplicate the history record
        loadAdminPage('dashboard', firstNavBtn, false);
    }
};

// ==========================================
// 7. TASK MANAGER LOGIC (FIREBASE CONNECTED)
// ==========================================
window.loadAdminTasks = async function() {
    const list = document.getElementById('admin-tasks-list');
    if (!list) return;
    
    list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 15px;">Fetching from cloud...</div>`;

    try {
        const snap = await db.collection('tasks').orderBy('createdAt', 'desc').get();
        
        if (snap.empty) {
            list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 15px;">No tasks available.</div>`;
            return;
        }

        let html = '';
        snap.forEach(doc => {
            const task = doc.data();
            html += `
                <div style="background: var(--bg-color); border: 1px solid rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="font-size: 1.5rem;">${task.icon}</div>
                        <div>
                            <div style="font-weight: bold;">${task.title}</div>
                            <div style="color: var(--accent-color); font-size: 0.85rem;">+ ${task.reward} 🪙</div>
                        </div>
                    </div>
                    <button onclick="window.deleteTask('${doc.id}')" style="background: rgba(255, 69, 58, 0.1); color: var(--danger); border: none; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-weight: bold;">Delete</button>
                </div>`;
        });
        list.innerHTML = html;
    } catch (error) {
        list.innerHTML = `<div style="text-align: center; color: var(--danger); padding: 15px;">Failed to load tasks.</div>`;
    }
};

window.addNewTask = async function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerText = "Saving to Cloud...";
    btn.disabled = true;

    const newTask = {
        title: document.getElementById('task-title').value,
        reward: parseInt(document.getElementById('task-reward').value),
        link: document.getElementById('task-link').value,
        icon: document.getElementById('task-icon').value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('tasks').add(newTask);
        document.getElementById('admin-add-task-form').reset();
        window.loadAdminTasks(); // Refresh list
    } catch (error) {
        alert("Error saving task to Firebase.");
        console.error(error);
    } finally {
        btn.innerText = "Add Task";
        btn.disabled = false;
    }
};

window.deleteTask = async function(id) {
    if(confirm("Delete this task permanently?")) {
        try {
            await db.collection('tasks').doc(id).delete();
            window.loadAdminTasks();
        } catch (error) {
            alert("Failed to delete task.");
        }
    }
};

// ==========================================
// 8. STORE MANAGER LOGIC (FIREBASE CONNECTED)
// ==========================================
window.loadAdminStore = async function() {
    const list = document.getElementById('admin-store-list');
    if (!list) return;

    list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 15px;">Fetching from cloud...</div>`;

    try {
        const snap = await db.collection('store').orderBy('createdAt', 'desc').get();
        
        if (snap.empty) {
            list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 15px;">Store is empty.</div>`;
            return;
        }

        let html = '';
        snap.forEach(doc => {
            const item = doc.data();
            
            // 👉 THE FIX: Smart Icon Renderer
            let iconDisplay = '';
            if (item.icon && item.icon.startsWith('http')) {
                // If it's a link, render an image that sits perfectly inside the gradient background!
                iconDisplay = `<div style="background: ${item.theme}; width: 45px; height: 45px; border-radius: 10px; display: flex; justify-content: center; align-items: center; overflow: hidden;"><img src="${item.icon}" style="width: 100%; height: 100%; object-fit: contain; padding: 4px;"></div>`;
            } else {
                // If it's just an emoji, render the text
                iconDisplay = `<div style="background: ${item.theme}; width: 45px; height: 45px; border-radius: 10px; display: flex; justify-content: center; align-items: center; font-size: 1.2rem;">${item.icon}</div>`;
            }

            html += `
                <div style="background: var(--bg-color); border: 1px solid rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        ${iconDisplay}
                        <div>
                            <div style="font-weight: bold;">${item.title}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);"><span style="color: var(--accent-color);">${item.category}</span> • ${item.price} 🪙</div>
                        </div>
                    </div>
                    <button onclick="window.deleteStoreItem('${doc.id}')" style="background: rgba(255, 69, 58, 0.1); color: var(--danger); border: none; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-weight: bold;">Delete</button>
                </div>`;
        });
        list.innerHTML = html;
    } catch (error) {
        console.error(error);
        list.innerHTML = `<div style="text-align: center; color: var(--danger); padding: 15px;">Failed to load store items.</div>`;
    }
};

window.addNewStoreItem = async function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerText = "Adding...";
    btn.disabled = true;

    const newItem = {
        title: document.getElementById('item-title').value,
        subtitle: document.getElementById('item-subtitle').value,
        price: parseInt(document.getElementById('item-price').value),
        category: document.getElementById('item-category').value,
        icon: document.getElementById('item-icon').value,
        theme: document.getElementById('item-theme').value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        await db.collection('store').add(newItem);
        document.getElementById('admin-add-item-form').reset();
        window.loadAdminStore(); // Refresh the list
    } catch (error) {
        alert("Error adding item to store.");
        console.error(error);
    } finally {
        btn.innerText = "Add to Store";
        btn.disabled = false;
    }
};

window.deleteStoreItem = async function(id) {
    if(confirm("Delete this store item? It will be removed from the User App instantly.")) {
        try {
            await db.collection('store').doc(id).delete();
            window.loadAdminStore();
        } catch (error) {
            alert("Failed to delete item.");
            console.error(error);
        }
    }
};

// ==========================================
// 9. WITHDRAWALS & ADS LOGIC (FIREBASE)
// ==========================================
window.currentWithdrawFilter = 'Pending';

window.filterWithdrawals = function(status) {
    window.currentWithdrawFilter = status;
    
    // UI Button updates
    document.getElementById('filter-pending').style.background = status === 'Pending' ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)';
    document.getElementById('filter-pending').style.color = status === 'Pending' ? 'white' : 'var(--text-muted)';
    
    document.getElementById('filter-completed').style.background = status === 'Completed' ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)';
    document.getElementById('filter-completed').style.color = status === 'Completed' ? 'white' : 'var(--text-muted)';
    
    window.loadWithdrawals();
};

window.loadWithdrawals = async function() {
    const list = document.getElementById('admin-withdraw-list');
    if(!list) return;
    
    list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 30px;">Fetching from Firebase...</div>`;

    try {
        let query;
        if (window.currentWithdrawFilter === 'Pending') {
            query = db.collection('withdrawals').where('status', '==', 'Pending').orderBy('createdAt', 'desc');
        } else {
            query = db.collection('withdrawals').where('status', 'in', ['Approved', 'Rejected']).orderBy('createdAt', 'desc');
        }

        const snap = await query.get();
        let html = '';

        snap.forEach(doc => {
            const data = doc.data();
            const date = data.createdAt ? data.createdAt.toDate().toLocaleString() : 'Unknown Time';
            
            let statusBadge = '';
            let actionButtons = '';

            if (data.status === 'Pending') {
                statusBadge = `<span style="background: rgba(255, 204, 0, 0.2); color: #ffcc00; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">PENDING</span>`;
                actionButtons = `
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button onclick="window.handleWithdrawal('${doc.id}', 'Approved')" style="flex: 1; background: var(--success); color: white; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer;">Approve & Pay</button>
                        <button onclick="window.handleWithdrawal('${doc.id}', 'Rejected', '${data.userId}', ${data.amount})" style="flex: 1; background: rgba(255, 69, 58, 0.1); color: var(--danger); border: 1px solid var(--danger); padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer;">Reject & Refund</button>
                    </div>`;
            } else if (data.status === 'Approved') {
                statusBadge = `<span style="background: rgba(50, 215, 75, 0.2); color: var(--success); padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">PAID</span>`;
            } else {
                statusBadge = `<span style="background: rgba(255, 69, 58, 0.2); color: var(--danger); padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">REJECTED</span>`;
            }

            html += `
                <div style="background: var(--bg-color); border: 1px solid rgba(255,255,255,0.05); padding: 20px; border-radius: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                        <div>
                            <div style="font-weight: bold; font-size: 1.1rem;">${data.userName}</div>
                            <div style="color: var(--text-muted); font-size: 0.85rem; font-family: monospace;">UID: ${data.userId}</div>
                        </div>
                        ${statusBadge}
                    </div>
                    
                    <div style="background: rgba(255,255,255,0.02); padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: var(--text-muted); font-size: 0.9rem;">Item:</span>
                            <span style="font-weight: bold;">${data.itemTitle}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: var(--text-muted); font-size: 0.9rem;">Cost:</span>
                            <span style="color: #ffcc00; font-weight: bold;">${data.amount.toLocaleString()} 🪙</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: var(--text-muted); font-size: 0.9rem;">Method:</span>
                            <span style="font-weight: bold; color: var(--accent-color);">${data.methodType}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-muted); font-size: 0.9rem;">Account:</span>
                            <span style="font-family: monospace; font-size: 1.1rem; user-select: all;">${data.accountDetails}</span>
                        </div>
                    </div>
                    
                    <div style="color: var(--text-muted); font-size: 0.8rem; text-align: right;">Requested: ${date}</div>
                    ${actionButtons}
                </div>`;
        });

        if(html === '') html = `<div style="text-align: center; color: var(--text-muted); padding: 30px;">No requests found.</div>`;
        list.innerHTML = html;

    } catch (err) {
        console.error("Fetch Error: ", err);
        list.innerHTML = `<div style="text-align: center; color: var(--danger); padding: 30px;">Error fetching data. Ensure Firebase Rules allow Admin reads.</div>`;
    }
};

window.handleWithdrawal = async function(docId, newStatus, userId = null, refundAmount = 0) {
    const confirmMsg = newStatus === 'Approved' ? 
        "Have you successfully sent the money? This will mark it as PAID." : 
        "Reject this request? The coins will be refunded back to the user.";
        
    if(!confirm(confirmMsg)) return;

    try {
        // 1. Update the document status
        await db.collection('withdrawals').doc(docId).update({
            status: newStatus,
            processedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 2. If Rejected, refund the user's coins in Firebase
        if (newStatus === 'Rejected' && userId) {
            await db.collection('users').doc(userId).update({
                balance: firebase.firestore.FieldValue.increment(refundAmount)
            });
            alert(`Marked as Rejected. ${refundAmount} coins refunded to user.`);
        } else {
            alert("Marked as Approved!");
        }

        // 3. Reload the list
        window.loadWithdrawals();

    } catch (err) {
        alert("Action failed. Check console.");
        console.error(err);
    }
};

// ==========================================
// 10. AD CAMPAIGN MANAGER LOGIC
// ==========================================

window.switchRequestTab = function(tab) {
    const wSec = document.getElementById('withdrawals-section');
    const aSec = document.getElementById('ads-section');
    const wBtn = document.getElementById('tab-withdrawals');
    const aBtn = document.getElementById('tab-ads');

    if (tab === 'withdrawals') {
        wSec.style.display = 'block';
        aSec.style.display = 'none';
        wBtn.style.background = 'var(--accent-color)';
        wBtn.style.color = 'white';
        aBtn.style.background = 'rgba(255,255,255,0.05)';
        aBtn.style.color = 'var(--text-muted)';
        window.loadWithdrawals(); // Keep your existing withdrawal fetcher!
    } else {
        wSec.style.display = 'none';
        aSec.style.display = 'block';
        aBtn.style.background = 'var(--accent-color)';
        aBtn.style.color = 'white';
        wBtn.style.background = 'rgba(255,255,255,0.05)';
        wBtn.style.color = 'var(--text-muted)';
        window.loadAdRequests();
    }
};

window.loadAdRequests = async function() {
    const list = document.getElementById('admin-ads-list');
    if(!list) return;
    
    list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 30px;">Fetching Ad Campaigns...</div>`;

    try {
        const snap = await db.collection('ad_requests').orderBy('createdAt', 'desc').get();
        let html = '';

        snap.forEach(doc => {
            const data = doc.data();
            const date = data.createdAt ? data.createdAt.toDate().toLocaleString() : 'Unknown';
            
            let statusBadge = '';
            let actionButtons = '';

            if (data.status === 'Pending') {
                statusBadge = `<span style="background: rgba(255, 204, 0, 0.2); color: #ffcc00; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">PENDING</span>`;
                actionButtons = `
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button onclick="window.handleAdRequest('${doc.id}', 'Approved')" style="flex: 1; background: var(--success); color: white; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer;">Approve -> Send to Tasks</button>
                        <button onclick="window.handleAdRequest('${doc.id}', 'Rejected')" style="flex: 1; background: rgba(255, 69, 58, 0.1); color: var(--danger); border: 1px solid var(--danger); padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer;">Reject & Refund</button>
                    </div>`;
            } else if (data.status === 'Approved') {
                statusBadge = `<span style="background: rgba(50, 215, 75, 0.2); color: var(--success); padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">APPROVED / ACTIVE</span>`;
            } else {
                statusBadge = `<span style="background: rgba(255, 69, 58, 0.2); color: var(--danger); padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">REJECTED</span>`;
            }

            html += `
                <div style="background: var(--bg-color); border: 1px solid rgba(255,255,255,0.05); padding: 20px; border-radius: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                        <div>
                            <div style="font-weight: bold; font-size: 1.1rem;">${data.title}</div>
                            <div style="color: var(--text-muted); font-size: 0.85rem;">User: ${data.userName} (UID: ${data.userId.substring(0,8)}...)</div>
                        </div>
                        ${statusBadge}
                    </div>
                    
                    <div style="background: rgba(255,255,255,0.02); padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: var(--text-muted); font-size: 0.9rem;">Target Link:</span>
                            <span style="font-family: monospace; font-size: 0.9rem; color: var(--accent-color); word-break: break-all;">${data.link}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: var(--text-muted); font-size: 0.9rem;">Reward per User:</span>
                            <span style="font-weight: bold;">${data.reward} 🪙</span>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: var(--text-muted); font-size: 0.9rem;">Clicks Delivered:</span>
                            <span style="color: #32d74b; font-weight: bold;">${data.clicksCompleted || 0} / ${data.clicks}</span>
                        </div>

                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-muted); font-size: 0.9rem;">Total Paid by User:</span>
                            <span style="color: #ffcc00; font-weight: bold;">${data.totalCost.toLocaleString()} 🪙</span>
                        </div>
                    </div>
                    
                    <div style="color: var(--text-muted); font-size: 0.8rem; text-align: right;">Submitted: ${date}</div>
                    ${actionButtons}
                </div>`;
        });

        if(html === '') html = `<div style="text-align: center; color: var(--text-muted); padding: 30px;">No ad campaigns found.</div>`;
        list.innerHTML = html;

    } catch (err) {
        console.error("Fetch Error: ", err);
        list.innerHTML = `<div style="text-align: center; color: var(--danger); padding: 30px;">Error fetching ad data.</div>`;
    }
};

window.handleAdRequest = async function(docId, newStatus) {
    const confirmMsg = newStatus === 'Approved' ? 
        "Approve this campaign? It will be automatically converted into a public Task for all users to earn from." : 
        "Reject this campaign? The coins will be refunded back to the user.";
        
    if(!confirm(confirmMsg)) return;

    try {
        const docRef = db.collection('ad_requests').doc(docId);
        const docSnap = await docRef.get();
        const adData = docSnap.data();

        if (newStatus === 'Approved') {
            // 1. Update the ad request and initialize the counter
            await docRef.update({
                status: newStatus,
                clicksCompleted: 0, // NEW: Start the counter at 0
                processedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // 2. Add it to Tasks WITH the tracker ID
            await db.collection('tasks').add({
                title: adData.title,
                reward: adData.reward,
                link: adData.link,
                icon: '📢', 
                createdBy: adData.userId,
                adRequestId: docId, // NEW: Link back to the original campaign!
                clicksRequested: adData.clicks,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert("Campaign Approved! It is now live in the Earn section.");
        } else if (newStatus === 'Rejected') {
            // Refund the user
            await docRef.update({ status: newStatus, processedAt: firebase.firestore.FieldValue.serverTimestamp() });
            await db.collection('users').doc(adData.userId).update({
                balance: firebase.firestore.FieldValue.increment(adData.totalCost)
            });
            alert(`Rejected. ${adData.totalCost} coins have been fully refunded to the user.`);
        }

        window.loadAdRequests();

    } catch (err) {
        alert("Action failed. Check console.");
        console.error(err);
    }
};

// ==========================================
// 11. DEPOSIT MANAGER LOGIC
// ==========================================

window.switchDepositTab = function(tab) {
    const rSec = document.getElementById('dep-requests-section');
    const mSec = document.getElementById('dep-methods-section');
    const rBtn = document.getElementById('tab-dep-requests');
    const mBtn = document.getElementById('tab-dep-methods');

    if (tab === 'requests') {
        rSec.style.display = 'block'; mSec.style.display = 'none';
        rBtn.style.background = 'var(--accent-color)'; rBtn.style.color = 'white';
        mBtn.style.background = 'rgba(255,255,255,0.05)'; mBtn.style.color = 'var(--text-muted)';
        window.loadDepositRequests();
    } else {
        rSec.style.display = 'none'; mSec.style.display = 'block';
        mBtn.style.background = 'var(--accent-color)'; mBtn.style.color = 'white';
        rBtn.style.background = 'rgba(255,255,255,0.05)'; rBtn.style.color = 'var(--text-muted)';
        window.loadDepositMethods();
    }
};

// --- MANAGE METHODS ---
window.loadDepositMethods = async function() {
    const list = document.getElementById('admin-deposit-methods-list');
    if(!list) return;

    try {
        const snap = await db.collection('deposit_methods').get();
        let html = '';
        snap.forEach(doc => {
            const data = doc.data();
            
            // THE FIX: Check if the icon is a URL or an Emoji
            let iconDisplay = '';
            if (data.icon && data.icon.startsWith('http')) {
                iconDisplay = `<img src="${data.icon}" style="width: 40px; height: 40px; object-fit: contain; border-radius: 8px;">`;
            } else {
                iconDisplay = `<div style="font-size: 1.5rem; width: 40px; text-align: center;">${data.icon}</div>`;
            }

            html += `
                <div style="background: var(--bg-color); border: 1px solid rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        ${iconDisplay}
                        <div>
                            <div style="font-weight: bold;">${data.title} <span style="font-size: 0.8rem; color: var(--text-muted);">(${data.currency})</span></div>
                            <div style="font-size: 0.8rem; color: var(--accent-color); font-family: monospace;">${data.address}</div>
                        </div>
                    </div>
                    <button onclick="window.deleteDepositMethod('${doc.id}')" style="background: rgba(255, 69, 58, 0.1); color: var(--danger); border: none; padding: 6px 12px; border-radius: 8px; font-weight: bold; cursor: pointer;">Delete</button>
                </div>`;
        });
        list.innerHTML = html || '<div style="color: var(--text-muted); padding: 10px;">No methods added yet.</div>';
    } catch (err) { console.error(err); }
};

window.addDepositMethod = async function(e) {
    e.preventDefault();
    try {
        await db.collection('deposit_methods').add({
            title: document.getElementById('dm-title').value,
            currency: document.getElementById('dm-currency').value,
            icon: document.getElementById('dm-icon').value,
            address: document.getElementById('dm-address').value,
            instructions: document.getElementById('dm-instructions').value,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        e.target.reset();
        window.loadDepositMethods();
    } catch (err) { alert("Error adding method."); }
};

window.deleteDepositMethod = async function(id) {
    if(confirm("Delete this payment method?")) {
        await db.collection('deposit_methods').doc(id).delete();
        window.loadDepositMethods();
    }
};

// --- REVIEW REQUESTS ---
window.loadDepositRequests = async function() {
    const list = document.getElementById('admin-deposit-requests-list');
    if(!list) return;

    try {
        const snap = await db.collection('deposit_requests').where('status', '==', 'Pending').orderBy('createdAt', 'desc').get();
        let html = '';

        snap.forEach(doc => {
            const data = doc.data();
            html += `
                <div style="background: var(--bg-color); border: 1px solid rgba(255,255,255,0.05); padding: 15px; border-radius: 12px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <div>
                            <div style="font-weight: bold;">${data.userName} <span style="font-size: 0.8rem; color: var(--text-muted); font-family: monospace;">(${data.userId})</span></div>
                            <div style="font-size: 0.85rem; color: var(--text-muted);">Method: <span style="color: white;">${data.method}</span></div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: bold; color: #ffcc00;">Reported: ${data.amountSent}</div>
                        </div>
                    </div>
                    <div style="background: rgba(255,255,255,0.02); padding: 10px; border-radius: 8px; margin-bottom: 15px; font-family: monospace; font-size: 0.9rem;">
                        <span style="color: var(--text-muted);">TrxID/Sender:</span> ${data.trxId}
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="window.approveDeposit('${doc.id}', '${data.userId}')" style="flex: 1; background: var(--success); color: white; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer;">Verify & Add Coins</button>
                        <button onclick="window.rejectDeposit('${doc.id}')" style="flex: 1; background: rgba(255, 69, 58, 0.1); color: var(--danger); border: 1px solid var(--danger); padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer;">Reject</button>
                    </div>
                </div>`;
        });
        list.innerHTML = html || '<div style="text-align: center; color: var(--text-muted); padding: 20px;">No pending deposits.</div>';
    } catch (err) { console.error(err); }
};

window.approveDeposit = async function(docId, userId) {
    const input = prompt("Transaction verified! How many COINS should be added to their account?");
    if (!input || input.trim() === '') return;
    
    const coins = parseInt(input);
    if (isNaN(coins) || coins <= 0) return alert("Invalid coin amount.");

    if(confirm(`Send ${coins} coins to this user?`)) {
        try {
            // Update request status
            await db.collection('deposit_requests').doc(docId).update({ status: 'Approved', coinsCredited: coins });
            // Add coins to user
            await db.collection('users').doc(userId).update({ balance: firebase.firestore.FieldValue.increment(coins) });
            alert("Success! Coins added.");
            window.loadDepositRequests();
        } catch (err) { alert("Error processing deposit."); }
    }
};

window.rejectDeposit = async function(docId) {
    // 1. Ask the Admin for the reason
    const reason = prompt("Enter the reason for rejection (e.g., Invalid TrxID, Funds not received):");
    
    // 2. If they hit 'Cancel' on the prompt, stop the process
    if (reason === null) return; 

    if(confirm("Are you sure you want to reject this deposit request?")) {
        try {
            // 3. Save the 'Rejected' status AND the reason to Firebase
            await db.collection('deposit_requests').doc(docId).update({ 
                status: 'Rejected',
                rejectReason: reason || "No reason provided by Admin."
            });
            window.loadDepositRequests();
        } catch (err) {
            console.error(err);
            alert("Failed to reject deposit.");
        }
    }
};
// ==========================================
// AD NETWORK SETTINGS SAVER
// ==========================================
window.loadAdSettings = async function() {
    try {
        const snap = await db.collection('settings').doc('ads').get();
        
        if (snap.exists) {
            const data = snap.data();
            
            // !== false ensures that if the value is missing, it defaults to true
            document.getElementById('ad-adsgram-enabled').checked = data.adsgramEnabled !== false; 
            document.getElementById('ad-adsgram-id').value = data.adsgramId || 'int-23202';
            document.getElementById('ad-adsgram-reward').value = data.adsgramReward || 50;
            
            document.getElementById('ad-libtl-enabled').checked = data.libtlEnabled !== false;
            document.getElementById('ad-libtl-id').value = data.libtlId || '9683040';
            document.getElementById('ad-libtl-reward').value = data.libtlReward || 100;
        } else {
            // If the admin hasn't saved anything yet, force the boxes to be checked
            document.getElementById('ad-adsgram-enabled').checked = true;
            document.getElementById('ad-libtl-enabled').checked = true;
        }
    } catch(e) { 
        console.error("Could not fetch Ad settings", e); 
    }
};

window.saveAdSettings = async function() {
    try {
        await db.collection('settings').doc('ads').set({
            adsgramEnabled: document.getElementById('ad-adsgram-enabled').checked,
            adsgramId: document.getElementById('ad-adsgram-id').value.trim(),
            adsgramReward: parseInt(document.getElementById('ad-adsgram-reward').value) || 50,
            
            libtlEnabled: document.getElementById('ad-libtl-enabled').checked,
            libtlId: document.getElementById('ad-libtl-id').value.trim(),
            libtlReward: parseInt(document.getElementById('ad-libtl-reward').value) || 100
        }, { merge: true });
        
        alert("Ad Settings Updated! All user apps will show these changes instantly.");
    } catch(e) {
        alert("Error saving settings.");
        console.error(e);
    }
};

// ==========================================
// GAME MANAGER LOGIC
// ==========================================
window.loadAdminGames = async function() {
    const list = document.getElementById('admin-games-list');
    if(!list) return;
    
    list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 15px;">Loading games...</div>`;

    try {
        const snap = await db.collection('games').orderBy('createdAt', 'desc').get();
        let html = '';
        snap.forEach(doc => {
            const g = doc.data();
            let iconDisplay = g.icon.startsWith('http') ? `<img src="${g.icon}" style="width:40px; height:40px; border-radius:8px; object-fit:cover;">` : `<div style="font-size: 2rem;">${g.icon}</div>`;
            
            html += `
                <div style="background: var(--bg-color); border: 1px solid rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        ${iconDisplay}
                        <div>
                            <div style="font-weight: bold;">${g.title} <span style="font-size: 0.8rem; color: var(--text-muted);">(${g.fileId}.html)</span></div>
                            <div style="font-size: 0.85rem; color: #ffcc00;">Fee: ${g.entryFee} 🪙 | Reward: ${g.reward} 🪙</div>
                        </div>
                    </div>
                    <button onclick="window.deleteGame('${doc.id}')" style="background: rgba(255, 69, 58, 0.1); color: var(--danger); border: none; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-weight: bold;">Unpublish</button>
                </div>`;
        });
        list.innerHTML = html || `<div style="text-align:center; color:var(--text-muted);">No games published.</div>`;
    } catch (err) { console.error(err); }
};

window.publishNewGame = async function(e) {
    e.preventDefault();
    try {
        await db.collection('games').add({
            title: document.getElementById('game-title').value,
            fileId: document.getElementById('game-file-id').value, // Links to your folder!
            desc: document.getElementById('game-desc').value,
            rules: document.getElementById('game-rules').value,
            entryFee: parseInt(document.getElementById('game-fee').value),
            reward: parseInt(document.getElementById('game-reward').value),
            icon: document.getElementById('game-icon').value,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        e.target.reset();
        window.loadAdminGames();
        alert("Game Published Successfully!");
    } catch (error) { alert("Error publishing game."); }
};

window.deleteGame = async function(id) {
    if(confirm("Unpublish this game? It will instantly disappear from the User App.")) {
        await db.collection('games').doc(id).delete();
        window.loadAdminGames();
    }
};