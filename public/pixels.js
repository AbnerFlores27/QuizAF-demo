// Tiny pixel-art engine: sprites are drawn pixel by pixel with code,
// the same way real 8-bit game graphics were made. No image files at all.

const PALETTE = {
  ".": null,          // transparent
  k: "#05070f",      // near black (screen / slots)
  K: "#12172b",      // dark navy (cabinet body)
  S: "#232c4f",      // steel
  s: "#39406b",      // light steel
  d: "#0d1326",      // room dark
  c: "#00e5ff",      // neon cyan
  p: "#ff2d95",      // neon pink
  y: "#ffd60a",      // gold / yellow
  g: "#39ff88",      // neon green
  w: "#ffffff",      // white
  x: "#9fe9ff",      // pale cyan (star shine)
  o: "#b8860b",      // dark gold (coin edge / trim)
  r: "#8f1043",      // deep red (marquee frame)
  B: "#2a6bff",      // electric blue (deck button)
  l: "#56608f",      // chrome highlight
  F: "#1d2547",      // floor tile (light)
  f: "#101628",      // floor tile (dark)
  E: "#3b4a80",      // floor tile edge
  P: "#4d0f31",      // pink glow shadow
  C: "#0b4a55",      // cyan glow shadow
  M: "#1c1030",      // purple wall shade
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

// The arcade machine: a 44x68 sprite built from code rectangles.
// meta records where the screen, buttons, joystick and coin slot are,
// so the page can place real clickable elements on top of the art.
function buildMachine() {
  const g = makeGrid(44, 68);

  // Cabinet body.
  g.rect(4, 0, 36, 64, "K");
  g.rect(4, 0, 36, 1, "l");    // top highlight
  g.rect(4, 63, 36, 1, "s");   // bottom edge
  g.rect(4, 0, 1, 64, "S");    // left edge
  g.rect(39, 0, 1, 64, "S");   // right edge

  // Neon tubes running down both side edges.
  for (let y = 1; y < 63; y++) {
    const seg = Math.floor(y / 5) % 4;
    g.set(4, y, seg === 0 ? "c" : seg === 2 ? "p" : "S");
    g.set(39, y, seg === 0 ? "p" : seg === 2 ? "c" : "S");
  }

  // Bulb strip under the roof.
  g.rect(6, 1, 32, 2, "S");
  for (let x = 8; x < 38; x++) {
    g.set(x, 1, x % 2 === 0 ? "y" : "w");
    g.set(x, 2, x % 2 === 0 ? "w" : "y");
  }

  // Marquee: red frame, pink face, shine pixels, gold trim underneath.
  g.rect(6, 4, 32, 9, "r");
  g.rect(7, 5, 30, 7, "p");
  g.rect(7, 11, 30, 1, "P");
  g.set(9, 6, "w");
  g.set(10, 7, "w");
  g.set(11, 8, "w");
  g.rect(6, 13, 32, 1, "o");

  // Screen bezel with a chrome top edge.
  g.rect(6, 14, 32, 1, "l");
  g.rect(6, 15, 32, 38, "S");
  g.rect(7, 16, 30, 36, "k"); // the screen (the overlay sits here)
  g.rect(6, 53, 32, 1, "s");

  // Speaker grille dots.
  for (let x = 8; x < 38; x += 2) {
    g.set(x, 54, "s");
    g.set(x + 1, 54, "d");
  }
  g.rect(6, 55, 32, 1, "s"); // trim line

  // Control deck with a chrome edge.
  g.rect(6, 56, 32, 1, "l");
  g.rect(6, 57, 32, 4, "S");
  g.rect(7, 57, 30, 4, "d");

  // Joystick: ball with a shine, stem, and base ring.
  g.rect(11, 56, 2, 2, "p");
  g.set(11, 56, "w");
  g.set(12, 58, "k");
  g.set(12, 59, "k");
  g.set(11, 60, "s");
  g.set(12, 60, "s");
  g.set(13, 60, "s");

  // Four deck buttons: BLUE, CYAN, PINK, YELLOW.
  const buttonXs = [22, 26, 30, 34];
  const buttonColors = ["B", "c", "p", "y"];
  for (let i = 0; i < buttonXs.length; i++) {
    const bx = buttonXs[i];
    g.set(bx, 57, "s");
    g.set(bx - 1, 58, "s");
    g.set(bx, 58, buttonColors[i]);
    g.set(bx + 1, 58, "s");
    g.set(bx, 59, "s");
  }

  // Front panel: gold coin door with a slot, plus a green power LED.
  g.rect(6, 61, 32, 2, "K");
  g.rect(17, 61, 10, 2, "o");
  g.rect(18, 61, 8, 2, "k");
  g.set(20, 61, "y");
  g.set(21, 61, "y");
  g.set(22, 61, "y");
  g.set(19, 62, "s");
  g.set(26, 62, "s");
  g.set(7, 62, "g");

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

// A distant arcade cabinet standing in the room, screen glowing.
function farCabinet(g, x, y, marqueeColor) {
  g.rect(x, y, 16, 28, "K");
  g.rect(x, y, 16, 1, "S");
  g.rect(x, y + 27, 16, 1, "k");
  g.rect(x + 1, y + 2, 14, 3, marqueeColor);
  g.rect(x + 2, y + 7, 12, 9, "k");
  g.rect(x + 4, y + 9, 8, 5, "C");
  g.rect(x + 6, y + 10, 4, 3, "c");
  g.rect(x + 2, y + 18, 12, 6, "S");
  g.rect(x + 4, y + 20, 2, 2, "p");
  g.set(x + 10, y + 20, "y");
}

// The arcade room background (160x90): ceiling, starfield wall with
// panel seams, neon signs with glow halos, distant cabinets, and a
// perspective checkered floor with light spilling onto it.
function buildRoom() {
  const g = makeGrid(160, 90);
  g.rect(0, 0, 160, 90, "d");

  // Ceiling band with little lights.
  g.rect(0, 0, 160, 5, "k");
  for (let x = 2; x < 160; x += 9) {
    g.set(x, 5, "S");
    g.set(x + 1, 6, "s");
  }

  // Wall panel seams.
  for (let x = 20; x < 160; x += 44) g.rect(x, 6, 1, 48, "M");

  // Wall texture + tiny stars.
  for (let y = 6; y < 54; y++) {
    for (let x = 0; x < 160; x++) {
      const n = (x * 31 + y * 17) % 53;
      if (n === 0) g.set(x, y, "w");
      else if (n === 1) g.set(x, y, "x");
      else if ((x * 7 + y * 13) % 29 === 0) g.set(x, y, "K");
    }
  }

  // Fade the top of the wall into shadow.
  for (let y = 6; y < 15; y++) {
    for (let x = 0; x < 160; x++) {
      if ((x * 7 + y * 11) % 4 === 0) g.set(x, y, "M");
    }
  }

  // A few bright 4-point sparkles.
  for (let i = 0; i < 12; i++) {
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

  // Perspective checkered floor: tiles get smaller toward the horizon.
  g.rect(0, 54, 160, 1, "K");
  for (let y = 55; y < 90; y++) {
    const t = (y - 54) / 36;
    const cw = 3 + 27 * t * t;
    const band = Math.floor(t * t * 8);
    for (let x = 0; x < 160; x++) {
      const col = Math.floor(x / cw);
      const checker = (col + band) % 2 === 0;
      let ch = checker ? "F" : "f";
      if (t < 0.45) ch = checker ? "f" : "d";
      if (t > 0.15 && x - col * cw < 0.9) ch = "E";
      g.set(x, y, ch);
    }
  }

  // Neon light from the signs spilling onto the floor.
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

  // Distant cabinets standing on the floor, left and right.
  farCabinet(g, 8, 30, "p");
  farCabinet(g, 132, 32, "c");

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

  return g;
}
