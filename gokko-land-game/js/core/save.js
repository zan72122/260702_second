// セーブデータ(localStorage)
const KEY = 'gokko-town-save-v1';

export const defaultState = () => ({
  coins: 30,
  // ゲームごとの最高スター数(0=未クリア)
  stamps: { cake: 0, sushi: 0, delivery: 0, fire: 0, register: 0 },
  hats: ['none'],
  equippedHat: 'none',
  sound: true,
});

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const data = JSON.parse(raw);
    return { ...defaultState(), ...data, stamps: { ...defaultState().stamps, ...(data.stamps || {}) } };
  } catch {
    return defaultState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch { /* プライベートブラウズ等では保存できなくてもよい */ }
}
