class SoundSystem {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        
        // Real MP3 Background Music Player
        this.bgm = new Audio('/static/game/audio/bgm5.mp3');
        this.bgm.loop = true;
        this.bgm.volume = 0.25; // Soft, unobtrusive background level
    }

    async init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }

        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }

        // Start playing the MP3 track
        if (!this.isMuted && this.bgm.paused) {
            this.bgm.play().catch(() => {
                // Handled gracefully if browser still blocks autoplay
            });
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.bgm.pause();
        } else {
            this.bgm.play();
        }
        return this.isMuted;
    }

    // --- Placement Tap ---
    playPlace(count = 1) {
        if (!this.ctx || this.isMuted) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        const freq = 280 + (count * 50);
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.15, t + 0.12);

        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.22);
    }

    // --- Deep Mystical Bass Resonance Explosion ---
    playExplode(combo = 1) {
        if (!this.ctx || this.isMuted) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const t = this.ctx.currentTime;

        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(90 + Math.min(combo * 8, 40), t);
        subOsc.frequency.exponentialRampToValueAtTime(28, t + 0.4);

        subGain.gain.setValueAtTime(0.45, t);
        subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

        subOsc.connect(subGain);
        subGain.connect(this.ctx.destination);
        subOsc.start(t);
        subOsc.stop(t + 0.48);

        const crysOsc = this.ctx.createOscillator();
        const crysGain = this.ctx.createGain();
        crysOsc.type = 'triangle';
        crysOsc.frequency.setValueAtTime(380 + combo * 40, t);
        crysOsc.frequency.exponentialRampToValueAtTime(180, t + 0.55);

        crysGain.gain.setValueAtTime(0.2, t);
        crysGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

        crysOsc.connect(crysGain);
        crysGain.connect(this.ctx.destination);
        crysOsc.start(t);
        crysOsc.stop(t + 0.62);
    }

    playWin() {
        if (!this.ctx || this.isMuted) return;
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
        notes.forEach((freq, idx) => {
            const t = this.ctx.currentTime + idx * 0.12;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);

            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(t);
            osc.stop(t + 0.55);
        });
    }
}

const sounds = new SoundSystem();

window.addEventListener('pointerdown', () => {
    sounds.init();
}, { once: false });