document.addEventListener("DOMContentLoaded", () => {
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
    if (messageEl) messageEl.textContent = text || "";
  }


  form.addEventListener("submit", async (e) => {
    e.preventDefault();


    const email = (emailInput?.value || "").trim().toLowerCase();
    const password = passwordInput?.value || "";


    if (!email || !password) {
      setMessage("Please enter email and password.");
      return;
    }


    setMessage("");


    try {
      const res = await fetch(`${API_BASE}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });


      if (!res.ok) {
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

      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");
      window.location.href = next && /^[\w.-]+\.html$/.test(next) ? next : "index.html";
    } catch (err) {
      console.error("SIGN-IN: network error:", err);
      setMessage("Network error. Please try again.");
    }
  });
});


