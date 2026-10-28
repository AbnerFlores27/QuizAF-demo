// Shared nav bar: figure out who is logged in and show the right links.
(function () {
  var navAuth = document.getElementById("nav-auth");
  if (!navAuth) return;

  fetch("/api/auth/me")
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var user = data.user;
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
    })
    .catch(function () {
      navAuth.innerHTML = '<a href="/login.html">Log in</a>';
    });
})();
