console.log("NAV-AUTH: script loaded");

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  const signInLink = document.getElementById("sign-in-link");
  const logoutLink = document.getElementById("logout-link");
  const nav = document.querySelector(".nav-links");

  let profileLink = document.getElementById("profile-link");
  if (!profileLink && nav && logoutLink) {
    profileLink = document.createElement("a");
    profileLink.href = "profile.html";
    profileLink.id = "profile-link";
    profileLink.textContent = "My Profile";
    nav.insertBefore(profileLink, logoutLink);
  }

  const landingGuest = document.getElementById("landing-guest");
  const landingSignedIn = document.getElementById("landing-signed-in");
  if (landingGuest && landingSignedIn) {
    const signedIn = Boolean(token);
    landingGuest.hidden = signedIn;
    landingSignedIn.hidden = !signedIn;
  }

  if (!signInLink || !logoutLink) return;

  if (token) {
    signInLink.style.setProperty("display", "none", "important");
    if (profileLink) {
      profileLink.style.setProperty("display", "inline-block", "important");
    }
    logoutLink.style.setProperty("display", "inline-block", "important");
  } else {
    signInLink.style.setProperty("display", "inline-block", "important");
    if (profileLink) {
      profileLink.style.setProperty("display", "none", "important");
    }
    logoutLink.style.setProperty("display", "none", "important");
  }

  logoutLink.addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.removeItem("token");
    window.location.href = "index.html";
  });
});
