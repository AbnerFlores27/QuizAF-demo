// Abner's Arcade v3: pixel-art machine, real interactions.
// The machine art is drawn pixel by pixel in pixels.js. This file places
// clickable parts on top of the art and runs the show.
// All the real auth work still happens in auth.js + the server (unchanged).

const MACHINE = { gridW: 44, gridH: 68, scale: 9 };

async function fetchPlayer() {
  try {
    const response = await fetch("/api/auth/me");
    const data = await response.json();
    return data.user || null;
  } catch {
    return null;
  }
}

function playTone(frequency, duration, type, volume) {
  // Little 8-bit style beeps made with the browser's sound tools - no files.
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
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

document.addEventListener("DOMContentLoaded", () => {
  const room = document.getElementById("arcade-room");
  const wrap = document.getElementById("machine-wrap");
  const machineCanvas = document.getElementById("machine-canvas");
  const screenOverlay = document.getElementById("screen-overlay");

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

  const buttonIds = { p: "btn-p", y: "btn-y", c: "btn-c" };
  m.btns.forEach((btn) => {
    const el = document.getElementById(buttonIds[btn.key]).style;
    el.left = "calc(" + pct(btn.x + 0.5, MACHINE.gridW) + " - 17px)";
    el.top = "calc(" + pct(btn.y + 0.5, MACHINE.gridH) + " - 17px)";
  });

  const stick = document.getElementById("joystick").style;
  stick.left = "calc(" + pct(m.stick.x + 0.5, MACHINE.gridW) + " - 22px)";
  stick.top = "calc(" + pct(m.stick.y + 0.5, MACHINE.gridH) + " - 22px)";

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
      room.classList.add("zoomed", "form-view", "skip-anim");
      document.getElementById("welcome-title").textContent = "HI, " + player.username.toUpperCase() + "!";
      show("in");
    }
  });

  // ENTER: zoom in with a CRT flicker.
  document.getElementById("enter-btn").addEventListener("click", () => {
    room.classList.remove("skip-anim");
    room.classList.add("zoomed");
    crtBoot();
    playTone(660, 0.08);
    show("coin");
  });

  // INSERT COIN: the coin actually flies into the machine's coin slot.
  document.getElementById("coin").addEventListener("click", (event) => {
    coinDing();

    const coin = event.currentTarget;
    const coinRect = coin.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    const slotX = wrapRect.left + (wrapRect.width * m.slot.x) / MACHINE.gridW;
    const slotY = wrapRect.top + (wrapRect.height * m.slot.y) / MACHINE.gridH;
    const dx = slotX - (coinRect.left + coinRect.width / 2);
    const dy = slotY - (coinRect.top + coinRect.height / 2);

    coin.classList.add("fly");
    coin.style.transform = "translate(" + dx + "px, " + dy + "px) scale(0.3)";

    setTimeout(() => {
      room.classList.add("form-view");
      show("auth");
      // Reset the coin for next time.
      coin.classList.remove("fly");
      coin.style.transform = "";
    }, 600);
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

  // Secret admin code: press the deck buttons in the right order.
  // The reveal is just a fun door - the SERVER still decides who is an admin.
  const SECRET = ["p", "y", "c"];
  const presses = [];

  const buttonNotes = { p: 392, y: 523, c: 659 };

  async function tryAdminUnlock() {
    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        denyBuzz();
        show("denied");
        return;
      }
      const data = await response.json();
      const list = document.getElementById("admin-list");
      list.innerHTML = "";
      data.users.forEach((user) => {
        const item = document.createElement("li");
        item.textContent = user.id + " - " + user.username + " - " + user.role.toUpperCase();
        list.appendChild(item);
      });
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
      if (presses.length > SECRET.length) presses.shift();
      if (presses.length === SECRET.length && presses.join("") === SECRET.join("")) {
        presses.length = 0;
        tryAdminUnlock();
      }
    });
  });

  // Joystick: cycles the attract line + a click sound (it is a real stick!).
  document.getElementById("joystick").addEventListener("click", () => {
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
