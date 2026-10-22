// Abner's Arcade entrance: zoom-in, INSERT COIN, then login/register on the machine screen.
// This is all visual - the auth API calls stay exactly the same (auth.js handles the forms).

async function fetchPlayer() {
  try {
    const response = await fetch("/api/auth/me");
    const data = await response.json();
    return data.user || null;
  } catch {
    return null;
  }
}

function ding() {
  // A tiny 8-bit style "coin" beep made with the browser's sound tools - no sound files needed.
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1318, ctx.currentTime + 0.09);
    gain.gain.setValueAtTime(0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // Sound is a bonus - never let it break the page.
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const room = document.getElementById("arcade-room");
  const screens = {
    idle: document.getElementById("screen-idle"),
    coin: document.getElementById("screen-coin"),
    auth: document.getElementById("screen-auth"),
    in: document.getElementById("screen-in"),
  };

  function show(name) {
    Object.values(screens).forEach((el) => el.classList.add("hidden"));
    screens[name].classList.remove("hidden");
  }

  // Logged in already? Skip straight to the welcome screen.
  fetchPlayer().then((player) => {
    if (player) {
      room.classList.add("zoomed", "skip-anim");
      document.getElementById("welcome-title").textContent = "HI, " + player.username.toUpperCase() + "!";
      show("in");
    }
  });

  document.getElementById("enter-btn").addEventListener("click", () => {
    room.classList.add("zoomed");
    room.classList.remove("skip-anim");
    show("coin");
  });

  document.getElementById("coin").addEventListener("click", (event) => {
    ding();
    event.currentTarget.classList.add("dropped");
    setTimeout(() => show("auth"), 620);
  });

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
});
