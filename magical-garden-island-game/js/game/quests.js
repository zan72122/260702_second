// クエスト(ようせいルミのおねがい)
// type: stat=統計が増えたら / bloomType=特定の花を咲かせる / level=レベル到達
export const QUESTS = [
  {
    title: 'チューリップのたねを うえよう',
    intro: 'ようこそ、まほうの花の島へ! わたしは ようせいのルミ。まずは 花だんをタップして チューリップのたねを うえてみて!',
    type: 'stat', stat: 'planted', count: 1,
    reward: { sparkles: 20 },
    outro: 'じょうずにできたね! たねは じかんがたつと そだつよ。',
  },
  {
    title: 'まほうのじょうろで みずやりしよう',
    intro: 'めがでている花だんをタップすると まほうのみずやりができるの。みずをあげると ぐんぐんそだつよ!',
    type: 'stat', stat: 'watered', count: 1,
    reward: { sparkles: 20, seeds: { tulip: 1 } },
    outro: 'キラキラのおみず、きもちいいね〜!',
  },
  {
    title: '花を 1りん さかせよう',
    intro: 'おせわをつづけて 花をさかせてみて! みずやりをすると はやくさくよ。',
    type: 'stat', stat: 'bloomed', count: 1,
    reward: { sparkles: 30 },
    outro: 'わあ! きれいにさいたね!',
  },
  {
    title: 'さいた花を しゅうかくしよう',
    intro: 'まんかいの花をタップすると キラキラがあつまるよ。「!」マークがめじるし!',
    type: 'stat', stat: 'harvested', count: 1,
    reward: { sparkles: 30, petals: 3 },
    outro: 'キラキラは おかいものに つかえるよ!',
  },
  {
    title: 'ショップで たねを かおう',
    intro: 'みぎの 🛍️ ボタンから ショップがひらけるよ。すきなたねを かってみて!',
    type: 'stat', stat: 'seedsBought', count: 1,
    reward: { sparkles: 40 },
    outro: 'おかいもの じょうず!',
  },
  {
    title: '花を 3りん さかせよう',
    intro: 'たくさんの花で 島をかざろう! ぜんぶで3りん さかせてみて。',
    type: 'stat', stat: 'bloomed', count: 3,
    reward: { sparkles: 50, seeds: { daisy: 2 } },
    outro: '島が はなやかに なってきたね!',
  },
  {
    title: 'ちょうちょを つかまえよう',
    intro: '花がさくと ちょうちょが あそびにくるよ。ちかづいて タップしてみて!',
    type: 'stat', stat: 'butterflies', count: 1,
    reward: { sparkles: 50, petals: 5 },
    outro: 'つかまえた! ずかんに とうろくされたよ。',
  },
  {
    title: 'ドレスを きがえよう',
    intro: '👗 ボタンで きせかえができるの。あたらしいドレスは ショップでかえるよ。きがえてみて!',
    type: 'stat', stat: 'dressChanged', count: 1,
    reward: { sparkles: 60 },
    outro: 'とっても にあってる!',
  },
  {
    title: 'かざりを おいてみよう',
    intro: '🪄 ボタンから 島にかざりをおけるよ。ベンチやランタンで すてきにしよう!',
    type: 'stat', stat: 'decorPlaced', count: 1,
    reward: { sparkles: 60, petals: 5 },
    outro: 'センスばつぐん! 島がかわいくなったね。',
  },
  {
    title: 'ガーデンレベル 3 をめざそう',
    intro: '花をさかせると ガーデンレベルがあがるよ。レベル3になると… にじのはしのむこうに ひみつのにわが!',
    type: 'level', count: 3,
    reward: { sparkles: 100, seeds: { rose: 2 } },
    outro: 'にじのはしが かかったよ! ひみつのにわへ いってみよう!',
  },
  {
    title: 'バラを 2りん さかせよう',
    intro: 'プリンセスといえば バラ! まっかなバラを さかせてみて。',
    type: 'bloomType', flower: 'rose', count: 2,
    reward: { sparkles: 120, petals: 10 },
    outro: 'バラのかおりが 島いっぱいに ひろがるね!',
  },
  {
    title: 'よるの島を たんけんしよう',
    intro: 'よるになると ホタルがとんで ランタンがひかるの。よるに ちょうちょか花を みつけてみて! (よるまで まってね)',
    type: 'night',
    reward: { sparkles: 100, seeds: { bellflower: 1 } },
    outro: 'よるの島も ロマンチックだね〜!',
  },
  {
    title: '花を 15りん さかせよう',
    intro: '島じゅうを 花でいっぱいに しちゃおう!',
    type: 'stat', stat: 'bloomed', count: 15,
    reward: { sparkles: 200, petals: 15 },
    outro: 'ここまでくれば りっぱなガーデナー!',
  },
  {
    title: 'かざりを 5こ おこう',
    intro: 'かざりをふやして じぶんだけの お庭にしよう!',
    type: 'stat', stat: 'decorPlaced', count: 5,
    reward: { sparkles: 250, petals: 10 },
    outro: 'まるで おとぎばなしの お庭みたい!',
  },
  {
    title: 'ガーデンレベル 6 をめざそう',
    intro: 'レベル6で スターフラワーと ユニコーンぞうが かえるようになるよ!',
    type: 'level', count: 6,
    reward: { sparkles: 300, seeds: { starflower: 1 } },
    outro: 'ほしのちからが 島にあつまってきた…!',
  },
  {
    title: 'ムーンフラワーを さかせよう',
    intro: 'よるにだけさく ふしぎな花。レベル7でたねがかえるよ。よるのあいだに みずやりすると いいかも!',
    type: 'bloomType', flower: 'moonflower', count: 1,
    reward: { sparkles: 400, petals: 20 },
    outro: 'つきのひかりみたいに きれい…!',
  },
  {
    title: 'レインボーローズを さかせよう',
    intro: 'でんせつの花 レインボーローズ! さかせたら 島のまほうが かんぜんに よみがえるよ!',
    type: 'bloomType', flower: 'rainbowrose', count: 1,
    reward: { sparkles: 800, petals: 30 },
    outro: 'ありがとう、プリンセス! 島のまほうが よみがえったよ! これからも いっしょに すてきなガーデンを つくろうね!',
  },
];

