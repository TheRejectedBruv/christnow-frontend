/* global Stripe */
document.addEventListener("DOMContentLoaded", async function () {
  const courseList = document.querySelector('.course-list');
  if (!courseList) return;

  // Try to get JWT from localStorage
  const token = localStorage.getItem("token");

  let userProfile = null;
  if (token) {
    try {
      const userRes = await fetch("http://localhost:8085/users/profile", {
        headers: { "Authorization": "Bearer " + token }
      });
      if (userRes.ok) {
        userProfile = await userRes.json();
      }
    } catch (err) {
      userProfile = null;
    }
  }

  // Fetch all courses
  let courses = [];
  try {
    const res = await fetch("http://localhost:8085/courses");
    courses = await res.json();
  } catch (err) {
    console.error("Course fetch failed:", err);
    courseList.innerHTML = "<p style='color:red;'>Could not load courses.</p>";
    return;
  }

  // Render all courses
  courseList.innerHTML = "";
  courses.forEach(course => {
    const owned = userProfile && userProfile.ownedCourses && userProfile.ownedCourses.includes(course.id);
    const pickedFree = userProfile && userProfile.freeCourses && userProfile.freeCourses.includes(course.id);
    let actionBtnHtml = "";

    // Special case for Faith Course
    if (course.title === "Faith Course") {
      if (owned || pickedFree) {
        actionBtnHtml = `<button disabled>You Own This Course</button>`;
      } else {
        actionBtnHtml = `<button class="buy-btn" data-course-id="${course.id}">Buy Course</button>`;
      }
    }
    // Other courses
    else if (owned || pickedFree) {
      actionBtnHtml = `<button disabled>You Own This Course</button>`;
    } else if (userProfile && course.free && userProfile.freeCourses.length < 3) {
      actionBtnHtml = `<button class="add-free-btn" data-course-id="${course.id}">Add as Free</button>`;
    } else if (userProfile && course.free) {
      actionBtnHtml = `<button disabled>Limit Reached</button>`;
    } else if (!userProfile) {
      actionBtnHtml = `<button onclick="window.location.href='sign-in.html'">Sign In to Access</button>`;
    } else {
      actionBtnHtml = `<button disabled>Buy (Coming Soon)</button>`;
    }

    courseList.innerHTML += `
      <div class="course-card">
        <h3>${course.title}</h3>
        <p>${course.description}</p>
        <div class="course-buttons">
          ${actionBtnHtml}
          <a href="course-details.html?id=${course.id}" class="view-course-link">View Course</a>
        </div>
      </div>
    `;
  });

  // Attach click handlers for "Add as Free" (if any)
  document.querySelectorAll(".add-free-btn").forEach(btn => {
    btn.addEventListener("click", async function () {
      if (!userProfile || !userProfile.email) {
        alert("You must be signed in.");
        window.location.href = "sign-in.html";
        return;
      }
      const courseId = btn.getAttribute("data-course-id");
      try {
        const res = await fetch(`http://localhost:8085/users/${userProfile.email}/free-courses/${courseId}`, {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
          }
        });
        if (res.ok) {
          alert("Course claimed as free! Reloading courses...");
          window.location.reload();
        } else {
          const msg = await res.text();
          alert("Could not claim course: " + msg);
        }
      } catch (err) {
        alert("Failed to claim course.");
      }
    });
  });
});

// Stripe checkout (still disabled unless you wire it up later)
async function checkout(courseName, amount) {
  const response = await fetch("http://localhost:8085/payments/create-checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ courseName: courseName, amount: amount })
  });

  const session = await response.json();

  const result = await stripe.redirectToCheckout({
    sessionId: session.id
  });

  if (result.error) {
    alert(result.error.message);
  }
}
