// 会話 & おねがい進行
import { QUESTS, questById, npcById } from './data.js';
import {
  state, questState, questIsComplete, acceptQuest, completeQuest,
  nextQuestFor, addHeart, questProgress,
} from './state.js';
import { ui } from '../ui/ui.js';
import { audio } from '../core/audio.js';
import { pick } from '../core/utils.js';

// NPC と話す(メインフロー)
export async function talkTo(npcEntry, G) {
  const def = npcEntry.def;
  const name = `${def.icon} ${def.name}・${def.title}`;

  npcEntry.talking = true;
  G.player.lockMove = true;
  G.player.mode = 'idle';
  audio.sfx('talk');

  try {
    // 1) 報告できるおねがい
    const reportable = state.activeQuests.find((aq) => {
      const q = questById(aq.id);
      return q && q.npc === def.id && questIsComplete(aq);
    });
    if (reportable) {
      const q = questById(reportable.id);
      await ui.showDialog(name, [
        pick(['わぁ! ありがとう!!', 'すごい! やってくれたのね!', 'かんぺきだケロ!…おっと くちぐせが']),
        `「${q.name}」 だいせいこう!`,
      ]);
      completeQuest(q.id);
      audio.sfx('fanfare');
      G.particles.confetti(G.player.pos.clone(), 40);
      G.particles.hearts(npcEntry.model.group.position.clone(), 10);
      let rewardText = `🪙 ${q.reward.coins} / 💖 ${q.reward.happy}`;
      if (q.reward.item) {
        const info = (await import('./data.js')).itemInfo(q.reward.item.id);
        rewardText += ` / ${info?.icon || ''}${info?.name || ''} ×${q.reward.item.n}`;
      }
      await ui.showResult('🎉 おねがい たっせい!', `<b>${q.name}</b><br><br>ごほうび:<br>${rewardText}`);
      questProgress('talk'); // 会話系クエストにもカウント
      return;
    }

    // 2) 新しいおねがい
    const next = nextQuestFor(def.id, QUESTS);
    if (next) {
      const choice = await ui.showChoices(name, next.lines[0], ['✨ ひきうける!', 'また こんどね']);
      if (choice === 0) {
        acceptQuest(next.id);
        audio.sfx('pop');
        await ui.showDialog(name, [next.lines[1] || 'たのんだよ!', `📜「${next.name}」を ひきうけた!`]);
        ui.toast(`📜 おねがい「${next.name}」スタート!`);
      } else {
        await ui.showDialog(name, ['そっか〜。きが むいたら おねがいね!']);
      }
      questProgress('talk');
      return;
    }

    // 3) ふつうのあいさつ
    await ui.showDialog(name, [pick(def.greetings)]);
    questProgress('talk');

    // なかよしハートのチャンス
    if (Math.random() < 0.4) {
      addHeart(def.id, 1);
      audio.sfx('heart');
      G.particles.hearts(npcEntry.model.group.position.clone(), 6);
    }

    // 4) キャラ別のおさそい
    if (def.id === 'felix') {
      const c = await ui.showChoices(name, 'ステージで いっしょに おどるかにゃ?', ['💃 おどる!', 'またこんど']);
      if (c === 0) G.startDance();
    }
    if (def.id === 'popo') {
      const c = await ui.showChoices(name, 'つりを していくケロ?', ['🎣 つりをする!', 'またこんど']);
      if (c === 0) G.startFishing();
    }
  } finally {
    npcEntry.talking = false;
    G.player.lockMove = false;
    G.npcs.refreshBubbles();
    ui.updateQuestTracker();
  }
}

export function heartsOf(npcId) {
  return state.hearts[npcId] || 0;
}
void npcById;
