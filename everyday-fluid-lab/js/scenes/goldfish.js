// シーン: おまつりの金魚すくい
import { TAU, rand, clamp, pick } from '../engine/utils.js';
import { rr, vgrad } from '../engine/art.js';

const FISH_COLORS = [
  ['#ff5a3c', '#ffd8c8'], ['#ff8a3c', '#fff0d8'], ['#f0f0f0', '#ff6a50'], ['#333', '#666'],
];

export default {
  id: 'goldfish',
  name: '金魚すくい',
  emoji: '🐟',
  desc: 'ポイがやぶれるまえに すくえ!',
  goal: '🎯 金魚を5ひき すくおう!',
  clearMsg: '金魚すくい名人!',
  maxParticles: 2800,
  view: { shine: 1.2, refract: 1.3, thresh: 0.34 },

  init(ctx) {
    const d = ctx.data;
    d.score = 0;
    d.poiHp = 1;
    d.poiUsed = 1;
    d.tornShown = false;
    d.fish = [];
    ctx.sim.definePhase(0, { // 水
      sigma: 2.5, beta: 1.4, grav: 1, mix: 0,
      color: [0.55, 0.78, 0.9], alpha: 0.35,
    });
    ctx.setTools([{ id: 'newpoi', icon: '🥤', label: 'あたらしいポイ' }]);
    ctx.setHint('そーっと近づいて、すばやく上へ すくいあげ!あばれると ポイがやぶれるよ');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.waterY = H - Math.min(H * 0.42, 62);
    d.bowlX = W - 14; d.bowlY = 30; // トップバーにかぶらない位置
    if (!d.filled) {
      d.filled = true;
      ctx.fill(2, d.waterY, W - 2, H - 2, 0, 1.5);
      const n = 6;
      for (let i = 0; i < n; i++) {
        d.fish.push({
          x: rand(10, W - 10), y: rand(d.waterY + 8, H - 10),
          ang: rand(TAU), spd: rand(9, 16), size: rand(3.2, 4.6),
          col: pick(FISH_COLORS), tailT: rand(TAU), fear: 0,
          caught: false, flyT: 0, wanderT: 0,
        });
      }
    }
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    const { W, H } = ctx;
    // ポイ
    const poiR = 8.5;
    let poi = null;
    if (p) {
      poi = { x: p.x, y: p.y, vx: p.vx, vy: p.vy };
      const under = p.y > d.waterY - 2;
      const sp = Math.hypot(p.vx, p.vy);
      if (under) {
        // 水をかき回す + ポイへのダメージ
        s.impulse(p.x, p.y, poiR * 1.3, p.vx * 0.10, p.vy * 0.10);
        if (d.poiHp > 0.25) d.poiHp -= sp * dt / 1300;
        if (sp > 120 && Math.random() < dt * 5) {
          ctx.sfx.splash(Math.min(0.7, sp / 400));
          ctx.fx.splashBurst(p.x, d.waterY, Math.min(90, sp * 0.4), 'rgba(170,215,240,0.9)');
        }
        if (d.poiHp <= 0.25 && !d.tornShown) {
          d.tornShown = true;
          ctx.sfx.pop(0.5);
          ctx.toast('💥 ポイが やぶれた…!「あたらしいポイ」でさいちょうせん');
          ctx.vibrate(40);
        }
      }
    }

    // 金魚
    for (const f of d.fish) {
      if (f.caught) {
        // お椀へ飛んでいく
        f.flyT += dt;
        f.x += (d.bowlX - f.x) * Math.min(1, dt * 4);
        f.y += (d.bowlY - f.y) * Math.min(1, dt * 4);
        if (f.flyT > 0.9) {
          f.done = true;
        }
        continue;
      }
      f.tailT += dt * (6 + f.spd * 0.5);
      f.wanderT -= dt;
      if (f.wanderT <= 0) {
        f.wanderT = rand(0.5, 1.6);
        f.targetAng = f.ang + rand(-1.2, 1.2);
        f.spd = rand(8, 18);
      }
      // ポイから逃げる
      if (poi) {
        const dx = f.x - poi.x, dy = f.y - poi.y;
        const dd = Math.hypot(dx, dy);
        // そーっと近づけば気づかれない (すばやい動きに反応)
        const poiSp = Math.hypot(poi.vx, poi.vy);
        if (dd < (poiSp > 45 ? 17 : 7.5)) {
          f.targetAng = Math.atan2(dy, dx);
          f.spd = 40;
          f.fear = 1;
        }
      }
      f.fear = Math.max(0, f.fear - dt);
      // 水中にとどまる
      if (f.y < d.waterY + 5) f.targetAng = Math.PI / 2 + rand(-0.4, 0.4) * 0; // 下へ
      if (f.y > H - 7) f.targetAng = -Math.PI / 2;
      if (f.x < 8) f.targetAng = 0;
      if (f.x > W - 8) f.targetAng = Math.PI;
      // 角度をなめらかに
      let da = ((f.targetAng ?? f.ang) - f.ang + Math.PI * 3) % TAU - Math.PI;
      f.ang += clamp(da, -3 * dt * (1 + f.fear * 3), 3 * dt * (1 + f.fear * 3));
      const [fvx, fvy] = [Math.cos(f.ang) * f.spd, Math.sin(f.ang) * f.spd];
      const [wvx, wvy] = s.velocityAt(f.x, f.y);
      f.x += (fvx + wvx * 0.5) * dt;
      f.y += (fvy + wvy * 0.5) * dt;
      f.x = clamp(f.x, 5, W - 5);
      f.y = clamp(f.y, d.waterY + 2, H - 4);
      // 速い魚は水を押す
      if (f.fear > 0.5) s.impulse(f.x, f.y, 5, Math.cos(f.ang) * 8, Math.sin(f.ang) * 8);

      // すくわれた? (水中〜水面ですばやく上へ動かした瞬間)
      if (poi && d.poiHp > 0.25 && poi.y < d.waterY + 26 && poi.vy < -28) {
        const dd = Math.hypot(f.x - poi.x, f.y - poi.y);
        if (dd < poiR * 1.05) {
          f.caught = true;
          d.score++;
          ctx.sfx.splash(0.8);
          ctx.sfx.chime();
          ctx.fx.splashBurst(poi.x, d.waterY, 70, 'rgba(170,215,240,0.9)');
          ctx.fx.addText(poi.x, poi.y - 8, `+1 (${d.score}ひき)`, '#ffef9a');
          ctx.vibrate(30);
        }
      }
    }
    d.fish = d.fish.filter((f) => !f.done);
    // ときどき泡
    if (Math.random() < dt * 2) {
      ctx.fx.addBubble(rand(5, W - 5), rand(d.waterY + 10, H - 5), rand(0.4, 0.9));
    }
    ctx.progress(d.score / 5);
  },

  onTool(ctx, id) {
    if (id === 'newpoi') {
      ctx.data.poiHp = 1;
      ctx.data.poiUsed++;
      ctx.data.tornShown = false;
      ctx.toast(`🥤 ${ctx.data.poiUsed}まいめのポイ!しんちょうに…`);
    }
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    // 夏祭りの夜
    g.fillStyle = vgrad(g, 0, H, [[0, '#1b2456'], [0.5, '#2c3a74'], [1, '#1c2c58']]);
    g.fillRect(0, 0, W, H);
    // ちょうちん
    for (let i = 0; i < Math.ceil(W / 30); i++) {
      const x = 15 + i * 30, y = 9 + (i % 2) * 4;
      g.strokeStyle = 'rgba(120,90,60,0.8)'; g.lineWidth = 0.5;
      g.beginPath(); g.moveTo(x - 15, y - 7); g.lineTo(x + 15, y - 5); g.stroke();
      const grd = g.createRadialGradient(x, y, 1, x, y, 12);
      grd.addColorStop(0, 'rgba(255,190,90,0.6)');
      grd.addColorStop(1, 'rgba(255,190,90,0)');
      g.fillStyle = grd;
      g.beginPath(); g.arc(x, y, 12, 0, TAU); g.fill();
      g.fillStyle = '#ff5a4a';
      g.beginPath(); g.ellipse(x, y, 3.2, 4.2, 0, 0, TAU); g.fill();
      g.fillStyle = '#ffe8a0';
      g.beginPath(); g.ellipse(x, y, 1.6, 3.4, 0, 0, TAU); g.fill();
    }
    // 水槽のふち (木枠)
    g.fillStyle = '#8a5a34';
    rr(g, -2, d.waterY - 6, W + 4, 5, 2);
    g.fill();
    g.fillStyle = '#6d4426';
    g.fillRect(-2, d.waterY - 2, W + 4, 2);
    // 水槽の底
    g.fillStyle = '#345a8a';
    g.fillRect(0, d.waterY, W, H - d.waterY);
    g.fillStyle = 'rgba(255,255,255,0.06)';
    for (let x = 0; x < W; x += 9) {
      g.beginPath(); g.arc(x + 4, H - 3, 2.5, 0, TAU); g.fill();
    }
  },

  drawFront(ctx, g) {
    const d = ctx.data, p = ctx.primary;
    // 金魚
    for (const f of d.fish) {
      g.save();
      g.translate(f.x, f.y);
      g.rotate(f.ang + Math.PI); // 進行方向へ頭
      const sc = f.caught ? Math.max(0.3, 1 - f.flyT) : 1;
      g.scale(sc, sc);
      if (!f.caught && f.y > d.waterY) g.globalAlpha = 0.88;
      const wag = Math.sin(f.tailT) * 0.7;
      // 尾びれ
      g.fillStyle = f.col[0];
      g.beginPath();
      g.moveTo(f.size * 0.8, 0);
      g.quadraticCurveTo(f.size * 2.1, wag * f.size - f.size, f.size * 2.6, wag * f.size - f.size * 1.1);
      g.quadraticCurveTo(f.size * 2.0, wag * f.size, f.size * 2.6, wag * f.size + f.size * 1.1);
      g.quadraticCurveTo(f.size * 2.1, wag * f.size + f.size, f.size * 0.8, 0);
      g.fill();
      // 体
      g.fillStyle = f.col[0];
      g.beginPath();
      g.ellipse(0, 0, f.size * 1.4, f.size * 0.85, 0, 0, TAU);
      g.fill();
      g.fillStyle = f.col[1];
      g.beginPath();
      g.ellipse(-f.size * 0.2, f.size * 0.2, f.size * 0.8, f.size * 0.4, 0, 0, TAU);
      g.fill();
      // 目
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(-f.size * 0.85, -f.size * 0.25, f.size * 0.28, 0, TAU); g.fill();
      g.fillStyle = '#222';
      g.beginPath(); g.arc(-f.size * 0.9, -f.size * 0.25, f.size * 0.16, 0, TAU); g.fill();
      g.restore();
    }
    // お椀 (とった金魚)
    g.fillStyle = '#3a76c4';
    g.beginPath();
    g.moveTo(d.bowlX - 11, d.bowlY - 3);
    g.quadraticCurveTo(d.bowlX, d.bowlY + 9, d.bowlX + 11, d.bowlY - 3);
    g.closePath(); g.fill();
    g.fillStyle = 'rgba(160,210,240,0.85)';
    g.beginPath();
    g.ellipse(d.bowlX, d.bowlY - 3, 11, 2.6, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#fff';
    g.font = 'bold 5px sans-serif';
    g.textAlign = 'center';
    g.fillText(`×${d.score}`, d.bowlX, d.bowlY + 16);
    // ポイ
    const pp = p;
    if (pp) {
      g.save();
      g.translate(pp.x, pp.y);
      const torn = d.poiHp <= 0.25;
      // 紙
      if (!torn) {
        g.fillStyle = `rgba(255,255,255,${0.25 + d.poiHp * 0.5})`;
        g.beginPath(); g.arc(0, 0, 8.5, 0, TAU); g.fill();
      } else {
        g.fillStyle = 'rgba(255,255,255,0.3)';
        g.beginPath();
        g.arc(0, 0, 8.5, 0.6, TAU - 0.9);
        g.lineTo(2, 1);
        g.closePath(); g.fill();
      }
      // わく
      g.strokeStyle = '#e84a5a';
      g.lineWidth = 1.6;
      g.beginPath(); g.arc(0, 0, 8.5, 0, TAU); g.stroke();
      g.beginPath(); g.moveTo(7, 5); g.lineTo(15, 14); g.stroke();
      g.restore();
      // HPゲージ
      g.fillStyle = 'rgba(255,255,255,0.75)';
      rr(g, pp.x - 8, pp.y - 14.5, 16, 2.6, 1.3);
      g.fill();
      g.fillStyle = d.poiHp > 0.5 ? '#5ad06a' : (d.poiHp > 0.25 ? '#f0b840' : '#e84a3a');
      rr(g, pp.x - 7.4, pp.y - 14, Math.max(0.01, 14.8 * clamp(d.poiHp, 0, 1)), 1.6, 0.8);
      g.fill();
    }
  },
};
