// Abner's Arcade pixel-art engine v11 - a whole arcade, in 8 bits.
// Sprites are drawn pixel by pixel with code, the same way real 8-bit
// game graphics were made. No image files at all. v11 stretches the
// room from 160 to 448 cells wide: an east aisle of glowing cabinets, a
// snack corner with a popcorn cart, a prize case, and the front doors -
// so the camera can travel across the whole floor.

const PALETTE = {
  ".": null,          // transparent
  k: "#05070f",      // near black (screens / slots)
  K: "#12172b",      // dark navy (cabinet body)
  S: "#232c4f",      // steel
  s: "#39406b",      // light steel
  d: "#0d1326",      // room dark
  c: "#00e5ff",      // neon cyan
  p: "#ff2d95",      // neon pink
  m: "#ff71ce",      // light pink (shine)
  y: "#ffd60a",      // gold / yellow
  g: "#39ff88",      // neon green
  w: "#ffffff",      // white
  x: "#9fe9ff",      // pale cyan (shine)
  o: "#b8860b",      // dark gold (coin edge / trim)
  r: "#8f1043",      // deep red (marquee frame)
  B: "#2a6bff",      // electric blue (deck button)
  R: "#ff2222",      // bright red (joystick ball / rocket)
  O: "#ff6b1a",      // orange (flames / carpet)
  V: "#7b2ff7",      // violet (side art / kick panel)
  u: "#4b1178",      // deep violet (cabinet crown)
  l: "#56608f",      // chrome highlight
  F: "#1d2547",      // spare floor tone (kept for compatibility)
  f: "#101628",      // spare floor tone
  E: "#3b4a80",      // spare floor tone
  P: "#4d0f31",      // pink glow shadow
  C: "#0b4a55",      // cyan glow shadow
  M: "#1c1030",      // purple wall shade
  A: "#241a4f",      // arcade carpet tile (light)
  a: "#12082a",      // arcade carpet tile (dark)
  e: "#3a2a6b",      // carpet tile edge
  N: "#f0b184",      // visitor skin
  T: "#a76a3f",      // visitor skin, deep tone
  G: "#0f5c33",      // green glow shadow (carpet light pools)
};

function makeGrid(width, height) {
  const rows = [];
  for (let y = 0; y < height; y++) {
    rows.push(new Array(width).fill("."));
  }
  const grid = {
    w: width,
    h: height,
    rows: rows,
    set: (x, y, ch) => {
      if (x >= 0 && x < width && y >= 0 && y < height) rows[y][x] = ch;
    },
    rect: (x, y, w, h, ch) => {
      for (let yy = y; yy < y + h; yy++) {
        for (let xx = x; xx < x + w; xx++) grid.set(xx, yy, ch);
      }
    },
  };
  return grid;
}

