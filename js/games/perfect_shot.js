// ==========================================
// GAME ENGINE: THE PERFECT SHOT
// ==========================================

window.perfect = {
    canvas: null, ctx: null, w: 0, h: 0,
    isPlaying: false, isSnapping: false,
    sliderX: 0, speed: 0, dir: 1,
    barW: 0, greenW: 0, yellowW: 0,
    animationFrame: null, flashAlpha: 0, recBlink: false
};

// 1. AUTO-TRIGGERED BY ROUTER
window.init_perfect_shot = function() {
    const prizeDisplay = document.getElementById('perfect-prize-display');
    if(prizeDisplay) prizeDisplay.innerText = window.currentGameReward || 0;

    window.perfect.canvas = document.getElementById('perfect-canvas');
    if (!window.perfect.canvas) return;
    
    window.perfect.ctx = window.perfect.canvas.getContext('2d');
    
    const resizeCanvas = () => {
        const rect = window.perfect.canvas.parentElement.getBoundingClientRect();
        // Account for the 120px shutter button area at the bottom
        window.perfect.canvas.width = rect.width;
        window.perfect.canvas.height = rect.height - 120; 
        window.perfect.w = window.perfect.canvas.width;
        window.perfect.h = window.perfect.canvas.height;
        
        // Define exact target zones
        window.perfect.barW = window.perfect.w * 0.85; // 85% of screen width
        window.perfect.greenW = window.perfect.barW * 0.08; // 8% is perfect
        window.perfect.yellowW = window.perfect.barW * 0.35; // 35% is near-miss
    };
    resizeCanvas();
    
    // Blinking REC dot
    setInterval(() => {
        const dot = document.getElementById('perfect-rec-dot');
        if(dot) dot.style.opacity = window.perfect.recBlink ? '1' : '0.2';
        window.perfect.recBlink = !window.perfect.recBlink;
    }, 600);
    
    // Setup Shutter Animation
    const shutter = document.getElementById('perfect-shutter-btn');
    shutter.addEventListener('pointerdown', () => { if(!shutter.disabled) shutter.style.transform = 'scale(0.85)'; });
    shutter.addEventListener('pointerup', () => { shutter.style.transform = 'scale(1)'; });
    shutter.addEventListener('pointerleave', () => { shutter.style.transform = 'scale(1)'; });
};

