document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signin-form");

  if (!form) {
    console.error("❌ signin-form not found!");
    return;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const messageEl = document.getElementById("login-message");

    try {
      const response = await fetch("http://localhost:8085/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("token", data.token); // Store JWT
        messageEl.textContent = "✅ Login successful! Redirecting...";
        messageEl.style.color = "green";
          window.location.href = "index.html"; // <--- Redirects to home after login
     
      } else {
        const errorText = await response.text();
        messageEl.textContent = "❌ " + errorText;
        messageEl.style.color = "red";
        console.error("❌ Error:", errorText);
      }
    } catch (err) {
      messageEl.textContent = "❌ Network error!";
      messageEl.style.color = "red";
      console.error("❌ Network error:", err);
    }
  });
});
