// カメラ映像とワールド座標の対応づけ
// - セルフィーミラー (左右反転): 手を右に動かすと画面でも右に動く
// - cover フィット: 映像をステージ全面にトリミング表示
// 重要: ランドマークの変換と映像の描画に「同じ」変換を使うことで、
// 画面に映る手と当たり判定がピクセル単位で一致する。

export class Mapper {
  constructor() {
    this.vw = 640; this.vh = 480;   // 映像サイズ (px)
    this.W = 100; this.H = 160;     // ワールドサイズ (短辺=100)
    this.sx0 = 0; this.sy0 = 0;     // トリミング原点 (映像px)
    this.sw = 640; this.sh = 480;   // トリミングサイズ (映像px)
  }

  update(videoW, videoH, W, H) {
    if (videoW) { this.vw = videoW; this.vh = videoH; }
    this.W = W; this.H = H;
    const videoAR = this.vw / this.vh;
    const stageAR = W / H;
    if (videoAR > stageAR) {
      // 映像が横長 → 左右をトリミング
      this.sh = this.vh;
      this.sw = this.vh * stageAR;
      this.sx0 = (this.vw - this.sw) / 2;
      this.sy0 = 0;
    } else {
      // 映像が縦長 → 上下をトリミング
      this.sw = this.vw;
      this.sh = this.vw / stageAR;
      this.sx0 = 0;
      this.sy0 = (this.vh - this.sh) / 2;
    }
  }

  // 正規化ランドマーク (0..1, 映像フレーム系) → ワールド座標 (ミラー込み)
  toWorld(nx, ny, out) {
    const px = nx * this.vw, py = ny * this.vh;
    const wx = this.W - ((px - this.sx0) / this.sw) * this.W; // ミラー
    const wy = ((py - this.sy0) / this.sh) * this.H;
    out[0] = wx; out[1] = wy;
    return out;
  }

  // Float32Array(42) をまとめて変換
  mapAll(norm, outWorld) {
    for (let i = 0; i < 21; i++) {
      const px = norm[i * 2] * this.vw, py = norm[i * 2 + 1] * this.vh;
      outWorld[i * 2] = this.W - ((px - this.sx0) / this.sw) * this.W;
      outWorld[i * 2 + 1] = ((py - this.sy0) / this.sh) * this.H;
    }
    return outWorld;
  }

  // 背景キャンバスに映像をミラー + cover で描く
  // g はワールド座標系に変換済みの ctx
  drawVideo(g, video) {
    g.save();
    g.translate(this.W, 0);
    g.scale(-1, 1);
    g.drawImage(video, this.sx0, this.sy0, this.sw, this.sh, 0, 0, this.W, this.H);
    g.restore();
  }
}
