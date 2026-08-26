console.log("[Courses] script loaded");

const FREE_PICK_LIMIT = 1;
const API_BASE = "/api";

function normalizeId(x) {
  if (x == null) return "";
  return String(x).trim();
}

function idInList(id, list) {
  return (Array.isArray(list) ? list : []).map(normalizeId).includes(normalizeId(id));
}

function getButtonLabel(course, user) {
  if (!user) {
    return "Sign In to Access";
  }

  const ownedIds = user.ownedCourseIds || [];
  const freeIds = user.freeCourseIds || [];

  if (idInList(course.id, ownedIds) || idInList(course.id, freeIds)) {
    return "Owned";
  }

  if (freeIds.length < FREE_PICK_LIMIT) {
    return "Claim Free";
  }

  return "Buy Course";
}

function getButtonClass(label) {
  if (label === "Claim Free") return "add-free-btn";
  if (label === "Buy Course") return "buy-btn";
  if (label === "Sign In to Access") return "sign-in-btn";
  return "owned-btn";
}

function updateFreeCounter(freeCounter, user) {
  if (!freeCounter || !user) return;
  const freeCount = Array.isArray(user.freeCourseIds) ? user.freeCourseIds.length : 0;
  const remaining = FREE_PICK_LIMIT - freeCount;
  if (remaining > 0) {
    freeCounter.textContent = "Choose any 1 course free — the rest are paid";
    freeCounter.style.display = "block";
  } else {
    freeCounter.textContent = "";
    freeCounter.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const list = document.getElementById("course-list");
  if (!list) return;

  try {
    const res = await fetch("https://christnow-backend-777aa5f9a483.herokuapp.com/courses");
    if (!res.ok) throw new Error("Failed to load courses");
    const courses = await res.json();

    const token = localStorage.getItem("token");
    let user = null;
    if (token) {
      const ures = await fetch("https://christnow-backend-777aa5f9a483.herokuapp.com/api/users/profile", {
        headers: { Authorization: "Bearer " + token }
      }).catch(() => null);
      if (ures && ures.ok) user = await ures.json();
      updateFreeCounter(document.getElementById("free-counter"), user);
    }

    list.innerHTML = "";

    courses.forEach(course => {
      const card = document.createElement("div");
      card.className = "course-card";

      const buttonLabel = getButtonLabel(course, user);
      const buttonClass = getButtonClass(buttonLabel);
      const disabled = buttonLabel === "Owned" ? "disabled" : "";

      card.innerHTML = `
  <h3>${course.title}</h3>
  <p>${course.description || ""}</p>
  <div class="course-buttons">
    <button class="${buttonClass}" ${disabled}
      data-course-id="${course.id}"
      data-course-title="${(course.title || "").replace(/"/g, "&quot;")}"
      data-course-price="${course.price ?? 0}">${buttonLabel}</button>
    <a href="course-details.html?id=${course.id}" class="view-course-link">View Course</a>
  </div>
`;

      list.appendChild(card);
    });

    document.querySelectorAll(".sign-in-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        window.location.href = "sign-in.html";
      });
    });

    document.querySelectorAll(".add-free-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!user || !user.email || !token) {
          window.location.href = "sign-in.html";
          return;
        }
        const courseId = btn.getAttribute("data-course-id");
        try {
          const res = await fetch(
            `${API_BASE}/users/${encodeURIComponent(user.email)}/free-courses/${courseId}`,
            {
              method: "POST",
              headers: { Authorization: "Bearer " + token },
            }
          );
          if (res.ok) {
            alert("Added");
            window.location.reload();
          } else {
            alert("Error: " + (await res.text()));
          }
        } catch (err) {
          alert("Could not add free course.");
        }
      });
    });

    document.querySelectorAll(".buy-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await startCourseCheckout({
            courseId: btn.getAttribute("data-course-id"),
            courseTitle: btn.getAttribute("data-course-title"),
            coursePrice: btn.getAttribute("data-course-price"),
            token,
            apiBase: API_BASE,
          });
        } catch (err) {
          alert(err.message || "Could not start checkout.");
        }
      });
    });
  } catch (err) {
    console.error("Error loading courses:", err);
    list.innerHTML = "<p>Failed to load courses.</p>";
  }
});
