console.log("[Courses] script loaded");

document.addEventListener("DOMContentLoaded", async () => {
  const list = document.getElementById("course-list");
  if (!list) return;

  try {
    // Fetch all courses
    const res = await fetch("http://localhost:8085/courses");
    if (!res.ok) throw new Error("Failed to load courses");
    const courses = await res.json();

    // Optional: check user profile
    const token = localStorage.getItem("token");
    let user = null;
    if (token) {
      const ures = await fetch("http://localhost:8085/users/profile", {
        headers: { Authorization: "Bearer " + token }
      }).catch(() => null);
      if (ures && ures.ok) user = await ures.json();
    }

    // Clear old content
    list.innerHTML = "";

    // Render each course card
    courses.forEach(course => {
      const card = document.createElement("div");
      card.className = "course-card";

      const buttonLabel = getButtonLabel(course, user);

      card.innerHTML = `
        <h2>${course.title}</h2>
        <p>${course.description || ""}</p>
        <button class="course-btn">${buttonLabel}</button>
        <a href="course-details.html?id=${course.id}">View Course</a>
      `;

      list.appendChild(card);
    });

  } catch (err) {
    console.error("Error loading courses:", err);
    list.innerHTML = "<p>Failed to load courses.</p>";
  }
});

function getButtonLabel(course, user) {
  // If course has a price → always show "Buy Course"
  if (course.price > 0) {
    return "Buy Course";
  }

  // If course is free and user hasn’t claimed 3 yet
  if (course.free && (!user || (user.freeCourses?.length || 0) < 3)) {
    return "Claim as Free";
  }

  // Already owned
  if (user && (user.ownedCourses?.includes(course.id) || user.freeCourses?.includes(course.id))) {
    return "You Own This Course";
  }

  // Not signed in → prompt
  if (!user) {
    return "Sign In to Access";
  }

  // Fallback
  return "Unavailable";
}
