// ==========================================
// GAME LOGIC: LUCKY DICE ROLL
// ==========================================

window.ld_selectedSide = null;
window.ld_gameData = null;
window.ld_isRolling = false;
window.ld_isFirstRoll = true;

window.init_lucky_dice = async function() {
    try {
        window.ld_selectedSide = null;
        window.ld_isRolling = false;
        window.ld_isFirstRoll = true; 
        
        const dice = document.getElementById('ld-dice');
        // Reset to an isometric angle so it looks cool
        if (dice) dice.style.transform = 'rotateX(-15deg) rotateY(15deg)';

        const balDisplay = document.getElementById('ld-balance-display');
        if (balDisplay && window.currentUser) {
            balDisplay.innerText = `Your Balance: ${window.currentUser.balance.toLocaleString()} 🪙`;
        }

        const snap = await window.db.collection('games').where('fileId', '==', 'lucky_dice').get();
        if (!snap.empty) {
            window.ld_gameData = snap.docs[0].data();
            const feeEl = document.getElementById('ld-fee');
            const rewardEl = document.getElementById('ld-reward');
            if (feeEl) feeEl.innerText = window.ld_gameData.entryFee;
            if (rewardEl) rewardEl.innerText = window.ld_gameData.reward;
        }
    } catch (err) { 
        console.error("Error loading dice data", err); 
    } finally {
        window.ld_selectSide(null); 
    }
};

window.ld_selectSide = function(side) {
    if(window.ld_isRolling) return;
    window.ld_selectedSide = side;

    const btnLow = document.getElementById('btn-low');
    const btnHigh = document.getElementById('btn-high');
    const playBtn = document.getElementById('ld-play-btn');

    if(btnLow && btnHigh) {
        btnLow.style.background = 'rgba(255,255,255,0.05)';
        btnLow.style.borderColor = 'transparent';
        btnHigh.style.background = 'rgba(255,255,255,0.05)';
        btnHigh.style.borderColor = 'transparent';

        if (side === 'Low') {
            btnLow.style.background = 'rgba(255, 69, 58, 0.1)';
            btnLow.style.borderColor = 'var(--danger)';
        } else if (side === 'High') {
            btnHigh.style.background = 'rgba(50, 215, 75, 0.1)';
            btnHigh.style.borderColor = 'var(--success)';
        }
    }

    if (playBtn) {
        if (side) {
            if (window.ld_isFirstRoll) {
                playBtn.innerText = "Roll Dice (Entry Paid) ✅";
            } else {
                playBtn.innerText = `Pay ${window.ld_gameData ? window.ld_gameData.entryFee : '--'} 🪙 to Roll!`;
            }
            playBtn.style.opacity = '1';
            playBtn.disabled = false;
            window.safeHaptic('light');
        } else {
            playBtn.innerText = "Select High or Low";
            playBtn.style.opacity = '0.5';
            playBtn.disabled = true;
        }
    }
};

window.ld_playGame = async function() {
    if (!window.ld_selectedSide || !window.ld_gameData || window.ld_isRolling) return;

    const fee = window.ld_gameData.entryFee;
    const reward = window.ld_gameData.reward;

    if (!window.ld_isFirstRoll) {
        if (window.currentUser.balance < fee) {
            window.safeAlert(`You need ${fee} 🪙 to play!`);
            window.safeHaptic('error');
            return;
        }
        const feeSuccess = await window.processTransaction(-fee, null);
        if (!feeSuccess) return; 
    }

    window.ld_isFirstRoll = false;
    window.ld_isRolling = true;
    
    const playBtn = document.getElementById('ld-play-btn');
    if (playBtn) {
        playBtn.innerText = "Rolling...";
        playBtn.style.opacity = '0.5';
        playBtn.disabled = true;
    }

    // 1. Generate the random roll (1 to 6)
    const resultNum = Math.floor(Math.random() * 6) + 1;
    
    // 2. Did they win?
    const isWin = (window.ld_selectedSide === 'Low' && resultNum <= 3) || 
                  (window.ld_selectedSide === 'High' && resultNum >= 4);

    // 3. 3D Dice Rotation Math
    const dice = document.getElementById('ld-dice');
    if (dice) {
        // Extra spins to make it look dramatic (5 full 360 rotations = 1800deg)
        const xSpins = 1800;
        const ySpins = 1800;

        let finalRotX = xSpins;
        let finalRotY = ySpins;

        // Target the correct face
        if (resultNum === 1) { finalRotX += 0;   finalRotY += 0; }
        if (resultNum === 2) { finalRotX += 0;   finalRotY += -90; }
        if (resultNum === 3) { finalRotX += 0;   finalRotY += 90; }
        if (resultNum === 4) { finalRotX += -90; finalRotY += 0; }
        if (resultNum === 5) { finalRotX += 90;  finalRotY += 0; }
        if (resultNum === 6) { finalRotX += 0;   finalRotY += 180; }

        dice.style.transform = `rotateX(${finalRotX}deg) rotateY(${finalRotY}deg)`;
    }
    
    window.safeHaptic('light');

    // Wait for animation, then process result
    setTimeout(async () => {
        try {
            if (isWin) {
                window.safeHaptic('success');
                await window.processTransaction(reward, null);
                window.safeAlert(`🎉 You won! The dice rolled a ${resultNum}. +${reward} 🪙 added!`);
            } else {
                window.safeHaptic('error');
                window.safeAlert(`😢 You lost! The dice rolled a ${resultNum}. Better luck next time.`);
            }
        } catch (error) {
            console.error("Reward Processing Error:", error);
        } finally {
            window.ld_isRolling = false;
            
            const balDisplay = document.getElementById('ld-balance-display');
            if(balDisplay && window.currentUser) {
                balDisplay.innerText = `Your Balance: ${window.currentUser.balance.toLocaleString()} 🪙`;
            }
            
            window.ld_selectSide(null); 
            if(typeof window.updateAllUI === 'function') window.updateAllUI();
        }
    }, 2600);
};