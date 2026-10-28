// Tiny pixel-art engine: sprites are drawn pixel by pixel with code,
// the same way real 8-bit game graphics were made. No image files at all.

const PALETTE = {
  ".": null,          // transparent
  k: "#05070f",      // black (screen)
  K: "#12172b",      // dark navy (cabinet body)
  S: "#232c4f",      // steel
  s: "#39406b",      // light steel
  d: "#0d1326",      // room dark
  c: "#00e5ff",      // neon cyan
  p: "#ff2d95",      // neon pink
  y: "#ffd60a",      // gold / yellow
  g: "#39ff88",      // neon green
  w: "#ffffff",      // white
  o: "#b8860b",      // dark gold (coin edge)
  r: "#8f1043",      // deep red (marquee frame)
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

// The arcade machine: a 44x68 sprite built from code rectangles.
// meta records where the screen, buttons, joystick and coin slot are,
// so the page can place real clickable elements on top of the art.
function buildMachine() {
  const g = makeGrid(44, 68);

  g.rect(4, 0, 36, 64, "K");   // cabinet body
  g.rect(4, 0, 36, 1, "s");    // top edge
  g.rect(4, 63, 36, 1, "s");   // bottom edge
  g.rect(4, 0, 1, 64, "s");    // left edge
  g.rect(39, 0, 1, 64, "s");   // right edge

  g.rect(6, 1, 32, 2, "s");    // bulb strip
  for (let x = 8; x < 38; x++) {
    if (x % 2 === 0) g.set(x, 1, "y"); else g.set(x, 2, "y");
  }

  g.rect(6, 4, 32, 9, "r");    // marquee frame
  g.rect(7, 5, 30, 7, "p");    // marquee face
  g.set(9, 6, "w");            // shine pixels
  g.set(10, 7, "w");
  g.set(11, 8, "w");

  g.rect(6, 13, 32, 1, "S");   // steel band

  g.rect(6, 15, 32, 38, "S");  // screen bezel
  g.rect(7, 16, 30, 36, "k"); // the screen (black)

  g.rect(6, 53, 32, 2, "S");   // bezel bottom
  g.rect(6, 55, 32, 1, "s");   // trim line

  g.rect(6, 56, 32, 5, "S");   // control deck
  g.rect(7, 57, 30, 4, "d");   // deck face

  g.set(12, 57, "p");          // joystick ball
  g.set(12, 58, "k");          // joystick stem
  g.set(12, 59, "k");
  g.set(11, 60, "s");          // joystick base
  g.set(12, 60, "s");
  g.set(13, 60, "s");

  const buttonXs = [26, 30, 34];
  const buttonColors = ["p", "y", "c"];
  for (let i = 0; i < buttonXs.length; i++) {
    const bx = buttonXs[i];
    g.set(bx, 57, "s");
    g.set(bx - 1, 58, "s");
    g.set(bx, 58, buttonColors[i]);
    g.set(bx + 1, 58, "s");
    g.set(bx, 59, "s");
  }

  g.rect(6, 61, 32, 2, "K");   // front panel
  g.rect(17, 61, 10, 2, "S");  // coin door frame
  g.rect(18, 61, 8, 2, "k");   // coin door
  g.set(21, 61, "y");          // coin slot
  g.set(22, 61, "y");

  g.rect(8, 64, 6, 4, "S");    // feet
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
        { x: 26, y: 58, key: "p", color: "#ff2d95" },
        { x: 30, y: 58, key: "y", color: "#ffd60a" },
        { x: 34, y: 58, key: "c", color: "#00e5ff" },
      ],
      stick: { x: 12, y: 58 },
    },
  };
}

// The gold coin (12x12).
function buildCoin() {
  const art = [
    "...oooooo...",
    "..oyyyyyyo..",
    ".oyywyyyyyo.",
    ".oywwyyyyyo.",
    "oyywwyyyyyyo",
    "oyywyyyyyyyo",
    "oyyyyyyyyyyo",
    ".oyyyyyyyyo.",
    ".oyyyyyyyyo.",
    "..oyyyyyyo..",
    "...oooooo...",
    "............",
  ];
  const g = makeGrid(12, 12);
  for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 12; x++) {
      g.set(x, y, art[y][x]);
    }
  }
  return g;
}

// The arcade room background (160x90): dithered wall, star pixels,
// two glowing wall signs, and a checkered tile floor.
function buildRoom() {
  const g = makeGrid(160, 90);
  g.rect(0, 0, 160, 90, "d");

  for (let y = 0; y < 54; y++) {
    for (let x = 0; x < 160; x++) {
      const n = (x * 31 + y * 17) % 53;
      if (n === 0) g.set(x, y, "w");
      else if (n === 1) g.set(x, y, "c");
      else if ((x * 7 + y * 13) % 29 === 0) g.set(x, y, "K");
    }
  }

  // Pink wall sign
  g.rect(14, 10, 16, 20, "p");
  g.rect(15, 11, 14, 18, "k");
  g.rect(17, 14, 10, 3, "p");
  g.rect(19, 20, 6, 2, "p");
  g.rect(18, 24, 8, 2, "p");

  // Cyan wall sign
  g.rect(130, 14, 14, 18, "c");
  g.rect(131, 15, 12, 16, "k");
  g.rect(133, 18, 8, 3, "c");
  g.rect(135, 24, 4, 2, "c");

  // Floor: checkered tiles
  g.rect(0, 54, 160, 1, "K");
  for (let y = 55; y < 90; y++) {
    for (let x = 0; x < 160; x++) {
      const tx = Math.floor(x / 8);
      const ty = Math.floor(y / 8);
      const checker = (tx + ty) % 2 === 0;
      g.set(x, y, checker ? "S" : "d");
      if ((tx * 7 + ty) % 11 === 0) g.set(x, y, "s");
    }
  }

  return g;
}