function renderGrid(canvas, grid, scale) {
  canvas.width = grid.w * scale;
  canvas.height = grid.h * scale;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      const color = PALETTE[grid.rows[y][x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
}

// Stamp a small piece of art (an array of strings) onto a grid.
function stamp(g, art, ox, oy) {
  for (let y = 0; y < art.length; y++) {
    for (let x = 0; x < art[y].length; x++) {
      if (art[y][x] !== ".") g.set(ox + x, oy + y, art[y][x]);
    }
  }
}

// A dithered glow ring around a sign, so the neon looks like it lights
// the wall around it.
function addHalo(g, x, y, w, h, ch) {
  for (let yy = y - 3; yy < y + h + 3; yy++) {
    for (let xx = x - 3; xx < x + w + 3; xx++) {
      const inside = xx >= x && xx < x + w && yy >= y && yy < y + h;
      if (inside) continue;
      const edge = xx >= x - 1 && xx <= x + w && yy >= y - 1 && yy <= y + h;
      if (edge && (xx + yy) % 2 === 0) g.set(xx, yy, ch);
    }
  }
}

// The hero arcade machine: a 44x68 sprite built from code rectangles.
// meta records where the screen, buttons, joystick and coin slot are,
// so the page can place real clickable elements on top of the art.
function buildMachine() {
  const g = makeGrid(44, 68);

  // Cabinet body: deep violet crown, navy below.
  g.rect(4, 0, 36, 64, "K");
  g.rect(4, 0, 36, 14, "u");
  g.rect(4, 0, 36, 1, "l");    // top highlight
  g.rect(4, 63, 36, 1, "s");   // bottom edge
  g.rect(4, 0, 1, 64, "S");    // left edge
  g.rect(39, 0, 1, 64, "S");   // right edge

  // T-molding: a solid neon tube down each side, with small gaps.
  for (let y = 1; y < 63; y++) {
    if (y % 5 !== 4) {
      g.set(4, y, "c");
      g.set(39, y, "p");
    }
  }

  // Side art: little flames licking up the outer columns.
  for (let y = 3; y < 60; y++) {
    const f = (y * 7) % 11;
    if (f < 3) g.set(5, y, f === 0 ? "O" : "y");
    if (f === 4 || f === 5) g.set(38, y, f === 4 ? "y" : "O");
  }

  // Bulb strip under the roof: carnival colors.
  g.rect(6, 1, 32, 2, "S");
  const bulbColors = ["y", "c", "p", "g"];
  for (let x = 8; x < 38; x++) {
    g.set(x, 1, bulbColors[(x - 8) % 4]);
    g.set(x, 2, (x - 8) % 2 === 0 ? "w" : "s");
  }

  // Marquee: deep red frame with a bulb chase all around it.
  g.rect(6, 4, 32, 9, "r");
  for (let x = 6; x < 38; x++) {
    g.set(x, 4, x % 2 === 0 ? "w" : "o");
    g.set(x, 12, x % 2 === 0 ? "o" : "w");
  }
  for (let y = 5; y < 12; y++) {
    g.set(6, y, y % 2 === 0 ? "w" : "o");
    g.set(37, y, y % 2 === 0 ? "o" : "w");
  }
  g.rect(8, 6, 28, 5, "p");
  g.rect(8, 6, 28, 1, "m");
  g.rect(8, 10, 28, 1, "P");
  g.set(9, 6, "w");
  g.set(10, 7, "w");
  g.set(11, 8, "w");
  g.rect(6, 13, 32, 1, "o");

  // Screen bezel: chrome edges + gold corner rivets.
  g.rect(6, 14, 32, 1, "l");
  g.rect(6, 15, 32, 38, "S");
  g.rect(7, 16, 30, 36, "k"); // the screen (the overlay sits here)
  g.set(6, 15, "o");
  g.set(37, 15, "o");
  g.set(6, 52, "o");
  g.set(37, 52, "o");
  g.rect(6, 53, 32, 1, "l");

  // Speaker grille: slanted slashes.
  for (let x = 8; x < 38; x++) {
    g.set(x, 54, (x + 54) % 4 < 2 ? "s" : "d");
  }
  g.rect(6, 55, 32, 1, "s"); // trim line

  // Control deck with a chrome edge.
  g.rect(6, 56, 32, 1, "l");
  g.rect(6, 57, 32, 4, "S");
  g.rect(7, 57, 30, 4, "d");

  // Joystick: red ball with a white glint, black shaft, steel gate.
  g.set(12, 57, "R");
  g.set(11, 58, "w");
  g.set(12, 58, "R");
  g.set(13, 58, "R");
  g.set(12, 59, "k");
  g.set(10, 60, "s");
  g.set(11, 60, "s");
  g.set(12, 60, "k");
  g.set(13, 60, "s");
  g.set(14, 60, "s");

  // Four deck buttons: BLUE, CYAN, PINK, YELLOW + glow reflections.
  const buttonXs = [22, 26, 30, 34];
  const buttonColors = ["B", "c", "p", "y"];
  const buttonGlows = ["C", "C", "P", "o"];
  for (let i = 0; i < buttonXs.length; i++) {
    const bx = buttonXs[i];
    g.set(bx, 57, "s");
    g.set(bx - 1, 58, "s");
    g.set(bx, 58, buttonColors[i]);
    g.set(bx + 1, 58, "s");
    g.set(bx, 59, "s");
    g.set(bx, 60, buttonGlows[i]);
  }

  // Front panel: violet kick stripes + gold two-slot coin door.
  g.rect(6, 61, 32, 2, "K");
  for (let x = 6; x < 38; x++) {
    if (x < 15 || x > 28) {
      const stripe = (x + 61) % 4;
      g.set(x, 61, stripe < 2 ? "V" : "u");
      g.set(x, 62, stripe < 2 ? "u" : "V");
    }
  }
  g.rect(15, 61, 14, 2, "o");
  g.rect(16, 61, 12, 1, "y");
  g.rect(16, 62, 12, 1, "o");
  g.set(19, 61, "w");
  g.set(24, 61, "w");
  g.set(19, 62, "k");
  g.set(24, 62, "k");
  g.set(21, 62, "k");
  g.set(22, 62, "k");

  // Power LED + a little red service light.
  g.set(7, 62, "g");
  g.set(36, 62, "r");

  // Feet.
  g.rect(8, 64, 6, 4, "S");
  g.rect(30, 64, 6, 4, "S");
  g.rect(8, 67, 6, 1, "s");
  g.rect(30, 67, 6, 1, "s");

  return {
    grid: g,
    meta: {
      screen: { x: 7, y: 16, w: 30, h: 36 },
      marquee: { x: 7, y: 5, w: 30, h: 7 },
      slot: { x: 22, y: 61.5 },
      btns: [
        { x: 22, y: 58, key: "b", color: "#2a6bff" },
        { x: 26, y: 58, key: "c", color: "#00e5ff" },
        { x: 30, y: 58, key: "p", color: "#ff2d95" },
        { x: 34, y: 58, key: "y", color: "#ffd60a" },
      ],
      stick: { x: 12, y: 58 },
    },
  };
}

// The gold coin (12x12) with a shine streak and a shaded bottom rim.
function buildCoin() {
  const art = [
    "...oooooo...",
    "..oyyyyyyo..",
    ".oyywyyyyyo.",
    ".oywwyyyyyo.",
    "oyywwyyyyyyo",
    "oywyyyyyyyyo",
    "oyyyyyyyyyyo",
    "oyyyyyyyyyyo",
    ".oyyyyyyyyo.",
    ".oyyoyyoyyo.",
    "..ooyyyyoo..",
    "...oooooo...",
  ];
  const g = makeGrid(12, 12);
  for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 12; x++) {
      g.set(x, y, art[y][x]);
    }
  }
  return g;
}

