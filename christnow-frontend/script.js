/* global startCourseCheckout */
document.addEventListener("DOMContentLoaded", async function () {
  console.log("HOMEPAGE: script loaded");

  const FREE_PICK_LIMIT = 1;
  const API_BASE = "https://christnow-backend-777aa5f9a483.herokuapp.com";


  const courseList = document.querySelector(".course-list");
  if (!courseList) {
    console.log("HOMEPAGE: .course-list not found in DOM");
    return;
  }


  // ---------------- TOKEN (ONE KEY ONLY) ----------------
  let token = localStorage.getItem("token");


  // If older builds used jwtToken, migrate it once
  if (!token) {
    const old = localStorage.getItem("jwtToken");
    if (old) {
      localStorage.setItem("token", old);
      localStorage.removeItem("jwtToken");
      token = old;
      console.log("HOMEPAGE: migrated jwtToken -> token");
    }
  }


  console.log("HOMEPAGE: token value =", token);


  // ---------------- PROFILE ----------------
  // IMPORTANT: Your backend route is /users/profile (not /profile)
  let userProfile = null;


  if (token) {
    if (token.toLowerCase().startsWith("bearer ")) {
      token = token.slice(7).trim();
      localStorage.setItem("token", token);
    }
    try {
      const res = await fetch(`${API_BASE}/api/users/profile`, {
        method: "GET",
        headers: { Authorization: "Bearer " + token },
      });

      console.log("HOMEPAGE: /api/users/profile status =", res.status);


      if (res.ok) {
        userProfile = await res.json();
        console.log("HOMEPAGE: userProfile =", userProfile);
        const welcomeTitle = document.getElementById("welcome-back-title");
        if (welcomeTitle && userProfile.username) {
          welcomeTitle.textContent = "Welcome back, " + userProfile.username;
        }
        // Show free counter if logged in
        const freeCounter = document.getElementById("free-counter");
        if (freeCounter && userProfile) {
          const freeCount = Array.isArray(userProfile.freeCourseIds) ? userProfile.freeCourseIds.length : 0;
          const remaining = FREE_PICK_LIMIT - freeCount;
          if (remaining > 0) {
            freeCounter.textContent = "Choose any 1 course free — the rest are paid";
            freeCounter.style.display = "block";
          } else {
            freeCounter.textContent = "";
            freeCounter.style.display = "none";
          }
        }


      } else {
        console.log("HOMEPAGE: profile failed, clearing token");
        localStorage.removeItem("token");
        userProfile = null;
      }
    } catch (err) {
      console.error("HOMEPAGE: error loading profile:", err);
      userProfile = null;
    }
  } else {
    console.log("HOMEPAGE: no token → treating as logged out");
  }


  // ---------------- COURSES ----------------
  let courses = [];
  try {
    const res = await fetch(`https://christnow-backend-777aa5f9a483.herokuapp.com/courses`);
    console.log("HOMEPAGE: /courses status =", res.status);


    if (!res.ok) throw new Error("Course fetch failed: " + res.status);
    courses = await res.json();
    console.log("HOMEPAGE: loaded courses =", courses);
  } catch (err) {
    console.error("HOMEPAGE: course fetch failed:", err);
    courseList.innerHTML = "<p style='color:red;'>Could not load courses.</p>";
    return;
  }


  // ---------------- RENDER ----------------
  courseList.innerHTML = "";


  function normalizeId(x) {
    if (x == null) return "";
    return String(x).trim();
  }

  function idInList(id, list) {
    return (Array.isArray(list) ? list : []).map(normalizeId).includes(normalizeId(id));
  }


  courses.forEach((course) => {
    let actionBtnHtml = "";


    // --------- NOT LOGGED IN ---------
    if (!userProfile) {
      actionBtnHtml = `<button class="sign-in-btn">Sign In to Access</button>`;
    } else {
      const ownedIds = Array.isArray(userProfile.ownedCourseIds) ? userProfile.ownedCourseIds : [];
      const freeIds = Array.isArray(userProfile.freeCourseIds) ? userProfile.freeCourseIds : [];


      const ownsThis = idInList(course.id, ownedIds) || idInList(course.id, freeIds);
      const hasFreeSlot = !ownsThis && freeIds.length < FREE_PICK_LIMIT;


      console.log(
        "HOMEPAGE: course",
        course.id,
        "ownedIds=",
        ownedIds,
        "freeIds=",
        freeIds,
        "ownsThis=",
        ownsThis,
        "hasFreeSlot=",
        hasFreeSlot
      );


      if (ownsThis) {
        actionBtnHtml = `<button class="owned-btn" disabled>Owned</button>`;
      } else if (hasFreeSlot) {
        actionBtnHtml = `<button class="add-free-btn" data-course-id="${course.id}">Claim Free</button>`;
      } else {
        actionBtnHtml = `<button class="buy-btn" data-course-id="${course.id}" data-course-title="${course.title.replace(/"/g, "&quot;")}" data-course-price="${course.price}">Buy Course</button>`;
      }
    }


    const safeDescription = course.description || "";


    courseList.innerHTML += `
      <div class="course-card">
        <h3>${course.title}</h3>
        <p>${safeDescription}</p>
        <div class="course-buttons">
          ${actionBtnHtml}
          <a href="course-details.html?id=${course.id}" class="view-course-link">View Course</a>
        </div>
      </div>
    `;
  });


  // ---------------- BUTTON HANDLERS ----------------


  // SIGN IN BUTTON
  document.querySelectorAll(".sign-in-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.location.href = "sign-in.html";
    });
  });


  // ADD AS FREE BUTTON
  document.querySelectorAll(".add-free-btn").forEach((btn) => {
    btn.addEventListener("click", async function () {
      if (!userProfile || !userProfile.email || !token) {
        alert("Sign in first.");
        window.location.href = "sign-in.html";
        return;
      }


      const courseId = btn.getAttribute("data-course-id");
      console.log("HOMEPAGE: Add as Free clicked for course", courseId);


      try {
        const res = await fetch(
          `${API_BASE}/api/users/${encodeURIComponent(userProfile.email)}/free-courses/${courseId}`,
          {
            method: "POST",
            headers: {
              Authorization: "Bearer " + token,
            },
          }
        );


        console.log("HOMEPAGE: add-free response status =", res.status);


        if (res.ok) {
          alert("Added");
          window.location.reload();
        } else {
          const msg = await res.text();
          alert("Error: " + msg);
        }
      } catch (err) {
        console.error("HOMEPAGE: error adding free course:", err);
        alert("Error.");
      }
    });
  });


  // BUY COURSE
  document.querySelectorAll(".buy-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const courseId = btn.getAttribute("data-course-id");
      const courseTitle = btn.getAttribute("data-course-title");
      const coursePrice = btn.getAttribute("data-course-price");

      if (!courseId || !courseTitle) {
        window.location.href = `course-details.html?id=${encodeURIComponent(courseId || "")}`;
        return;
      }

      try {
        await startCourseCheckout({
          courseId,
          courseTitle,
          coursePrice,
          token,
          apiBase: "/api",
        });
      } catch (err) {
        alert(err.message || "Could not start checkout.");
      }
    });
  });
});


// ---------------- STRIPE CHECKOUT ----------------
// See checkout.js


// === NAV AUTH TOGGLE ===
function updateNavAuthState() {
  const token = localStorage.getItem("token");
  const signInLink = document.getElementById("sign-in-link");
  const signOutLink = document.getElementById("logout-link");

  console.log("NAV: token present =", !!token);
  console.log("NAV: signInLink found =", !!signInLink);
  console.log("NAV: signOutLink found =", !!signOutLink);

  if (!signInLink || !signOutLink) {
    console.warn("NAV: missing link elements — check IDs in HTML");
    return;
  }

  if (token) {
    signInLink.style.display = "none";
    signOutLink.style.display = "inline-block";
  } else {
    signInLink.style.display = "inline-block";
    signOutLink.style.display = "none";
  }
}

// Run it on every page load
document.addEventListener("DOMContentLoaded", updateNavAuthState);

// Hook up sign-out click
document.addEventListener("DOMContentLoaded", () => {
  const signOutLink = document.getElementById("logout-link");
  if (signOutLink) {
    signOutLink.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("token");
      window.location.href = "index.html";
    });
  }
});





