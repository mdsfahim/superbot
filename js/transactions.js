// ==========================================
// UNIFIED HYBRID TRANSACTION LEDGER
// ==========================================

window.currentTrxFilter = 'All';

window.initTransactionsLogic = function() {
    window.filterTransactions('All', document.querySelector('.trx-tab.active'));
};

window.filterTransactions = function(type, btnElement) {
    window.currentTrxFilter = type;
    
    // Update Tab UI visually
    if (btnElement) {
        document.querySelectorAll('.trx-tab').forEach(b => {
            b.style.background = 'rgba(255,255,255,0.05)';
            b.style.color = 'var(--text-muted)';
            b.style.border = '1px solid rgba(255,255,255,0.1)';
            b.classList.remove('active');
        });
        btnElement.style.background = 'var(--accent-color)';
        btnElement.style.color = 'white';
        btnElement.style.border = 'none';
        btnElement.classList.add('active');
    }

    // THE HYBRID ROUTER
    if (type === 'Deposit') {
        window.loadFirebaseHistory('deposit_requests');
    } else if (type === 'Ads') {
        window.loadFirebaseHistory('ad_requests');
    } else if (type === 'Withdraw') {
        window.loadFirebaseHistory('withdrawals');
    } else if (type === 'Earn') {
        window.renderLocalTransactions();
    } else {
        window.renderAllTransactions(); // THE NEW MASTER MERGER
    }
};

// ----------------------------------------------------
// 1. THE MASTER MERGER (For the "All" Tab)
// ----------------------------------------------------
window.renderAllTransactions = async function() {
    const list = document.getElementById('transactions-list');
    list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 30px;">Loading...</div>`;

    try {
        let allItems = [];

        // Fetch Local Earnings
        const getLocal = new Promise((resolve) => {
            const process = (str) => {
                let items = [];
                if (str) {
                    try {
                        const parsed = JSON.parse(str);
                        const earns = parsed.filter(x => x.t === 'Earn');
                        items = earns.map(x => ({
                            type: 'Earn',
                            icon: x.i || '🎯',
                            title: x.d || 'Task Completed',
                            amountHtml: `<span style="color: #34c759; font-weight: bold;">+ ${Math.abs(x.a).toLocaleString()} 🪙</span>`,
                            dateStr: new Date(x.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' }),
                            timestamp: x.ts,
                            bg: 'rgba(52, 199, 89, 0.1)',
                            iconColor: '#34c759',
                            statusHtml: '' 
                        }));
                    } catch(e) {}
                }
                resolve(items);
            };

            try {
                if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.isVersionAtLeast('6.9')) {
                    window.Telegram.WebApp.CloudStorage.getItem('fps_trx_history', (err, val) => process(err ? localStorage.getItem('fps_trx_history') : val));
                } else { process(localStorage.getItem('fps_trx_history')); }
            } catch(e) { process(localStorage.getItem('fps_trx_history')); }
        });

        // Fetch Firebase Helper
        const getFb = async (collection, typeStr, icon, bg, iconColor) => {
            try {
                const snap = await window.db.collection(collection).where('userId', '==', window.currentUser.id).orderBy('createdAt', 'desc').limit(15).get();
                return snap.docs.map(doc => {
                    const d = doc.data();
                    const ts = d.createdAt ? d.createdAt.toDate().getTime() : Date.now();
                    const dateStr = d.createdAt ? d.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' }) : 'Just now';
                    
                    let title = ''; let amountHtml = '';
                    if (collection === 'deposit_requests') { title = `Deposit via ${d.method}`; amountHtml = `<span style="color: #ffcc00; font-weight: bold;">${d.amountSent}</span>`; }
                    else if (collection === 'ad_requests') { title = `Campaign: ${d.title}`; amountHtml = `<span style="color: white; font-weight: bold;">- ${d.totalCost} 🪙</span>`; }
                    else { title = `Withdraw to ${d.methodType}`; amountHtml = `<span style="color: white; font-weight: bold;">- ${d.amount} 🪙</span>`; }

                    let statusColor = '#ffcc00'; 
                    let borderLeft = '';
                    if (d.status === 'Approved' || d.status === 'Completed' || d.status === 'Paid') statusColor = 'var(--success)';
                    if (d.status === 'Rejected') { statusColor = 'var(--danger)'; borderLeft = 'border-left: 3px solid var(--danger);'; }

                    let statusHtml = `<p style="color: ${statusColor}; font-size: 0.75rem; font-weight: bold; margin: 2px 0 0 0;">${d.status.toUpperCase()}</p>`;
                    
                    if (d.status === 'Rejected' && d.rejectReason) {
                        statusHtml += `<div style="font-size: 0.8rem; color: var(--danger); margin-top: 6px; background: rgba(255, 69, 58, 0.1); padding: 6px 10px; border-radius: 6px;"><b>Reason:</b> ${d.rejectReason}</div>`;
                    }

                    // THE FIX: Adding the Campaign Click Tracker
                    if (collection === 'ad_requests' && (d.status === 'Approved' || d.status === 'Completed')) {
                        statusHtml += `<div style="margin-top: 6px; font-size: 0.8rem; background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 6px; display: inline-block;">
                            <span style="color: var(--text-muted);">Delivered:</span> <b style="color: #32d74b;">${d.clicksCompleted || 0} / ${d.clicks}</b>
                        </div>`;
                    }

                    return { type: typeStr, icon, title, amountHtml, dateStr, timestamp: ts, bg, iconColor, statusHtml, borderLeft };
                });
            } catch(e) { return []; }
        };

        const [localEarns, fbDeps, fbAds, fbWiths] = await Promise.all([
            getLocal,
            getFb('deposit_requests', 'Deposit', '💳', 'rgba(52, 199, 89, 0.1)', '#34c759'),
            getFb('ad_requests', 'Ad', '📢', 'rgba(255, 59, 48, 0.1)', '#ff3b30'),
            getFb('withdrawals', 'Withdraw', '💸', 'rgba(255, 59, 48, 0.1)', '#ff3b30')
        ]);

        allItems = [...localEarns, ...fbDeps, ...fbAds, ...fbWiths];
        allItems.sort((a, b) => b.timestamp - a.timestamp); 

        if (allItems.length === 0) {
            list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 30px;">No transaction history found.</div>`;
            return;
        }

        let html = '';
        allItems.forEach(item => {
            html += `
                <div style="background: var(--surface-color); padding: 15px; border-radius: 12px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.02); ${item.borderLeft || ''}">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="display: flex; gap: 15px;">
                            <div style="background: ${item.bg}; color: ${item.iconColor}; border-radius: 10px; font-size: 1.2rem; display:flex; justify-content:center; align-items:center; width: 45px; height: 45px; flex-shrink: 0;">${item.icon}</div>
                            <div>
                                <h4 style="font-size: 0.95rem; margin-bottom: 3px; margin-top: 0;">${item.title}</h4>
                                <p style="color: var(--text-muted); font-size: 0.75rem; margin: 0;">${item.dateStr}</p>
                                ${item.statusHtml}
                            </div>
                        </div>
                        <div style="text-align: right; flex-shrink: 0;">
                            ${item.amountHtml}
                        </div>
                    </div>
                </div>
            `;
        });
        list.innerHTML = html;

    } catch (err) {
        list.innerHTML = `<div style="text-align: center; color: var(--danger); padding: 30px;">Error merging history.</div>`;
    }
};


