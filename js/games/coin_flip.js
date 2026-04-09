// ==========================================
// GAME LOGIC: LUCKY COIN FLIP (BULLETPROOF)
// ==========================================

window.cf_selectedSide = null;
window.cf_gameData = null;
window.cf_isFlipping = false;
window.cf_isFirstFlip = true;

window.init_coin_flip = async function() {
    try {
        window.cf_selectedSide = null;
        window.cf_isFlipping = false;
        window.cf_isFirstFlip = true; 
        
        const coin = document.getElementById('cf-coin');
        if (coin) coin.style.transform = 'rotateY(0deg)';

        const balDisplay = document.getElementById('cf-balance-display');
        if (balDisplay && window.currentUser) {
            balDisplay.innerText = `Your Balance: ${window.currentUser.balance.toLocaleString()} 🪙`;
        }

        const snap = await window.db.collection('games').where('fileId', '==', 'coin_flip').get();
        if (!snap.empty) {
            window.cf_gameData = snap.docs[0].data();
            const feeEl = document.getElementById('cf-fee');
            const rewardEl = document.getElementById('cf-reward');
            if (feeEl) feeEl.innerText = window.cf_gameData.entryFee;
            if (rewardEl) rewardEl.innerText = window.cf_gameData.reward;
        }
    } catch (err) { 
        console.error("Error loading game data", err); 
    } finally {
        // ALWAYS refresh the button UI safely
        window.cf_selectSide(null); 
    }
};

window.cf_selectSide = function(side) {
    if(window.cf_isFlipping) return;
    window.cf_selectedSide = side;

    const btnHeads = document.getElementById('btn-heads');
    const btnTails = document.getElementById('btn-tails');
    const playBtn = document.getElementById('cf-play-btn');

    // Safely update side buttons if they exist on screen
    if(btnHeads && btnTails) {
        btnHeads.style.background = 'rgba(255,255,255,0.05)';
        btnHeads.style.borderColor = 'transparent';
        btnTails.style.background = 'rgba(255,255,255,0.05)';
        btnTails.style.borderColor = 'transparent';

        if (side === 'Heads') {
            btnHeads.style.background = 'rgba(255, 204, 0, 0.1)';
            btnHeads.style.borderColor = '#ffcc00';
        } else if (side === 'Tails') {
            btnTails.style.background = 'rgba(224, 224, 224, 0.1)';
            btnTails.style.borderColor = '#e0e0e0';
        }
    }

    // Safely update the Play Button
    if (playBtn) {
        if (side) {
            if (window.cf_isFirstFlip) {
                playBtn.innerText = "Flip Now (Entry Paid) ✅";
            } else {
                playBtn.innerText = `Pay ${window.cf_gameData ? window.cf_gameData.entryFee : '--'} 🪙 to Flip!`;
            }
            playBtn.style.opacity = '1';
            playBtn.disabled = false;
            window.safeHaptic('light');
        } else {
            playBtn.innerText = "Select a side to Play";
            playBtn.style.opacity = '0.5';
            playBtn.disabled = true;
        }
    }
};

window.cf_playGame = async function() {
    if (!window.cf_selectedSide || !window.cf_gameData || window.cf_isFlipping) return;

    const fee = window.cf_gameData.entryFee;
    const reward = window.cf_gameData.reward;

    // SMART BILLING: Deduct if NOT the first flip
    if (!window.cf_isFirstFlip) {
        if (window.currentUser.balance < fee) {
            window.safeAlert(`You need ${fee} 🪙 to play!`);
            window.safeHaptic('error');
            return;
        }
        const feeSuccess = await window.processTransaction(-fee, null);
        if (!feeSuccess) return; 
    }

    window.cf_isFirstFlip = false;
    window.cf_isFlipping = true;
    
    const playBtn = document.getElementById('cf-play-btn');
    if (playBtn) {
        playBtn.innerText = "Flipping...";
        playBtn.style.opacity = '0.5';
        playBtn.disabled = true;
    }

    const isWin = Math.random() < 0.5;
    let resultSide = isWin ? window.cf_selectedSide : (window.cf_selectedSide === 'Heads' ? 'Tails' : 'Heads');

    // Start 3D Animation Safely
    const coin = document.getElementById('cf-coin');
    if (coin) {
        coin.style.transition = 'none';
        coin.style.transform = 'rotateY(0deg)';
        void coin.offsetWidth; // Force CSS refresh

        coin.style.transition = 'transform 2.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
        let baseSpins = 1800; // 5 full rotations
        let finalRotation = baseSpins + (resultSide === 'Tails' ? 180 : 0);
        coin.style.transform = `rotateY(${finalRotation}deg)`;
    }
    
    window.safeHaptic('light');

    // Wait for animation, then process result
    setTimeout(async () => {
        try {
            if (isWin) {
                window.safeHaptic('success');
                await window.processTransaction(reward, null);
                window.safeAlert(`🎉 You won! It landed on ${resultSide}. +${reward} 🪙 added!`);
            } else {
                window.safeHaptic('error');
                window.safeAlert(`😢 You lost! It landed on ${resultSide}. Better luck next time.`);
            }
        } catch (error) {
            console.error("Reward Processing Error:", error);
        } finally {
            // THE GUARANTEED UN-STICKER: This block runs NO MATTER WHAT!
            window.cf_isFlipping = false;
            
            const balDisplay = document.getElementById('cf-balance-display');
            if(balDisplay && window.currentUser) {
                balDisplay.innerText = `Your Balance: ${window.currentUser.balance.toLocaleString()} 🪙`;
            }
            
            window.cf_selectSide(null); 
            if(typeof window.updateAllUI === 'function') window.updateAllUI();
        }
    }, 2600);
};