# 🏴‍☠️ Pirate Chain Reaction

A tactical, high-seas themed strategy game built with **Django** and vanilla **HTML5 Canvas**. Compete with up to 8 players or AI opponents to trigger explosive chain reactions and conquer the board.

---

## 🎮 Gameplay & Mechanics

Chain Reaction is a deterministic strategy game where players take turns placing orbs onto a grid:

* **Grid Stability & Critical Mass:**
  * **Corner Cells:** Unstable at **2** orbs $\to$ explodes in 2 directions.
  * **Edge Cells:** Unstable at **3** orbs $\to$ explodes in 3 directions.
  * **Center Cells:** Unstable at **4** orbs $\to$ explodes in 4 directions.
* **Cascade Reactions:** When a cell exceeds its critical mass, it explodes, sending projectiles into adjacent cells, claiming ownership of those cells, and potentially triggering full-board chain reactions.
* **Victory Condition:** Eliminate all opponent orbs to become the last pirate standing.

---

## ✨ Features

* **🏴‍☠️ 8 Unique Pirate Factions:** Each player commands an individual color scheme and glowing thematic insignia:
  * 🔴 **Captain Crimson:** `☠️` Jolly Roger
  * 🟢 **Siren Emerald:** `⚓` Anchor
  * 🟡 **Corsair Gold:** `⚔️` Cutlasses
  * 🟣 **Abyssal Kraken:** `🐙` Kraken
  * 🔵 **Navigator Azure:** `🧭` Compass
  * 🟠 **Powder Orange:** `💣` Bomb
  * ⚪ **Ghost Silver:** `🗡️` Dagger
  * ⚫ **Shadow Black:** `📜` Treasure Map
* **📱 HiDPI & Mobile Optimized:** Dynamic DPR scaling ensures razor-sharp rendering on Retina and high-density mobile screens.
* **🌊 Floating Orb Dynamics:** Smooth harmonic vertical levitation and custom particle shockwave collision effects.
* **🎵 Dual-Track Looping OST:** Background music system that automatically cycles through ambient sea shanties.
* **🤖 Configurable CPU Opponents:** Choose between human players or AI with multiple difficulty settings.
* **📐 Adaptive Grid Presets:** Supports Standard, Small, Large, Square, and Titan board dimensions across portrait and landscape orientations.

---

## 🛠️ Tech Stack

* **Backend:** Python / [Django](https://www.djangoproject.com/)
* **Frontend:** Vanilla JavaScript (ES6+), HTML5 Canvas, Web Audio API
* **Styling:** Responsive Modern CSS3

---

## 🚀 Quickstart Guide

### Prerequisites
* Python 3.8+ installed on your system.

### 1. Clone the Repository
```bash
git clone [https://github.com/rp-2908/Chain_reaction_game.git](https://github.com/rp-2908/Chain_reaction_game.git)
cd Chain_reaction_game
```
### 2. Create and Activate Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```
### 3. Install Dependencies & Run Migrations
```bash
pip install django
python manage.py migrate
```
### 4. Start the Local Server
```bash
python manage.py runserver
```

## 📂 Project Structure
```
├── game/
│   ├── static/game/
│   │   ├── audio/          # Background music tracks (.mp3)
│   │   ├── css/            # Custom UI styling and modal overlays
│   │   └── js/
│   │       ├── ai.js       # Strategic evaluation logic for CPU players
│   │       ├── audio.js    # Multi-track looping background music engine
│   │       ├── engine.js   # Canvas loop, physics, animations, and game rules
│   │       └── particles.js# Shockwave rings, projectiles, and spark effects
│   ├── templates/game/
│   │   └── index.html      # Game HUD, modal config, and canvas viewport
│   ├── views.py            # Django route handlers
│   └── urls.py             # App-level routing
├── manage.py
└── README.md
```

## 📜 License
### How to Add This to Your Repository

1. Create a file named **`README.md`** in your project root directory.
2. Paste the code above.
3. Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual GitHub username and repository name.
4. Commit and push:
   ```bash
   git add README.md
   git commit -m "docs: add comprehensive GitHub README"
   git push origin main
   ```