// Shapes for the wall signs.
const STAR = [
  "....p....",
  "....p....",
  "....p....",
  "ppppppppp",
  ".ppppppp.",
  "..ppppp..",
  "..pp.pp..",
  ".pp...pp.",
];

const BOLT = [
  "...cc",
  "..cc.",
  ".cc..",
  "ccccc",
  ".ccc.",
  "..cc.",
  ".cc..",
  "cc...",
];

// A classic little space invader, waving from the wall.
const INVADER = [
  "..g.....g..",
  "...g...g...",
  "..ggggggg..",
  ".gg.ggg.gg.",
  "ggggggggggg",
  "g.ggggggg.g",
  "g.g.....g.g",
  "...gg.gg...",
];

// A distant arcade cabinet standing in the room. Its little screen can
// play a tiny game: "pong", "invader", or a plain glow.
function farCabinet(g, x, y, marqueeColor, screenMode) {
  g.rect(x, y, 16, 28, "K");
  g.rect(x, y, 16, 1, "S");
  g.rect(x, y + 27, 16, 1, "k");
  g.rect(x + 1, y + 2, 14, 3, marqueeColor);
  g.set(x + 1, y + 2, "w");
  g.set(x + 14, y + 2, "w");
  g.set(x + 4, y + 4, "w");
  g.set(x + 11, y + 4, "w");
  for (let yy = y + 7; yy < y + 26; yy += 2) {
    g.set(x, yy, marqueeColor);
    g.set(x + 15, yy, marqueeColor);
  }
  g.rect(x + 2, y + 7, 12, 9, "k");
  if (screenMode === "pong") {
    g.set(x + 3, y + 9, "w");
    g.set(x + 3, y + 10, "w");
    g.set(x + 3, y + 11, "w");
    g.set(x + 12, y + 11, "w");
    g.set(x + 12, y + 12, "w");
    g.set(x + 12, y + 13, "w");
    g.set(x + 7, y + 11, "x");
    g.set(x + 8, y + 10, "x");
  } else if (screenMode === "invader") {
    g.set(x + 5, y + 9, "g");
    g.set(x + 7, y + 9, "g");
    g.set(x + 5, y + 10, "g");
    g.set(x + 6, y + 10, "g");
    g.set(x + 7, y + 10, "g");
    g.set(x + 5, y + 11, "g");
    g.set(x + 7, y + 11, "g");
    g.set(x + 4, y + 13, "c");
    g.set(x + 8, y + 13, "c");
  } else {
    g.rect(x + 4, y + 9, 8, 5, "C");
    g.rect(x + 6, y + 10, 4, 3, "c");
  }
  g.rect(x + 2, y + 18, 12, 6, "S");
  g.rect(x + 2, y + 19, 12, 4, "d");
  g.set(x + 4, y + 20, "p");
  g.set(x + 10, y + 20, "y");
}

// A framed wall poster: a rocket blasting off, a racing car, or a champion's trophy.
function poster(g, x, y, kind) {
  g.rect(x, y, 10, 14, "S");
  g.rect(x + 1, y + 1, 8, 12, "k");
  if (kind === "rocket") {
    g.set(x + 4, y + 3, "w");
    g.set(x + 4, y + 4, "R");
    g.set(x + 5, y + 4, "R");
    g.set(x + 4, y + 5, "R");
    g.set(x + 5, y + 5, "R");
    g.set(x + 4, y + 6, "R");
    g.set(x + 4, y + 7, "O");
    g.set(x + 4, y + 8, "y");
    g.set(x + 2, y + 3, "x");
    g.set(x + 7, y + 6, "x");
    g.set(x + 3, y + 10, "x");
  } else if (kind === "trophy") {
    g.rect(x + 3, y + 3, 4, 1, "y");
    g.rect(x + 2, y + 4, 6, 2, "y");
    g.set(x + 1, y + 4, "o");
    g.set(x + 1, y + 5, "o");
    g.set(x + 8, y + 4, "o");
    g.set(x + 8, y + 5, "o");
    g.rect(x + 4, y + 6, 2, 3, "o");
    g.rect(x + 3, y + 9, 4, 1, "y");
    g.set(x + 3, y + 4, "w");
    g.set(x + 2, y + 2, "x");
    g.set(x + 8, y + 3, "x");
  } else {
    g.rect(x + 2, y + 8, 6, 2, "B");
    g.set(x + 3, y + 7, "B");
    g.set(x + 5, y + 7, "B");
    g.set(x + 3, y + 10, "k");
    g.set(x + 6, y + 10, "k");
    g.set(x + 8, y + 8, "y");
    g.set(x + 2, y + 3, "x");
  }
}

// A gold change machine glowing by the right wall.
function changeMachine(g) {
  g.rect(150, 40, 8, 17, "S");
  g.rect(150, 40, 8, 1, "s");
  g.rect(151, 41, 6, 2, "y");
  g.set(152, 41, "w");
  g.rect(151, 44, 6, 8, "k");
  g.set(152, 46, "o");
  g.set(155, 46, "o");
  g.rect(152, 52, 4, 1, "o");
  g.rect(151, 56, 6, 1, "k");
}

