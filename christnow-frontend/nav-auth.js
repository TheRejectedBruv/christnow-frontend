console.log("NAV-AUTH: script loaded");

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  const signInLink = document.getElementById("sign-in-link");
  const logoutLink = document.getElementById("logout-link");

  console.log("NAV-AUTH: token =", !!token, "signIn =", !!signInLink, "logout =", !!logoutLink);

  if (!signInLink || !logoutLink) return;

  if (token) {
    signInLink.style.setProperty("display", "none", "important");
    logoutLink.style.setProperty("display", "inline-block", "important");
  } else {
    signInLink.style.setProperty("display", "inline-block", "important");
    logoutLink.style.setProperty("display", "none", "important");
  }

  logoutLink.addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.removeItem("token");
    window.location.href = "index.html";
  });
});

