document.addEventListener("DOMContentLoaded", () => {
  // Support either form id without touching HTML or CSS
  const form =
    document.getElementById("signin-form") ||
    document.getElementById("sign-in-form");


  if (!form) {
    console.error("SIGN-IN: form not found (#signin-form or #sign-in-form)");
    return;
  }


  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const messageEl = document.getElementById("login-message");


  const API_BASE = "/api";


  function setMessage(text) {
    // No styling, no classes, no CSS modifications. Only text.
    if (messageEl) messageEl.textContent = text || "";
  }


  form.addEventListener("submit", async (e) => {
    e.preventDefault();


    const email = (emailInput?.value || "").trim();
    const password = passwordInput?.value || "";


    if (!email || !password) {
      setMessage("Please enter email and password.");
      return;
    }


    setMessage("");


    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });


      if (!res.ok) {
        // Don’t touch CSS. Just show the backend text if available.
        const txt = await res.text();
        setMessage(txt || "Invalid email or password.");
        return;
      }


      const data = await res.json();
      const token = data.token || data.jwt || data.accessToken;


      if (!token) {
        setMessage("Login succeeded but no token was returned.");
        return;
      }


      localStorage.setItem("token", token);


      // Redirect after login (no CSS, no DOM changes)
      window.location.href = "index.html";
    } catch (err) {
      console.error("SIGN-IN: network error:", err);
      setMessage("Network error. Please try again.");
    }
  });
});
