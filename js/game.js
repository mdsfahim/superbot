window.activeGamesCache = [];

window.initGameLogic = async function() {
    const list = document.getElementById('live-games-list');
    if (!list) return;

    try {
        const snap = await window.db.collection('games').orderBy('createdAt', 'desc').get();
        
        if (snap.empty) {
            list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 30px; background: var(--surface-color); border-radius: 16px;">No games available yet. Check back soon!</div>`;
            return;
        }

        window.activeGamesCache = [];
        let html = '';
        
        snap.forEach(doc => {
            const g = doc.data();
            g.id = doc.id;
            window.activeGamesCache.push(g);

            let iconDisplay = g.icon.startsWith('http') ? `<img src="${g.icon}" style="width:50px; height:50px; border-radius:12px; object-fit:cover;">` : `<div style="font-size: 2.5rem; background: rgba(255,255,255,0.05); width: 50px; height: 50px; display:flex; justify-content:center; align-items:center; border-radius: 12px;">${g.icon}</div>`;

            html += `
                <div style="background: var(--surface-color); border: 1px solid rgba(255,255,255,0.05); padding: 15px; border-radius: 16px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        ${iconDisplay}
                        <div>
                            <h4 style="margin: 0 0 4px 0;">${g.title}</h4>
                            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px;">${g.desc}</div>
                            <div style="font-size: 0.75rem; font-weight: bold;">
                                <span style="color: #ff3b30;">Fee: ${g.entryFee}</span> • <span style="color: #34c759;">Win: ${g.reward}</span>
                            </div>
                        </div>
                    </div>
                    <button onclick="window.openGameDetails('${g.id}')" style="background: var(--accent-color); color: white; border: none; padding: 10px 20px; border-radius: 50px; font-weight: bold; cursor: pointer;">Play</button>
                </div>
            `;
        });
        list.innerHTML = html;

    } catch (error) {
        list.innerHTML = `<div style="text-align: center; color: var(--danger); padding: 30px;">Error loading games.</div>`;
    }
};

window.openGameDetails = function(gameId) {
    const g = window.activeGamesCache.find(x => x.id === gameId);
    if (!g) return;

    document.getElementById('popup-game-icon').innerHTML = g.icon.startsWith('http') ? `<img src="${g.icon}" style="width:80px; height:80px; border-radius:16px;">` : g.icon;
    document.getElementById('popup-game-title').innerText = g.title;
    document.getElementById('popup-game-desc').innerText = g.desc;
    document.getElementById('popup-game-rules').innerText = g.rules;
    document.getElementById('popup-game-fee').innerText = `- ${g.entryFee} 🪙`;
    document.getElementById('popup-game-reward').innerText = `+ ${g.reward} 🪙`;

    const startBtn = document.getElementById('popup-game-start-btn');
    startBtn.onclick = () => window.launchGameEngine(g);

    document.getElementById('game-info-popup').style.display = 'flex';
};

window.launchGameEngine = async function(gameData) {
    const btn = document.getElementById('popup-game-start-btn');
    
    if (window.currentUser.balance < gameData.entryFee) {
        window.safeAlert(`Insufficient balance! You need ${gameData.entryFee} 🪙 to play.`);
        window.safeHaptic('error');
        return;
    }

    btn.disabled = true;
    btn.innerText = "Processing...";

    // 1. Deduct the Entry Fee
    const success = await window.processTransaction(-gameData.entryFee, null);
    
    if (success) {
        // Log the expense to Cloud Ledger
        if (typeof window.logTransaction === 'function' && gameData.entryFee > 0) {
            window.logTransaction('Withdraw', gameData.entryFee, `Entry: ${gameData.title}`, '🎮');
        }

        document.getElementById('game-info-popup').style.display = 'none';
        btn.disabled = false;
        btn.innerText = "Start Game";

        // 2. Set the global reward so the HTML game knows how much to pay out!
        window.currentGameReward = gameData.reward;

        // 3. MAGIC: Route to the HTML file inside additional/games/
        window.openSubPage('games', gameData.fileId, gameData.title);

    } else {
        btn.disabled = false;
        btn.innerText = "Start Game";
    }
};