class Shockwave {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = 4;
        this.alpha = 0.85;
        this.lineWidth = 3;
    }

    update() {
        this.radius += 2.8;
        this.alpha -= 0.04;
        this.lineWidth = Math.max(0.5, this.lineWidth * 0.95);
    }

    draw(ctx) {
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.strokeStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 12;
        ctx.lineWidth = this.lineWidth;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4.5 + 1.2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.alpha = 1;
        this.decay = Math.random() * 0.03 + 0.02;
        this.radius = Math.random() * 2.5 + 1.5;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.96;
        this.vy *= 0.96;
        this.alpha -= this.decay;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(this.alpha, 0);
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Projectile {
    constructor(startX, startY, targetX, targetY, color, onComplete) {
        this.x = startX;
        this.y = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.color = color;
        this.onComplete = onComplete;
        this.progress = 0;
        this.speed = 0.12;
    }

    update() {
        this.progress += this.speed;
        this.x = this.x + (this.targetX - this.x) * this.progress;
        this.y = this.y + (this.targetY - this.y) * this.progress;

        if (this.progress >= 1) {
            this.onComplete();
            return true;
        }
        return false;
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// --- Falling Arcane Snow / Forest Spores Engine ---
class SnowFlake {
    constructor(w, h) {
        this.w = w;
        this.h = h;
        this.reset(true);
    }

    reset(initial = false) {
        this.x = Math.random() * this.w;
        this.y = initial ? Math.random() * this.h : -10;
        this.radius = Math.random() * 2.2 + 0.8;
        this.speedY = Math.random() * 0.9 + 0.4;
        this.speedX = Math.sin(Math.random() * Math.PI) * 0.4 - 0.2;
        this.alpha = Math.random() * 0.6 + 0.2;
        this.sway = Math.random() * 0.02;
        this.angle = Math.random() * Math.PI * 2;
    }

    update() {
        this.angle += this.sway;
        this.x += Math.sin(this.angle) * 0.5 + this.speedX;
        this.y += this.speedY;

        if (this.y > this.h + 10 || this.x < -10 || this.x > this.w + 10) {
            this.reset();
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = `rgba(200, 255, 225, ${this.alpha})`;
        ctx.shadowColor = '#6ee7b7';
        ctx.shadowBlur = this.radius > 1.8 ? 8 : 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function startSnowEffect() {
    const snowCanvas = document.getElementById('snowCanvas');
    if (!snowCanvas) return;

    const sCtx = snowCanvas.getContext('2d');
    let width = (snowCanvas.width = window.innerWidth);
    let height = (snowCanvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
        width = snowCanvas.width = window.innerWidth;
        height = snowCanvas.height = window.innerHeight;
    });

    const flakes = Array.from({ length: 65 }, () => new SnowFlake(width, height));

    function animateSnow() {
        sCtx.clearRect(0, 0, width, height);
        flakes.forEach((flake) => {
            flake.update();
            flake.draw(sCtx);
        });
        requestAnimationFrame(animateSnow);
    }

    animateSnow();
}

// Start snow particles immediately on load
startSnowEffect();