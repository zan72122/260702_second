// localStorage セーブ / ロード
const KEY = 'magic-castle-save-v1';

export function saveGame(state) {
  try {
    const data = {
      coins: state.coins,
      happiness: state.happiness,
      hearts: state.hearts,
      inventory: state.inventory,
      owned: state.owned,
      equipped: state.equipped,
      collections: state.collections,
      questsDone: state.questsDone,
      activeQuests: state.activeQuests.map((q) => ({ id: q.id, prog: q.prog })),
      garden: state.garden,
      playerName: state.playerName,
      tutorialDone: state.tutorialDone,
      sound: state.sound,
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn('save failed', e);
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('load failed', e);
    return null;
  }
}

export function hasSave() {
  return !!localStorage.getItem(KEY);
}
