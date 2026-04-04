// ==========================================
// GAME ENGINE: COIN SLASHER
// ==========================================

window.slasher = {
    canvas: null, ctx: null, w: 0, h: 0,
    isPlaying: false, score: 0, targetScore: 20,
    entities: [], particles: [], slashTrail: [],
    spawnInterval: null, animationFrame: null,
    pointerDown: false
};

// 1. THIS FUNCTION IS AUTO-TRIGGERED BY THE ROUTER
window.init_coin_slasher = function() {
    // Show the dynamic reward set by the Admin
    const prizeDisplay = document.getElementById('slasher-prize-display');
    if(prizeDisplay) prizeDisplay.innerText = window.currentGameReward || 0;

    window.slasher.canvas = document.getElementById('slasher-canvas');
    if (!window.slasher.canvas) return;
    
    window.slasher.ctx = window.slasher.canvas.getContext('2d');
    
    // Fit canvas to container
    const resizeCanvas = () => {
        const rect = window.slasher.canvas.parentElement.getBoundingClientRect();
        window.slasher.canvas.width = rect.width;
        window.slasher.canvas.height = rect.height;
        window.slasher.w = rect.width;
        window.slasher.h = rect.height;
    };
    resizeCanvas();
    
    // Setup Swipe Listeners
    const c = window.slasher.canvas;
    c.addEventListener('touchstart', slasherDown, {passive: false});
    c.addEventListener('touchmove', slasherMove, {passive: false});
    c.addEventListener('touchend', slasherUp);
    
    c.addEventListener('mousedown', slasherDown);
    c.addEventListener('mousemove', slasherMove);
    c.addEventListener('mouseup', slasherUp);
    c.addEventListener('mouseleave', slasherUp);
};

// 2. INPUT HANDLING
function slasherDown(e) {
    if(!window.slasher.isPlaying) return;
    e.preventDefault();
    window.slasher.pointerDown = true;
    window.slasher.slashTrail = [];
    slasherAddTrail(e);
}

function slasherMove(e) {
    if(!window.slasher.isPlaying || !window.slasher.pointerDown) return;
    e.preventDefault();
    slasherAddTrail(e);
    slasherCheckCollisions();
}

function slasherUp() { window.slasher.pointerDown = false; }

function slasherAddTrail(e) {
    const rect = window.slasher.canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    window.slasher.slashTrail.push({ x: clientX - rect.left, y: clientY - rect.top, life: 1.0 });
    if(window.slasher.slashTrail.length > 10) window.slasher.slashTrail.shift();
}

// 3. COLLISION & PARTICLES
function slasherCheckCollisions() {
    if(window.slasher.slashTrail.length < 2) return;
    const lastPoint = window.slasher.slashTrail[window.slasher.slashTrail.length - 1];
    
    window.slasher.entities.forEach(entity => {
        if(!entity.active) return;
        const dist = Math.hypot(entity.x - lastPoint.x, entity.y - lastPoint.y);
        
        if (dist < entity.radius + 20) { 
            entity.active = false;
            
            // Create Explosion
            for(let i=0; i<6; i++) {
                window.slasher.particles.push({
                    x: entity.x, y: entity.y,
                    vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10,
                    life: 1.0, color: entity.type === 'coin' ? '#ffcc00' : '#ff3b30'
                });
            }
            
            if (entity.type === 'coin') {
                window.slasher.score += 1;
                document.getElementById('slasher-score').innerText = window.slasher.score;
                window.safeHaptic('light');
                
                // Check Win Condition
                if (window.slasher.score >= window.slasher.targetScore) {
                    window.endSlasherRound(true);
                }
            } else {
                window.safeHaptic('error');
                window.endSlasherRound(false); // Hit a skull!
            }
        }
    });
}

