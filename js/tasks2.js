// ==========================================
// EARN TASKS & AD NETWORK LOGIC
// ==========================================

window.renderTasks = async function() {
    const container = document.getElementById('user-task-container');
    if (!container) return;

    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 50px 20px;">Loading tasks & ads...</div>`;

    try {
        const [adSnap, taskSnap] = await Promise.all([
            window.db.collection('settings').doc('ads').get(),
            window.db.collection('tasks').orderBy('createdAt', 'desc').get()
        ]);

        let adConfig = {
            adsgramEnabled: true, adsgramId: "int-23202", adsgramReward: 50,
            libtlEnabled: true, libtlId: "9683040", libtlReward: 100
        };
        if (adSnap.exists) adConfig = { ...adConfig, ...adSnap.data() };

        let html = '';

        if (adConfig.adsgramEnabled) {
            html += `
                <div class="task-card" style="border: 1px solid #3b82f6; background: rgba(59, 130, 246, 0.05);">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="font-size: 2rem; background: rgba(59,130,246,0.1); padding: 10px; border-radius: 12px; display:flex; justify-content:center; align-items:center; width: 45px; height: 45px;">▶️</div>
                        <div>
                            <h4 style="margin-bottom: 4px;">Standard Video Ad</h4>
                            <span style="color: #3b82f6; font-size: 0.8rem; font-weight: bold;">+ ${adConfig.adsgramReward} 🪙</span>
                        </div>
                    </div>
                    <button id="btn-adsgram" onclick="window.playAdsgram('${adConfig.adsgramId}', ${adConfig.adsgramReward})" style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 50px; font-weight: bold; cursor: pointer; transition: 0.2s;">Watch</button>
                </div>
            `;
        }

        if (adConfig.libtlEnabled) {
            html += `
                <div class="task-card" style="border: 1px solid #a855f7; background: rgba(168, 85, 247, 0.05);">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="font-size: 2rem; background: rgba(168,85,247,0.1); padding: 10px; border-radius: 12px; display:flex; justify-content:center; align-items:center; width: 45px; height: 45px;">💎</div>
                        <div>
                            <h4 style="margin-bottom: 4px;">Premium Ad (Monetag)</h4>
                            <span style="color: #a855f7; font-size: 0.8rem; font-weight: bold;">+ ${adConfig.libtlReward} 🪙</span>
                        </div>
                    </div>
                    <button id="btn-libtl" onclick="window.playMonetag('${adConfig.libtlId}', ${adConfig.libtlReward})" style="background: #a855f7; color: white; border: none; padding: 8px 16px; border-radius: 50px; font-weight: bold; cursor: pointer; transition: 0.2s;">Watch</button>
                </div>
            `;
        }

        if ((adConfig.adsgramEnabled || adConfig.libtlEnabled) && !taskSnap.empty) {
            html += `<div style="height: 1px; background: rgba(255,255,255,0.1); margin: 20px 0 10px 0;"></div>`;
        }

        const completedTasks = window.currentUser.completedTasks || []; 

        if (!taskSnap.empty) {
            taskSnap.forEach(doc => {
                const task = doc.data();
                const taskId = doc.id;
                const isCompleted = completedTasks.includes(taskId);

                if (isCompleted) {
                    html += `
                        <div class="task-card" style="opacity: 0.5; pointer-events: none;">
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <div style="font-size: 2rem; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 12px;">✅</div>
                                <div>
                                    <h4 style="margin-bottom: 4px; text-decoration: line-through; color: var(--text-muted);">${task.title}</h4>
                                    <span style="color: var(--text-muted); font-size: 0.8rem; font-weight: bold;">+ ${task.reward} 🪙</span>
                                </div>
                            </div>
                            <button disabled style="background: rgba(255,255,255,0.05); color: var(--text-muted); border: none; padding: 8px 16px; border-radius: 50px; font-weight: bold;">Done</button>
                        </div>
                    `;
               } else {
                    html += `
                        <div class="task-card">
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <div style="font-size: 2rem; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 12px; display:flex; justify-content:center; align-items:center; width: 45px; height: 45px;">${task.icon || '🎯'}</div>
                                <div>
                                    <h4 style="margin-bottom: 4px;">${task.title}</h4>
                                    <span style="color: var(--accent-color); font-size: 0.8rem; font-weight: bold;">+ ${task.reward} 🪙</span>
                                </div>
                            </div>
                            <button id="task-btn-${taskId}" onclick="window.startTask('${taskId}', '${task.link}', ${task.reward}, '${task.adRequestId || ''}')" style="background: var(--accent-color); color: white; border: none; padding: 8px 16px; border-radius: 50px; font-weight: bold; cursor: pointer; transition: 0.3s ease;">Go</button>
                        </div>
                    `;
                }
            });
        }

        container.innerHTML = html;

    } catch (error) {
        console.error("Error fetching tasks & ads:", error);
        container.innerHTML = `<div style="text-align: center; color: #ff453a; padding: 50px 20px;">Connection error.</div>`;
    }
};

// ==========================================
// AD SDK LOGIC (EXPLOIT-PROOF)
// ==========================================

