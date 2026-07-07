// signup.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signup-form");
  const messageEl = document.getElementById("signup-message");
  const API_BASE = "/api";
  const BACKEND_DIRECT = "https://christnow-backend-777aa5f9a483.herokuapp.com";

  if (!form) {
    console.error("❌ signup-form not found!");
    return;
  }

  // Keep sign-up fields empty; browsers sometimes autofill despite autocomplete="off"
  ["signup-username", "signup-email", "signup-password"].forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.value = "";
  });

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function postRegister(payload) {
    const endpoints = [
      `${API_BASE}/users/register`,
      `${BACKEND_DIRECT}/users/register`,
    ];

    for (const url of endpoints) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (response.ok || response.status === 400 || response.status === 409) {
            return response;
          }

          if ([502, 503, 504].includes(response.status) && attempt < 2) {
            await wait(1500 * (attempt + 1));
            continue;
          }

          if ([502, 503, 504].includes(response.status)) {
            break;
          }

          return response;
        } catch (err) {
          if (attempt < 2) {
            await wait(1500 * (attempt + 1));
            continue;
          }
        }
      }
    }

    return null;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = document.getElementById("signup-username").value.trim();
    const email = document.getElementById("signup-email").value.trim().toLowerCase();
    const password = document.getElementById("signup-password").value;

    messageEl.textContent = "Creating your account...";
    messageEl.style.color = "inherit";

    try {
      const response = await postRegister({ username, email, password });

      if (!response) {
        messageEl.textContent =
          "❌ The server is waking up or temporarily unavailable. Please wait a moment and try again.";
        messageEl.style.color = "red";
        return;
      }

      if (response.ok) {
        const data = await response.json();
        let token = data.token || data.jwt || data.accessToken;

        if (!token) {
          const loginRes = await fetch(`${API_BASE}/users/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          if (loginRes.ok) {
            const loginData = await loginRes.json();
            token = loginData.token || loginData.jwt || loginData.accessToken;
          }
        }

        if (token) {
          localStorage.setItem("token", token);
        }

        messageEl.textContent = "✅ Account created! Redirecting...";
        messageEl.style.color = "green";
        setTimeout(() => (window.location.href = "index.html"), 1200);
        return;
      }

      const errorText = await response.text();
      if (response.status === 403) {
        messageEl.textContent = "❌ Access denied. Please refresh and try again.";
      } else if (response.status === 409) {
        messageEl.textContent = "❌ " + (errorText || "That username or email is already in use.");
      } else if (response.status === 503) {
        messageEl.textContent =
          "❌ The server is temporarily unavailable. Please wait a few seconds and try again.";
      } else {
        messageEl.textContent = "❌ " + (errorText || "Registration failed. Please try again.");
      }
      messageEl.style.color = "red";
    } catch (err) {
      messageEl.textContent = "❌ Network error! Please check your connection and try again.";
      messageEl.style.color = "red";
    }
  });
});