// A wall clock for the back wall. Arcade time is whatever the manager
// says it is, but the hands still look sharp.
const CLOCK = [
  ".sssss.",
  "sKKKKKs",
  "sKKwKKs",
  "sKKwwKs",
  "sKKKKKs",
  "sKKKKKs",
  ".sssss.",
];

// A snack vending machine glowing on the back wall: a glass window full
// of colorful treats, a gold coin slot, and the flap where snacks drop.
function vendingMachine(g, x, y) {
  g.rect(x, y, 10, 20, "S");
  for (let xx = x; xx < x + 10; xx++) g.set(xx, y, "s");
  g.rect(x + 1, y + 1, 8, 9, "k");
  const snacks = ["O", "p", "c", "g", "y", "B"];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      g.set(x + 2 + col * 2, y + 2 + row * 3, snacks[(row * 4 + col) % snacks.length]);
    }
  }
  g.rect(x + 1, y + 10, 8, 1, "s");
  g.rect(x + 1, y + 11, 8, 1, "S");
  g.rect(x + 2, y + 12, 6, 4, "k");
  g.rect(x + 3, y + 13, 4, 2, "d");
  g.set(x + 3, y + 13, "s");
  g.set(x + 8, y + 17, "y");
  g.set(x + 8, y + 18, "o");
  g.rect(x, y + 19, 10, 1, "k");
}

// A little pool of marquee light on the carpet under a glowing cabinet.
function glowPool(g, x, y, ch) {
  for (let i = 0; i < 5; i++) {
    for (let j = -(4 - i); j <= 4 - i; j++) {
      if ((x + j + y + i) % 2 === 0) g.set(x + j, y + i, ch);
    }
  }
}

// An 8-bit arcade visitor, 8 wide x 13 tall: hair, face, shirt, jeans,
// sneakers. pose "stand" faces you, "back" faces the machine they are
// playing, and "walk1"/"walk2" are the two poses of the walk cycle.
function personRows(outfit, pose) {
  const H = outfit.hair;
  const SK = outfit.skin;
  const S = outfit.shirt;
  const P = outfit.pants;
  const face = pose === "back" ? H : SK;
  const legs =
    pose === "walk1"
      ? [
          "." + P + P + ".." + P + P + ".",
          "." + P + P + ".." + P + P + ".",
          "." + P + "...." + P + ".",
          ".k....k.",
        ]
      : pose === "walk2"
        ? [
            ".." + P + P + P + P + "..",
            ".." + P + P + P + P + "..",
            ".." + P + P + P + P + "..",
            "..kkkk..",
          ]
        : [
            ".." + P + P + P + P + "..",
            ".." + P + ".." + P + "..",
            ".." + P + ".." + P + "..",
            "..k..k..",
          ];
  return [
    ".." + H + H + H + H + "..",
    ".." + H + H + H + H + "..",
    ".." + face + face + face + face + "..",
    ".." + face + face + face + face + "..",
    "." + S + S + S + S + S + S + ".",
    SK + "." + S + S + S + S + "." + SK,
    "." + S + S + S + S + S + S + ".",
    ".." + P + P + P + P + "..",
    ".." + P + P + P + P + "..",
  ].concat(legs);
}

// Stamp a visitor onto the room (the standing crowd).
function drawPerson(g, x, y, outfit, pose) {
  stamp(g, personRows(outfit, pose), x, y);
}

// Build a walk frame as its own grid, for the visitors that stroll.
function buildWalker(outfit, pose) {
  const rows = personRows(outfit, pose);
  const g = makeGrid(8, 13);
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) g.set(x, y, rows[y][x]);
  }
  return g;
}

// Puts a world point on the floor: depth wd goes 0 at the back wall to
// 1 at the front, and wx is left (-) or right (+) of the middle.
function setFloorPixel(g, wx, wd, ch) {
  const x = Math.round(80 + wx * wd);
  const y = Math.round(54 + 36 * wd);
  if (y >= 55 && y < 90 && x >= 0 && x < 160) g.set(x, y, ch);
}