// --- ADSGRAM (Natively rejects on skip) ---
window.playAdsgram = async function(blockId, rewardAmount) {
    const btn = document.getElementById('btn-adsgram');
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Loading...";
    }

    try {
        if (!window.AdsgramController && window.Adsgram) {
            window.AdsgramController = window.Adsgram.init({ blockId: blockId });
        }
        
        if (window.AdsgramController) {
            await window.AdsgramController.show();
            const success = await window.processTransaction(rewardAmount, `Ad Complete! +${rewardAmount} 🪙 added.`);
            if (success && typeof window.logTransaction === 'function') {
                window.logTransaction('Earn', rewardAmount, 'Standard Ad Watched', '▶️');
            }
        } else {
            window.safeAlert("Ad network not ready. Please try again later.");
        }
    } catch (error) {
        window.safeHaptic('error');
        window.safeAlert("Ad was closed early or is unavailable right now.");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = "Watch";
        }
        if(typeof window.updateAllUI === 'function') window.updateAllUI();
    }
};

// --- MONETAG PREMIUM AD (AdVault Time-Verification) ---
window.loadMonetag_SDK = async function(zoneId) {
    return new Promise((resolve, reject) => {
        if (typeof window[`show_${zoneId}`] === 'function') return resolve();

        const script = document.createElement('script');
        script.src = 'https://libtl.com/sdk.js';
        script.dataset.zone = zoneId;
        script.dataset.sdk = `show_${zoneId}`;
        
        const timeout = setTimeout(() => {
            script.remove();
            reject(new Error('Ad SDK timed out'));
        }, 10000);

        script.onload = () => { clearTimeout(timeout); resolve(); };
        script.onerror = () => { clearTimeout(timeout); reject(new Error('Failed to load SDK')); };
        document.head.appendChild(script);
    });
};

window.playMonetag = async function(zoneId, rewardAmount) {
    const btn = document.getElementById('btn-libtl');
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Loading...";
    }

    try {
        await window.loadMonetag_SDK(zoneId);
        const showAd = window[`show_${zoneId}`];
        if (typeof showAd !== 'function') throw new Error("SDK Trigger missing");

        const userId = window.currentUser && window.currentUser.id ? window.currentUser.id : 'anonymous';

        if (btn) btn.innerText = "Watching...";

        // 👉 ADVAULT LOGIC: Record exact time the ad opened
        const startTime = Date.now();

        // Pause code here while the ad plays
        await showAd({ ymid: userId });

        // 👉 ADVAULT LOGIC: Measure how much time passed when it closes
        const elapsed = Date.now() - startTime;
        
        // If they closed the window before 14,000 milliseconds (14s) have passed, it's a skip!
        // (We use 14,000ms instead of 15,000ms just to account for minor SDK loading delays)
        if (elapsed < 14000) {
            window.safeHaptic('error');
            window.safeAlert("Penalty: You closed the ad too early! You must watch for at least 15 seconds.");
            return; // 🛑 THIS STOPS THE REWARD FROM BEING GIVEN
        }

        // If they reach this line, they genuinely waited 15 seconds!
        const success = await window.processTransaction(rewardAmount, `Premium Ad Complete! +${rewardAmount} 🪙 added.`);
        if (success && typeof window.logTransaction === 'function') {
            window.logTransaction('Earn', rewardAmount, 'Premium Ad Watched', '💎');
        }

    } catch (error) {
        console.warn("Ad Failed or Skipped", error);
        window.safeHaptic('error');
        window.safeAlert("Ad closed early or unavailable. No reward given.");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = "Watch";
        }
        if(typeof window.updateAllUI === 'function') window.updateAllUI();
    }
};


// ==========================================
// REGULAR TASKS LOGIC
// ==========================================
window.startTask = function(taskId, url, rewardAmount, adReqId) {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.openLink) {
        window.Telegram.WebApp.openLink(url);
    } else if (url && url !== '#') {
        window.open(url, '_blank');
    }
    const btn = document.getElementById(`task-btn-${taskId}`);
    if (!btn) return;
    btn.innerText = "Claim";
    btn.style.background = "var(--success)";
    btn.style.color = "white";
    
    btn.onclick = function() { window.claimTaskReward(taskId, rewardAmount, btn, adReqId); };
};

window.claimTaskReward = async function(taskId, rewardAmount, btnEl, adReqId) {
    btnEl.disabled = true;
    btnEl.innerText = "Wait...";

    const success = await window.processTransaction(rewardAmount, `Task verified! +${rewardAmount} 🪙 added.`);
    if (success) {
        try {
            if (adReqId && adReqId !== '') {
                await window.db.collection('ad_requests').doc(adReqId).update({
                    clicksCompleted: firebase.firestore.FieldValue.increment(1)
                });
            }
            
            await window.userRef.update({ completedTasks: firebase.firestore.FieldValue.arrayUnion(taskId) });
            if (!window.currentUser.completedTasks) window.currentUser.completedTasks = [];
            window.currentUser.completedTasks.push(taskId);
            
            if (typeof window.logTransaction === 'function') window.logTransaction('Earn', rewardAmount, 'Task Completed', '🎯');
            window.renderTasks();
            
        } catch (error) {
            btnEl.disabled = false; btnEl.innerText = "Claim";
        }
    } else {
        btnEl.disabled = false; btnEl.innerText = "Claim";
    }
};