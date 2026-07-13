document.addEventListener("DOMContentLoaded", async () => {
  const API_BASE = "/api";
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "sign-in.html?next=profile.html";
    return;
  }

  const emailEl = document.getElementById("profile-email");
  const usernameEl = document.getElementById("profile-username");
  const listEl = document.getElementById("profile-course-list");
  const emptyEl = document.getElementById("profile-empty");
  const errorEl = document.getElementById("profile-error");

  function authHeaders() {
    return { Authorization: `Bearer ${token}` };
  }

  function normalizeId(id) {
    if (id == null) return "";
    return String(id).trim();
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  try {
    const [profileRes, coursesRes] = await Promise.all([
      fetch(`${API_BASE}/users/profile`, { headers: authHeaders() }),
      fetch(`${API_BASE}/courses`)
    ]);

    if (profileRes.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "sign-in.html?next=profile.html";
      return;
    }

    if (!profileRes.ok) {
      throw new Error("Could not load your profile. Try signing in again.");
    }

    if (!coursesRes.ok) {
      throw new Error("Could not load courses.");
    }

    const profile = await profileRes.json();
    const courses = await coursesRes.json();

    emailEl.textContent = profile.email || "—";
    usernameEl.textContent = profile.username || "—";

    const ownedIds = new Set();
    (profile.ownedCourseIds || []).forEach((id) => {
      const norm = normalizeId(id);
      if (norm) ownedIds.add(norm);
    });
    (profile.freeCourseIds || []).forEach((id) => {
      const norm = normalizeId(id);
      if (norm) ownedIds.add(norm);
    });

    const ownedCourses = (Array.isArray(courses) ? courses : []).filter((course) =>
      ownedIds.has(normalizeId(course.id))
    );

    if (ownedCourses.length === 0) {
      listEl.innerHTML = "";
      emptyEl.style.display = "block";
      return;
    }

    emptyEl.style.display = "none";
    listEl.innerHTML = ownedCourses
      .map(
        (course) => `
        <div class="profile-course-row">
          <span class="profile-course-name">${escapeHtml(course.title || "Untitled")}</span>
          <a href="lessons.html?courseId=${encodeURIComponent(course.id)}" class="start-course-btn">Start Course</a>
        </div>
      `
      )
      .join("");
  } catch (err) {
    if (emailEl) emailEl.textContent = "—";
    if (usernameEl) usernameEl.textContent = "—";
    if (errorEl) errorEl.textContent = err.message || "Something went wrong.";
  }
});
