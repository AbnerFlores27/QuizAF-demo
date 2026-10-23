// Abner's Arcade v11: THE BIG ARCADE. The room now stretches way past
// the hero machine - a whole aisle of glowing cabinets, a snack corner,
// a prize case, and the front doors - and the attract camera show
// TRAVELS across it: it starts at the doors and glides the entire
// length of the arcade before cutting between close-up shots. Pressing
// play lands the camera home with a slower, cinematic zoom onto the
// machine. The art is drawn in pixels.js; this file places clickable
// parts on top of it. The real auth work still happens in auth.js +
// the server.

const MACHINE = { gridW: 44, gridH: 68, scale: 9 };

// One shared audio voice. (Before, every beep built a brand-new one and
// browsers ran out of voices after a few clicks - the arcade went silent.)
let audioCtx = null;

function playTone(frequency, duration, type, volume) {
  // Little 8-bit style beeps made with the browser's sound tools - no files.
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume || 0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (duration || 0.12));
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (duration || 0.12) + 0.03);
  } catch {
    // Sound is a bonus - never let it break the page.
  }
}

function coinDing() {
  playTone(880, 0.09);
  setTimeout(() => playTone(1318, 0.28), 90);
}

function denyBuzz() {
  playTone(110, 0.3, "sawtooth", 0.08);
}

