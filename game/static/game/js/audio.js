class SoundSystem {
    constructor() {
        this.isMuted = false;
        
        // Looping Background Music Playlist
        this.playlist = [
            '/static/game/audio/bgm2.mp3',
            '/static/game/audio/bgm3.mp3'
        ];
        this.currentTrackIndex = 0;

        this.bgm = new Audio(this.playlist[this.currentTrackIndex]);
        this.bgm.volume = 0.25;

        // Auto-switch to next song when current track ends
        this.bgm.addEventListener('ended', () => {
            if (this.isMuted) return;
            this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlist.length;
            this.bgm.src = this.playlist[this.currentTrackIndex];
            this.bgm.play().catch(() => {});
        });
    }

    init() {
        if (!this.isMuted && this.bgm.paused) {
            this.bgm.play().catch(() => {});
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.bgm.pause();
        } else {
            this.bgm.play().catch(() => {});
        }
        return this.isMuted;
    }

    // Keep empty stubs so legacy calls don't trigger errors
    playPlace() {}
    playExplode() {}
    playWin() {}
}

const sounds = new SoundSystem();

window.addEventListener('pointerdown', () => {
    sounds.init();
}, { once: false });