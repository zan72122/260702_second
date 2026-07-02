// ============================================================
// どうぶつ住民 AI と 会話
// ============================================================

import * as THREE from 'three';
import { buildVillager, animateRig, VILLAGERS } from './characters.js';
import { state } from './state.js';
import { FRUITS } from './items.js';

const HOMES = {
  mike: { x: -34, z: 16, r: 12 },
  hachi: { x: 36, z: 28, r: 10 },
  kerotta: { x: 20, z: 38, r: 9 },
  mofuzo: { x: -30, z: -22, r: 10 },
  piko: { x: -2, z: 12, r: 9 },
};

// ---------------- セリフ ----------------
const LINES = {
  genki: [
    '{player}、きょうも モリモリ いこうね{catch}！',
    'さっき うみで おっきい かげ みたんだ{catch}！サメかも！？',
    'はしって ころんで わらって…しまぐらしって さいこう{catch}！',
    'あたらしい ふく ほしいなぁ。おみせ みてきたら{catch}？',
    'きょうの てんき、あそびに ぴったり{catch}！',
    '{player}と おともだちに なれて うれしい{catch}♪',
  ],
  honest: [
    'けさは はやおきして しまを パトロールしたんだ{catch}。',
    'かわの みずが きれいだと さかなも よろこぶんだって{catch}。',
    'コツコツ つづけることが たいせつなんだ{catch}。',
    '{player}は どんな さかなが すき？ぼくは ぜんぶすき{catch}！',
    'きのう ほった かせき、はくぶつかんに あずけたよ{catch}。',
    'こまったときは おたがいさま、だよね{catch}。',
  ],
  lazy: [
    'ふぁ〜あ…おひるね びより だね{catch}…',
    'おなか すいたなぁ。フルーツ たべたい{catch}…',
    'いそがしいのは にがて。のんびり いこう{catch}〜',
    'くさのうえで ごろごろするの、きもちいいよ{catch}…',
    'ゆめのなかで ごちそう たべてたのに おきちゃった{catch}…',
    '{player}も たまには やすみなよ{catch}〜',
  ],
  gentle: [
    'やあ {player}。きょうも おだやかな いちにちだね{catch}。',
    'おちゃでも のんで いきなさい…と いいたいところだけど おそとだね{catch}。',
    'はなに みずを あげると よろこぶよ{catch}。',
    'ほしぞらを みてると こころが おちつくんだ{catch}。',
    'むかしは よく うみで およいだものさ{catch}。',
    'なにか こまりごとは ないかい{catch}？',
  ],
  oshare: [
    'その ふく、なかなか イケてるじゃない{catch}♪',
    'ながれぼしに おねがいごと しちゃった{catch}☆',
    'おしゃれは こころの ビタミンよ{catch}！',
    'きょうの わたし、かがやいてる{catch}？',
    'ビーチで おさんぽ、ロマンチックよね{catch}〜',
    'はくぶつかんの コレクション、もう みた{catch}？',
  ],
};

const MORNING = ['おはよう、{player}{catch}！', 'あさの くうき、きもちいいね{catch}！'];
const NIGHT = ['こんばんは{catch}。ほしが きれいだね。', 'よふかしは ほどほどにね{catch}…'];
const RAIN = ['あめの ひは しっとり おちつくね{catch}。', 'かさ わすれちゃった{catch}…'];

const GIFT_THANKS = [
  'わぁ！{item}！？ うれしい{catch}！！',
  'えっ いいの？ {item} だいすき{catch}！',
  '{item}…！ たいせつに たべるね{catch}！',
];

const FRIEND_GIFT = [
  'いつも ありがとう。これ うけとって{catch}！',
  'なかよしの しるしに プレゼント{catch}♪',
];

export function friendshipLevel(pts) {
  const th = [0, 2, 5, 10, 18, 30];
  let lv = 0;
  for (let i = 0; i < th.length; i++) if (pts >= th[i]) lv = i;
  return lv; // 0〜5
}