// The legendary arcade carpet: dark violet tiles covered in neon
// triangles, diamonds, squiggles and dots that shrink into the distance.
function drawCarpet(g) {
  g.rect(0, 54, 160, 36, "a");

  // Big checker tiles in perspective.
  for (let y = 55; y < 90; y++) {
    const wd = (y - 54) / 36;
    for (let x = 0; x < 160; x++) {
      const wx = (x - 80) / wd;
      const col = Math.floor(wx / 16);
      const row = Math.floor(wd * 8);
      if ((col + row) % 2 === 0) g.set(x, y, "A");
    }
  }

  // Tile seams, horizontal and vertical.
  for (let row = 1; row <= 8; row++) {
    const y = Math.round(54 + 36 * (row / 8));
    if (y <= 54 || y >= 90) continue;
    for (let x = 0; x < 160; x++) {
      if ((x + row) % 2 === 0) g.set(x, y, "e");
    }
  }
  for (const wx of [-64, -48, -32, -16, 0, 16, 32, 48, 64]) {
    for (let step = 0; step <= 72; step++) {
      const wd = 0.05 + (step / 72) * 0.92;
      if (step % 3 === 0) setFloorPixel(g, wx, wd, "e");
    }
  }

  // The neon pattern stamped across the tiles.
  const CARPET_COLORS = ["p", "c", "y", "g", "O"];
  for (let tx = -64; tx <= 64; tx += 16) {
    for (let td = 1; td <= 8; td++) {
      const wd = td / 8;
      const hash = ((tx + 64) * 7 + td * 13) % 11;
      const wx = tx + (hash % 3) * 3 - 3;
      const color = CARPET_COLORS[hash % 5];
      const kind = hash % 5;
      if (kind === 0) {
        // Triangle pointing at the back wall.
        for (let i = 0; i < 4; i++) {
          for (let j = -i; j <= i; j++) {
            setFloorPixel(g, wx + j, wd + i * 0.02, color);
          }
        }
      } else if (kind === 1) {
        // Triangle pointing at the player.
        for (let i = 0; i < 4; i++) {
          for (let j = -(3 - i); j <= 3 - i; j++) {
            setFloorPixel(g, wx + j, wd + i * 0.02, color);
          }
        }
      } else if (kind === 2) {
        // Diamond.
        const rows = [[0], [-1, 1], [-2, 2], [-2, 2], [-1, 1], [0]];
        for (let i = 0; i < rows.length; i++) {
          for (const j of rows[i]) {
            setFloorPixel(g, wx + j, wd + i * 0.016, color);
          }
        }
      } else if (kind === 3) {
        // A wavy squiggle line.
        for (let i = 0; i < 6; i++) {
          setFloorPixel(g, wx - 2 + i, wd + (i % 2 === 0 ? 0.012 : 0.048), color);
        }
      } else {
        // A bright dot.
        setFloorPixel(g, wx, wd + 0.01, "w");
        setFloorPixel(g, wx, wd + 0.035, color);
      }
    }
  }
}


// v11: a popcorn cart for the snack corner - a glass case full of
// popcorn riding on red-and-white striped legs, with two little wheels.
function popcornCart(g, x, y) {
  g.rect(x, y, 12, 13, "S");
  g.rect(x + 1, y + 1, 10, 5, "k");
  g.set(x + 2, y + 2, "y");
  g.set(x + 3, y + 2, "o");
  g.set(x + 5, y + 2, "y");
  g.set(x + 6, y + 2, "y");
  g.set(x + 8, y + 2, "o");
  g.set(x + 9, y + 2, "y");
  g.set(x + 3, y + 3, "y");
  g.set(x + 4, y + 3, "y");
  g.set(x + 6, y + 3, "o");
  g.set(x + 7, y + 3, "y");
  g.set(x + 4, y + 4, "y");
  g.set(x + 7, y + 4, "o");
  g.rect(x + 1, y + 6, 10, 1, "s");
  for (let xx = x + 1; xx < x + 11; xx++) {
    g.set(xx, y + 7, (xx - x) % 2 === 0 ? "w" : "R");
    g.set(xx, y + 8, (xx - x) % 2 === 0 ? "R" : "w");
    g.set(xx, y + 9, (xx - x) % 2 === 0 ? "w" : "R");
    g.set(xx, y + 10, (xx - x) % 2 === 0 ? "R" : "w");
  }
  g.rect(x + 1, y + 11, 10, 2, "k");
  g.set(x, y + 12, "k");
  g.set(x + 11, y + 12, "k");
}

// v11: the carpet continuing east of the classic room, using the same
// perspective math anchored at the same vanishing point, so the floor
// pattern flows on seamlessly. Stamps are kept east of cell 160 so the
// classic room stays pixel-identical.
function setFloorPixelEast(g, wx, wd, ch) {
  const x = Math.round(80 + wx * wd);
  const y = Math.round(54 + 36 * wd);
  if (y >= 55 && y < 90 && x >= 160 && x < 448) g.set(x, y, ch);
}

