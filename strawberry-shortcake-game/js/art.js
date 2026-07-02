/* ================================================================
   art.js — SVG art factory
   Every visual element is hand-drawn SVG cloned from the reference
   mockups: chibi chef girl, bunny & chick mascots, strawberries,
   bowls, cakes, the pink kitchen, candy lettering accents…
   ================================================================ */

let _uid = 0;
export const uid = (p = "u") => `${p}${++_uid}`;

/* ---------------------------------------------------------------
   Shared little pieces
--------------------------------------------------------------- */

export function sparkle(x, y, s, color = "#fff") {
  return `<path d="M${x} ${y - s} Q${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y} Q${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s} Q${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y} Q${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s}Z" fill="${color}"/>`;
}

export function heart(x, y, s, fill = "#f06292", stroke = "") {
  const st = stroke ? ` stroke="${stroke}" stroke-width="${s * 0.16}"` : "";
  return `<path d="M${x} ${y + s * 0.9} C${x - s * 1.24} ${y - s * 0.1} ${x - s * 0.62} ${y - s} ${x} ${y - s * 0.36} C${x + s * 0.62} ${y - s} ${x + s * 1.24} ${y - s * 0.1} ${x} ${y + s * 0.9}Z" fill="${fill}"${st}/>`;
}

export function star(x, y, r, fill = "#ffd54f", stroke = "#f5b731") {
  let pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.48;
    pts.push(`${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(" ")}" fill="${fill}" stroke="${stroke}" stroke-width="${r * 0.14}" stroke-linejoin="round"/>`;
}

/* glossy star with face-ish highlight, like the せいせき icon */
export function glossyStar(size = 42) {
  return `<svg viewBox="0 0 60 60" width="${size}" height="${size}">
    ${star(30, 32, 24, "#ffd94f", "#fff")}
    ${star(30, 32, 24, "url(#gs${_uid})", "none")}
    <defs><linearGradient id="gs${++_uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe98a"/><stop offset="1" stop-color="#f7b32b"/>
    </linearGradient></defs>
    ${star(30, 32, 24, `url(#gs${_uid})`, "#fff")}
    <ellipse cx="24" cy="22" rx="8" ry="5" fill="#fff8d9" opacity=".85"/>
  </svg>`;
}

export function glossyHeart(size = 42, color1 = "#ff8ab5", color2 = "#ee4d86") {
  const id = uid("gh");
  return `<svg viewBox="0 0 60 60" width="${size}" height="${size}">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${color1}"/><stop offset="1" stop-color="${color2}"/>
    </linearGradient></defs>
    ${heart(30, 30, 22, `url(#${id})`, "#fff")}
    <ellipse cx="23" cy="21" rx="7" ry="4.5" fill="#ffd3e4" opacity=".9" transform="rotate(-18 23 21)"/>
  </svg>`;
}

export function bookIcon(size = 42) {
  return `<svg viewBox="0 0 60 60" width="${size}" height="${size}">
    <rect x="10" y="8" width="40" height="46" rx="7" fill="#ec6f9f" stroke="#fff" stroke-width="3"/>
    <rect x="16" y="8" width="34" height="46" rx="6" fill="#f78ab4"/>
    <rect x="10" y="8" width="9" height="46" rx="4.5" fill="#d94f83"/>
    <rect x="22" y="18" width="22" height="24" rx="5" fill="#fff" opacity=".92"/>
    <path d="M22 18 h22 v24 h-22z" fill="none" stroke="#f4b8ce" stroke-width="2" stroke-dasharray="3 3" transform="translate(0,0) scale(.92) translate(2,2)"/>
    ${heart(33, 30, 7, "#ee5d90")}
  </svg>`;
}

export function gearIcon() {
  let teeth = "";
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    teeth += `<rect x="-4" y="-17" width="8" height="9" rx="3" fill="currentColor" transform="rotate(${(a * 180) / Math.PI} 0 0) translate(0 0)" transform-origin="0 0"/>`;
  }
  return `<svg viewBox="-20 -20 40 40" width="30" height="30">
    <g>${Array.from({ length: 8 }, (_, i) => `<rect x="-3.6" y="-18" width="7.2" height="8" rx="3" fill="currentColor" transform="rotate(${i * 45})"/>`).join("")}</g>
    <circle r="12.5" fill="currentColor"/>
    <circle r="5.5" fill="#e8508c"/>
  </svg>`;
}

export function cakeSliceBadge() {
  return `<svg viewBox="0 0 60 60" width="42" height="42">
    <path d="M8 34 L52 34 L50 48 Q30 54 10 48 Z" fill="#fff3f6" stroke="#e8a5bf" stroke-width="2"/>
    <path d="M8 34 Q30 26 52 34 L52 38 Q30 31 8 38Z" fill="#f9e2a8"/>
    <path d="M9 40 Q30 33 51 40 L51 44 Q30 37 9 44Z" fill="#fff"/>
    <path d="M10 45 Q30 39 50 45 L50 48 Q30 53 10 48Z" fill="#f9e2a8"/>
    <path d="M14 33 Q17 26 22 31 Q26 25 30 30 Q34 25 38 31 Q43 26 46 33" fill="#fff" stroke="#f3d9e2" stroke-width="1"/>
    <ellipse cx="30" cy="26" rx="7" ry="8" fill="#e53946"/>
    <path d="M30 18 l-3 4 h6z" fill="#58b368"/>
    <circle cx="27" cy="24" r="1" fill="#ffd2d2"/><circle cx="32" cy="27" r="1" fill="#ffd2d2"/><circle cx="29" cy="30" r="1" fill="#ffd2d2"/>
  </svg>`;
}

/* ---------------------------------------------------------------
   Lace trim — white scallop border like the mockups' edges
--------------------------------------------------------------- */
export function laceTrim() {
  let scallops = "";
  for (let x = 0; x <= 390; x += 26) {
    scallops += `<circle cx="${x + 13}" cy="10" r="13" fill="#fff"/>`;
  }
  let dots = "";
  for (let x = 13; x <= 390; x += 26) {
    dots += `<circle cx="${x}" cy="14" r="2.2" fill="#f8bbd0"/>`;
  }
  return `<svg viewBox="0 0 390 26" width="100%" height="100%" preserveAspectRatio="none">
    <rect x="0" y="0" width="390" height="10" fill="#fff"/>
    ${scallops}${dots}
  </svg>`;
}

/* ---------------------------------------------------------------
   Kitchen backdrop — pink tile wall, window, shelf with jars,
   curtains, counter + gingham tablecloth. One SVG, reused.
--------------------------------------------------------------- */
export function kitchenBackdrop() {
  const g = uid("kb");
  let tiles = "";
  for (let y = 0; y < 420; y += 42) {
    for (let x = -21; x < 400; x += 42) {
      const off = (y / 42) % 2 === 0 ? 0 : 21;
      tiles += `<rect x="${x + off}" y="${y}" width="40" height="40" rx="6" fill="#fbd3e2"/>`;
    }
  }
  let jars = "";
  const jarColors = ["#f9c8da", "#fce7ba", "#f9c8da"];
  for (let i = 0; i < 3; i++) {
    const jx = 300 + i * 30;
    jars += `
      <rect x="${jx}" y="196" width="24" height="32" rx="8" fill="${jarColors[i]}" stroke="#e8a5bf" stroke-width="1.5"/>
      <rect x="${jx + 3}" y="192" width="18" height="8" rx="3" fill="#e78daf"/>
      ${heart(jx + 12, 212, 5, "#fff", "")}`;
  }
  let utensils = "";
  const ux = [330, 350, 370];
  const shapes = [
    `<rect x="-2.5" y="0" width="5" height="34" rx="2.5" fill="#c98d5f"/><ellipse cx="0" cy="40" rx="8" ry="10" fill="#d9a06f"/>`,
    `<rect x="-2.5" y="0" width="5" height="34" rx="2.5" fill="#c98d5f"/><path d="M-8 34 h16 v12 q0 4 -4 4 h-8 q-4 0 -4 -4z" fill="#d9a06f"/><line x1="-4" y1="38" x2="-4" y2="46" stroke="#c08050" stroke-width="2"/><line x1="0" y1="38" x2="0" y2="48" stroke="#c08050" stroke-width="2"/><line x1="4" y1="38" x2="4" y2="46" stroke="#c08050" stroke-width="2"/>`,
    `<rect x="-2.5" y="0" width="5" height="30" rx="2.5" fill="#c98d5f"/><ellipse cx="0" cy="38" rx="9" ry="11" fill="#d9a06f"/><circle cx="0" cy="38" r="4" fill="#f7c9dd"/>`,
  ];
  ux.forEach((x, i) => (utensils += `<g transform="translate(${x} 236)">${shapes[i]}</g>`));

  let sparkles = "";
  const sp = [[40, 120, 7], [200, 60, 5], [352, 96, 6], [70, 300, 5], [330, 330, 7], [180, 260, 4], [25, 210, 5]];
  sp.forEach(([x, y, s]) => (sparkles += sparkle(x, y, s, "rgba(255,255,255,.9)")));

  return `<svg viewBox="0 0 390 844" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
    <defs>
      <pattern id="${g}gg" width="32" height="32" patternUnits="userSpaceOnUse">
        <rect width="32" height="32" fill="#fde7ef"/>
        <rect width="16" height="32" fill="rgba(244,143,177,.42)"/>
        <rect width="32" height="16" fill="rgba(244,143,177,.42)"/>
        <rect width="16" height="16" fill="rgba(240,120,160,.5)"/>
      </pattern>
      <linearGradient id="${g}sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#bfe8fa"/><stop offset="1" stop-color="#e8f7fd"/>
      </linearGradient>
    </defs>

    <rect width="390" height="520" fill="#fbdce8"/>
    ${tiles}

    <!-- window -->
    <g transform="translate(18 96)">
      <rect x="-6" y="-8" width="150" height="180" rx="12" fill="#f6afc9"/>
      <rect x="0" y="0" width="138" height="164" rx="8" fill="url(#${g}sky)"/>
      <circle cx="26" cy="34" r="14" fill="#fff" opacity=".95"/>
      <circle cx="42" cy="30" r="17" fill="#fff" opacity=".95"/>
      <circle cx="58" cy="36" r="12" fill="#fff" opacity=".95"/>
      <ellipse cx="104" cy="150" rx="34" ry="22" fill="#8fce7f"/>
      <ellipse cx="76" cy="158" rx="26" ry="16" fill="#a8dc96"/>
      <rect x="63" y="0" width="9" height="164" fill="#f6afc9"/>
      <rect x="0" y="76" width="138" height="9" fill="#f6afc9"/>
      <!-- curtains -->
      <path d="M-6 -8 Q10 60 -6 130 L-6 -8Z" fill="#f78fb5"/>
      <path d="M-6 -8 L28 -8 Q6 40 10 96 Q0 60 -6 130Z" fill="#fa9ec2" opacity=".9"/>
      <path d="M144 -8 Q128 60 144 130 L144 -8Z" fill="#f78fb5"/>
      <path d="M144 -8 L110 -8 Q132 40 128 96 Q138 60 144 130Z" fill="#fa9ec2" opacity=".9"/>
      <path d="M-6 -8 h150 v14 q-38 10 -75 0 q-37 10 -75 0z" fill="#f47da9"/>
    </g>

    <!-- shelf -->
    <g>
      <rect x="284" y="228" width="106" height="10" rx="5" fill="#e78daf"/>
      <rect x="284" y="152" width="106" height="10" rx="5" fill="#e78daf"/>
      ${jars}
      <rect x="296" y="120" width="22" height="30" rx="8" fill="#fce7ba" stroke="#e8a5bf" stroke-width="1.5"/>
      <rect x="326" y="114" width="26" height="36" rx="9" fill="#fff" stroke="#e8a5bf" stroke-width="1.5"/>
      ${heart(339, 132, 6, "#f48fb1")}
      <rect x="360" y="122" width="20" height="28" rx="7" fill="#f9c8da" stroke="#e8a5bf" stroke-width="1.5"/>
    </g>
    ${utensils}

    <!-- counter / lower cabinets -->
    <rect x="0" y="470" width="390" height="30" rx="6" fill="#f7a6c4"/>
    <rect x="0" y="496" width="390" height="120" fill="#f48fb1"/>
    <g opacity=".55">
      <rect x="18" y="514" width="90" height="70" rx="12" fill="#fa9ec2"/>
      <rect x="126" y="514" width="90" height="70" rx="12" fill="#fa9ec2"/>
      <circle cx="63" cy="549" r="7" fill="#fddce9"/>
      <circle cx="171" cy="549" r="7" fill="#fddce9"/>
      ${heart(300, 550, 16, "#fa9ec2")}
    </g>

    <!-- gingham tablecloth -->
    <rect x="0" y="600" width="390" height="244" fill="url(#${g}gg)"/>
    <path d="M0 600 h390 v10 q-20 8 -39 0 q-20 8 -39 0 q-20 8 -39 0 q-20 8 -39 0 q-20 8 -39 0 q-20 8 -39 0 q-20 8 -39 0 q-20 8 -39 0 q-20 8 -39 0 q-20 8 -39 0z" fill="#fff" opacity=".8"/>
    ${sparkles}
  </svg>`;
}

/* ---------------------------------------------------------------
   Cloud panel — bumpy white cloud with dashed pink outline,
   used behind scene titles. Returns absolutely-fills SVG.
--------------------------------------------------------------- */
export function cloudPanel() {
  return `<svg viewBox="0 0 340 150" width="100%" height="100%" preserveAspectRatio="none">
    <g fill="#fffdfb">
      <rect x="16" y="24" width="308" height="102" rx="44"/>
      <circle cx="66" cy="27" r="17"/><circle cx="122" cy="21" r="20"/>
      <circle cx="180" cy="19" r="21"/><circle cx="238" cy="22" r="19"/>
      <circle cx="286" cy="28" r="15"/>
      <circle cx="66" cy="123" r="15"/><circle cx="126" cy="129" r="18"/>
      <circle cx="188" cy="131" r="18"/><circle cx="248" cy="127" r="17"/>
      <circle cx="292" cy="121" r="13"/>
    </g>
    <rect x="30" y="34" width="280" height="84" rx="38" fill="none" stroke="#f48fb1" stroke-width="3" stroke-dasharray="10 8"/>
  </svg>`;
}

/* ---------------------------------------------------------------
   Chibi chef girl.
   poses: wave | whisk | point | cheer | mitt | pipe | knife
   eyes:  wink (default) | open | happy(closed ∪∪)
--------------------------------------------------------------- */
export function chefGirl({ pose = "wave", eyes = "wink", size = 220 } = {}) {
  const g = uid("cg");
  const skin = "#ffe9dc", skinLine = "#f2c9b0";
  const hair = "#8a5a3b", hairHi = "#a8744f";
  const W = 240, H = 300;

  const gingham = `
    <pattern id="${g}gh" width="18" height="18" patternUnits="userSpaceOnUse">
      <rect width="18" height="18" fill="#fce4ec"/>
      <rect width="9" height="18" fill="rgba(244,143,177,.55)"/>
      <rect width="18" height="9" fill="rgba(244,143,177,.55)"/>
      <rect width="9" height="9" fill="rgba(240,110,155,.6)"/>
    </pattern>`;

  /* --- eyes --- */
  let eyesSvg = "";
  const eyeL = `<g>
      <ellipse cx="88" cy="126" rx="13.5" ry="16" fill="#5b3a21"/>
      <ellipse cx="88" cy="126" rx="10.5" ry="13" fill="#7b4a2d"/>
      <circle cx="84" cy="120" r="4.6" fill="#fff"/>
      <circle cx="92" cy="131" r="2.4" fill="#fff" opacity=".85"/>
      <path d="M74 112 Q88 104 102 112" fill="none" stroke="#6d452a" stroke-width="3.4" stroke-linecap="round"/>
    </g>`;
  const eyeROpen = `<g>
      <ellipse cx="152" cy="126" rx="13.5" ry="16" fill="#5b3a21"/>
      <ellipse cx="152" cy="126" rx="10.5" ry="13" fill="#7b4a2d"/>
      <circle cx="148" cy="120" r="4.6" fill="#fff"/>
      <circle cx="156" cy="131" r="2.4" fill="#fff" opacity=".85"/>
      <path d="M138 112 Q152 104 166 112" fill="none" stroke="#6d452a" stroke-width="3.4" stroke-linecap="round"/>
    </g>`;
  const eyeRWink = `<g>
      <path d="M139 126 Q152 118 165 126" fill="none" stroke="#6d452a" stroke-width="4.6" stroke-linecap="round"/>
      <path d="M138 112 Q152 105 166 112" fill="none" stroke="#6d452a" stroke-width="3.2" stroke-linecap="round"/>
    </g>`;
  const eyeHappyL = `<path d="M75 128 Q88 116 101 128" fill="none" stroke="#6d452a" stroke-width="4.6" stroke-linecap="round"/>`;
  const eyeHappyR = `<path d="M139 128 Q152 116 165 128" fill="none" stroke="#6d452a" stroke-width="4.6" stroke-linecap="round"/>`;
  if (eyes === "wink") eyesSvg = eyeL + eyeRWink;
  else if (eyes === "open") eyesSvg = eyeL + eyeROpen;
  else eyesSvg = eyeHappyL + eyeHappyR;

  /* --- arms per pose --- */
  const sleeve = "#fdf6f0";
  let armL = "", armR = "", prop = "";
  // Left arm = viewer's left. Girl's props usually in her right hand (viewer left side).
  if (pose === "wave" || pose === "cheer") {
    armL = `<path d="M78 196 Q46 176 34 148 Q30 138 40 134 Q48 132 52 140 Q62 164 88 178" fill="${sleeve}" stroke="${skinLine}" stroke-width="2"/>
            <circle cx="38" cy="140" r="11" fill="${skin}" stroke="${skinLine}" stroke-width="2"/>`;
    armR = `<path d="M162 196 Q194 176 206 148 Q210 138 200 134 Q192 132 188 140 Q178 164 152 178" fill="${sleeve}" stroke="${skinLine}" stroke-width="2"/>
            <circle cx="202" cy="140" r="11" fill="${skin}" stroke="${skinLine}" stroke-width="2"/>`;
  } else if (pose === "whisk") {
    armL = `<path d="M80 196 Q52 180 44 152 Q41 142 51 139 Q59 137 62 146 Q70 168 92 180" fill="${sleeve}" stroke="${skinLine}" stroke-width="2"/>
            <circle cx="50" cy="146" r="11" fill="${skin}" stroke="${skinLine}" stroke-width="2"/>`;
    prop = `<g transform="translate(50 146) rotate(-24)">
        <rect x="-5" y="-58" width="10" height="34" rx="5" fill="#e8508c"/>
        <g stroke="#c9ced6" stroke-width="3.4" fill="none" stroke-linecap="round">
          <path d="M0 -26 Q-16 6 0 26 Q16 6 0 -26"/>
          <path d="M0 -26 Q-7 6 0 26 Q7 6 0 -26"/>
          <path d="M0 -26 Q-22 8 -3 25"/>
          <path d="M0 -26 Q22 8 3 25"/>
        </g></g>`;
    armR = `<path d="M160 198 Q184 190 192 176 Q196 168 188 164 Q180 162 176 168 Q168 178 152 184" fill="${sleeve}" stroke="${skinLine}" stroke-width="2"/>
            <circle cx="188" cy="168" r="10" fill="${skin}" stroke="${skinLine}" stroke-width="2"/>`;
  } else if (pose === "point") {
    armL = `<path d="M80 198 Q60 192 52 182 Q47 175 54 170 Q61 167 66 172 Q74 180 90 184" fill="${sleeve}" stroke="${skinLine}" stroke-width="2"/>
            <circle cx="58" cy="174" r="10" fill="${skin}" stroke="${skinLine}" stroke-width="2"/>`;
    armR = `<path d="M162 196 Q196 182 210 160 Q215 151 206 146 Q198 143 193 150 Q182 168 156 180" fill="${sleeve}" stroke="${skinLine}" stroke-width="2"/>
            <circle cx="206" cy="152" r="10" fill="${skin}" stroke="${skinLine}" stroke-width="2"/>
            <rect x="206" y="141" width="16" height="7" rx="3.5" fill="${skin}" stroke="${skinLine}" stroke-width="1.6" transform="rotate(-18 206 148)"/>`;
  } else if (pose === "mitt") {
    armL = `<path d="M80 198 Q52 190 42 172 Q37 163 46 158 Q54 155 59 162 Q68 174 90 182" fill="${sleeve}" stroke="${skinLine}" stroke-width="2"/>
            <g transform="translate(44 158) rotate(-16)">
              <path d="M-14 -6 Q-16 -22 -2 -24 Q14 -26 16 -10 L14 8 Q0 14 -12 8Z" fill="#f8a8c6" stroke="#e07ba2" stroke-width="2"/>
              <path d="M-14 -6 Q-4 -12 16 -10" fill="none" stroke="#e07ba2" stroke-width="2"/>
            </g>`;
    armR = `<path d="M160 198 Q188 190 198 172 Q203 163 194 158 Q186 155 181 162 Q172 174 150 182" fill="${sleeve}" stroke="${skinLine}" stroke-width="2"/>
            <g transform="translate(196 158) rotate(16)">
              <path d="M14 -6 Q16 -22 2 -24 Q-14 -26 -16 -10 L-14 8 Q0 14 12 8Z" fill="#f8a8c6" stroke="#e07ba2" stroke-width="2"/>
            </g>`;
  } else if (pose === "pipe") {
    armL = `<path d="M82 196 Q66 176 66 158 Q66 148 76 148 Q84 148 85 157 Q86 172 98 182" fill="${sleeve}" stroke="${skinLine}" stroke-width="2"/>
            <circle cx="76" cy="152" r="10" fill="${skin}" stroke="${skinLine}" stroke-width="2"/>`;
    armR = `<path d="M158 196 Q174 176 174 158 Q174 148 164 148 Q156 148 155 157 Q154 172 142 182" fill="${sleeve}" stroke="${skinLine}" stroke-width="2"/>
            <circle cx="164" cy="152" r="10" fill="${skin}" stroke="${skinLine}" stroke-width="2"/>`;
    // piping bag is held in front of the body but must stay behind
    // the (huge chibi) head — rendered via propBehind below
    prop = `<g transform="translate(120 206) scale(.82)">
        <path d="M0 -28 L-22 34 Q0 44 22 34 Z" fill="#fdf6ee" stroke="#e5d2c0" stroke-width="2"/>
        <path d="M-6 34 L6 34 L3 48 Q0 51 -3 48Z" fill="#b9bfc8"/>
        <path d="M0 -28 Q-10 -34 0 -40 Q10 -34 0 -28" fill="#fdf6ee" stroke="#e5d2c0" stroke-width="2"/>
      </g>`;
  } else if (pose === "knife") {
    armL = `<path d="M82 196 Q60 186 52 170 Q48 162 56 158 Q63 155 68 161 Q76 172 94 180" fill="${sleeve}" stroke="${skinLine}" stroke-width="2"/>
            <circle cx="56" cy="162" r="10" fill="${skin}" stroke="${skinLine}" stroke-width="2"/>`;
    prop = `<g transform="translate(56 162) rotate(-10)">
        <rect x="-6" y="-34" width="12" height="22" rx="5" fill="#ec6f9f"/>
        ${heart(0, -26, 4, "#fff")}
        <path d="M-5 -12 L5 -12 L4 26 Q0 32 -4 26Z" fill="#dfe6ee" stroke="#b9c2cd" stroke-width="1.5"/>
      </g>`;
    armR = `<path d="M158 198 Q180 192 188 180 Q192 172 184 168 Q177 166 172 171 Q164 179 150 184" fill="${sleeve}" stroke="${skinLine}" stroke-width="2"/>
            <circle cx="184" cy="172" r="10" fill="${skin}" stroke="${skinLine}" stroke-width="2"/>`;
  }

  const propBehindHead = pose === "pipe";
  return `<svg viewBox="0 0 ${W} ${H}" width="${size}" height="${(size * H) / W}">
    <defs>${gingham}</defs>

    <!-- twin tails (behind) -->
    <g fill="${hair}">
      <path d="M46 150 Q22 168 26 208 Q28 238 46 252 Q40 224 50 200 Q34 196 44 168Z"/>
      <path d="M194 150 Q218 168 214 208 Q212 238 194 252 Q200 224 190 200 Q206 196 196 168Z"/>
      <path d="M46 150 Q30 180 42 216" fill="none" stroke="${hairHi}" stroke-width="5" stroke-linecap="round"/>
      <path d="M194 150 Q210 180 198 216" fill="none" stroke="${hairHi}" stroke-width="5" stroke-linecap="round"/>
    </g>
    <!-- tail ribbons -->
    <g transform="translate(48 152) rotate(-14)">
      <path d="M0 0 L-17 -11 Q-23 0 -17 11Z" fill="#f0629b"/><path d="M0 0 L17 -11 Q23 0 17 11Z" fill="#f0629b"/><circle r="5.5" fill="#f8a8c6"/>
    </g>
    <g transform="translate(192 152) rotate(14)">
      <path d="M0 0 L-17 -11 Q-23 0 -17 11Z" fill="#f0629b"/><path d="M0 0 L17 -11 Q23 0 17 11Z" fill="#f0629b"/><circle r="5.5" fill="#f8a8c6"/>
    </g>

    <!-- body -->
    <g>
      <path d="M84 186 L156 186 L166 252 Q120 268 74 252 Z" fill="#fdf6f0" stroke="#eddcd0" stroke-width="2"/>
      <!-- apron -->
      <path d="M88 196 L152 196 L160 250 Q120 264 80 250 Z" fill="url(#${g}gh)" stroke="#f097bd" stroke-width="2.5"/>
      <rect x="104" y="182" width="7" height="22" fill="#f5aac8"/>
      <rect x="129" y="182" width="7" height="22" fill="#f5aac8"/>
      <!-- skirt frill -->
      <path d="M74 252 Q84 262 96 254 Q106 264 120 256 Q134 264 144 254 Q156 262 166 252 Q170 262 164 268 Q120 284 76 268 Q70 262 74 252Z" fill="#fbc6da"/>
      <!-- jacket buttons -->
      <circle cx="108" cy="196" r="3.4" fill="#f06292"/><circle cx="132" cy="196" r="3.4" fill="#f06292"/>
      <circle cx="108" cy="212" r="3.4" fill="#f06292"/><circle cx="132" cy="212" r="3.4" fill="#f06292"/>
      <!-- waist bow -->
      <g transform="translate(120 246)">
        <path d="M0 0 L-20 -10 Q-27 0 -20 12Z" fill="#f0629b"/><path d="M0 0 L20 -10 Q27 0 20 12Z" fill="#f0629b"/><circle r="6" fill="#f8a8c6"/>
      </g>
      <!-- apron pocket with strawberry -->
      <g transform="translate(97 226)">
        <path d="M-13 0 h26 v14 q0 6 -6 6 h-14 q-6 0 -6 -6z" fill="#fce4ec" stroke="#f097bd" stroke-width="2"/>
        <ellipse cx="0" cy="10" rx="6.5" ry="7.5" fill="#e53946"/>
        <path d="M0 2 l-3.4 3.4 h6.8z" fill="#58b368"/>
      </g>
    </g>

    ${armL}${armR}
    ${propBehindHead ? prop : ""}

    <!-- head -->
    <g>
      <ellipse cx="120" cy="132" rx="62" ry="56" fill="${skin}"/>
      <!-- side hair -->
      <path d="M58 132 Q54 96 82 78 L88 108 Q70 116 66 148 Q60 144 58 132Z" fill="${hair}"/>
      <path d="M182 132 Q186 96 158 78 L152 108 Q170 116 174 148 Q180 144 182 132Z" fill="${hair}"/>
      <!-- bangs -->
      <path d="M62 118 Q60 76 100 66 Q120 60 140 66 Q180 76 178 118 Q166 96 152 108 Q146 88 132 98 Q124 84 112 98 Q100 86 94 106 Q76 96 62 118Z" fill="${hair}"/>
      <path d="M84 84 Q104 70 130 74" fill="none" stroke="${hairHi}" stroke-width="5" stroke-linecap="round"/>
      ${eyesSvg}
      <!-- blush -->
      <ellipse cx="72" cy="148" rx="11" ry="7" fill="#fbb7c8" opacity=".85"/>
      <ellipse cx="168" cy="148" rx="11" ry="7" fill="#fbb7c8" opacity=".85"/>
      <!-- mouth: open happy -->
      <path d="M108 154 Q120 152 132 154 Q129 172 120 172 Q111 172 108 154Z" fill="#e0526f"/>
      <path d="M113 166 Q120 170 127 166 L126 169 Q120 173 114 169Z" fill="#f78ca4"/>
      <!-- nose dot -->
      <circle cx="120" cy="146" r="1.6" fill="#eeb39a"/>
    </g>

    <!-- chef hat -->
    <g>
      <path d="M64 84 Q52 44 88 36 Q96 12 124 18 Q148 8 162 30 Q192 32 182 66 Q178 84 168 90 L72 92 Q66 90 64 84Z" fill="#fbc6da"/>
      <path d="M64 84 Q52 44 88 36 Q96 12 124 18 Q148 8 162 30" fill="none" stroke="#f4a9c7" stroke-width="3" opacity=".7"/>
      <rect x="66" y="82" width="108" height="20" rx="10" fill="#f8a8c6"/>
      <rect x="66" y="82" width="108" height="8" rx="4" fill="#fbc0d6"/>
      <!-- gingham heart patch -->
      <g transform="translate(84 66)">
        ${heart(0, 0, 15, `url(#${g}gh)`, "#fff")}
      </g>
      <!-- hat bow right -->
      <g transform="translate(172 78) rotate(18)">
        <path d="M0 0 L-14 -9 Q-19 0 -14 10Z" fill="#f0629b"/><path d="M0 0 L14 -9 Q19 0 14 10Z" fill="#f0629b"/><circle r="4.5" fill="#f8a8c6"/>
      </g>
    </g>
    ${propBehindHead ? "" : prop}
  </svg>`;
}

/* ---------------------------------------------------------------
   Bunny mascot — white, pink bow, holds a strawberry
--------------------------------------------------------------- */
export function bunny({ size = 110, happy = false } = {}) {
  const eyes = happy
    ? `<path d="M38 62 Q44 56 50 62" fill="none" stroke="#5b4038" stroke-width="3.4" stroke-linecap="round"/>
       <path d="M64 62 Q70 56 76 62" fill="none" stroke="#5b4038" stroke-width="3.4" stroke-linecap="round"/>`
    : `<circle cx="44" cy="62" r="5" fill="#5b4038"/><circle cx="70" cy="62" r="5" fill="#5b4038"/>
       <circle cx="42.4" cy="60" r="1.8" fill="#fff"/><circle cx="68.4" cy="60" r="1.8" fill="#fff"/>`;
  return `<svg viewBox="0 0 120 130" width="${size}" height="${(size * 130) / 120}">
    <!-- ears -->
    <path d="M34 40 Q22 4 40 2 Q54 2 50 38" fill="#fff" stroke="#f3d7e2" stroke-width="2.5"/>
    <path d="M38 34 Q32 10 40 8 Q46 8 44 34" fill="#fbc6da"/>
    <path d="M80 38 Q76 2 92 2 Q108 6 84 42" fill="#fff" stroke="#f3d7e2" stroke-width="2.5"/>
    <path d="M84 32 Q84 12 90 10 Q96 12 86 36" fill="#fbc6da"/>
    <!-- bow -->
    <g transform="translate(36 30) rotate(-16)">
      <path d="M0 0 L-16 -10 Q-22 0 -16 11Z" fill="#f0629b"/><path d="M0 0 L16 -10 Q22 0 16 11Z" fill="#f0629b"/><circle r="5" fill="#f8a8c6"/>
    </g>
    <!-- body -->
    <ellipse cx="58" cy="102" rx="34" ry="26" fill="#fff" stroke="#f3d7e2" stroke-width="2.5"/>
    <!-- head -->
    <ellipse cx="58" cy="66" rx="36" ry="32" fill="#fff" stroke="#f3d7e2" stroke-width="2.5"/>
    ${eyes}
    <ellipse cx="34" cy="72" rx="7" ry="4.6" fill="#fbb7c8"/>
    <ellipse cx="82" cy="72" rx="7" ry="4.6" fill="#fbb7c8"/>
    <path d="M54 72 Q57 70 60 72 Q58.5 76 57 76 Q55.5 76 54 72Z" fill="#f0629b"/>
    <path d="M57 76 Q57 80 52 82 M57 76 Q57 80 62 82" fill="none" stroke="#5b4038" stroke-width="2" stroke-linecap="round"/>
    <!-- paws + strawberry -->
    <ellipse cx="40" cy="98" rx="9" ry="7" fill="#fff" stroke="#f3d7e2" stroke-width="2"/>
    <ellipse cx="76" cy="98" rx="9" ry="7" fill="#fff" stroke="#f3d7e2" stroke-width="2"/>
    <g transform="translate(58 98)">
      <ellipse cx="0" cy="0" rx="11" ry="12.5" fill="#e53946"/>
      <path d="M0 -12 l-5 5 h10z" fill="#58b368"/>
      <path d="M-2 -15 Q0 -19 2 -15 L0 -11Z" fill="#6cbf78"/>
      <circle cx="-4" cy="-2" r="1.4" fill="#ffd2d2"/><circle cx="4" cy="0" r="1.4" fill="#ffd2d2"/><circle cx="0" cy="5" r="1.4" fill="#ffd2d2"/>
    </g>
    <!-- feet -->
    <ellipse cx="40" cy="122" rx="11" ry="6" fill="#fff" stroke="#f3d7e2" stroke-width="2"/>
    <ellipse cx="76" cy="122" rx="11" ry="6" fill="#fff" stroke="#f3d7e2" stroke-width="2"/>
  </svg>`;
}

/* ---------------------------------------------------------------
   Chick mascot — yellow, mini chef hat, holds a whisk
--------------------------------------------------------------- */
export function chick({ size = 100, happy = false } = {}) {
  const eyes = happy
    ? `<path d="M40 54 Q46 48 52 54" fill="none" stroke="#6b4a2f" stroke-width="3.4" stroke-linecap="round"/>
       <path d="M66 54 Q72 48 78 54" fill="none" stroke="#6b4a2f" stroke-width="3.4" stroke-linecap="round"/>`
    : `<circle cx="46" cy="54" r="5" fill="#6b4a2f"/><circle cx="72" cy="54" r="5" fill="#6b4a2f"/>
       <circle cx="44.4" cy="52" r="1.8" fill="#fff"/><circle cx="70.4" cy="52" r="1.8" fill="#fff"/>`;
  return `<svg viewBox="0 0 130 130" width="${(size * 130) / 130}" height="${size}">
    <!-- whisk in wing -->
    <g transform="translate(108 52) rotate(14)">
      <rect x="-4" y="-6" width="8" height="26" rx="4" fill="#e8508c"/>
      <g stroke="#c9ced6" stroke-width="2.6" fill="none" stroke-linecap="round">
        <path d="M0 -6 Q-11 -26 0 -40 Q11 -26 0 -6"/>
        <path d="M0 -6 Q-5 -26 0 -40 Q5 -26 0 -6"/>
      </g>
    </g>
    <!-- body -->
    <ellipse cx="62" cy="78" rx="42" ry="38" fill="#ffd54f" stroke="#f0b73a" stroke-width="2.5"/>
    <path d="M28 96 Q18 104 24 112 Q32 116 38 106" fill="#ffd54f" stroke="#f0b73a" stroke-width="2.5"/>
    <path d="M100 88 Q114 92 112 104 Q104 112 94 100" fill="#ffd54f" stroke="#f0b73a" stroke-width="2.5"/>
    ${eyes}
    <ellipse cx="36" cy="64" rx="7" ry="4.6" fill="#fca986"/>
    <ellipse cx="82" cy="64" rx="7" ry="4.6" fill="#fca986"/>
    <path d="M52 62 L66 62 L59 72Z" fill="#f59653"/>
    <!-- bow tie -->
    <g transform="translate(59 92)">
      <path d="M0 0 L-13 -8 Q-18 0 -13 9Z" fill="#f8a8c6"/><path d="M0 0 L13 -8 Q18 0 13 9Z" fill="#f8a8c6"/><circle r="4.4" fill="#fbc6da"/>
    </g>
    <!-- feet -->
    <path d="M50 114 L50 122 M46 122 L54 122" stroke="#f59653" stroke-width="3" stroke-linecap="round"/>
    <path d="M72 114 L72 122 M68 122 L76 122" stroke="#f59653" stroke-width="3" stroke-linecap="round"/>
    <!-- chef hat -->
    <g transform="translate(62 28)">
      <path d="M-24 4 Q-30 -14 -12 -16 Q-8 -28 4 -24 Q16 -30 22 -18 Q34 -16 26 2 L24 8 L-22 8Z" fill="#fff" stroke="#e8dcd2" stroke-width="2"/>
      <rect x="-24" y="6" width="50" height="9" rx="4.5" fill="#f3ece5"/>
    </g>
  </svg>`;
}

/* ---------------------------------------------------------------
   Strawberries
--------------------------------------------------------------- */
export function strawberry({ size = 60, leaf = true } = {}) {
  const g = uid("sb");
  return `<svg viewBox="0 0 60 64" width="${size}" height="${(size * 64) / 60}">
    <defs><radialGradient id="${g}" cx=".35" cy=".3" r="1">
      <stop offset="0" stop-color="#f5726f"/><stop offset=".55" stop-color="#e53946"/><stop offset="1" stop-color="#c62838"/>
    </radialGradient></defs>
    <path d="M30 60 Q6 46 6 26 Q6 10 30 12 Q54 10 54 26 Q54 46 30 60Z" fill="url(#${g})"/>
    ${leaf ? `<path d="M30 4 Q24 8 18 8 Q24 12 22 17 Q28 14 30 18 Q32 14 38 17 Q36 12 42 8 Q36 8 30 4Z" fill="#58b368"/>
    <path d="M28 2 Q30 -2 32 2 L31 8 L29 8Z" fill="#6cbf78"/>` : ""}
    <g fill="#ffd9d9" opacity=".95">
      <ellipse cx="20" cy="26" rx="2" ry="2.8"/><ellipse cx="32" cy="23" rx="2" ry="2.8"/>
      <ellipse cx="42" cy="28" rx="2" ry="2.8"/><ellipse cx="25" cy="37" rx="2" ry="2.8"/>
      <ellipse cx="37" cy="38" rx="2" ry="2.8"/><ellipse cx="30" cy="48" rx="2" ry="2.8"/>
    </g>
    <ellipse cx="20" cy="18" rx="6" ry="4" fill="#fff" opacity=".4" transform="rotate(-24 20 18)"/>
  </svg>`;
}

export function strawberrySliceSvg({ size = 50 } = {}) {
  return `<svg viewBox="0 0 60 64" width="${size}" height="${(size * 64) / 60}">
    <path d="M30 60 Q6 46 6 26 Q6 10 30 12 Q54 10 54 26 Q54 46 30 60Z" fill="#f9868c"/>
    <path d="M30 56 Q11 44 11 27 Q11 15 30 16 Q49 15 49 27 Q49 44 30 56Z" fill="#fddcda"/>
    <path d="M30 20 L30 52 M16 28 L30 36 M44 28 L30 36 M20 44 L30 38 M40 44 L30 38" stroke="#f7a8a8" stroke-width="2.4" stroke-linecap="round" fill="none"/>
    <ellipse cx="30" cy="34" rx="5" ry="6" fill="#fbeeea"/>
  </svg>`;
}

/* ---------------------------------------------------------------
   Whipped-cream swirl (deco item + piping)
--------------------------------------------------------------- */
export function creamSwirl({ size = 50 } = {}) {
  return `<svg viewBox="0 0 60 56" width="${size}" height="${(size * 56) / 60}">
    <path d="M10 46 Q4 34 14 30 Q8 20 20 18 Q18 8 30 10 Q42 6 42 16 Q54 18 48 28 Q58 34 48 42 Q52 50 40 50 L16 50 Q10 50 10 46Z" fill="#fffaf3" stroke="#eee0d2" stroke-width="2"/>
    <path d="M22 44 Q18 34 26 30 Q22 22 32 22 Q40 20 38 28 Q46 30 40 38" fill="none" stroke="#f2e6d8" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`;
}

/* chocolate heart plate 「おめでとう」 */
export function chocoPlate({ size = 52, text = "おめでとう" } = {}) {
  return `<svg viewBox="0 0 64 58" width="${size}" height="${(size * 58) / 64}">
    ${heart(32, 28, 25, "#6d4128", "#8a5a3b")}
    <path d="M32 51 C13 34 15 18 32 26 C49 18 51 34 32 51Z" fill="none" stroke="#fce4ec" stroke-width="1.6" stroke-dasharray="4 3"/>
    <text x="32" y="31" font-size="8.6" font-weight="900" fill="#fce4ec" text-anchor="middle" font-family="inherit">${text}</text>
  </svg>`;
}

export function mintLeaf({ size = 46 } = {}) {
  return `<svg viewBox="0 0 60 52" width="${size}" height="${(size * 52) / 60}">
    <path d="M30 48 Q10 40 12 22 Q14 8 30 6 Q46 8 48 22 Q50 40 30 48Z" fill="#58b368"/>
    <path d="M30 8 L30 46 M30 18 Q20 20 16 28 M30 18 Q40 20 44 28 M30 30 Q22 32 20 38 M30 30 Q38 32 40 38" stroke="#3f9150" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M14 20 Q22 12 30 12" stroke="#7ecb8a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </svg>`;
}

export function colorStars({ size = 50 } = {}) {
  return `<svg viewBox="0 0 60 56" width="${size}" height="${(size * 56) / 60}">
    ${star(18, 16, 12, "#f9b17c", "#f2934f")}
    ${star(42, 20, 11, "#8fd0f2", "#5eb2e0")}
    ${star(28, 40, 12, "#f9a8c5", "#f07daa")}
  </svg>`;
}

/* single colored star (for placing on cake) */
export function oneStar({ size = 30, color = "#f9a8c5", edge = "#f07daa" } = {}) {
  return `<svg viewBox="0 0 40 40" width="${size}" height="${size}">${star(20, 22, 16, color, edge)}</svg>`;
}

/* ---------------------------------------------------------------
   Ingredient basket icons (selection screen)
--------------------------------------------------------------- */
function basket(inner) {
  return `
    ${inner}
    <path d="M8 44 Q37 52 66 44 L62 58 Q37 64 12 58 Z" fill="#d9a06f" stroke="#c08050" stroke-width="2"/>
    <path d="M8 44 Q37 52 66 44" fill="none" stroke="#b3763f" stroke-width="3"/>
    <g stroke="#c08050" stroke-width="1.6" opacity=".8">
      <path d="M14 47 L18 58 M24 49 L26 60 M34 50 L34 61 M44 49 L42 60 M54 47 L50 58" fill="none"/>
    </g>`;
}

export function ingIcon(kind, size = 74) {
  let inner = "";
  if (kind === "strawberry") {
    inner = `
      <g transform="translate(12 14) scale(.5)">${strawberry({ size: 60 }).replace(/<\/?svg[^>]*>/g, "")}</g>
      <g transform="translate(32 8) scale(.55)">${strawberry({ size: 60 }).replace(/<\/?svg[^>]*>/g, "")}</g>
      <g transform="translate(2 20) scale(.45)">${strawberry({ size: 60 }).replace(/<\/?svg[^>]*>/g, "")}</g>
      <g transform="translate(44 22) scale(.42)">${strawberry({ size: 60 }).replace(/<\/?svg[^>]*>/g, "")}</g>`;
  } else if (kind === "egg") {
    inner = `
      <ellipse cx="24" cy="30" rx="12" ry="15" fill="#fdf3e3" stroke="#ecd9bd" stroke-width="1.6"/>
      <ellipse cx="46" cy="28" rx="12" ry="15" fill="#fff" stroke="#e9e2d6" stroke-width="1.6"/>
      <ellipse cx="35" cy="38" rx="12" ry="13" fill="#fdf3e3" stroke="#ecd9bd" stroke-width="1.6"/>
      <path d="M52 36 a10 10 0 1 0 16 8 q-4 3 -8 0 q2 -5 -2 -8 z" fill="#fff" stroke="#e9e2d6" stroke-width="1.4"/>
      <circle cx="60" cy="44" r="6" fill="#f8b32c"/>`;
  } else if (kind === "flour") {
    inner = `
      <path d="M14 44 Q10 24 37 20 Q64 24 60 44 Z" fill="#fff" stroke="#e8e0d5" stroke-width="2"/>
      <path d="M20 30 Q28 22 37 24 Q30 28 28 34Z" fill="#f4ede2"/>
      <path d="M58 20 Q66 10 70 16 Q68 24 60 26 M62 26 Q70 22 72 28 Q68 34 61 32" fill="#e9d8a6" stroke="#d4bd7f" stroke-width="1.4"/>`;
  } else if (kind === "milk") {
    inner = `
      <path d="M16 18 Q16 12 24 12 Q32 12 32 18 L34 26 Q38 34 38 44 L12 44 Q12 34 14 26Z" fill="#fff" stroke="#dfe6ee" stroke-width="2" opacity=".95"/>
      <path d="M14 32 L36 32 L38 44 L12 44Z" fill="#fdfdfd"/>
      <ellipse cx="25" cy="32" rx="11" ry="3" fill="#f3f6fa"/>
      <rect x="44" y="16" width="18" height="30" rx="7" fill="#fff" stroke="#dfe6ee" stroke-width="2"/>
      <rect x="47" y="12" width="12" height="7" rx="3" fill="#8fd0f2"/>
      <rect x="46" y="28" width="14" height="10" rx="3" fill="#bfe4f7"/>
      <circle cx="53" cy="33" r="3" fill="#fff"/>`;
  } else if (kind === "sugar") {
    inner = `
      <path d="M12 40 Q10 22 37 20 Q64 22 62 40 L60 46 L14 46Z" fill="#fbf4e8" stroke="#e5d5bd" stroke-width="2"/>
      <ellipse cx="37" cy="24" rx="22" ry="6" fill="#fff"/>
      <ellipse cx="37" cy="23" rx="18" ry="4.4" fill="#fdf8ef"/>
      <rect x="40" y="6" width="5" height="20" rx="2.5" fill="#c98d5f" transform="rotate(18 42 16)"/>
      <ellipse cx="37" cy="23" rx="10" ry="3" fill="#f3e8d3"/>`;
  } else if (kind === "cream") {
    inner = `
      <path d="M12 30 Q12 24 20 24 L54 24 Q62 24 62 30 L60 44 L14 44Z" fill="#eef4f8" stroke="#d5e2ec" stroke-width="2" opacity=".9"/>
      <path d="M20 24 Q16 14 26 12 Q24 4 34 6 Q40 0 46 8 Q56 6 52 16 Q58 18 54 24Z" fill="#fffaf3" stroke="#eee0d2" stroke-width="2"/>
      <path d="M28 22 Q26 14 34 12 Q40 10 40 16" fill="none" stroke="#f2e6d8" stroke-width="2" stroke-linecap="round"/>`;
  } else if (kind === "wasabi") {
    inner = `
      <path d="M28 40 Q20 18 34 10 Q40 6 42 12 Q46 30 38 44Z" fill="#8bc34a" stroke="#689f38" stroke-width="2"/>
      <path d="M34 12 L36 40" stroke="#aed581" stroke-width="2.4" fill="none"/>
      <path d="M26 14 Q18 10 16 16 Q20 22 27 20 M44 16 Q52 12 54 18 Q50 24 43 22" fill="#9ccc65" stroke="#689f38" stroke-width="1.6"/>
      <ellipse cx="34" cy="44" rx="12" ry="4" fill="#7cb342" opacity=".5"/>`;
  } else if (kind === "fish") {
    inner = `
      <path d="M12 30 Q26 14 46 22 Q58 14 60 18 Q58 26 52 30 Q58 34 60 42 Q58 46 46 38 Q26 46 12 30Z" fill="#8fd0f2" stroke="#5eb2e0" stroke-width="2"/>
      <circle cx="24" cy="28" r="3" fill="#28536b"/>
      <path d="M34 22 Q38 30 34 38 M42 24 Q45 30 42 36" stroke="#5eb2e0" stroke-width="2" fill="none"/>`;
  } else if (kind === "pepper") {
    inner = `
      <path d="M30 16 Q26 8 34 8 Q40 8 38 16" fill="none" stroke="#689f38" stroke-width="4" stroke-linecap="round"/>
      <path d="M20 20 Q34 12 48 20 Q56 34 44 44 Q34 50 24 44 Q12 34 20 20Z" fill="#ef5350" stroke="#d32f2f" stroke-width="2"/>
      <path d="M26 22 Q22 30 26 40" stroke="#f98f8d" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }
  return `<svg viewBox="0 0 74 64" width="${size}" height="${(size * 64) / 74}">${basket(inner)}</svg>`;
}

/* ---------------------------------------------------------------
   Mixing / whipping bowl — pink bowl with hearts, content varies
   contentType: batter (yellow) | cream (white)
   phase 0..1 controls texture
--------------------------------------------------------------- */
export function bowlSvg({ size = 300, content = "cream", phase = 0, swirlAngle = 0 } = {}) {
  const g = uid("bw");
  const isCream = content === "cream";
  const base = isCream ? "#fff8ef" : "#f4d792";
  const hi = isCream ? "#fffdf8" : "#f9e6b4";
  const lo = isCream ? "#f3e2cc" : "#e3ba62";
  // texture: from flat liquid to stiff peaks as phase→1
  const peaks = [];
  const n = 7;
  for (let i = 0; i < n; i++) {
    const px = 40 + (i * 220) / (n - 1) + (i % 2 ? 6 : -6) * phase;
    const ph = 4 + phase * (14 + (i % 3) * 7);
    peaks.push(`Q${px - 12} ${86 - ph} ${px} ${86 - ph * 0.4} Q${px + 12} ${86 + 4}`);
  }
  return `<svg viewBox="0 0 300 240" width="${size}" height="${(size * 240) / 300}">
    <defs>
      <linearGradient id="${g}b" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f8a8c6"/><stop offset=".6" stop-color="#ef7fae"/><stop offset="1" stop-color="#e0619a"/>
      </linearGradient>
    </defs>
    <!-- content behind rim -->
    <defs>
      <clipPath id="${g}c"><ellipse cx="150" cy="86" rx="116" ry="32"/></clipPath>
    </defs>
    <g>
      <ellipse cx="150" cy="86" rx="118" ry="34" fill="${base}"/>
      <path d="M52 86 Q80 ${70 - phase * 16} 110 ${82 - phase * 6} Q150 ${64 - phase * 18} 190 ${82 - phase * 8} Q222 ${70 - phase * 14} 248 86 Q220 ${100} 150 ${102} Q80 ${100} 52 86Z" fill="${hi}"/>
      <!-- rotating swirl (drawn circular, flattened to the ellipse) -->
      <g clip-path="url(#${g}c)">
        <g transform="translate(150 86) scale(1 .28) rotate(${swirlAngle})">
          <path d="M0 0 Q40 -30 80 0 Q40 44 -12 22" fill="none" stroke="${lo}" stroke-width="9" stroke-linecap="round" opacity=".55"/>
          <path d="M-90 -10 Q-40 -58 20 -44" fill="none" stroke="${lo}" stroke-width="8" stroke-linecap="round" opacity=".4"/>
          <path d="M-60 40 Q0 66 60 40" fill="none" stroke="${hi}" stroke-width="8" stroke-linecap="round" opacity=".8"/>
        </g>
      </g>
      <path d="M84 88 Q116 ${78 - phase * 10} 150 ${88 - phase * 4} Q186 ${76 - phase * 12} 216 88" fill="none" stroke="${lo}" stroke-width="4" stroke-linecap="round" opacity=".7"/>
    </g>
    <!-- bowl body -->
    <path d="M28 84 Q28 116 60 156 Q92 196 150 196 Q208 196 240 156 Q272 116 272 84 Q272 74 258 74 L42 74 Q28 74 28 84Z" fill="url(#${g}b)"/>
    <ellipse cx="150" cy="80" rx="122" ry="26" fill="none" stroke="#e0619a" stroke-width="4"/>
    <ellipse cx="150" cy="79" rx="122" ry="26" fill="none" stroke="#fbc6da" stroke-width="2" opacity=".8"/>
    <!-- scallop edge deco -->
    <path d="M40 108 Q50 118 62 110 Q72 122 86 113 Q96 124 110 115 Q122 126 136 116 Q150 127 164 116 Q178 126 190 115 Q204 124 214 113 Q228 122 238 110 Q250 118 260 108" fill="none" stroke="#fbc6da" stroke-width="3.4" stroke-linecap="round" opacity=".85"/>
    ${heart(110, 150, 10, "#fbc6da")}
    ${heart(150, 158, 12, "#fbc6da")}
    ${heart(190, 150, 10, "#fbc6da")}
    <ellipse cx="86" cy="130" rx="16" ry="26" fill="#fff" opacity=".22" transform="rotate(18 86 130)"/>
    <!-- pedestal -->
    <ellipse cx="150" cy="206" rx="52" ry="12" fill="#e0619a"/>
    <ellipse cx="150" cy="202" rx="52" ry="12" fill="#ef7fae"/>
  </svg>`;
}

/* ---------------------------------------------------------------
   Hand whisk (big, for whipping scene, animated by CSS transform)
--------------------------------------------------------------- */
export function whiskSvg({ size = 130 } = {}) {
  return `<svg viewBox="0 0 80 200" width="${size * 0.4}" height="${size}">
    <rect x="32" y="4" width="16" height="64" rx="8" fill="#e8508c"/>
    <rect x="35" y="8" width="5" height="56" rx="2.5" fill="#f78ab4"/>
    <g stroke="#c9ced6" stroke-width="5" fill="none" stroke-linecap="round">
      <path d="M40 68 Q6 118 40 178 Q74 118 40 68"/>
      <path d="M40 68 Q22 118 40 178 Q58 118 40 68"/>
      <path d="M40 68 Q-4 124 34 176"/>
      <path d="M40 68 Q84 124 46 176"/>
    </g>
    <g stroke="#e6ebf2" stroke-width="2" fill="none" stroke-linecap="round">
      <path d="M40 70 Q10 118 40 174"/>
      <path d="M40 70 Q70 118 40 174"/>
    </g>
  </svg>`;
}

/* ---------------------------------------------------------------
   Eggs (crackable) — whole egg / cracked halves + yolk
--------------------------------------------------------------- */
export function eggSvg({ size = 64, cracked = false } = {}) {
  if (!cracked) {
    return `<svg viewBox="0 0 64 76" width="${size}" height="${(size * 76) / 64}">
      <ellipse cx="32" cy="40" rx="26" ry="32" fill="#fdf3e3" stroke="#ecd9bd" stroke-width="2.4"/>
      <ellipse cx="23" cy="26" rx="8" ry="11" fill="#fff" opacity=".7" transform="rotate(-16 23 26)"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 64 76" width="${size}" height="${(size * 76) / 64}">
    <path d="M10 36 Q8 12 32 10 Q56 12 54 36 L46 32 L40 40 L32 32 L24 40 L18 32Z" fill="#fdf3e3" stroke="#ecd9bd" stroke-width="2.2" transform="translate(-4 -6) rotate(-14 32 24)"/>
    <path d="M12 52 Q12 44 20 46 L26 50 L34 44 L42 52 L50 46 Q56 48 54 56 Q52 70 32 70 Q14 70 12 52Z" fill="#fdf3e3" stroke="#ecd9bd" stroke-width="2.2"/>
    <circle cx="33" cy="55" r="9" fill="#f8b32c"/>
    <circle cx="30" cy="52" r="3" fill="#fbcf6a"/>
  </svg>`;
}

/* ---------------------------------------------------------------
   Oven — pink kawaii oven with window; door content injected
--------------------------------------------------------------- */
export function ovenSvg({ size = 330, glow = 0, riseT = 0, browning = 0 } = {}) {
  const g = uid("ov");
  const cakeTopY = 178 - riseT * 26;
  const cakeCol = browning < 0.35 ? "#f7e1a8" : browning < 0.75 ? "#f2c979" : "#a8642c";
  const cakeTop = browning < 0.35 ? "#fdeec4" : browning < 0.75 ? "#f7dd9d" : "#c07c3c";
  return `<svg viewBox="0 0 340 300" width="${size}" height="${(size * 300) / 340}">
    <defs>
      <linearGradient id="${g}b" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fbc0d6"/><stop offset=".5" stop-color="#f8a8c6"/><stop offset="1" stop-color="#f088b2"/>
      </linearGradient>
      <radialGradient id="${g}w" cx=".5" cy=".45" r=".8">
        <stop offset="0" stop-color="#ffdf9e"/><stop offset=".7" stop-color="#f8b755"/><stop offset="1" stop-color="#c67f2e"/>
      </radialGradient>
    </defs>
    <!-- body -->
    <rect x="14" y="30" width="312" height="252" rx="26" fill="url(#${g}b)" stroke="#e0619a" stroke-width="4"/>
    <!-- top panel: knobs + display -->
    <ellipse cx="52" cy="20" rx="26" ry="12" fill="#5b4a48"/>
    <ellipse cx="120" cy="18" rx="22" ry="10" fill="#5b4a48"/>
    <circle cx="70" cy="60" r="15" fill="#fbc6da" stroke="#e0619a" stroke-width="3"/>
    <rect x="67" y="49" width="6" height="12" rx="3" fill="#e0619a"/>
    <circle cx="118" cy="60" r="15" fill="#fbc6da" stroke="#e0619a" stroke-width="3"/>
    <rect x="115" y="49" width="6" height="12" rx="3" fill="#e0619a" transform="rotate(45 118 60)"/>
    <rect x="150" y="46" width="66" height="30" rx="8" fill="#4a3446"/>
    ${heart(183, 62, 10, `rgba(255,${140 + glow * 90},${170 + glow * 60},${0.75 + glow * 0.25})`)}
    <circle cx="248" cy="60" r="15" fill="#fbc6da" stroke="#e0619a" stroke-width="3"/>
    <rect x="245" y="49" width="6" height="12" rx="3" fill="#e0619a" transform="rotate(-40 248 60)"/>
    <circle cx="292" cy="60" r="15" fill="#fbc6da" stroke="#e0619a" stroke-width="3"/>
    <rect x="289" y="49" width="6" height="12" rx="3" fill="#e0619a" transform="rotate(80 292 60)"/>
    <!-- strawberry deco -->
    <g transform="translate(28 44) scale(.5)">${strawberry({ size: 60 }).replace(/<\/?svg[^>]*>/g, "")}</g>

    <!-- door -->
    <rect x="34" y="92" width="250" height="176" rx="18" fill="#f8a8c6" stroke="#e0619a" stroke-width="4"/>
    <rect x="52" y="108" width="214" height="132" rx="12" fill="url(#${g}w)"/>
    <rect x="52" y="108" width="214" height="132" rx="12" fill="rgba(255,220,140,${glow * 0.4})"/>
    <!-- rack -->
    <line x1="60" y1="216" x2="258" y2="216" stroke="#8a5a3b" stroke-width="5"/>
    <line x1="78" y1="216" x2="78" y2="228" stroke="#8a5a3b" stroke-width="4"/>
    <line x1="240" y1="216" x2="240" y2="228" stroke="#8a5a3b" stroke-width="4"/>
    <!-- cake pan -->
    <g>
      <path d="M112 ${cakeTopY} L206 ${cakeTopY} L206 214 L112 214Z" fill="${cakeCol}"/>
      <ellipse cx="159" cy="${cakeTopY}" rx="47" ry="10" fill="${cakeTop}"/>
      <path d="M104 190 L214 190 L210 216 L108 216Z" fill="#c9ced6"/>
      <path d="M104 190 L214 190 L213 198 L105 198Z" fill="#e2e7ee"/>
      <path d="M108 210 Q120 204 130 210 Q142 204 152 210 Q164 204 174 210 Q186 204 196 210 Q206 204 210 210 L210 216 L108 216Z" fill="#eef2f7"/>
    </g>
    <!-- glass reflection -->
    <path d="M62 118 L120 118 L84 232 L58 232Z" fill="#fff" opacity=".18"/>
    <path d="M132 118 L156 118 L120 232 L96 232Z" fill="#fff" opacity=".12"/>
    <!-- handle -->
    <rect x="290" y="120" width="16" height="110" rx="8" fill="#fbc6da" stroke="#e0619a" stroke-width="3"/>
    <!-- feet -->
    <rect x="40" y="278" width="40" height="14" rx="7" fill="#e0619a"/>
    <rect x="260" y="278" width="40" height="14" rx="7" fill="#e0619a"/>
  </svg>`;
}

/* ---------------------------------------------------------------
   Cutting board + knife
--------------------------------------------------------------- */
export function boardSvg({ size = 360 } = {}) {
  return `<svg viewBox="0 0 360 150" width="${size}" height="${(size * 150) / 360}">
    <ellipse cx="180" cy="80" rx="172" ry="56" fill="#d9a06f"/>
    <ellipse cx="180" cy="74" rx="172" ry="56" fill="#ecc189"/>
    <ellipse cx="180" cy="74" rx="156" ry="48" fill="none" stroke="#dcae74" stroke-width="3"/>
    <path d="M40 66 Q180 46 320 66 M60 88 Q180 72 300 88" stroke="#dcae74" stroke-width="2.4" fill="none" opacity=".7"/>
  </svg>`;
}

export function knifeSvg({ size = 120 } = {}) {
  return `<svg viewBox="0 0 60 150" width="${size * 0.4}" height="${size}">
    <rect x="18" y="4" width="24" height="52" rx="11" fill="#ec6f9f"/>
    <rect x="22" y="8" width="7" height="44" rx="3.5" fill="#f78ab4"/>
    ${heart(30, 30, 7, "#fff")}
    <path d="M20 56 L40 56 L38 132 Q30 146 22 132Z" fill="#e8edf3"/>
    <path d="M20 56 L30 56 L28 136 Q24 134 22 130Z" fill="#f8fafc"/>
    <path d="M40 56 L38 132" stroke="#c3ccd6" stroke-width="2" fill="none"/>
  </svg>`;
}

/* ---------------------------------------------------------------
   The cake! base for decorating + result.
   layers of sponge/cream drawn to match mockup 06/04.
   decorations: array of {kind,x,y} in viewBox coords (0..320 x 0..260)
--------------------------------------------------------------- */
export function cakeSvg({ size = 330, frosted = false, decorations = [], plate = true, recipe = "shortcake" } = {}) {
  const deco = decorations.map((d) => {
    let item = "";
    if (d.kind === "strawberry") item = `<g transform="translate(${d.x - 16} ${d.y - 20}) scale(.55)">${strawberry({ size: 60 }).replace(/<\/?svg[^>]*>/g, "")}</g>`;
    else if (d.kind === "cream") item = `<g transform="translate(${d.x - 15} ${d.y - 15}) scale(.55)">${creamSwirl({ size: 60 }).replace(/<\/?svg[^>]*>/g, "")}</g>`;
    else if (d.kind === "choco") item = `<g transform="translate(${d.x - 16} ${d.y - 15}) scale(.55)">${chocoPlate({ size: 64 }).replace(/<\/?svg[^>]*>/g, "")}</g>`;
    else if (d.kind === "mint") item = `<g transform="translate(${d.x - 12} ${d.y - 11}) scale(.45)">${mintLeaf({ size: 60 }).replace(/<\/?svg[^>]*>/g, "")}</g>`;
    else if (d.kind === "star") item = `<g transform="translate(${d.x - 11} ${d.y - 11}) scale(.72)">${oneStar({ size: 30, color: d.color || "#f9a8c5", edge: d.edge || "#f07daa" }).replace(/<\/?svg[^>]*>/g, "")}</g>`;
    return item;
  }).join("");

  let base = "";
  if (recipe === "cupcake") {
    base = `
      <!-- cupcake wrapper -->
      <path d="M96 150 L224 150 L206 236 Q160 246 114 236 Z" fill="#f8a8c6"/>
      <g stroke="#e0619a" stroke-width="3" opacity=".8">
        ${Array.from({ length: 8 }, (_, i) => `<line x1="${106 + i * 15.5}" y1="152" x2="${112 + i * 13.5}" y2="234"/>`).join("")}
      </g>
      <path d="M96 150 L224 150 L221 164 L99 164Z" fill="#fbc6da"/>
      <!-- muffin dome -->
      <path d="M100 150 Q96 96 160 92 Q224 96 220 150Z" fill="${frosted ? "#fffaf3" : "#f2d089"}"/>
      ${frosted ? `<path d="M104 150 Q100 132 118 134 Q112 116 132 120 Q130 102 152 108 Q160 96 174 108 Q192 100 190 118 Q210 114 204 134 Q220 132 216 150Z" fill="#fffdf8" stroke="#f0e4d4" stroke-width="2"/>` : `<ellipse cx="160" cy="112" rx="52" ry="18" fill="#f7dd9d"/>`}
    `;
  } else if (recipe === "pancake") {
    base = `
      ${plate ? `<ellipse cx="160" cy="232" rx="140" ry="26" fill="#fff" stroke="#f3d7e2" stroke-width="3"/>` : ""}
      <ellipse cx="160" cy="216" rx="112" ry="24" fill="#e2a45c"/>
      <ellipse cx="160" cy="208" rx="112" ry="24" fill="#f2c479"/>
      <ellipse cx="160" cy="196" rx="104" ry="22" fill="#e2a45c"/>
      <ellipse cx="160" cy="188" rx="104" ry="22" fill="#f2c479"/>
      <ellipse cx="160" cy="176" rx="96" ry="20" fill="#e2a45c"/>
      <ellipse cx="160" cy="168" rx="96" ry="20" fill="#f4cd85"/>
      ${frosted ? `<path d="M84 158 Q92 176 112 166 Q118 182 140 172 Q150 188 168 174 Q184 186 196 170 Q214 180 222 162 Q232 172 236 158 Q236 150 160 148 Q84 150 84 158Z" fill="#fdeccd"/><ellipse cx="160" cy="152" rx="76" ry="12" fill="#fbe3b8"/>` : ""}
    `;
  } else {
    base = `
      ${plate ? `
      <!-- cake stand -->
      <ellipse cx="160" cy="238" rx="150" ry="24" fill="#f7a6c4"/>
      <ellipse cx="160" cy="232" rx="150" ry="24" fill="#fbc6da"/>
      <path d="M14 232 Q22 244 36 236 Q44 248 60 240 Q68 250 84 242 Q94 252 110 244 Q122 253 136 245 Q150 254 160 246 Q170 254 184 245 Q198 253 210 244 Q226 252 236 242 Q252 250 260 240 Q276 248 284 236 Q298 244 306 232" fill="none" stroke="#f088b2" stroke-width="3" opacity=".7"/>
      <ellipse cx="160" cy="228" rx="132" ry="18" fill="#fff"/>
      <path d="M34 228 a126 17 0 0 0 252 0" fill="none" stroke="#f3d7e2" stroke-width="2" stroke-dasharray="5 4"/>` : ""}
      <!-- bottom sponge -->
      <path d="M64 196 L256 196 L256 218 Q160 232 64 218Z" fill="#f2d089"/>
      <path d="M64 196 L256 196 L256 204 Q160 214 64 204Z" fill="#f7dd9d"/>
      <!-- cream + strawberry filling -->
      <path d="M62 176 L258 176 L258 198 Q252 202 246 197 Q240 203 232 198 Q224 204 216 198 Q208 204 200 198 Q192 204 184 198 Q176 204 168 198 Q160 204 152 198 Q144 204 136 198 Q128 204 120 198 Q112 204 104 198 Q96 204 88 198 Q80 203 74 197 Q68 202 62 198Z" fill="#fffaf3"/>
      ${[86, 122, 158, 194, 230].map((x) => `<g transform="translate(${x - 13} ${168}) scale(.44)">${strawberrySliceSvg({ size: 60 }).replace(/<\/?svg[^>]*>/g, "")}</g>`).join("")}
      <!-- top sponge -->
      <path d="M64 148 L256 148 L256 178 L64 178Z" fill="#f2d089"/>
      <path d="M64 148 L256 148 L256 156 Q160 166 64 156Z" fill="#f7dd9d"/>
      <ellipse cx="160" cy="148" rx="96" ry="16" fill="${frosted ? "#fffaf3" : "#f7dd9d"}"/>
      ${frosted ? `
      <!-- frosting drape -->
      <path d="M64 148 Q64 140 74 140 L246 140 Q256 140 256 148 L256 156 Q248 162 240 155 Q232 163 222 156 Q214 164 204 156 Q196 164 186 156 Q178 164 168 157 Q160 164 152 157 Q144 164 134 156 Q126 164 116 156 Q108 163 98 156 Q90 163 80 155 Q72 162 64 156Z" fill="#fffdf8"/>
      <ellipse cx="160" cy="142" rx="97" ry="15" fill="#fffdf8"/>
      <ellipse cx="160" cy="141" rx="88" ry="12" fill="#fff7ec"/>` : ""}
    `;
  }

  return `<svg viewBox="0 0 320 268" width="${size}" height="${(size * 268) / 320}">
    ${base}
    ${deco}
  </svg>`;
}

/* strawberry sliced-side deco band used on mockup cake sides */
export function heartBand(width = 200) {
  let hearts = "";
  for (let x = 14; x < width; x += 30) hearts += heart(x, 10, 8, "#fbc6da");
  return `<svg viewBox="0 0 ${width} 20" width="${width}" height="20">${hearts}</svg>`;
}