// 4. MAIN GAME LOOP
function slasherLoop() {
    if (!window.slasher.isPlaying) return;
    const ctx = window.slasher.ctx;
    ctx.clearRect(0, 0, window.slasher.w, window.slasher.h);
    
    // Draw Entities
    ctx.font = "45px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (let i = window.slasher.entities.length - 1; i >= 0; i--) {
        let e = window.slasher.entities[i];
        if(!e.active) continue;
        
        e.vy += 0.2; // Gravity
        e.x += e.vx; e.y += e.vy;
        
        if (e.y > window.slasher.h + 100) e.active = false; // Remove if fallen
        ctx.fillText(e.emoji, e.x, e.y);
    }
    
    // Draw Particles
    for (let i = window.slasher.particles.length - 1; i >= 0; i--) {
        let p = window.slasher.particles[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.05;
        if(p.life <= 0) { window.slasher.particles.splice(i, 1); continue; }
        
        ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.globalAlpha = p.life; ctx.fill(); ctx.globalAlpha = 1.0;
    }
    
    // Draw Slash Trail
    if (window.slasher.slashTrail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(window.slasher.slashTrail[0].x, window.slasher.slashTrail[0].y);
        for(let i=1; i<window.slasher.slashTrail.length; i++) ctx.lineTo(window.slasher.slashTrail[i].x, window.slasher.slashTrail[i].y);
        
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.shadowColor = '#3b82f6'; ctx.shadowBlur = 15; ctx.stroke(); ctx.shadowBlur = 0;
    }
    
    if(!window.slasher.pointerDown && window.slasher.slashTrail.length > 0) window.slasher.slashTrail.shift();
    window.slasher.animationFrame = requestAnimationFrame(slasherLoop);
}

// 5. GAME FLOW CONTROLS
window.startSlasherRound = function() {
    document.getElementById('slasher-start-overlay').style.display = 'none';
    window.slasher.score = 0;
    document.getElementById('slasher-score').innerText = '0';
    window.slasher.entities = [];
    window.slasher.particles = [];
    window.slasher.slashTrail = [];
    window.slasher.isPlaying = true;
    
    window.slasher.animationFrame = requestAnimationFrame(slasherLoop);
    
    // Spawn targets
    window.slasher.spawnInterval = setInterval(() => {
        if(!window.slasher.isPlaying) return;
        const isCursed = Math.random() < 0.35; // 35% chance of skull
        window.slasher.entities.push({
            x: Math.random() * (window.slasher.w - 80) + 40,
            y: window.slasher.h + 50,
            vx: (Math.random() - 0.5) * 5,
            vy: -(Math.random() * 6 + 12),
            radius: 30,
            type: isCursed ? 'skull' : 'coin',
            emoji: isCursed ? '💀' : '🪙',
            active: true
        });
    }, 700);
};

window.endSlasherRound = async function(isWin) {
    window.slasher.isPlaying = false;
    clearInterval(window.slasher.spawnInterval);
    cancelAnimationFrame(window.slasher.animationFrame);
    
    const endOverlay = document.getElementById('slasher-end-overlay');
    const icon = document.getElementById('slasher-end-icon');
    const title = document.getElementById('slasher-end-title');
    const text = document.getElementById('slasher-end-text');
    
    endOverlay.style.display = 'flex';
    
    if (isWin) {
        icon.innerText = '🏆';
        title.innerText = 'You Won!';
        title.style.color = '#34c759';
        text.innerText = `Processing Reward...`;
        
        // Give the reward to the user!
        const reward = window.currentGameReward || 0;
        const success = await window.processTransaction(reward, `Winner! +${reward} 🪙 added.`);
        
        if (success) {
            text.innerText = `+${reward} 🪙 has been added to your balance!`;
            if(typeof window.logTransaction === 'function') {
                window.logTransaction('Earn', reward, 'Won Coin Slasher', '🎮');
            }
        } else {
            text.innerText = `Network error saving your win.`;
        }
    } else {
        icon.innerText = '💀';
        title.innerText = 'Game Over';
        title.style.color = '#ff3b30';
        text.innerText = 'You slashed a cursed skull!';
    }
};