// 2. MAIN RENDER LOOP
function perfectLoop() {
    const ctx = window.perfect.ctx;
    const w = window.perfect.w;
    const h = window.perfect.h;
    const center = w / 2;
    const centerY = h / 2;
    
    ctx.clearRect(0, 0, w, h);
    
    // Draw Rule of Thirds Grid (Viewfinder)
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w/3, 0); ctx.lineTo(w/3, h);
    ctx.moveTo(w*2/3, 0); ctx.lineTo(w*2/3, h);
    ctx.moveTo(0, h/3); ctx.lineTo(w, h/3);
    ctx.moveTo(0, h*2/3); ctx.lineTo(w, h*2/3);
    ctx.stroke();

    // Draw Focus Brackets [   ]
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 3;
    const bSize = 30;
    ctx.beginPath();
    // Top Left
    ctx.moveTo(center - 50, centerY - 50 + bSize); ctx.lineTo(center - 50, centerY - 50); ctx.lineTo(center - 50 + bSize, centerY - 50);
    // Top Right
    ctx.moveTo(center + 50 - bSize, centerY - 50); ctx.lineTo(center + 50, centerY - 50); ctx.lineTo(center + 50, centerY - 50 + bSize);
    // Bottom Left
    ctx.moveTo(center - 50, centerY + 50 - bSize); ctx.lineTo(center - 50, centerY + 50); ctx.lineTo(center - 50 + bSize, centerY + 50);
    // Bottom Right
    ctx.moveTo(center + 50 - bSize, centerY + 50); ctx.lineTo(center + 50, centerY + 50); ctx.lineTo(center + 50, centerY + 50 - bSize);
    ctx.stroke();

    // Draw The Scale Bar
    const barX = center - (window.perfect.barW / 2);
    const barY = h - 60;
    
    // Red Base (Miss)
    ctx.fillStyle = 'rgba(255, 59, 48, 0.5)';
    ctx.fillRect(barX, barY, window.perfect.barW, 20);
    
    // Yellow Base (Near Miss)
    ctx.fillStyle = 'rgba(255, 204, 0, 0.8)';
    ctx.fillRect(center - (window.perfect.yellowW/2), barY, window.perfect.yellowW, 20);
    
    // Green Base (Perfect)
    ctx.fillStyle = '#32d74b';
    ctx.fillRect(center - (window.perfect.greenW/2), barY - 5, window.perfect.greenW, 30);

    // Update & Draw The Moving Slider
    if (window.perfect.isPlaying && !window.perfect.isSnapping) {
        window.perfect.sliderX += window.perfect.speed * window.perfect.dir;
        if (window.perfect.sliderX > center + window.perfect.barW/2) { 
            window.perfect.sliderX = center + window.perfect.barW/2; 
            window.perfect.dir = -1; 
        }
        if (window.perfect.sliderX < center - window.perfect.barW/2) { 
            window.perfect.sliderX = center - window.perfect.barW/2; 
            window.perfect.dir = 1; 
        }
    }
    
    // Draw Slider Line
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.fillRect(window.perfect.sliderX - 3, barY - 15, 6, 50);
    ctx.shadowBlur = 0; // reset

    // Draw Shutter Flash Effect
    if (window.perfect.flashAlpha > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${window.perfect.flashAlpha})`;
        ctx.fillRect(0, 0, w, h);
        window.perfect.flashAlpha -= 0.08;
    }

    window.perfect.animationFrame = requestAnimationFrame(perfectLoop);
}

// 3. GAME FLOW
window.startPerfectRound = function() {
    document.getElementById('perfect-start-overlay').style.display = 'none';
    document.getElementById('perfect-shutter-btn').disabled = false;
    
    window.perfect.isPlaying = true;
    window.perfect.isSnapping = false;
    window.perfect.flashAlpha = 0;
    window.perfect.sliderX = window.perfect.w / 2; // Start in center
    
    // Speed: Travels across the screen very fast (adjust to make harder/easier)
    window.perfect.speed = window.perfect.w * 0.025; 
    
    window.perfect.animationFrame = requestAnimationFrame(perfectLoop);
};

window.takePerfectShot = function() {
    if(!window.perfect.isPlaying || window.perfect.isSnapping) return;
    
    window.perfect.isSnapping = true;
    document.getElementById('perfect-shutter-btn').disabled = true;
    window.safeHaptic('heavy');
    
    // Trigger Camera Flash
    window.perfect.flashAlpha = 1.0;
    
    // Wait for flash to fade slightly before calculating and showing result
    setTimeout(() => {
        evaluateShot();
    }, 600);
};

async function evaluateShot() {
    window.perfect.isPlaying = false;
    cancelAnimationFrame(window.perfect.animationFrame);
    
    const center = window.perfect.w / 2;
    const distFromCenter = Math.abs(window.perfect.sliderX - center);
    
    const endOverlay = document.getElementById('perfect-end-overlay');
    const icon = document.getElementById('perfect-end-icon');
    const title = document.getElementById('perfect-end-title');
    const text = document.getElementById('perfect-end-text');
    
    endOverlay.style.display = 'flex';
    
    let reward = 0;
    let statusText = '';
    
    if (distFromCenter <= window.perfect.greenW / 2) {
        // PERFECT SHOT
        reward = window.currentGameReward || 0;
        icon.innerText = '📸';
        title.innerText = 'PERFECT SHOT!';
        title.style.color = '#32d74b';
        statusText = `Flawless focus! You won the grand prize.`;
        
    } else if (distFromCenter <= window.perfect.yellowW / 2) {
        // GOOD SHOT (Near Miss - 40% payout)
        reward = Math.floor((window.currentGameReward || 0) * 0.4);
        icon.innerText = '⚠️';
        title.innerText = 'GOOD FOCUS';
        title.style.color = '#ffcc00';
        statusText = `Slightly blurry. You recovered 40% of the prize.`;
        
    } else {
        // MISS
        reward = 0;
        icon.innerText = '❌';
        title.innerText = 'OUT OF FOCUS';
        title.style.color = '#ff3b30';
        statusText = `You missed the subject entirely.`;
    }

    if (reward > 0) {
        text.innerText = `Processing Payout...`;
        const success = await window.processTransaction(reward, `Shot Sold! +${reward} 🪙 added.`);
        
        if (success) {
            text.innerHTML = `${statusText}<br><br><span style="color:#32d74b; font-size:1.5rem; font-weight:bold;">+${reward} 🪙</span>`;
            if(typeof window.logTransaction === 'function') {
                window.logTransaction('Earn', reward, 'Won The Perfect Shot', '📸');
            }
        } else {
            text.innerText = `Network error saving your payout.`;
        }
    } else {
        text.innerText = statusText;
    }
}