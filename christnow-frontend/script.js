/* global Stripe */
document.addEventListener("DOMContentLoaded", async function () {
  console.log("HOMEPAGE: script loaded");


  const API_BASE = "/api";


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
    try {
      const res = await fetch(`${API_BASE}/users/profile`, {
        method: "GET",
        headers: { Authorization: "Bearer " + token },
      });

     if (token && token.toLowerCase().startsWith("bearer ")) {
  token = token.slice(7).trim();
}

      console.log("HOMEPAGE: /users/profile status =", res.status);


      if (res.ok) {
        userProfile = await res.json();
        console.log("HOMEPAGE: userProfile =", userProfile);
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
    const res = await fetch(`${API_BASE}/courses`);
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


  courses.forEach((course) => {
    let actionBtnHtml = "";


    // --------- NOT LOGGED IN ---------
    if (!userProfile) {
      actionBtnHtml = `<button class="sign-in-btn">Sign In to Access</button>`;
    } else {
      // Your safe profile response uses these keys:
      const ownedIds = Array.isArray(userProfile.ownedCourseIds) ? userProfile.ownedCourseIds : [];
      const freeIds = Array.isArray(userProfile.freeCourseIds) ? userProfile.freeCourseIds : [];


      const ownsThis = ownedIds.includes(course.id) || freeIds.includes(course.id);


      // free-slot logic: allow up to 3 free picks IF course.free === true
      const courseIsFreeEligible = course.free === true;
      const hasFreeSlot = courseIsFreeEligible && !ownsThis && freeIds.length < 3;


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
        actionBtnHtml = `<button class="add-free-btn" data-course-id="${course.id}">Add as Free</button>`;
      } else {
        actionBtnHtml = `<button class="buy-btn" data-course-id="${course.id}">Buy Course</button>`;
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
          `${API_BASE}/users/${encodeURIComponent(userProfile.email)}/free-courses/${courseId}`,
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


  // BUY COURSE (placeholder)
  document.querySelectorAll(".buy-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      alert("Buying not set up yet.");
    });
  });
});


// ---------------- STRIPE CHECKOUT ----------------
async function checkout(courseName, amount) {
  const response = await fetch("/api/payments/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseName, amount }),
  });


  const session = await response.json();
  const result = await stripe.redirectToCheckout({ sessionId: session.id });


  if (result.error) {
    alert(result.error.message);
  }
}




