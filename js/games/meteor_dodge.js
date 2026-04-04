// ==========================================
// GAME ENGINE: METEOR SURVIVAL
// ==========================================

window.meteorGame = {
    canvas: null, ctx: null, w: 0, h: 0,
    isPlaying: false, 
    timeRemaining: 15.0, // 15 seconds to survive
    lastTime: 0,
    player: { x: 0, y: 0, radius: 20, isDragging: false },
    meteors: [], particles: [],
    spawnInterval: null, animationFrame: null,
    difficulty: 1
};

// 1. AUTO-TRIGGERED BY ROUTER
window.init_meteor_dodge = function() {
    const prizeDisplay = document.getElementById('meteor-prize-display');
    if(prizeDisplay) prizeDisplay.innerText = window.currentGameReward || 0;

    window.meteorGame.canvas = document.getElementById('meteor-canvas');
    if (!window.meteorGame.canvas) return;
    
    window.meteorGame.ctx = window.meteorGame.canvas.getContext('2d');
    
    // Resize canvas
    const resizeCanvas = () => {
        const rect = window.meteorGame.canvas.parentElement.getBoundingClientRect();
        window.meteorGame.canvas.width = rect.width;
        window.meteorGame.canvas.height = rect.height;
        window.meteorGame.w = rect.width;
        window.meteorGame.h = rect.height;
        
        // Put player at the bottom center initially
        window.meteorGame.player.x = window.meteorGame.w / 2;
        window.meteorGame.player.y = window.meteorGame.h - 100;
    };
    resizeCanvas();
    
    // Setup Touch/Mouse Listeners for dragging the ship
    const c = window.meteorGame.canvas;
    c.addEventListener('touchstart', dragStart, {passive: false});
    c.addEventListener('touchmove', dragMove, {passive: false});
    c.addEventListener('touchend', dragEnd);
    
    c.addEventListener('mousedown', dragStart);
    c.addEventListener('mousemove', dragMove);
    c.addEventListener('mouseup', dragEnd);
    c.addEventListener('mouseleave', dragEnd);
};

// 2. PLAYER CONTROLS (1:1 Dragging)
function dragStart(e) {
    if(!window.meteorGame.isPlaying) return;
    e.preventDefault();
    window.meteorGame.player.isDragging = true;
    updatePlayerPos(e);
}

function dragMove(e) {
    if(!window.meteorGame.isPlaying || !window.meteorGame.player.isDragging) return;
    e.preventDefault();
    updatePlayerPos(e);
}

function dragEnd() { window.meteorGame.player.isDragging = false; }

function updatePlayerPos(e) {
    const rect = window.meteorGame.canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Keep player within screen bounds
    let newX = clientX - rect.left;
    let newY = clientY - rect.top;
    
    newX = Math.max(20, Math.min(newX, window.meteorGame.w - 20));
    newY = Math.max(20, Math.min(newY, window.meteorGame.h - 20));
    
    window.meteorGame.player.x = newX;
    window.meteorGame.player.y = newY;
}

// 3. METEOR PHYSICS & COLLISIONS
function checkMeteorCollisions() {
    const p = window.meteorGame.player;
    
    window.meteorGame.meteors.forEach(m => {
        if (!m.active) return;
        
        // Calculate distance between center of ship and center of meteor
        const dist = Math.hypot(m.x - p.x, m.y - p.y);
        
        // If distance is less than their combined radii, it's a crash!
        // We make the collision box slightly smaller than the emoji for a fairer feeling
        if (dist < p.radius + m.radius - 8) { 
            window.safeHaptic('error');
            createExplosion(p.x, p.y, '#ff3b30');
            window.endMeteorRound(false); // Player died
        }
    });
}

function createExplosion(x, y, color) {
    for(let i=0; i<15; i++) {
        window.meteorGame.particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.5) * 12,
            life: 1.0,
            color: color
        });
    }
}

