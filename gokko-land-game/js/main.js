// わくわく!ごっこタウン エントリポイント
import * as THREE from 'three';
import { Renderer } from './core/renderer.js';
import { AudioSys } from './core/audio.js';
import { loadState, saveState } from './core/save.js';
import { UI, GAME_INFO } from './ui/ui.js';
import { TownScene } from './world/town.js';
import { CakeGame } from './games/cake.js';
import { SushiGame } from './games/sushi.js';
import { DeliveryGame } from './games/delivery.js';
import { FireGame } from './games/fire.js';
import { RegisterGame } from './games/register.js';
import { HATS } from './chars/chara.js';
import { pick } from './core/utils.js';

const GAME_CLASSES = {
  cake: CakeGame,
  sushi: SushiGame,
  delivery: DeliveryGame,
  fire: FireGame,
  register: RegisterGame,
};

class App {
  constructor() {
    this.state = loadState();
    this.audio = new AudioSys();
    this.ui = new UI(this);
    this.renderer = new Renderer(document.getElementById('game-canvas'));
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.current = null; // いまのシーン(town or game)
    this.clock = new THREE.Clock();

    this.bindInput();
    this.bindUI();
    this.boot();
    window.__app = this; // デバッグ用
  }

  async boot() {
    // ロード演出(アセットは全て手続き生成なので気分だけ)
    const steps = ['タウンをじゅんびちゅう…', 'おみせを たてています…', 'おきゃくさんが ならんでいます…'];
    for (let i = 0; i < steps.length; i++) {
      this.ui.setLoading((i + 1) / (steps.length + 1), steps[i]);
      await new Promise((r) => setTimeout(r, 260));
    }
    // タウンを構築
    this.town = new TownScene(this);
    this.current = this.town;
    this.renderer.setScene(this.town.scene);
    this.ui.setLoading(1, 'できた!');
    await new Promise((r) => setTimeout(r, 250));
    this.ui.hideLoading();
    this.ui.showTitle();
    this.loop();
  }

