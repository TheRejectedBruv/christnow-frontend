document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-password-toggle]").forEach((btn) => {
    const fieldId = btn.getAttribute("aria-controls");
    const input = fieldId
      ? document.getElementById(fieldId)
      : btn.closest(".password-field")?.querySelector("input");

    if (!input) return;

    btn.addEventListener("click", () => {
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      btn.textContent = isHidden ? "Hide" : "Show";
      btn.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
      btn.setAttribute("aria-pressed", isHidden ? "true" : "false");
    });
  });
});