async function fetchPlayer() {
  try {
    const response = await fetch("/api/auth/me");
    const data = await response.json();
    return data.user || null;
  } catch {
    return null;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const room = document.getElementById("arcade-room");
  const wrap = document.getElementById("machine-wrap");
  const machineCanvas = document.getElementById("machine-canvas");
  const screenOverlay = document.getElementById("screen-overlay");
  const stickEl = document.getElementById("joystick");

  // ---- THE CAMERA ----
  // Everything you see (the room + the machine) sits inside one "scene"
  // box that we pan and zoom like a TV camera. Before you play, an
  // attract loop cuts between shots of the arcade; pressing play glides
  // the camera back to the hero machine first.
  const scene = document.createElement("div");
  scene.className = "camera-scene";
  room.insertBefore(scene, room.firstChild);
  scene.appendChild(document.getElementById("room-canvas"));
  scene.appendChild(wrap);

  const VIEW_W = 160; // the classic room window, in cells
  const ROOM_H = 90;
  const WORLD_W = 448; // the whole arcade the camera can travel across
  const HOME = { x: 80, y: 45, z: 1 };

  // The classic window is 160x90 cells stretched to COVER the room box;
  // the whole world is 448 cells wide and trails off to the right,
  // waiting for the camera. This maps a world point to the page.
  function coverMap() {
    const W = room.clientWidth;
    const H = room.clientHeight;
    const drawnW = Math.max(W, (H * VIEW_W) / ROOM_H);
    const drawnH = (drawnW * ROOM_H) / VIEW_W;
    return {
      W: W,
      H: H,
      drawnW: drawnW,
      drawnH: drawnH,
      offX: (W - drawnW) / 2,
      offY: (H - drawnH) / 2,
      worldW: (drawnW * WORLD_W) / VIEW_W,
    };
  }

  function gridToScene(px, py, map) {
    return {
      x: map.offX + (px / WORLD_W) * map.worldW,
      y: map.offY + (py / ROOM_H) * map.drawnH,
    };
  }

  // Size the room canvas so the classic 160-cell window sits exactly
  // where it always did, and the rest of the world trails off to the
  // right, waiting for the camera to travel it.
  function fitScene() {
    const map = coverMap();
    const cv = document.getElementById("room-canvas");
    cv.style.left = map.offX + "px";
    cv.style.top = map.offY + "px";
    cv.style.width = map.worldW + "px";
    cv.style.height = map.drawnH + "px";
  }
  fitScene();

  let currentShot = HOME;

  // ms = 0 means a hard cut; a bigger ms is a smooth camera move.
  function cameraTo(shot, ms) {
    const map = coverMap();
    const p = gridToScene(shot.x, shot.y, map);
    scene.style.transition = ms > 0 ? "transform " + ms + "ms ease-in-out" : "none";
    scene.style.transform =
      "translate(" + (map.W / 2 - shot.z * p.x) + "px, " +
      (map.H / 2 - shot.z * p.y) + "px) scale(" + shot.z + ")";
    currentShot = shot;
  }

  // ---- WALKING VISITORS ----
  // Three 8-bit kids stroll the carpet on a two-frame walk cycle. They
  // live inside the camera scene, so they ride along with every shot -
  // and they pass BEHIND the hero machine, like real people would.
  const walkers = [
    { outfit: { hair: "p", skin: "N", shirt: "k", pants: "B" }, x: 34, feetY: 68, dir: 1, speed: 0.45, frame: 0, minX: 10, maxX: 148 },
    { outfit: { hair: "y", skin: "T", shirt: "c", pants: "S" }, x: 126, feetY: 76, dir: -1, speed: 0.4, frame: 1, minX: 10, maxX: 148 },
    // v11: a kid strolling the east wing too, past the snack corner.
    { outfit: { hair: "g", skin: "N", shirt: "r", pants: "K" }, x: 320, feetY: 70, dir: -1, speed: 0.35, frame: 0, minX: 168, maxX: 436 },
  ];

  function placeWalker(w) {
    const map = coverMap();
    const p = gridToScene(w.x, w.feetY, map);
    const size = (map.drawnW / VIEW_W) * 8;
    const height = (size / 8) * 13;
    w.el.style.width = size + "px";
    w.el.style.height = height + "px";
    w.el.style.left = p.x - size / 2 + "px";
    w.el.style.top = p.y - height + "px";
  }

  function drawWalkerFrame(w) {
    renderGrid(w.cv, buildWalker(w.outfit, w.frame === 0 ? "walk1" : "walk2"), 8);
  }

  walkers.forEach((w) => {
    w.el = document.createElement("div");
    w.el.className = "walker";
    w.cv = document.createElement("canvas");
    w.el.appendChild(w.cv);
    scene.appendChild(w.el);
    placeWalker(w);
    drawWalkerFrame(w);
  });

  let walkTick = 0;
  setInterval(() => {
    walkTick += 1;
    walkers.forEach((w) => {
      w.x += w.dir * w.speed;
      if (w.x > w.maxX) w.dir = -1;
      if (w.x < w.minX) w.dir = 1;
      if (walkTick % 2 === 0) w.frame = 1 - w.frame;
      placeWalker(w);
      drawWalkerFrame(w);
    });
  }, 90);

  // Draw the pixel art.
  const machine = buildMachine();
  renderGrid(machineCanvas, machine.grid, MACHINE.scale);
  renderGrid(document.getElementById("room-canvas"), buildRoom(), 8);
  renderGrid(document.getElementById("coin-canvas"), buildCoin(), 7);

  // Place the overlays exactly on the art, using percentages so they
  // stay glued on at any screen size.
  const pct = (n, total) => String((n / total) * 100) + "%";
  const m = machine.meta;
  const so = screenOverlay.style;
  so.left = pct(m.screen.x, MACHINE.gridW);
  so.top = pct(m.screen.y, MACHINE.gridH);
  so.width = pct(m.screen.w, MACHINE.gridW);
  so.height = pct(m.screen.h, MACHINE.gridH);

  const mq = document.getElementById("marquee-overlay").style;
  mq.left = pct(m.marquee.x, MACHINE.gridW);
  mq.top = pct(m.marquee.y, MACHINE.gridH);
  mq.width = pct(m.marquee.w, MACHINE.gridW);
  mq.height = pct(m.marquee.h, MACHINE.gridH);

  const buttonIds = { b: "btn-b", c: "btn-c", p: "btn-p", y: "btn-y" };
  const stickPos = stickEl.style;

  // Size the hit zones to the art and re-place them whenever the window
  // changes, so the buttons never overlap on small screens.
  function layoutControls() {
    const unit = wrap.offsetWidth / MACHINE.gridW;
    const btnSize = Math.round(unit * 3.8);
    const stickSize = Math.round(unit * 4.9);
    m.btns.forEach((btn) => {
      const el = document.getElementById(buttonIds[btn.key]).style;
      el.width = btnSize + "px";
      el.height = btnSize + "px";
      el.left = "calc(" + pct(btn.x + 0.5, MACHINE.gridW) + " - " + btnSize / 2 + "px)";
      el.top = "calc(" + pct(btn.y + 0.5, MACHINE.gridH) + " - " + btnSize / 2 + "px)";
    });
    stickPos.width = stickSize + "px";
    stickPos.height = stickSize + "px";
    stickPos.left = "calc(" + pct(m.stick.x + 0.5, MACHINE.gridW) + " - " + stickSize / 2 + "px)";
    stickPos.top = "calc(" + pct(m.stick.y + 0.5, MACHINE.gridH) + " - " + stickSize / 2 + "px)";
  }
  layoutControls();

  // Smart zoom: the machine grows for the coin moment, but never bigger
  // than the window, so the WHOLE cabinet (marquee to coin door) stays
  // on screen at every size.
  function fitZoom() {
    const w = wrap.offsetWidth || 396;
    const h = wrap.offsetHeight || 612;
    const fit = Math.min((window.innerHeight - 44) / h, (window.innerWidth - 24) / w);
    room.style.setProperty("--zoom-big", String(Math.max(0.8, Math.min(fit, 1.6))));
    room.style.setProperty("--zoom-form", String(Math.max(0.8, Math.min(fit * 0.85, 1.25))));
  }
  fitZoom();

  window.addEventListener("resize", () => {
    layoutControls();
    fitZoom();
    fitScene();
    walkers.forEach(placeWalker);
    cameraTo(currentShot, 0);
  });

  // The coin slot glint: a gold flash right where the flying coin lands.
  const glint = document.createElement("div");
  glint.className = "slot-glint";
  glint.style.left = pct(m.slot.x, MACHINE.gridW);
  glint.style.top = pct(m.slot.y, MACHINE.gridH);
  wrap.appendChild(glint);

  function flashSlot() {
    glint.classList.remove("flash");
    void glint.offsetWidth;
    glint.classList.add("flash");
  }

  // Screens.
  const screens = {
    idle: document.getElementById("screen-idle"),
    coin: document.getElementById("screen-coin"),
    auth: document.getElementById("screen-auth"),
    in: document.getElementById("screen-in"),
    admin: document.getElementById("screen-admin"),
    denied: document.getElementById("screen-denied"),
  };

  let currentPlayer = null;

  function show(name) {
    Object.values(screens).forEach((el) => el.classList.add("hidden"));
    screens[name].classList.remove("hidden");
  }

  function crtBoot() {
    screenOverlay.classList.remove("boot");
    void screenOverlay.offsetWidth;
    screenOverlay.classList.add("boot");
  }

  // Attract mode: the idle screen cycles lines like a real arcade machine.
  const attractLines = [
    "HIGH SCORE QUIZZES",
    "5 CABINETS",
    "WIN TICKETS",
    "FREE PLAY",
  ];
  let attractIndex = 0;
  setInterval(() => {
    if (screens.idle.classList.contains("hidden")) return;
    attractIndex = (attractIndex + 1) % attractLines.length;
    document.getElementById("idle-line").textContent = attractLines[attractIndex];
  }, 2400);

  // Logged in already? Jump straight to the welcome screen.
  fetchPlayer().then((player) => {
    if (player) {
      currentPlayer = player;
      stopAttractShow();
      cameraTo(HOME, 0);
      room.classList.add("zoomed", "form-view", "skip-anim");
      document.getElementById("welcome-title").textContent = "HI, " + player.username.toUpperCase() + "!";
      if (player.role === "admin") {
        document.getElementById("admin-badge").classList.remove("hidden");
      }
      show("in");
    }
  });

  // ---- THE ATTRACT CAMERA SHOW ----
  // Like the demo loop on a real arcade machine: while nobody is
  // playing, the camera cuts and GLIDES ACROSS THE WHOLE ARCADE.
  const SHOTS = [
    // THE WALK-IN: we start at the front doors and glide the whole way
    // across the arcade to the hero machine. A real ride through the room.
    { cam: { x: 420, y: 40, z: 2.3 }, ms: 0, hold: 1600,
      pan: { x: 150, y: 47, z: 1.5 }, panMs: 8000, hold2: 800 },
    // CUT: down the east aisle of cabinets, then a slow pan along the row.
    { cam: { x: 168, y: 44, z: 2.05 }, ms: 0, hold: 600,
      pan: { x: 244, y: 44, z: 2.05 }, panMs: 4200, hold2: 500 },
    // CUT: the snack corner - vending machine, popcorn cart, stools.
    { cam: { x: 312, y: 42, z: 2 }, ms: 0, hold: 2600 },
    // CUT: the prize case with the plushies.
    { cam: { x: 343, y: 40, z: 2.1 }, ms: 0, hold: 2200 },
    // CUT: the crowd on the carpet by the hero machine.
    { cam: { x: 96, y: 72, z: 1.9 }, ms: 0, hold: 2300 },
    // CUT: the neon signs.
    { cam: { x: 134, y: 20, z: 2.15 }, ms: 0, hold: 2100 },
    // THE WHOLE ARCADE in one wide frame, then a slow landing on the
    // hero machine - the camera settles right where you play.
    { cam: { x: 224, y: 45, z: 0.36 }, ms: 0, hold: 3000,
      pan: { x: 80, y: 45, z: 1 }, panMs: 5400, hold2: 700 },
  ];
  let attractOn = true;
  let attractTimer = null;
  let shotIndex = 0;

  const hud = document.createElement("button");
  hud.type = "button";
  hud.className = "arcade-btn attract-hud";
  hud.textContent = "PRESS ENTER TO PLAY";
  room.appendChild(hud);

  function stopAttractShow() {
    attractOn = false;
    clearTimeout(attractTimer);
    hud.classList.add("hidden");
  }

  function nextShot() {
    if (!attractOn) return;
    const shot = SHOTS[shotIndex];
    cameraTo(shot.cam, shot.ms);
    clearTimeout(attractTimer);
    if (shot.pan) {
      attractTimer = setTimeout(() => {
        if (!attractOn) return;
        cameraTo(shot.pan, shot.panMs);
        attractTimer = setTimeout(() => {
          if (!attractOn) return;
          shotIndex = (shotIndex + 1) % SHOTS.length;
          nextShot();
        }, shot.panMs + (shot.hold2 || 0));
      }, shot.hold);
    } else {
      attractTimer = setTimeout(() => {
        if (!attractOn) return;
        shotIndex = (shotIndex + 1) % SHOTS.length;
        nextShot();
      }, shot.ms + shot.hold);
    }
  }
  nextShot();

  // PLAY: glide the camera home first, THEN the machine does its own
  // zoom-in with a CRT flicker - the slow zoom you feel in a real game.
  function machineBoot() {
    if (room.classList.contains("zoomed")) return;
    room.classList.remove("skip-anim");
    room.classList.add("zoomed");
    crtBoot();
    playTone(660, 0.08);
    show("coin");
  }

  function pressStart() {
    if (!attractOn || room.classList.contains("zoomed")) return;
    stopAttractShow();
    const atHome =
      currentShot.z === HOME.z && currentShot.x === HOME.x && currentShot.y === HOME.y;
    if (atHome) {
      machineBoot();
    } else {
      cameraTo(HOME, 2600);
      setTimeout(machineBoot, 2600);
    }
  }

  document.getElementById("enter-btn").addEventListener("click", pressStart);
  hud.addEventListener("click", pressStart);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !(event.target instanceof HTMLInputElement)) pressStart();
  });

  // INSERT COIN: the coin flies out of the screen and drops into the
  // machine's REAL coin slot. (It used to slide around inside the screen
  // box, which clips at its edges - so it could never reach the slot.
  // Now a pixel-art twin of the coin makes the trip instead.)
  document.getElementById("coin").addEventListener("click", (event) => {
    coinDing();

    const coin = event.currentTarget;
    const coinRect = coin.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    const zoom = wrapRect.width / (wrap.offsetWidth || 1);

    // Start = center of the on-screen coin. End = the coin slot on the
    // machine art. Both in un-zoomed machine coordinates.
    const startX = (coinRect.left + coinRect.width / 2 - wrapRect.left) / zoom;
    const startY = (coinRect.top + coinRect.height / 2 - wrapRect.top) / zoom;
    const endX = (wrap.offsetWidth * m.slot.x) / MACHINE.gridW;
    const endY = (wrap.offsetHeight * m.slot.y) / MACHINE.gridH;

    // Hide the coin button and launch the flying twin from the same spot.
    coin.style.visibility = "hidden";
    const flyer = document.createElement("canvas");
    flyer.className = "coin-fly";
    renderGrid(flyer, buildCoin(), 7);
    flyer.style.width = coinRect.width / zoom + "px";
    flyer.style.height = coinRect.height / zoom + "px";
    flyer.style.left = startX - coinRect.width / (2 * zoom) + "px";
    flyer.style.top = startY - coinRect.height / (2 * zoom) + "px";
    wrap.appendChild(flyer);

    // Let the browser paint the flyer once, THEN start the flight.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        flyer.style.transform =
          "translate(" + (endX - startX) + "px, " + (endY - startY) +
          "px) rotate(40deg) scale(0.2)";
        flyer.style.opacity = "0";
      });
    });

    setTimeout(() => {
      flyer.remove();
      flashSlot();
      room.classList.add("form-view");
      show("auth");
      // Bring the coin button back for the next player.
      coin.style.visibility = "";
    }, 700);
  });

  // Login / Register tabs.
  document.querySelectorAll(".tab-btn").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const loginForm = document.getElementById("login-form");
      const registerForm = document.getElementById("register-form");
      if (tab.dataset.tab === "login") {
        loginForm.classList.remove("hidden");
        registerForm.classList.add("hidden");
      } else {
        registerForm.classList.remove("hidden");
        loginForm.classList.add("hidden");
      }
    });
  });

  document.getElementById("logout-btn").addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  });

  // ---- GAME SELECT ----
  // The 5 quiz cabinets. Phase 2 loads real quizzes into them; for now
  // picking one lights it up and shows its status, like a cabinet with
  // its game still on the truck to the arcade.
  const cabinetMessage = document.getElementById("cabinet-message");
  document.querySelectorAll(".cabinet-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      playTone(Number(btn.dataset.tone) || 440, 0.08);
      document.querySelectorAll(".cabinet-item").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      const label = btn.textContent.replace(/[0-9]/g, "").trim();
      cabinetMessage.textContent = label + ": CABINET OPENS IN PHASE 2";
      setTimeout(() => playTone(659, 0.06), 90);
    });
  });

  // ---- Secret admin door ----
  // Press the deck buttons BLUE, BLUE, PINK, YELLOW, then push the
  // joystick. The code only opens the door - the SERVER still decides
  // who is actually an admin (players get ACCESS DENIED).
  const CODE = ["b", "b", "p", "y"];
  const presses = [];
  let codeReady = false;
  let adminUsers = [];

  const buttonNotes = { b: 262, c: 330, p: 392, y: 523 };

  function renderAdminPanel(users) {
    const list = document.getElementById("admin-list");
    list.innerHTML = "";
    document.getElementById("admin-count").textContent = "ACCOUNTS: " + users.length;
    document.getElementById("admin-message").textContent = "";

    users.forEach((user) => {
      const row = document.createElement("li");
      row.className = "panel-row";

      const name = document.createElement("span");
      name.className = "panel-name";
      name.textContent = user.username;

      const badge = document.createElement("span");
      badge.className = "role-badge " + (user.role === "admin" ? "role-admin" : "role-player");
      badge.textContent = user.role.toUpperCase();

      row.append(name, badge);

      if (currentPlayer && String(user.id) === String(currentPlayer.id)) {
        const self = document.createElement("span");
        self.className = "panel-self";
        self.textContent = "YOU";
        row.append(self);
      } else {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "role-btn";
        btn.textContent = user.role === "admin" ? "MAKE PLAYER" : "MAKE ADMIN";
        btn.addEventListener("click", () => toggleRole(user));
        row.append(btn);
      }

      list.append(row);
    });
  }

  function renderAccessLog(entries) {
    const list = document.getElementById("admin-log");
    list.innerHTML = "";
    if (entries.length === 0) {
      const row = document.createElement("li");
      row.className = "log-row";
      row.textContent = "NO ATTEMPTS YET";
      list.append(row);
      return;
    }
    entries.forEach((entry) => {
      const row = document.createElement("li");
      row.className = "log-row";

      const who = document.createElement("span");
      who.className = "log-who";
      who.textContent = entry.username || "NOT LOGGED IN";

      const what = document.createElement("span");
      what.className = "log-what";
      what.textContent = String(entry.endpoint || "").replace("/api/admin/", "");

      const status = document.createElement("span");
      status.className = "log-status " + (entry.allowed ? "log-ok" : "log-no");
      status.textContent = entry.allowed ? "IN" : "DENIED";

      row.append(who, what, status);
      list.append(row);
    });
  }

  async function toggleRole(user) {
    const newRole = user.role === "admin" ? "player" : "admin";
    const message = document.getElementById("admin-message");
    try {
      const response = await fetch("/api/admin/users/" + user.id + "/role", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await response.json();
      if (!response.ok) {
        message.textContent = data && data.error ? data.error.toUpperCase() : "COULD NOT UPDATE.";
        denyBuzz();
        return;
      }
      user.role = data.user.role;
      const updated = adminUsers.find((u) => String(u.id) === String(user.id));
      if (updated) updated.role = data.user.role;
      renderAdminPanel(adminUsers);
      playTone(659, 0.08);
    } catch {
      message.textContent = "NETWORK ERROR - TRY AGAIN.";
      denyBuzz();
    }
  }

  async function tryAdminUnlock() {
    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        denyBuzz();
        show("denied");
        return;
      }
      const data = await response.json();
      adminUsers = data.users || [];
      renderAdminPanel(adminUsers);

      // Also load the access log (admins only - the server checks again).
      const logResponse = await fetch("/api/admin/access-log");
      if (logResponse.ok) {
        const logData = await logResponse.json();
        renderAccessLog(logData.log || []);
      } else {
        renderAccessLog([]);
      }

      playTone(784, 0.1);
      setTimeout(() => playTone(1046, 0.2), 110);
      show("admin");
    } catch {
      denyBuzz();
      show("denied");
    }
  }

  Object.keys(buttonIds).forEach((key) => {
    document.getElementById(buttonIds[key]).addEventListener("click", () => {
      playTone(buttonNotes[key], 0.08);
      presses.push(key);
      if (presses.length > CODE.length) presses.shift();
      codeReady = presses.join("") === CODE.join("");
      if (codeReady) {
        // The joystick lights up: the door is primed.
        stickEl.classList.add("primed");
        playTone(784, 0.07);
        setTimeout(() => playTone(1046, 0.09), 80);
      } else {
        stickEl.classList.remove("primed");
      }
    });
  });

  // Joystick: pushes open the secret door if the code was entered,
  // otherwise it just cycles the attract line.
  stickEl.addEventListener("click", () => {
    if (codeReady) {
      codeReady = false;
      presses.length = 0;
      stickEl.classList.remove("primed");
      tryAdminUnlock();
      return;
    }
    playTone(330, 0.06);
    attractIndex = (attractIndex + 1) % attractLines.length;
    document.getElementById("idle-line").textContent = attractLines[attractIndex];
  });

  // Back buttons on the secret screens.
  document.querySelectorAll("[data-back]").forEach((btn) => {
    btn.addEventListener("click", () => {
      show(currentPlayer ? "in" : "auth");
    });
  });
});
