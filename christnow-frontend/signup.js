// signup.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signup-form");
  const messageEl = document.getElementById("signup-message");

  if (!form) {
    console.error("❌ signup-form not found!");
    return;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("http://localhost:8085/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
      });

      if (response.ok) {
        messageEl.textContent = "✅ Registered successfully! Redirecting to Sign In...";
        messageEl.style.color = "green";
        setTimeout(() => window.location.href = "index.html", 1200);
      } else {
        const errorText = await response.text();
        messageEl.textContent = "❌ " + errorText;
        messageEl.style.color = "red";
      }
    } catch (err) {
      messageEl.textContent = "❌ Network error!";
      messageEl.style.color = "red";
    }
  });
});
