class Shockwave {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = 6;
        this.maxRadius = 65;
        this.alpha = 0.9;
        this.lineWidth = 4;
    }

    update() {
        this.radius += 3.2;
        this.alpha -= 0.045;
        this.lineWidth = Math.max(0.5, this.lineWidth * 0.94);
    }

    draw(ctx) {
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.strokeStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15;
        ctx.lineWidth = this.lineWidth;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner arcane ring
        if (this.radius > 15) {
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.6, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 1.5;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.alpha = 1;
        this.decay = Math.random() * 0.03 + 0.02;
        this.radius = Math.random() * 3 + 1.5;
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
        ctx.shadowBlur = 10;
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
        this.speed = 0.11;
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
        // Glowing comet orb
        const grad = ctx.createRadialGradient(this.x - 2, this.y - 2, 1, this.x, this.y, 8);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, this.color);
        grad.addColorStop(1, '#000000');

        ctx.fillStyle = grad;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}