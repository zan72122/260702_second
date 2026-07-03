# やわらかラボ 〜ぷにぷに素材あそび〜 : Architecture & Contracts

Target: iPhone/iPad Safari (portrait & landscape), age 4. No text UI, no score, no goals.
Pure static site: plain `<script>` tags (NO ES modules, NO build). Global namespace `window.YL`.

## Load order (index.html)

```
js/engine/utils.js    -> YL.U          (helpers: clamp, lerp, dist, rand, hsl/rgb, smoothstep)
js/engine/field.js    -> YL.Field      (density grid + marching squares contours)   [CORE, Fable]
js/engine/sim.js      -> YL.Sim        (particles/bonds soft-body solver)           [CORE, Fable]
js/engine/render.js   -> YL.Render     (material rendering: goo fill, gloss, shadow)[CORE, Fable]
js/engine/input.js    -> YL.Input      (pointer -> fingers map)                     [CORE, Fable]
js/engine/fx.js       -> YL.FX         (decorative particles: sparkle/steam/crumbs) [agent: sonnet]
js/audio/sound.js     -> YL.Sound      (procedural WebAudio, no assets)             [agent: opus]
js/game/materials.js  -> YL.MATERIALS  (12 material definitions)                    [agent: opus]
js/game/tools.js      -> YL.Tools      (heat/cold/cutter/color/topping logic)       [agent: opus]
js/game/icons.js      -> YL.Icons      (SVG icon factory for UI)                    [agent: sonnet]
js/game/ui.js         -> YL.UI         (DOM trays, pickers)                         [agent: sonnet]
js/main.js            -> boot + loop                                                [CORE, Fable]
```

## Coordinate system

All logic in CSS pixels. Canvases scaled by devicePixelRatio internally.
Stage = full window. Play area = stage minus UI safe margins (sim.bounds = {x,y,w,h}).

## DOM contract (index.html provides)

```
#stage            (position:fixed, inset:0)
  canvas#bg       (background: table, drawn rarely)
  canvas#play     (material body, every frame)
  canvas#fx       (fx + tool ghosts + stickers overlays, every frame)
#ui               (DOM UI layer, pointer-events routed per element)
```

## Sim API (YL.Sim) — implemented by Fable, DO NOT reimplement

```js
sim = new YL.Sim();
sim.setBounds({x,y,w,h});
sim.setMaterial(matDef, {fresh:true})  // clears & spawns new lump (boing-in)
sim.spawnLump(x, y, radius, colorOverride|null) // extra lump of current material
sim.particles : Particle[]   // flat array (all same material)
sim.bonds     : Bond[]
sim.stickers  : Sticker[]    // {type:'star'|'heart'|'flower'|'eye', p:Particle, dx,dy, rot, s}
sim.step(dt, fingers)        // fingers: iterable of Finger
sim.stampCut(pts,cx,cy,scale)// pts=[[x,y]..] closed polygon (unit ~ -1..1) -> cuts bonds crossing
sim.injectColor(x,y,rgb)     // tints nearby particles + small color lump
sim.addHeat(x,y,r,amount)    // amount +hot / -cold, per-second rate
sim.popAt(x,y,r)             // foam pop: removes up to few particles, returns count
sim.events    : []           // drained each frame by main: {t:'tear'|'rebond'|'crack'|'pop', x,y, v}
sim.stats     : {press, stretch, jiggle, knead, heat, size}  // 0..1 aggregates for audio
```

`Particle = {x,y,px,py, r, h(0..1 height), col:[r,g,b 0..255], temp(-1..1), air(0..1), bake(0..1), wet(0..1)}`
`Finger = {id, x,y, px,py, down, justDown, justUp, mode}` — mode 'hand' by default; tools may set
'heat'|'cold'|'none' (none = sim ignores it physically).

## Material definition schema (materials.js exports YL.MATERIALS = [ ...12 ])

```js
{
  id:'slime', emoji:'🫧', name:'スライム',        // name only for README/aria-label
  ui:{ base:'#7ee787', accent:'#a5f3b8' },        // picker button colors
  palette:[[r,g,b],...],                          // 2-4 spawn colors (particles vary slightly)
  spacing:15, pr:9.5,                             // particle grid spacing / physics radius
  lumpR:88,                                       // spawn lump radius (css px)
  stiff:0.5,        // 0..1 bond stiffness per iteration
  damp:0.12,        // velocity damping 0..0.5 (LOW = jiggly/wobbly)
  plastic:{ yield:0.25, rate:0.18 },  // strain beyond yield flows into rest length (clay=high rate)
  breakStrain:2.2,  // bond breaks at len > rest*breakStrain (mochi high, cookie low)
  rebond:{ dist:1.15, rate:0.5 },     // re-bonding when closer than dist*restSpacing (sand=1, fast)
  memory:0.0,       // 0..1 rest-length pull back to original spacing (elastic snap-back: mochi/jelly)
  spread:0.0,       // 0..1 slow outward flow on table (slime puddles)
  restH:0.75,       // resting pseudo-height
  hRecover:0.5,     // dent recovery speed per second (bread slow-recover=0.15)
  mixRate:0.06,     // color diffusion across bonds (kneading mixes)
  frictionHeat:0.0, // rubbing warms (chocolate!)
  thermal(p, mat, dt) {},  // OPTIONAL per-particle hook: use p.temp to mutate p.bake/p.air/p.col…
                           //   and may return {stiffMul, breakMul, plasticMul} for that particle
  gloss:0.6,        // 0 matte .. 1 wet-shiny (render)
  texture:'smooth'|'grain'|'dust'|'crumb'|'bubbly'|'fluff', // render surface style
  outline:'#3f7d4f',// cartoon outline color (darker than body)
  soundId:'slime',  // sound profile key for YL.Sound
  feel:'ぷるぷる',   // README word
  special:{}        // optional flags: {popAir:true}(foam), {pipe:true}(cream extrudes on empty drag),
                    //   {crumbly:true}(sand/cookie), {rises:true}(bread idle-puffs when warm)
}
```