// 4. MAIN GAME LOOP
function meteorLoop(timestamp) {
    if (!window.meteorGame.isPlaying) return;
    
    // Delta time calculation for smooth timer
    if (!window.meteorGame.lastTime) window.meteorGame.lastTime = timestamp;
    const dt = (timestamp - window.meteorGame.lastTime) / 1000;
    window.meteorGame.lastTime = timestamp;
    
    // Update Timer
    window.meteorGame.timeRemaining -= dt;
    if (window.meteorGame.timeRemaining <= 0) {
        window.meteorGame.timeRemaining = 0;
        document.getElementById('meteor-time').innerText = "0.0";
        window.endMeteorRound(true); // Player Survived!
        return;
    }
    document.getElementById('meteor-time').innerText = window.meteorGame.timeRemaining.toFixed(1);
    
    // Increase difficulty over time
    window.meteorGame.difficulty += 0.002;

    const ctx = window.meteorGame.ctx;
    ctx.clearRect(0, 0, window.meteorGame.w, window.meteorGame.h);
    
    // Draw Player Ship
    ctx.font = "40px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🚀", window.meteorGame.player.x, window.meteorGame.player.y);
    
    // Ship Engine Glow effect
    ctx.beginPath();
    ctx.arc(window.meteorGame.player.x, window.meteorGame.player.y + 20, 10, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(10, 132, 255, ${Math.random() * 0.5 + 0.5})`;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#0a84ff';
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw Meteors
    for (let i = window.meteorGame.meteors.length - 1; i >= 0; i--) {
        let m = window.meteorGame.meteors[i];
        if(!m.active) continue;
        
        m.x += m.vx; 
        m.y += m.vy;
        m.rotation += m.rotSpeed;
        
        if (m.y > window.meteorGame.h + 50) {
            m.active = false;
            window.meteorGame.meteors.splice(i, 1);
            continue;
        }
        
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(m.rotation);
        ctx.font = `${m.radius * 2}px Arial`;
        ctx.fillText("☄️", 0, 0);
        ctx.restore();
    }
    
    // Draw Particles
    for (let i = window.meteorGame.particles.length - 1; i >= 0; i--) {
        let p = window.meteorGame.particles[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.03;
        if(p.life <= 0) { window.meteorGame.particles.splice(i, 1); continue; }
        
        ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.globalAlpha = p.life; ctx.fill(); ctx.globalAlpha = 1.0;
    }
    
    checkMeteorCollisions();
    
    window.meteorGame.animationFrame = requestAnimationFrame(meteorLoop);
}

// 5. GAME FLOW CONTROLS
window.startMeteorRound = function() {
    document.getElementById('meteor-start-overlay').style.display = 'none';
    
    window.meteorGame.timeRemaining = 15.0;
    document.getElementById('meteor-time').innerText = "15.0";
    
    // Reset player to bottom center
    window.meteorGame.player.x = window.meteorGame.w / 2;
    window.meteorGame.player.y = window.meteorGame.h - 100;
    window.meteorGame.player.isDragging = false;
    
    window.meteorGame.meteors = [];
    window.meteorGame.particles = [];
    window.meteorGame.difficulty = 1;
    window.meteorGame.lastTime = 0;
    window.meteorGame.isPlaying = true;
    
    window.meteorGame.animationFrame = requestAnimationFrame(meteorLoop);
    
    // Spawn Meteors faster as difficulty increases
    const spawnMeteor = () => {
        if(!window.meteorGame.isPlaying) return;
        
        const radius = Math.random() * 15 + 15; // Sizes between 15 and 30
        window.meteorGame.meteors.push({
            x: Math.random() * window.meteorGame.w,
            y: -50, // Spawn above screen
            vx: (Math.random() - 0.5) * 3, // Slight drift
            vy: (Math.random() * 4 + 4) * window.meteorGame.difficulty, // Falling speed scales with difficulty
            radius: radius,
            rotation: 0,
            rotSpeed: (Math.random() - 0.5) * 0.2,
            active: true
        });
        
        // Next spawn happens faster based on difficulty
        const nextSpawn = Math.max(100, 400 - (window.meteorGame.difficulty * 50));
        window.meteorGame.spawnInterval = setTimeout(spawnMeteor, nextSpawn);
    };
    
    spawnMeteor();
};

window.endMeteorRound = async function(isWin) {
    window.meteorGame.isPlaying = false;
    clearTimeout(window.meteorGame.spawnInterval);
    cancelAnimationFrame(window.meteorGame.animationFrame);
    
    const endOverlay = document.getElementById('meteor-end-overlay');
    const icon = document.getElementById('meteor-end-icon');
    const title = document.getElementById('meteor-end-title');
    const text = document.getElementById('meteor-end-text');
    
    endOverlay.style.display = 'flex';
    
    if (isWin) {
        icon.innerText = '🏆';
        title.innerText = 'MISSION SUCCESS';
        title.style.color = '#34c759';
        text.innerText = `Processing Reward...`;
        
        // Give the reward to the user
        const reward = window.currentGameReward || 0;
        const success = await window.processTransaction(reward, `Survival Bonus! +${reward} 🪙 added.`);
        
        if (success) {
            text.innerHTML = `You survived the meteor storm!<br><br><span style="color:#34c759; font-size:1.5rem; font-weight:bold;">+${reward} 🪙</span>`;
            if(typeof window.logTransaction === 'function') {
                window.logTransaction('Earn', reward, 'Won Meteor Survival', '🚀');
            }
        } else {
            text.innerText = `Network error saving your win.`;
        }
    } else {
        icon.innerText = '💥';
        title.innerText = 'SHIP DESTROYED';
        title.style.color = '#ff3b30';
        text.innerText = `You survived for ${(15 - window.meteorGame.timeRemaining).toFixed(1)} seconds.`;
    }
};