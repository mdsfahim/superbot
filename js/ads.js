// ==========================================
// ADVERTISE & CAMPAIGN LOGIC
// ==========================================

window.initAdsLogic = function() {
    window.calculateAdCost();
    window.loadMyCampaigns(); // Triggers the history fetch when page loads
};

window.calculateAdCost = function() {
    const reward = parseInt(document.getElementById('ad-reward').value) || 0;
    const clicks = parseInt(document.getElementById('ad-clicks').value) || 0;
    const totalCost = reward * clicks;
    
    const costDisplay = document.getElementById('ad-total-cost');
    if (costDisplay) {
        costDisplay.innerText = totalCost.toLocaleString() + ' 🪙';
    }
};

window.submitAdRequest = async function(e) {
    e.preventDefault();
    
    const title = document.getElementById('ad-title').value.trim();
    const link = document.getElementById('ad-link').value.trim();
    const reward = parseInt(document.getElementById('ad-reward').value);
    const clicks = parseInt(document.getElementById('ad-clicks').value);
    const totalCost = reward * clicks;

    if (totalCost <= 0) return window.safeAlert("Cost must be greater than 0.");
    
    if (window.currentUser.balance < totalCost) {
        window.safeHaptic('error');
        return window.safeAlert(`Insufficient balance! You need ${totalCost.toLocaleString()} 🪙.`);
    }

    const btn = document.getElementById('ad-submit-btn');
    btn.disabled = true;
    btn.innerText = "Processing Payment...";

    // Deduct the coins from the user's Firebase balance
    const success = await window.processTransaction(-totalCost, null);
    
    if (success) {
        try {
            // Save the campaign request to Firebase
            await window.db.collection('ad_requests').add({
                userId: window.currentUser.id,
                userName: window.currentUser.name,
                title: title,
                link: link,
                reward: reward,
                clicks: clicks,
                totalCost: totalCost,
                status: 'Pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            window.safeHaptic('success');
            window.safeAlert("Campaign submitted! Waiting for Admin approval.");
            document.getElementById('submit-ad-form').reset();
            window.calculateAdCost();
            window.loadMyCampaigns();

            // 👉 THE NEW LOGGING COMMAND 👈
            window.logTransaction('Withdraw', totalCost, 'Ad Campaign Created', '📢');

        } catch (error) {
            console.error(error);
            window.safeAlert("Error submitting ad. Contact support.");
        }
    }
    
    btn.disabled = false;
    btn.innerText = "Submit Campaign";
};

// --- NEW: FETCH USER'S PAST CAMPAIGNS ---
window.loadMyCampaigns = async function() {
    const list = document.getElementById('my-campaigns-list'); // Ensure this matches the ID in your ads.html
    if (!list) return;

    list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 30px;">Loading your campaigns...</div>`;

    try {
        const snap = await window.db.collection('ad_requests')
            .where('userId', '==', window.currentUser.id)
            .orderBy('createdAt', 'desc')
            .get();

        if (snap.empty) {
            list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 30px; background: var(--surface-color); border-radius: 12px; border: 1px dashed rgba(255,255,255,0.1);">You haven't created any campaigns yet.</div>`;
            return;
        }

        let html = '';
        snap.forEach(doc => {
            const data = doc.data();
            const date = data.createdAt ? data.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown';
            
            // Status colors
            let statusColor = '#ffcc00'; // Pending yellow
            let bgStyle = 'border-left: 3px solid #ffcc00;';
            
            if (data.status === 'Approved' || data.status === 'Completed') {
                statusColor = 'var(--success)'; // Green
                bgStyle = 'border-left: 3px solid var(--success);';
            } else if (data.status === 'Rejected') {
                statusColor = 'var(--danger)'; // Red
                bgStyle = 'border-left: 3px solid var(--danger);';
            }

            // THE NEW LIVE TRACKER BAR
            let trackerHtml = '';
            if (data.status === 'Approved' || data.status === 'Completed') {
                const clicksDone = data.clicksCompleted || 0;
                const totalClicks = data.clicks || 1;
                const progressPercent = Math.min(100, Math.round((clicksDone / totalClicks) * 100));
                
                trackerHtml = `
                    <div style="margin-top: 15px; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.02);">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="font-size: 0.8rem; color: var(--text-muted);">Campaign Progress</span>
                            <span style="font-size: 0.8rem; font-weight: bold; color: #32d74b;">${clicksDone} / ${totalClicks} Clicks</span>
                        </div>
                        <div style="width: 100%; background: rgba(255,255,255,0.1); height: 6px; border-radius: 10px; overflow: hidden;">
                            <div style="width: ${progressPercent}%; background: #32d74b; height: 100%; border-radius: 10px; transition: width 0.5s ease;"></div>
                        </div>
                    </div>
                `;
            }

            // Compile the card
            html += `
                <div style="background: var(--surface-color); border: 1px solid rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; margin-bottom: 15px; ${bgStyle}">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
                        <h4 style="margin: 0; font-size: 1.05rem;">${data.title}</h4>
                        <span style="color: ${statusColor}; font-size: 0.75rem; font-weight: bold; background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 6px;">${data.status.toUpperCase()}</span>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted);">
                        <span>Cost: <b style="color: white;">${data.totalCost} 🪙</b></span>
                        <span>${date}</span>
                    </div>
                    
                    ${trackerHtml}
                </div>
            `;
        });

        list.innerHTML = html;

    } catch (error) {
        console.error(error);
        if (error.message.includes("index")) {
            list.innerHTML = `<div style="text-align: center; color: #ffcc00; padding: 30px;">Syncing database index...</div>`;
        } else {
            list.innerHTML = `<div style="text-align: center; color: var(--danger); padding: 30px;">Error loading campaigns.</div>`;
        }
    }
};