// ----------------------------------------------------
// 2. FIREBASE FETCHER (For Individual Specific Tabs)
// ----------------------------------------------------
window.loadFirebaseHistory = async function(collectionName) {
    const list = document.getElementById('transactions-list');
    list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 30px;">Checking live status...</div>`;

    try {
        const snap = await window.db.collection(collectionName)
            .where('userId', '==', window.currentUser.id)
            .orderBy('createdAt', 'desc')
            .limit(20) 
            .get();

        if (snap.empty) {
            list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 30px;">No records found.</div>`;
            return;
        }

        let html = '';
        snap.forEach(doc => {
            const data = doc.data();
            const dateStr = data.createdAt ? data.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' }) : 'Just now';
            
            let statusColor = '#ffcc00'; let bgStyle = '';
            if(data.status === 'Approved' || data.status === 'Completed' || data.status === 'Paid') { statusColor = 'var(--success)'; }
            if(data.status === 'Rejected') { statusColor = 'var(--danger)'; bgStyle = 'border-left: 3px solid var(--danger);'; }

            let rejectHTML = '';
            if (data.status === 'Rejected' && data.rejectReason) {
                rejectHTML = `<div style="font-size: 0.8rem; color: var(--danger); margin-top: 6px; background: rgba(255, 69, 58, 0.1); padding: 6px 10px; border-radius: 6px;"><b>Reason:</b> ${data.rejectReason}</div>`;
            }

            let title = '', amount = '', icon = '', iconColor = '', iconBg = '', extraHtml = '';
            
            if (collectionName === 'deposit_requests') {
                title = `Deposit via ${data.method}`; amount = `<span style="color: #ffcc00; font-weight: bold;">${data.amountSent}</span>`; 
                icon = '💳'; iconColor = '#34c759'; iconBg = 'rgba(52, 199, 89, 0.1)';
            } else if (collectionName === 'ad_requests') {
                title = `Campaign: ${data.title}`; amount = `<span style="color: white; font-weight: bold;">- ${data.totalCost} 🪙</span>`; 
                icon = '📢'; iconColor = '#ff3b30'; iconBg = 'rgba(255, 59, 48, 0.1)';
                
                // THE FIX: Adding the Campaign Click Tracker for the "Ads" Tab
                if (data.status === 'Approved' || data.status === 'Completed') {
                    extraHtml = `<div style="margin-top: 8px; font-size: 0.8rem; background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 6px; display: inline-block;">
                        <span style="color: var(--text-muted);">Delivered:</span> <b style="color: #32d74b;">${data.clicksCompleted || 0} / ${data.clicks}</b>
                    </div>`;
                }

            } else {
                title = `Withdraw to ${data.methodType}`; amount = `<span style="color: white; font-weight: bold;">- ${data.amount} 🪙</span>`; 
                icon = '💸'; iconColor = '#ff3b30'; iconBg = 'rgba(255, 59, 48, 0.1)';
            }

            html += `
                <div style="background: var(--surface-color); padding: 15px; border-radius: 12px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.02); ${bgStyle}">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="display: flex; gap: 15px;">
                            <div style="background: ${iconBg}; color: ${iconColor}; border-radius: 10px; font-size: 1.2rem; display:flex; justify-content:center; align-items:center; width: 45px; height: 45px; flex-shrink: 0;">${icon}</div>
                            <div>
                                <h4 style="font-size: 0.95rem; margin-bottom: 3px; margin-top: 0;">${title}</h4>
                                <p style="color: var(--text-muted); font-size: 0.75rem; margin: 0;">${dateStr}</p>
                                <p style="color: ${statusColor}; font-size: 0.75rem; font-weight: bold; margin: 4px 0 0 0;">${data.status.toUpperCase()}</p>
                                ${rejectHTML}
                                ${extraHtml}
                            </div>
                        </div>
                        <div style="text-align: right; flex-shrink: 0;">${amount}</div>
                    </div>
                </div>
            `;
        });
        list.innerHTML = html;
        
    } catch (error) {
        if (error.message.includes("index")) { list.innerHTML = `<div style="text-align: center; color: #ffcc00; padding: 30px;">Syncing database index...</div>`; } 
        else { list.innerHTML = `<div style="text-align: center; color: var(--danger); padding: 30px;">Connection Error.</div>`; }
    }
};