function drawCarpetEast(g) {
  g.rect(160, 54, 288, 36, "a");

  // Big checker tiles in perspective.
  for (let y = 55; y < 90; y++) {
    const wd = (y - 54) / 36;
    for (let x = 160; x < 448; x++) {
      const wx = (x - 80) / wd;
      const col = Math.floor(wx / 16);
      const row = Math.floor(wd * 8);
      if ((col + row) % 2 === 0) g.set(x, y, "A");
    }
  }

  // Tile seams, horizontal and vertical.
  for (let row = 1; row <= 8; row++) {
    const y = Math.round(54 + 36 * (row / 8));
    if (y <= 54 || y >= 90) continue;
    for (let x = 160; x < 448; x++) {
      if ((x + row) % 2 === 0) g.set(x, y, "e");
    }
  }
  for (let wx = 80; wx <= 368; wx += 16) {
    for (let step = 0; step <= 72; step++) {
      const wd = 0.05 + (step / 72) * 0.92;
      if (step % 3 === 0) setFloorPixelEast(g, wx, wd, "e");
    }
  }

  // The neon pattern stamped across the east tiles.
  const CARPET_COLORS = ["p", "c", "y", "g", "O"];
  for (let tx = 80; tx <= 368; tx += 16) {
    for (let td = 1; td <= 8; td++) {
      const wd = td / 8;
      const hash = ((tx + 64) * 7 + td * 13) % 11;
      const wx = tx + (hash % 3) * 3 - 3;
      const color = CARPET_COLORS[hash % 5];
      const kind = hash % 5;
      if (kind === 0) {
        for (let i = 0; i < 4; i++) {
          for (let j = -i; j <= i; j++) {
            setFloorPixelEast(g, wx + j, wd + i * 0.02, color);
          }
        }
      } else if (kind === 1) {
        for (let i = 0; i < 4; i++) {
          for (let j = -(3 - i); j <= 3 - i; j++) {
            setFloorPixelEast(g, wx + j, wd + i * 0.02, color);
          }
        }
      } else if (kind === 2) {
        const rows = [[0], [-1, 1], [-2, 2], [-2, 2], [-1, 1], [0]];
        for (let i = 0; i < rows.length; i++) {
          for (const j of rows[i]) {
            setFloorPixelEast(g, wx + j, wd + i * 0.016, color);
          }
        }
      } else if (kind === 3) {
        for (let i = 0; i < 6; i++) {
          setFloorPixelEast(g, wx - 2 + i, wd + (i % 2 === 0 ? 0.012 : 0.048), color);
        }
      } else {
        setFloorPixelEast(g, wx, wd + 0.01, "w");
        setFloorPixelEast(g, wx, wd + 0.035, color);
      }
    }
  }
}