export class QuestSystem {
  constructor(state) {
    this.state = state;
    this.completedPending = false;
  }

  get current() {
    return QUESTS[this.state.data.questIndex] || null;
  }

  get index() { return this.state.data.questIndex; }

  // 進行度 (0..count)
  progressOf(q) {
    if (!q) return 0;
    const d = this.state.data;
    switch (q.type) {
      case 'stat': {
        const base = d.flags[`qbase_${d.questIndex}_${q.stat}`] || 0;
        return Math.min(q.count, (d.stats[q.stat] || 0) - base);
      }
      case 'bloomType':
        return Math.min(q.count, d.flags[`qbloom_${d.questIndex}`] || 0);
      case 'level':
        return Math.min(q.count, this.state.level);
      case 'night':
        return d.flags[`qnight_${d.questIndex}`] ? 1 : 0;
      default:
        return 0;
    }
  }

  countOf(q) { return q.type === 'night' ? 1 : q.count; }

  isComplete() {
    const q = this.current;
    return q && this.progressOf(q) >= this.countOf(q);
  }

  // クエスト開始時に基準値を記録(stat 型)
  ensureBase() {
    const q = this.current;
    if (!q) return;
    const d = this.state.data;
    if (q.type === 'stat') {
      const key = `qbase_${d.questIndex}_${q.stat}`;
      if (d.flags[key] === undefined) {
        // すでに達成済みの分はカウントしない(ただし最初のチュートリアルは除く)
        d.flags[key] = Math.max(0, (d.stats[q.stat] || 0) - (this.progressPreserve || 0));
      }
    }
  }

  // 花が咲いたときに呼ぶ
  notifyBloom(type) {
    const q = this.current;
    const d = this.state.data;
    if (q?.type === 'bloomType' && q.flower === type) {
      const key = `qbloom_${d.questIndex}`;
      d.flags[key] = (d.flags[key] || 0) + 1;
    }
  }

  // 夜イベント(夜にちょうちょ捕獲 or 収穫)
  notifyNightAction() {
    const q = this.current;
    if (q?.type === 'night') {
      this.state.data.flags[`qnight_${this.state.data.questIndex}`] = true;
    }
  }

  // 完了処理 → 報酬を付与して true
  claim() {
    const q = this.current;
    if (!q || !this.isComplete()) return null;
    const r = q.reward || {};
    if (r.sparkles) this.state.addSparkles(r.sparkles);
    if (r.petals) this.state.addPetals(r.petals);
    if (r.seeds) Object.entries(r.seeds).forEach(([t, n]) => this.state.addSeed(t, n));
    this.state.data.questIndex++;
    this.ensureBase();
    this.state.save();
    return q;
  }

  rewardText(q) {
    const r = q.reward || {};
    const parts = [];
    if (r.sparkles) parts.push(`✨${r.sparkles}`);
    if (r.petals) parts.push(`🌸${r.petals}`);
    if (r.seeds) parts.push(...Object.entries(r.seeds).map(([t, n]) => `たね×${n}`));
    return parts.join(' ');
  }
}
