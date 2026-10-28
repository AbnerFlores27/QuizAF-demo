// Shared nav bar: figure out who is logged in and show the right links.
(function () {
  var navAuth = document.getElementById("nav-auth");
  if (!navAuth) return;

  // Replit's free servers sleep. The FIRST request after waking can fail
  // while the server starts - that used to look like being logged out.
  // So we try a few times before giving up.
  function checkLogin(triesLeft) {
    fetch("/api/auth/me")
      .then(function (r) {
        if (!r.ok) throw new Error("server said " + r.status);
        return r.json();
      })
      .then(function (data) {
        show(data.user);
      })
      .catch(function () {
        if (triesLeft > 0) {
          setTimeout(function () { checkLogin(triesLeft - 1); }, 2500);
        } else {
          navAuth.innerHTML = '<a href="/login.html">Log in</a>';
        }
      });
  }

  function show(user) {
    if (!user) {
      navAuth.innerHTML =
        '<a href="/login.html">Log in</a> <a href="/register.html">Register</a>';
      return;
    }
    var adminLink = user.role === "admin" ? ' <a href="/admin.html">Admin</a>' : "";
    navAuth.innerHTML =
      "<span>" + user.username + " (" + user.role + ")</span>" +
      adminLink +
      ' <button type="button" id="logout-btn">Log out</button>';
    document.getElementById("logout-btn").addEventListener("click", function () {
      fetch("/api/auth/logout", { method: "POST" }).then(function () {
        window.location.href = "/";
      });
    });
  }

  checkLogin(3);
})();
