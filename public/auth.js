// Shared auth helpers: renders the account nav and wires up the auth forms.

async function fetchMe() {
  try {
    const response = await fetch("/api/auth/me");
    const data = await response.json();
    return data.user || null;
  } catch {
    return null;
  }
}

function renderNav(user) {
  const nav = document.querySelector("#auth-nav");
  if (!nav) return;
  nav.innerHTML = "";

  if (user) {
    const name = document.createElement("span");
    name.className = "nav-user";
    name.textContent = "Hi, " + user.username + "!";

    const logout = document.createElement("button");
    logout.type = "button";
    logout.textContent = "Log out";
    logout.addEventListener("click", async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    });

    nav.append(name, logout);
  } else {
    const login = document.createElement("a");
    login.href = "/login.html";
    login.textContent = "Log in";

    const register = document.createElement("a");
    register.href = "/register.html";
    register.textContent = "Register";

    nav.append(login, register);
  }
}

async function refreshNav() {
  renderNav(await fetchMe());
}

function wireAuthForm(formId, endpoint) {
  const form = document.querySelector(formId);
  if (!form) return;

  const message = document.querySelector("#auth-message");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const body = Object.fromEntries(new FormData(form).entries());
    const confirmPassword = form.querySelector('[name="confirm_password"]');

    message.textContent = "";
    message.className = "auth-message";

    if (confirmPassword && body.password !== confirmPassword.value) {
      message.textContent = "Passwords do not match.";
      message.classList.add("error");
      return;
    }

    const button = form.querySelector("button[type=submit]");
    if (button) button.disabled = true;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Something went wrong.");
      window.location.href = "/";
    } catch (error) {
      message.textContent = error.message;
      message.classList.add("error");
      if (button) button.disabled = false;
    }
  });
}

wireAuthForm("#register-form", "/api/auth/register");
wireAuthForm("#login-form", "/api/auth/login");

refreshNav();