export function createVillagers(scene, world) {
  const list = VILLAGERS.map((def) => {
    const rig = buildVillager(def);
    const home = HOMES[def.id];
    // 出現位置を home 周辺の歩ける場所に
    let x = home.x, z = home.z;
    for (let i = 0; i < 40; i++) {
      const tx = home.x + (Math.random() - 0.5) * home.r;
      const tz = home.z + (Math.random() - 0.5) * home.r;
      if (world.walkable(tx, tz)) { x = tx; z = tz; break; }
    }
    rig.group.position.set(x, world.heightAt(x, z), z);
    scene.add(rig.group);

    // ふきだしアイコン
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g = cv.getContext('2d');
    g.fillStyle = 'rgba(255,255,255,0.95)';
    g.beginPath();
    g.arc(32, 26, 20, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(24, 42); g.lineTo(32, 56); g.lineTo(38, 42);
    g.fill();
    g.fillStyle = '#f5a53c';
    g.font = 'bold 24px sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('！', 32, 27);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    bubble.scale.setScalar(0.7);
    bubble.position.y = 2.1;
    bubble.visible = false;
    rig.group.add(bubble);

    return {
      def, rig, home, bubble,
      state: 'idle', // idle | walk | talk
      idleT: 1 + Math.random() * 3,
      target: null,
      facing: Math.random() * Math.PI * 2,
    };
  });

  function update(dt, playerPos, time) {
    for (const v of list) {
      const g = v.rig.group;
      const d2p = Math.hypot(playerPos.x - g.position.x, playerPos.z - g.position.z);
      v.bubble.visible = v.state !== 'talk' && d2p < 4;

      if (v.state === 'talk') {
        // プレイヤーの方を向く
        const ang = Math.atan2(playerPos.x - g.position.x, playerPos.z - g.position.z);
        g.rotation.y += (ang - g.rotation.y) * Math.min(1, dt * 8);
        animateRig(v.rig, dt, false, time);
        continue;
      }

      // プレイヤーがぶつかりそうなら少し待つ
      if (v.state === 'idle') {
        v.idleT -= dt;
        if (v.idleT <= 0) {
          // あたらしい目的地
          for (let i = 0; i < 20; i++) {
            const tx = v.home.x + (Math.random() - 0.5) * v.home.r * 2;
            const tz = v.home.z + (Math.random() - 0.5) * v.home.r * 2;
            if (world.walkable(tx, tz)) { v.target = { x: tx, z: tz }; break; }
          }
          v.state = v.target ? 'walk' : 'idle';
          if (!v.target) v.idleT = 2;
        }
        animateRig(v.rig, dt, false, time);
      } else if (v.state === 'walk') {
        const dx = v.target.x - g.position.x;
        const dz = v.target.z - g.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.4 || d2p < 1.2) {
          v.state = 'idle';
          v.idleT = 2 + Math.random() * 5;
          v.target = null;
          animateRig(v.rig, dt, false, time);
        } else {
          const sp = 1.6;
          const mx = (dx / dist) * sp * dt;
          const mz = (dz / dist) * sp * dt;
          const nx = g.position.x + mx, nz = g.position.z + mz;
          if (world.walkable(nx, nz)) {
            g.position.x = nx; g.position.z = nz;
          } else {
            v.state = 'idle';
            v.idleT = 1.5;
            v.target = null;
          }
          const ang = Math.atan2(dx, dz);
          let diff = ang - g.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          g.rotation.y += diff * Math.min(1, dt * 8);
          animateRig(v.rig, dt, true, time);
        }
        g.position.y = world.heightAt(g.position.x, g.position.z);
      }
    }
  }

  function nearest(pos, r = 2.4) {
    let best = null, bd = r;
    for (const v of list) {
      const d = Math.hypot(pos.x - v.rig.group.position.x, pos.z - v.rig.group.position.z);
      if (d < bd) { bd = d; best = v; }
    }
    return best;
  }

  return { list, update, nearest };
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function fill(line, v) {
  return line
    .replaceAll('{player}', state.player.name)
    .replaceAll('{catch}', v.def.catch)
    .replaceAll('{item}', v._giftItemName || '');
}

// 会話内容を組み立てる（ui.showDialog に渡す形）
export function buildTalk(v, hour, weather) {
  const id = v.def.id;
  state.stats.talks++;
  const pts = state.friendship[id] || 0;
  const firstToday = !state.daily.talked[id];
  if (firstToday) {
    state.daily.talked[id] = true;
    state.friendship[id] = pts + 1;
  }
  const lines = [];
  if (hour >= 5 && hour < 10 && Math.random() < 0.5) lines.push(fill(pick(MORNING), v));
  else if ((hour >= 20 || hour < 5) && Math.random() < 0.5) lines.push(fill(pick(NIGHT), v));
  else if (weather === 'rain' && Math.random() < 0.5) lines.push(fill(pick(RAIN), v));
  lines.push(fill(pick(LINES[v.def.personality]), v));

  // なかよしプレゼント（レベル3以上・1日1回・30%）
  let gift = null;
  const lv = friendshipLevel(state.friendship[id] || 0);
  if (lv >= 3 && !state.daily.gifted['from_' + id] && Math.random() < 0.3) {
    state.daily.gifted['from_' + id] = true;
    const fruit = FRUITS[Math.floor(Math.random() * (FRUITS.length - 1))];
    gift = { kind: 'fruit', id: fruit.id, name: fruit.name, price: fruit.price, icon: fruit.icon };
    lines.push(fill(pick(FRIEND_GIFT), v));
  }
  return { lines, gift, firstToday };
}

export function buildGiftThanks(v, itemName) {
  v._giftItemName = itemName;
  const line = fill(pick(GIFT_THANKS), v);
  v._giftItemName = null;
  state.friendship[v.def.id] = (state.friendship[v.def.id] || 0) + 3;
  return line;
}