// ----------------------------------------------------
// 3. TELEGRAM CLOUD STORAGE (For logging & Earn Tab)
// ----------------------------------------------------
window.logTransaction = function(type, amount, description, icon) {
    const ts = Date.now();
    const newTrx = { t: type, a: amount, d: description, i: icon, ts: ts };

    const saveToStorage = (historyStr) => {
        let history = [];
        if (historyStr) { try { history = JSON.parse(historyStr); } catch(e){} }
        history.unshift(newTrx);
        const threeDaysAgo = ts - (3 * 24 * 60 * 60 * 1000);
        history = history.filter(x => x.ts > threeDaysAgo);
        if (history.length > 40) history = history.slice(0, 40);

        const newHistoryStr = JSON.stringify(history);

        try {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.isVersionAtLeast('6.9')) {
                window.Telegram.WebApp.CloudStorage.setItem('fps_trx_history', newHistoryStr);
            } else { localStorage.setItem('fps_trx_history', newHistoryStr); }
        } catch (error) { localStorage.setItem('fps_trx_history', newHistoryStr); }
    };

    try {
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.isVersionAtLeast('6.9')) {
            window.Telegram.WebApp.CloudStorage.getItem('fps_trx_history', (err, val) => {
                if (err) saveToStorage(localStorage.getItem('fps_trx_history'));
                else saveToStorage(val);
            });
        } else { saveToStorage(localStorage.getItem('fps_trx_history')); }
    } catch (error) { saveToStorage(localStorage.getItem('fps_trx_history')); }
};

window.renderLocalTransactions = function() {
    const list = document.getElementById('transactions-list');
    list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 30px;">Loading local ledger...</div>`;

    const displayData = (historyStr) => {
        let history = [];
        if (historyStr) { try { history = JSON.parse(historyStr); } catch(e){} }

        const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
        history = history.filter(x => x.ts > threeDaysAgo && x.t === 'Earn');

        if (history.length === 0) {
            list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 30px;">No recent earnings found.</div>`;
            return;
        }

        let html = '';
        history.forEach(trx => {
            const dateStr = new Date(trx.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; background: var(--surface-color); padding: 15px; border-radius: 12px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.02);">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="background: rgba(52, 199, 89, 0.1); color: #34c759; border-radius: 10px; font-size: 1.2rem; display:flex; justify-content:center; align-items:center; width: 45px; height: 45px; flex-shrink: 0;">${trx.i}</div>
                        <div>
                            <h4 style="font-size: 0.95rem; margin-bottom: 3px; margin-top: 0; word-break: break-word;">${trx.d}</h4>
                            <p style="color: var(--text-muted); font-size: 0.75rem; margin: 0;">${dateStr}</p>
                        </div>
                    </div>
                    <div style="text-align: right; flex-shrink: 0;">
                        <span style="color: #34c759; font-weight: bold;">+ ${Math.abs(trx.a).toLocaleString()} 🪙</span>
                    </div>
                </div>
            `;
        });
        list.innerHTML = html;
    };

    try {
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.isVersionAtLeast('6.9')) {
            window.Telegram.WebApp.CloudStorage.getItem('fps_trx_history', (err, val) => {
                if (err) displayData(localStorage.getItem('fps_trx_history'));
                else displayData(val);
            });
        } else { displayData(localStorage.getItem('fps_trx_history')); }
    } catch (error) { displayData(localStorage.getItem('fps_trx_history')); }
};