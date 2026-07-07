document.addEventListener("DOMContentLoaded", async function () {
  const API_BASE = "/api";


  // ---------- grab elements ----------
  const titleEl = document.querySelector(".course-title");
  const descEl = document.querySelector(".course-description");
  const lessonsListEl = document.querySelector(".lessons");
  const oldPriceEl = document.querySelector(".old-price");
  const freeLabelEl = document.querySelector(".free-label");
  const startBtn = document.getElementById("start-course-btn");


  if (!startBtn) return;


  // Make sure we always have somewhere to display errors (no console needed)
  let errorBox = document.getElementById("course-error-box");
  if (!errorBox) {
    errorBox = document.createElement("div");
    errorBox.id = "course-error-box";
    errorBox.style.marginTop = "14px";
    errorBox.style.padding = "12px";
    errorBox.style.borderRadius = "10px";
    errorBox.style.background = "#fff3f3";
    errorBox.style.border = "1px solid #ffd0d0";
    errorBox.style.color = "#7a1f1f";
    errorBox.style.fontSize = "14px";
    errorBox.style.display = "none";
    startBtn.insertAdjacentElement("afterend", errorBox);
  }


  function showErrorOnPage(message) {
    errorBox.textContent = message;
    errorBox.style.display = "block";
  }


  function clearErrorOnPage() {
    errorBox.textContent = "";
    errorBox.style.display = "none";
  }


  function setButton(text, disabled, onClick) {
    startBtn.textContent = text;
    startBtn.disabled = !!disabled;
    startBtn.onclick = onClick || null;
  }


  // ---------- get course id from URL ----------
  const params = new URLSearchParams(window.location.search);
  const courseId = params.get("id");


  if (!courseId) {
    setButton("Course not found", true, null);
    showErrorOnPage("Missing ?id= in the URL. Example: course-details.html?id=1");
    return;
  }


  // ---------- helpers ----------
  async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);


    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      return res;
    } finally {
      clearTimeout(timer);
    }
  }


  async function readResponseBody(res) {
    // Read text first so we can detect HTML vs JSON cleanly
    const text = await res.text();


    // If it looks like HTML, we return it as text (not JSON)
    const looksLikeHtml =
      text.trim().startsWith("<!DOCTYPE html") ||
      text.trim().startsWith("<html") ||
      text.includes("<head>") ||
      text.includes("<body>");


    if (looksLikeHtml) {
      return { type: "html", data: text };
    }


    // Try JSON
    try {
      return { type: "json", data: JSON.parse(text) };
    } catch (e) {
      return { type: "text", data: text };
    }
  }


  function normalizeId(x) {
    // backend might send numbers; profile arrays might be strings
    if (x === null || x === undefined) return "";
    return String(x).trim();
  }


  function idInList(id, list) {
    const norm = normalizeId(id);
    return (Array.isArray(list) ? list : []).map(normalizeId).includes(norm);
  }


  // ---------- load course ----------
  clearErrorOnPage();
  setButton("Loading…", true, null);


  let course = null;


  try {
    const courseUrl = `${API_BASE}/courses/${encodeURIComponent(courseId)}`;
    const res = await fetchWithTimeout(courseUrl, {}, 12000);


    const body = await readResponseBody(res);


    if (!res.ok) {
      setButton("Error loading course", true, null);
      showErrorOnPage(
        `Course API failed.\n` +
        `URL: ${courseUrl}\n` +
        `Status: ${res.status}\n` +
        `Body: ${body.type === "json" ? JSON.stringify(body.data).slice(0, 300) : String(body.data).slice(0, 300)}`
      );
      return;
    }


    if (body.type !== "json") {
      // This is the BIG one: it means your /api redirect didn’t apply and you got HTML
      setButton("Error loading course", true, null);
      showErrorOnPage(
        `Course API returned ${body.type.toUpperCase()} instead of JSON.\n` +
        `That usually means the /api redirect isn’t being applied in the deployed site.\n` +
        `Try opening this directly: ${courseUrl}`
      );
      return;
    }


    course = body.data;
  } catch (err) {
    setButton("Error loading course", true, null);
    showErrorOnPage(
      `Course request crashed.\n` +
      `This can happen if the backend is down, the request timed out, or the browser blocked it.\n` +
      `Try opening: ${API_BASE}/courses/${encodeURIComponent(courseId)}`
    );
    return;
  }


  // ---------- fill basic course info ----------
  if (titleEl) titleEl.textContent = course.title || "Course";
  if (descEl) descEl.textContent = course.description || "";


  // price / free label
  if (course.free) {
    if (freeLabelEl) freeLabelEl.textContent = "Free (counts as 1 of your 3 free courses)";
    if (oldPriceEl) oldPriceEl.textContent = "";
  } else if (course.price != null) {
    if (oldPriceEl) oldPriceEl.textContent = `$${Number(course.price).toFixed(2)}`;
    if (freeLabelEl) freeLabelEl.textContent = "";
  } else {
    if (oldPriceEl) oldPriceEl.textContent = "";
    if (freeLabelEl) freeLabelEl.textContent = "";
  }


  // lessons list (sorted if lessonOrder exists)
  if (lessonsListEl) {
    lessonsListEl.innerHTML = "";


    const lessons = Array.isArray(course.lessons) ? course.lessons.slice() : [];
    lessons.sort((a, b) => {
      const ao = a && a.lessonOrder != null ? Number(a.lessonOrder) : 999999;
      const bo = b && b.lessonOrder != null ? Number(b.lessonOrder) : 999999;
      return ao - bo;
    });


    if (lessons.length === 0) {
      const li = document.createElement("li");
      li.textContent = "No lessons found for this course.";
      lessonsListEl.appendChild(li);
    } else {
      lessons.forEach((lesson, index) => {
        const li = document.createElement("li");
       li.innerHTML = `<a href="lessons.html?courseId=${course.id}" style="text-decoration:none; color:inherit; cursor:pointer;">${lesson.title || "Lesson"}</a>`;
        lessonsListEl.appendChild(li);
      });
    }
  }


  // ---------- auth + ownership logic ----------
  const token = localStorage.getItem("token");


  function setLoggedOutButton() {
    setButton("Sign In to Start", false, function () {
      window.location.href = "sign-in.html";
    });
  }


  if (!token) {
    setLoggedOutButton();
    return;
  }


  // ---------- load user profile ----------
  let userProfile = null;


  async function tryProfile(url) {
    const res = await fetchWithTimeout(url, {
      headers: { "Authorization": "Bearer " + token }
    }, 12000);


    const body = await readResponseBody(res);


    if (!res.ok) return { ok: false, status: res.status, body };
    if (body.type !== "json") return { ok: false, status: res.status, body };


    return { ok: true, data: body.data };
  }


  try {
    // Try the two most common routes
    let attempt = await tryProfile(`${API_BASE}/users/profile`);
    if (!attempt.ok) attempt = await tryProfile(`${API_BASE}/profile`);


    if (!attempt.ok) {
      // Token probably expired or endpoint mismatch
      localStorage.removeItem("token");
      setLoggedOutButton();
      showErrorOnPage(
        `Signed-in token was rejected or profile route mismatch.\n` +
        `Tried: /api/users/profile and /api/profile\n` +
        `Status: ${attempt.status}\n` +
        `You were signed out so the page can still work.`
      );
      return;
    }


    userProfile = attempt.data;
  } catch (err) {
    setLoggedOutButton();
    showErrorOnPage(
      `Profile request failed (network/timeout).\n` +
      `You can still view course info, but button logic will act logged-out.`
    );
    return;
  }


  // ---------- compute ownership ----------
  const ownedIds = Array.isArray(userProfile.ownedCourseIds) ? userProfile.ownedCourseIds : [];
  const freeIds = Array.isArray(userProfile.freeCourseIds) ? userProfile.freeCourseIds : [];


  const ownsThis = idInList(course.id, ownedIds) || idInList(course.id, freeIds);
  const hasFreeSlot = !ownsThis && freeIds.length < 3;
  const remainingFreePicks = 3 - freeIds.length;


  if (hasFreeSlot && freeLabelEl) {
    freeLabelEl.textContent = `Use 1 of your ${remainingFreePicks} free pick${remainingFreePicks === 1 ? "" : "s"}`;
  }


  // ---------- decide button state ----------
  if (ownsThis) {
    setButton("Start Course", false, function () {
      window.location.href = `lessons.html?courseId=${encodeURIComponent(course.id)}`;
    });
    return;
  }


  if (hasFreeSlot) {
    setButton("Add as Free", false, async function () {
      clearErrorOnPage();


      try {
        if (!userProfile.email) {
          showErrorOnPage("Profile did not include email, so we can’t call the free-course endpoint.");
          return;
        }


        const url =
          `${API_BASE}/users/${encodeURIComponent(userProfile.email)}/free-courses/${encodeURIComponent(course.id)}`;


        const res = await fetchWithTimeout(url, {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
          }
        }, 12000);


        const body = await readResponseBody(res);


        if (res.ok) {
          alert("Added.");
          window.location.reload();
          return;
        }


        showErrorOnPage(
          `Failed to add free course.\n` +
          `Status: ${res.status}\n` +
          `Body: ${body.type === "json" ? JSON.stringify(body.data).slice(0, 300) : String(body.data).slice(0, 300)}`
        );
      } catch (err) {
        showErrorOnPage("Failed to add free course (timeout/network).");
      }
    });
    return;
  }


  // Not owned, not a free-slot case => buy path
  setButton("Buy Course", false, async function () {
    clearErrorOnPage();
    try {
      await startCourseCheckout({
        courseId: course.id,
        courseTitle: course.title,
        coursePrice: course.price,
        token,
        apiBase: API_BASE,
      });
    } catch (err) {
      showErrorOnPage(err.message || "Could not start checkout.");
    }
  });
});
