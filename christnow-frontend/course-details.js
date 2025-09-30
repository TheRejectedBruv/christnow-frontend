console.log(">>> course-details.js is running <<<");

console.log("[CD] script loaded");

document.addEventListener("DOMContentLoaded", initCourseDetails);

async function initCourseDetails() {
  const params = new URLSearchParams(location.search);
  const courseId = params.get("id");
  if (!courseId) return;

  // Load course
  const courseRes = await fetch(`http://localhost:8085/courses/${courseId}`);
  if (!courseRes.ok) return showNotFound();
  const course = await courseRes.json();

  console.log("DEBUG: Loaded course =", course);

  // Fill UI
  setText(".course-title", course.title || "Course");
  setText(".course-description", course.description || "");
  setText(".old-price", course.price != null ? `$${course.price}` : "");
  setText(".free-label", course.free ? "Free" : "");

  // Check lessons directly from the course JSON
  const lessonsExist = Array.isArray(course.lessons) && course.lessons.length > 0;
  console.log("DEBUG: lessonsExist =", lessonsExist, "course.lessons =", course.lessons);

  // Auth/profile
  const token = localStorage.getItem("token");
  let user = null;
  if (token) {
    const res = await fetch("http://localhost:8085/users/profile", {
      headers: { Authorization: "Bearer " + token }
    }).catch(() => null);
    if (res && res.ok) user = await res.json();
  }
  console.log("DEBUG: user profile =", user);

  const btn = document.getElementById("start-course-btn");
  if (!btn) return;

  // If not signed in
  if (!user) {
    console.log("DEBUG: No user branch triggered. free =", course.free, "price =", course.price);
    btn.textContent = course.free ? "Sign In to Claim" : "Sign In to Buy";
    btn.disabled = false;
    btn.onclick = () => (window.location.href = "sign-in.html");
    return;
  }

  // Already own or already picked as free
  const owned = user?.ownedCourses?.includes(Number(courseId)) || false;
  const isFreePicked = user?.freeCourses?.includes(Number(courseId)) || false;

  console.log("DEBUG: owned =", owned, "isFreePicked =", isFreePicked);

  if (owned || isFreePicked) {
    console.log("DEBUG: Owned/FreePicked branch triggered, lessonsExist =", lessonsExist);
    btn.textContent = lessonsExist ? "Start Course" : "Coming Soon";
    btn.disabled = !lessonsExist;
    btn.onclick = () => {
      if (lessonsExist) window.location.href = `lessons.html?courseId=${courseId}`;
    };
    return;
  }

  // Can still claim as one of the 3 free
  if (course.free && (user.freeCourses?.length || 0) < 3) {
    console.log("DEBUG: Claim as Free branch triggered");
    btn.textContent = "Claim as Free";
    btn.disabled = false;
    btn.onclick = async () => {
      const res = await fetch(`http://localhost:8085/users/${user.email}/free-courses/${courseId}`, {
        method: "POST",
        headers: { Authorization: "Bearer " + token }
      });
      if (res.ok) {
        if (lessonsExist) {
          window.location.href = `lessons.html?courseId=${courseId}`;
        } else {
          alert("Course claimed! Lessons are coming soon.");
          location.reload();
        }
      } else {
        alert(await res.text());
      }
    };
    return;
  }

  // Default: Paid course with lessons → Buy button
  if (lessonsExist) {
    console.log("DEBUG: Buy Course branch triggered");
    btn.textContent = "Buy Course";
    btn.disabled = false;
    btn.onclick = async () => {
      try {
        const res = await fetch("http://localhost:8085/payment/create-checkout-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
          },
          body: JSON.stringify({
            courseNames: [course.title],
            amount: course.price * 100,
            successUrl: window.location.origin + "/success.html",
            cancelUrl: window.location.origin + "/cancel.html"
          })
        });

        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();

        window.location.href = data.checkoutUrl;
      } catch (err) {
        console.error("Checkout error", err);
        alert("Error starting checkout. Please try again.");
      }
    };
  } else {
    console.log("DEBUG: Coming Soon branch triggered (no lessonsExist)");
    btn.textContent = "Coming Soon";
    btn.disabled = true;
  }
}

// ---- helpers ----
function setText(sel, val) {
  const el = document.querySelector(sel);
  if (el) el.textContent = val;
}
function showNotFound() {
  setText(".course-title", "Course not found");
}