// The arcade room background (448x90): black ceiling tiles, hanging neon
// tubes with light cones, a pennant banner, star wall, framed posters,
// little green invaders marching across the wall, a row of distant
// cabinets playing tiny games, a change machine, a snack machine, a wall
// clock, a trophy poster, marquee glow pools on the carpet, a whole
// crowd of 8-bit visitors, neon signs with glow halos, and the classic
// neon-pattern arcade carpet. v11 stretches the room east: a whole
// aisle of glowing cabinets, a snack corner with a popcorn cart, a
// prize case with plushies, and the front doors under a neon star
// sign - so the camera can travel across the whole arcade.
function buildRoom() {
  const g = makeGrid(448, 90);
  g.rect(0, 0, 448, 90, "d");

  // Ceiling: black ceiling tiles with track lights along the edge.
  g.rect(0, 0, 448, 5, "k");
  for (let x = 0; x < 448; x += 16) g.rect(x, 0, 1, 5, "d");
  for (let x = 2; x < 448; x += 9) {
    g.set(x, 5, "S");
    g.set(x + 1, 6, "s");
  }

  // Hanging fluorescent tubes, each with a soft cone of light.
  for (const tx of [32, 128, 224, 320, 416]) {
    g.rect(tx - 8, 2, 16, 1, "s");
    g.rect(tx - 7, 3, 14, 1, "x");
    g.set(tx - 7, 3, "w");
    g.set(tx + 6, 3, "w");
    for (let yy = 5; yy < 30; yy++) {
      const hw = 4 + Math.floor((yy - 4) * 0.55);
      for (let xx = tx - hw; xx <= tx + hw; xx++) {
        if ((xx + yy * 3) % 7 === 0) g.set(xx, yy, "x");
        else if ((xx + yy) % 5 === 0) g.set(xx, yy, "M");
      }
    }
  }

  // Party pennant banner strung across the back wall.
  for (let x = 0; x < 448; x++) g.set(x, 7, "s");
  const flagColors = ["p", "y", "c", "g"];
  for (let x = 3; x < 446; x += 8) {
    const ch = flagColors[Math.floor(x / 8) % 4];
    g.set(x, 8, ch);
    g.set(x + 1, 8, ch);
    g.set(x + 2, 8, ch);
    g.set(x, 9, ch);
    g.set(x + 1, 9, ch);
    g.set(x, 10, ch);
  }

  // Wall panel seams.
  for (let x = 20; x < 448; x += 44) g.rect(x, 6, 1, 48, "M");

  // Wall texture + stars in four colors.
  const starColors = ["w", "x", "m", "y"];
  for (let y = 6; y < 54; y++) {
    for (let x = 0; x < 448; x++) {
      const n = (x * 31 + y * 17) % 53;
      if (n === 0) g.set(x, y, starColors[(x + y) % 4]);
      else if ((x * 7 + y * 13) % 29 === 0) g.set(x, y, "K");
    }
  }

  // Fade the top of the wall into shadow.
  for (let y = 6; y < 15; y++) {
    for (let x = 0; x < 448; x++) {
      if ((x * 7 + y * 11) % 4 === 0) g.set(x, y, "M");
    }
  }

  // Bright 4-point sparkles.
  for (let i = 0; i < 14; i++) {
    const sx = ((i * 37 + 13) % 150) + 4;
    const sy = ((i * 23 + 7) % 38) + 8;
    g.set(sx, sy, "w");
    if (i % 3 === 0) {
      g.set(sx - 1, sy, "x");
      g.set(sx + 1, sy, "x");
      g.set(sx, sy - 1, "x");
      g.set(sx, sy + 1, "x");
    }
  }

  // Baseboard where the wall meets the carpet.
  g.rect(0, 52, 448, 1, "S");
  g.rect(0, 53, 448, 1, "s");

  // The famous arcade carpet, carried on across the east wing.
  drawCarpet(g);
  drawCarpetEast(g);

  // Neon light from the signs spilling onto the carpet.
  for (let y = 58; y < 68; y++) {
    for (let x = 6; x < 46; x++) {
      if ((x + y) % 2 === 0 && (x * 7 + y * 5) % 13 < 6) g.set(x, y, "P");
    }
  }
  for (let y = 60; y < 70; y++) {
    for (let x = 116; x < 154; x++) {
      if ((x + y) % 2 === 0 && (x * 5 + y * 7) % 13 < 6) g.set(x, y, "C");
    }
  }

  // Glossy reflections: bright sheens right under the neon signs.
  for (let y = 56; y < 66; y++) {
    for (let x = 20; x < 26; x++) {
      if ((x + y) % 2 === 0) g.set(x, y, "m");
    }
  }
  for (let y = 58; y < 68; y++) {
    for (let x = 133; x < 139; x++) {
      if ((x + y) % 2 === 0) g.set(x, y, "x");
    }
  }

  // A soft shadow where the hero machine stands.
  for (let y = 74; y <= 86; y++) {
    const half = Math.round(26 * (1 - Math.abs(y - 80) / 7) + 4);
    for (let x = 80 - half; x <= 80 + half; x++) {
      if ((x + y) % 2 === 0) g.set(x, y, "k");
    }
  }

  // A whole row of distant cabinets, plus the change machine.
  farCabinet(g, 6, 30, "p", "pong");
  farCabinet(g, 26, 32, "y", "");
  farCabinet(g, 58, 31, "B", "pong");
  farCabinet(g, 78, 32, "g", "invader");
  farCabinet(g, 116, 31, "O", "");
  farCabinet(g, 134, 32, "c", "invader");
  changeMachine(g);

  // Framed posters on the walls: a rocket, a race car, and a trophy cup.
  poster(g, 44, 14, "rocket");
  poster(g, 104, 16, "car");
  poster(g, 98, 32, "trophy");

  // Pools of marquee light on the carpet under the glowing cabinets.
  glowPool(g, 14, 58, "P");
  glowPool(g, 34, 60, "o");
  glowPool(g, 66, 59, "C");
  glowPool(g, 86, 60, "G");
  glowPool(g, 124, 59, "P");
  glowPool(g, 142, 60, "C");
  glowPool(g, 154, 57, "o");

  // A wall clock (with a red second hand) and a snack machine by the
  // cabinets, so the back wall feels like a real arcade corner.
  stamp(g, CLOCK, 35, 12);
  g.set(39, 16, "R");
  vendingMachine(g, 42, 30);

  // Pink star sign with a glow halo.
  addHalo(g, 14, 10, 16, 20, "P");
  g.rect(14, 10, 16, 20, "p");
  g.rect(15, 11, 14, 18, "k");
  stamp(g, STAR, 18, 15);
  g.set(22, 17, "w");

  // Cyan lightning bolt sign with a glow halo.
  addHalo(g, 128, 12, 18, 20, "C");
  g.rect(128, 12, 18, 20, "c");
  g.rect(129, 13, 16, 18, "k");
  stamp(g, BOLT, 134, 17);

  // Little green invaders marching across the wall.
  stamp(g, INVADER, 34, 20);
  stamp(g, INVADER, 44, 5);
  stamp(g, INVADER, 106, 6);
  stamp(g, INVADER, 117, 18);

  // The crowd: 8-bit visitors. The ones facing away are the players
  // glued to their machines; the rest are watching the room.
  drawPerson(g, 31, 47, { hair: "r", skin: "N", shirt: "y", pants: "B" }, "back");
  drawPerson(g, 46, 52, { hair: "k", skin: "N", shirt: "p", pants: "S" }, "back");
  drawPerson(g, 150, 51, { hair: "y", skin: "T", shirt: "c", pants: "B" }, "back");
  drawPerson(g, 16, 50, { hair: "m", skin: "N", shirt: "k", pants: "E" }, "stand");
  drawPerson(g, 24, 63, { hair: "k", skin: "T", shirt: "g", pants: "B" }, "stand");
  drawPerson(g, 108, 58, { hair: "B", skin: "N", shirt: "o", pants: "K" }, "stand");

  // ---- v11: THE EAST WING ----
  // The arcade keeps going: an aisle of glowing cabinets, the snack
  // corner, the prize case, and the front doors. The camera show
  // travels through all of it.
  drawCarpetEast(g);

  // An aisle of distant cabinets, each playing its own little game.
  farCabinet(g, 166, 31, "p", "pong");
  farCabinet(g, 186, 32, "y", "");
  farCabinet(g, 208, 31, "B", "invader");
  farCabinet(g, 228, 32, "c", "pong");

  // Posters and invaders keep the east wall busy.
  poster(g, 200, 14, "rocket");
  poster(g, 246, 16, "car");
  poster(g, 310, 14, "trophy");
  stamp(g, INVADER, 180, 8);
  stamp(g, INVADER, 300, 20);
  stamp(g, INVADER, 390, 18);

  // Pools of marquee light under the east cabinets.
  glowPool(g, 174, 58, "P");
  glowPool(g, 194, 60, "o");
  glowPool(g, 216, 59, "C");
  glowPool(g, 236, 60, "G");

  // The snack corner: a second vending machine, a popcorn cart, a
  // glowing snack sign, and a counter with red stools.
  vendingMachine(g, 258, 30);
  popcornCart(g, 270, 44);
  addHalo(g, 262, 14, 24, 10, "o");
  g.rect(262, 14, 24, 10, "y");
  g.rect(263, 15, 22, 8, "k");
  g.set(266, 17, "c"); g.set(267, 17, "c"); g.set(266, 18, "c"); g.set(267, 18, "c");
  g.set(266, 19, "w"); g.set(267, 19, "w");
  g.set(272, 17, "O"); g.set(273, 17, "y"); g.set(272, 18, "R"); g.set(273, 18, "O");
  g.set(278, 17, "p"); g.set(279, 17, "m"); g.set(278, 18, "p"); g.set(279, 18, "p");
  g.set(283, 17, "g"); g.set(284, 17, "g"); g.set(283, 18, "w"); g.set(284, 18, "g");
  g.rect(292, 52, 34, 6, "K");
  g.rect(292, 52, 34, 1, "l");
  g.rect(292, 57, 34, 1, "k");
  for (const sx of [296, 306, 316]) {
    g.set(sx, 60, "r"); g.set(sx + 1, 60, "r");
    g.set(sx, 61, "S"); g.set(sx + 1, 61, "S");
    g.set(sx, 62, "k"); g.set(sx + 1, 62, "k");
  }
  glowPool(g, 263, 58, "o");
  glowPool(g, 306, 58, "y");

  // The prize case: glass, a shelf, plushies, a star and a ball.
  addHalo(g, 330, 30, 26, 9, "P");
  g.rect(330, 30, 26, 9, "p");
  g.rect(331, 31, 24, 7, "k");
  stamp(g, STAR, 338, 31);
  g.rect(330, 42, 26, 16, "S");
  g.rect(331, 43, 24, 11, "k");
  g.rect(331, 49, 24, 1, "S");
  g.set(334, 46, "r");
  g.set(334, 47, "r"); g.set(335, 47, "r");
  g.set(334, 48, "r"); g.set(335, 48, "r");
  g.set(342, 47, "y"); g.set(343, 47, "y");
  g.set(342, 48, "y"); g.set(343, 48, "y");
  g.set(350, 47, "B"); g.set(351, 47, "B");
  g.set(350, 48, "B"); g.set(351, 48, "B");
  g.set(338, 51, "g"); g.set(339, 51, "g");
  g.set(346, 51, "c"); g.set(347, 51, "c");
  g.rect(331, 54, 24, 2, "d");
  glowPool(g, 343, 58, "P");

  // The front doors: steel frame, glass panes, push bars, a welcome
  // mat, and a neon star sign burning above them.
  addHalo(g, 402, 5, 36, 10, "C");
  g.rect(402, 5, 36, 10, "c");
  g.rect(403, 6, 34, 8, "k");
  stamp(g, STAR, 416, 6);
  g.rect(400, 18, 40, 40, "S");
  g.rect(402, 20, 36, 36, "d");
  g.rect(404, 22, 15, 32, "x");
  g.rect(421, 22, 15, 32, "x");
  g.rect(404, 22, 15, 1, "w");
  g.rect(421, 22, 15, 1, "w");
  for (let i = 0; i < 10; i++) {
    g.set(406 + i, 24 + i, "w");
    g.set(423 + i, 24 + i, "w");
  }
  g.rect(419, 20, 2, 36, "S");
  g.rect(406, 36, 11, 1, "s");
  g.rect(422, 36, 11, 1, "s");
  g.rect(402, 56, 36, 2, "k");
  g.rect(404, 60, 32, 12, "r");
  g.rect(406, 62, 28, 8, "k");
  g.set(410, 66, "y"); g.set(420, 66, "y"); g.set(430, 66, "y");
  for (let y = 58; y < 64; y++) {
    for (let x = 404; x < 436; x++) {
      if ((x + y) % 2 === 0 && (x * 7 + y * 5) % 13 < 6) g.set(x, y, "C");
    }
  }

  // The east crowd: players glued to the new cabinets, snackers at the
  // counter, a kid admiring the prizes, and someone at the doors.
  drawPerson(g, 171, 47, { hair: "B", skin: "T", shirt: "c", pants: "K" }, "back");
  drawPerson(g, 191, 52, { hair: "y", skin: "N", shirt: "V", pants: "S" }, "back");
  drawPerson(g, 213, 47, { hair: "m", skin: "N", shirt: "y", pants: "k" }, "back");
  drawPerson(g, 286, 62, { hair: "r", skin: "N", shirt: "g", pants: "k" }, "stand");
  drawPerson(g, 297, 57, { hair: "y", skin: "T", shirt: "p", pants: "E" }, "stand");
  drawPerson(g, 332, 58, { hair: "y", skin: "N", shirt: "p", pants: "S" }, "stand");
  drawPerson(g, 412, 56, { hair: "k", skin: "T", shirt: "c", pants: "K" }, "stand");

  return g;
}