The 12 materials (ids fixed — UI & sounds key off these):
`nendo`(ねんど/clay) `slime` `mochi` `pan`(パン生地) `purin` `cream`(ホイップ) `choco`
`cookie`(クッキー生地) `jelly`(ゼリー) `mallow`(マシュマロ) `sand`(すなねんど) `awa`(あわ/foam)

Feel targets: nendo=むにゅ(plastic, keeps shape), slime=ねばねば(flows/puddles, near-unbreakable),
mochi=びよーん(huge stretch, slow snap-back, dusty), pan=ふわ(slow dent recovery, rises when warm),
purin=ぷるんぷるん(max jiggle, caramel top), cream=ふわふわ(soft, pipes, slowly slumps),
choco=温度で溶け固まる(rub to melt! cold=snappy cracks), cookie=ぽろぽろ(crumbles, bakes crisp),
jelly=ぷるん+clean tear(translucent), mallow=もふっ(springy, toasts), sand=さらさら固まる
(pack by pressing / crumble by pulling), awa=しゅわしゅわ(pops on poke, regrows).

## Tools API (tools.js)

```js
YL.Tools.list = [ {id:'hand',...},{id:'cutter'},{id:'heat'},{id:'cold'},{id:'color'},{id:'topping'} ]
YL.Tools.state = { tool:'hand', sub:0 }   // sub = cutter shape idx / color idx / topping idx
YL.Tools.setTool(id, sub)
YL.Tools.update(sim, fingers, dt)  // implements: heat/cold emission (sim.addHeat), color taps
                                   // (sim.injectColor), topping taps (push sim.stickers), cutter
                                   // press-follow + stamp on release (sim.stampCut), cream piping
                                   // when material.special.pipe && drag on empty space (sim.spawnLump small)
YL.Tools.drawGhost(ctx)            // cutter shape ghost / heat glow ring under active finger
YL.Tools.SHAPES  = [star, heart, flower, circle]  // each = [[x,y]...] unit polygons (closed)
YL.Tools.COLORS  = 6 kid colors [[r,g,b]...]
YL.Tools.TOPPINGS= ['star','heart','flower','eye']  // 'eye' = googly eyes (pairs auto-placed)
```

## Sound API (sound.js) — procedural only, zero assets, must start muted-safe (unlock on first touch)

```js
YL.Sound.init()                 // lazy AudioContext, resume on first pointerdown (iOS)
YL.Sound.setEnabled(b) / .enabled
YL.Sound.setMaterial(matId)     // switch continuous voice profile
YL.Sound.frame(stats, dt)       // stats = sim.stats {press,stretch,jiggle,knead,heat,size} 0..1
                                //   -> continuous squish/stretch layers (LPF noise, pitch glides)
YL.Sound.event(name, o={})      // 'tear','pop','cut','spawn','sprinkle','crack','switch','tool',
                                //   'rebond','uiTap'  (o.v = 0..1 intensity)
```
Design: soft, rounded, quiet, NEVER startling. Per-material timbres (mochi=deep sine bend,
slime=wet noise squelch, sand=granular hiss, awa=tiny pops, purin=boingy wobble sine,
choco cold=woody snap). Master limiter + gentle lowpass. No music loop (or ultra-soft option).

## FX API (fx.js) — draws on #fx canvas ctx (already dpr-scaled)

```js
YL.FX.emit(name, {x,y,n,col,...}) // 'sparkle','steam','frost','flour','crumb','pop','cutflash',
                                  // 'heart','ring','drop'
YL.FX.update(dt); YL.FX.draw(ctx)
```
Style: soft pastel, additive-ish, short-lived (<1.2s), 60fps-cheap (pooled, max ~300).

## UI (ui.js + icons.js)

- `YL.UI.init({ onMaterial(id), onTool(id,sub), onReset(), onSound(b) })`
- Builds into `#ui`: material tray (12 round buttons, 64px+, horizontal scroll bottom edge),
  tool tray (right edge portrait-bottom-right cluster / landscape right column), reset & sound.
- Selected states: big bouncy scale. NO TEXT LABELS (aria-label ok). Icons from YL.Icons.
- Sub-tray: picking cutter/color/topping reveals 4-6 sub buttons near the tool tray.
- `YL.Icons.make(kind, opts) -> SVGElement` kinds: each material id (mini blob with face),
  'hand','cutter','heat','cold','color','topping','reset','soundOn','soundOff', shape/color/topping subs.
- Everything rounded, cream-paper background palette (#fff7ea table), joyful but not garish.

## main.js loop (Fable)

fixed-dt substeps; order: input → Tools.update → sim.step → render body → stickers → Tools.drawGhost
→ FX → Sound.frame + drain sim.events→Sound/FX. Resize handling, orientation, visibility pause.

## Kid-UX rules (all agents)

- Touch targets ≥ 56px. Immediate response < 1 frame. Nothing modal, nothing blocking, no text.
- Wrong actions impossible: any touch does something pleasant.
- Change is continuous: no instant teleports; everything eases/springs.
