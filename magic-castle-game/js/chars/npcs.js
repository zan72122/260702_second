// 住人 NPC:おさんぽ AI・ふきだし・なかよし度
import * as THREE from 'three';
import { buildNpcModel, animateAvatar } from './avatar.js';
import { NPCS, QUESTS } from '../game/data.js';
import { state, nextQuestFor, questState, questIsComplete } from '../game/state.js';
import { rand, TAU, lerpAngle, makeCanvas } from '../core/utils.js';

function emojiSprite(emoji, size = 0.9) {
  const tex = makeCanvas(96, 96, (ctx) => {
    ctx.font = '72px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 48, 54);
  });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.setScalar(size);
  return sp;
}

export class NpcManager {
  constructor(scene) {
    this.scene = scene;
    this.npcs = [];
    for (const def of NPCS) {
      const model = buildNpcModel(def);
      model.group.position.set(def.home.x, 0, def.home.z);
      scene.add(model.group);

      const bubble = emojiSprite('❗');
      bubble.position.y = 3.1;
      bubble.visible = false;
      model.group.add(bubble);

      const bubbleDone = emojiSprite('💖');
      bubbleDone.position.y = 3.1;
      bubbleDone.visible = false;
      model.group.add(bubbleDone);

      this.npcs.push({
        def, model, bubble, bubbleDone,
        yaw: rand(TAU),
        mode: 'idle',
        target: null,
        waitT: rand(1, 4),
        talking: false,
        t0: rand(100),
      });
    }
  }

  // クエストの!マーク更新
  refreshBubbles() {
    for (const n of this.npcs) {
      // 報告できるクエストがある?
      const reportable = state.activeQuests.some((aq) => {
        const q = QUESTS.find((x) => x.id === aq.id);
        return q && q.npc === n.def.id && questIsComplete(aq);
      });
      const offerable = !!nextQuestFor(n.def.id, QUESTS);
      n.bubbleDone.visible = reportable;
      n.bubble.visible = !reportable && offerable;
    }
  }

  update(dt, t, playerPos) {
    for (const n of this.npcs) {
      const g = n.model.group;
      if (n.talking) {
        // プレイヤーの方を向く
        const a = Math.atan2(playerPos.x - g.position.x, playerPos.z - g.position.z);
        n.yaw = lerpAngle(n.yaw, a, Math.min(1, dt * 8));
        g.rotation.y = n.yaw;
        animateAvatar(n.model.refs, dt, t + n.t0, 'wave');
        continue;
      }

      // おさんぽ AI
      if (n.target) {
        const dx = n.target.x - g.position.x;
        const dz = n.target.z - g.position.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.3) {
          n.target = null;
          n.waitT = rand(2, 6);
          n.mode = 'idle';
        } else {
          const sp = 1.4;
          g.position.x += (dx / d) * sp * dt;
          g.position.z += (dz / d) * sp * dt;
          n.yaw = lerpAngle(n.yaw, Math.atan2(dx, dz), Math.min(1, dt * 6));
          n.mode = 'walk';
        }
      } else {
        n.waitT -= dt;
        if (n.waitT <= 0) {
          const a = rand(TAU);
          const r = rand(0.5, n.def.wander);
          n.target = {
            x: n.def.home.x + Math.cos(a) * r,
            z: n.def.home.z + Math.sin(a) * r,
          };
        }
      }
      g.rotation.y = n.yaw;
      animateAvatar(n.model.refs, dt, t + n.t0, n.mode, 0.6);
      // ふきだしぷかぷか
      const bob = Math.sin(t * 3 + n.t0) * 0.12;
      n.bubble.position.y = 3.1 + bob;
      n.bubbleDone.position.y = 3.1 + bob;
    }
  }
}