  bindInput() {
    const canvas = this.renderer.renderer.domElement;
    const toNdc = (e) => {
      this.pointer.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );
      this.raycaster.setFromCamera(this.pointer, this.renderer.camera);
    };
    canvas.addEventListener('pointerdown', (e) => {
      toNdc(e);
      this.current?.onPointerDown?.(this.pointer.x, this.pointer.y, this.raycaster);
    });
    canvas.addEventListener('pointermove', (e) => {
      toNdc(e);
      this.current?.onPointerMove?.(this.pointer.x, this.pointer.y, this.raycaster);
    });
    const up = (e) => {
      toNdc(e);
      this.current?.onPointerUp?.(this.pointer.x, this.pointer.y, this.raycaster);
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', () => {
      this.current?.onPointerUp?.(0, 0, this.raycaster);
    });
    // iOSのダブルタップズーム等をふうじる
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('dblclick', (e) => e.preventDefault());
  }

  bindUI() {
    const el = this.ui.el;
    el.btnStart.addEventListener('click', () => {
      this.audio.unlock();
      this.audio.setEnabled(this.state.sound);
      this.audio.fanfare();
      this.ui.hideTitle();
      this.town.activate();
    });
    el.btnSound.addEventListener('click', () => {
      this.audio.unlock();
      this.state.sound = !this.state.sound;
      this.audio.setEnabled(this.state.sound);
      this.ui.setSoundIcon(this.state.sound);
      if (this.state.sound) this.audio.tap();
      saveState(this.state);
    });
    el.btnStamp.addEventListener('click', () => {
      this.audio.tap();
      this.ui.showPanel('stamps');
    });
    el.btnBack.addEventListener('click', () => {
      this.audio.tap();
      this.exitToTown();
    });
    el.gachaClose.addEventListener('click', () => {
      this.audio.tap();
      this.ui.hideGacha();
    });
    el.gachaSpin.addEventListener('click', () => this.spinGacha());
    this.ui.setSoundIcon(this.state.sound);
    this.ui.updateCoins(this.state.coins);
  }

  // ---- シーン管理 ----
  async enterGame(key) {
    await this.ui.fade(async () => {
      this.ui.hideAllHud();
      if (this.current && this.current !== this.town) this.current.dispose();
      this.town.entering = false;
      const game = new GAME_CLASSES[key](this);
      this.current = game;
      game.activate();
    });
  }

  async exitToTown() {
    await this.ui.fade(async () => {
      this.ui.hideOrder();
      this.ui.hideMessage();
      this.ui.hideGauge();
      this.ui.clearActions();
      this.ui.setProgress('');
      if (this.current && this.current !== this.town) this.current.dispose();
      // タウンは作りなおして いつも新鮮に(ぼうし反映も兼ねる)
      this.town.dispose();
      this.town = new TownScene(this);
      this.current = this.town;
      this.town.activate();
      this.ui.updateCoins(this.state.coins);
    });
  }

  // ゲームクリア(ミニゲームの finish() から呼ばれる)
  gameFinished(key, stars) {
    const coins = stars * 10;
    this.state.coins += coins;
    const isNewStamp = (this.state.stamps[key] || 0) === 0;
    this.state.stamps[key] = Math.max(this.state.stamps[key] || 0, stars);
    saveState(this.state);
    if (isNewStamp) this.audio.stamp();
    this.ui.updateCoins(this.state.coins, true);

    // ぜんぶスタンプそろった?
    const allDone = Object.keys(GAME_INFO).every((k) => (this.state.stamps[k] || 0) > 0);

    this.ui.showResult({
      stars,
      coins,
      gameKey: key,
      newStamp: isNewStamp,
      onRetry: () => this.enterGame(key),
      onHome: () => {
        this.exitToTown().then(() => {
          if (allDone && !this.state.master) {
            this.state.master = true;
            saveState(this.state);
            setTimeout(() => {
              this.audio.fanfare();
              this.ui.toast('👑 ぜんぶのおしごとマスター! おめでとう!!', 3200);
              this.town.fx.confetti(new THREE.Vector3(0, 6, 0), 80, 8);
            }, 700);
          }
        });
      },
    });
    setTimeout(() => this.audio.coin(), 500);
  }

  // ---- ガチャ ----
  openGacha() {
    this.ui.showGacha();
  }

  spinGacha() {
    if (this.state.coins < 20 || this.spinning) return;
    this.spinning = true;
    this.state.coins -= 20;
    saveState(this.state);
    this.ui.updateCoins(this.state.coins, true);
    const el = this.ui.el;
    el.gachaSpin.disabled = true;
    el.gachaCapsule.classList.add('hidden');
    el.gachaPrize.classList.add('hidden');
    el.gachaDome.classList.remove('hidden');
    el.gachaDome.classList.add('shaking');
    this.audio.gachaRoll();
    this.ui.updateGachaMsg('ガラガラガラ…');

    setTimeout(() => {
      el.gachaDome.classList.remove('shaking');
      el.gachaCapsule.classList.remove('hidden');
      this.audio.pop();
    }, 900);

    setTimeout(() => {
      el.gachaCapsule.classList.add('hidden');
      // けんしょう:もっていないぼうし優先
      const pool = HATS.filter((h) => h.id !== 'none');
      const notOwned = pool.filter((h) => !this.state.hats.includes(h.id));
      const prize = notOwned.length && Math.random() < 0.8 ? pick(notOwned) : pick(pool);
      const isNew = !this.state.hats.includes(prize.id);
      el.gachaPrize.textContent = prize.emoji;
      el.gachaPrize.classList.remove('hidden');
      this.audio.fanfare();
      if (isNew) {
        this.state.hats.push(prize.id);
        this.state.equippedHat = prize.id;
        this.ui.updateGachaMsg(`✨ あたらしい「${prize.name}」ゲット! かぶったよ!`);
        this.town.refreshHat();
      } else {
        this.state.coins += 10;
        this.ui.updateCoins(this.state.coins, true);
        this.ui.updateGachaMsg(`「${prize.name}」は もってたから 🪙10まい もどってきたよ`);
      }
      saveState(this.state);
      setTimeout(() => {
        el.gachaSpin.disabled = this.state.coins < 20;
        this.spinning = false;
        this.ui.updateGachaMsg();
      }, 2200);
    }, 1700);
  }

  equipHat(hatId) {
    this.audio.pop();
    this.state.equippedHat = hatId;
    saveState(this.state);
    if (this.town && this.current === this.town) this.town.refreshHat();
  }

  // ---- メインループ ----
  loop() {
    requestAnimationFrame(() => this.loop());
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.current?.update?.(dt);
    this.renderer.render();
  }
}

new App();
