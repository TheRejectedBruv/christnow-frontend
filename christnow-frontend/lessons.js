let lessonsData = [];
let currentLessonIndex = 0;
let progressTimer = null;
let vimeoPlayer = null;
let canMarkComplete = false;
let currentCourseId = null;

const API_BASE = "/api";

function getToken() {
  let token = localStorage.getItem("token") || "";
  if (token.toLowerCase().startsWith("bearer ")) {
    token = token.slice(7).trim();
  }
  return token;
}

function authHeaders(extra = {}) {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, ...extra }
    : { ...extra };
}

function reflectionStorageKey(lessonId) {
  return `reflection_lesson_${lessonId}`;
}

function reflectionApiUrl(lessonId) {
  return `${API_BASE}/users/lessons/${lessonId}/reflection`;
}

// ---------- Storage ----------
function completedStorageKey() {
  return currentCourseId ? `completedLessons_${currentCourseId}` : 'completedLessons';
}

function getCompleted() {
  return JSON.parse(localStorage.getItem(completedStorageKey()) || '[]');
}
function setCompleted(arr) {
  localStorage.setItem(completedStorageKey(), JSON.stringify(arr));
}
function percent(n, d) {
  return d > 0 ? (n / d) * 100 : 0;
}
function isLocked(i) {
  if (i === 0) return false;
  const completed = getCompleted();
  return !completed.includes(lessonsData[i - 1].id);
}

// ---------- Sidebar ----------
function renderSidebar() {
  const ul = document.getElementById('lesson-list');
  if (!ul) return;
  ul.innerHTML = '';
  const completed = getCompleted();

  lessonsData.forEach((lesson, i) => {
    const locked = isLocked(i);
    let liClass = '';
    if (i === currentLessonIndex) liClass += 'active ';
    if (completed.includes(lesson.id)) liClass += 'completed ';
    if (locked) liClass += 'locked ';

    ul.innerHTML += `
      <li class="${liClass.trim()}" ${locked ? '' : `onclick="showLesson(${i})"`}>
        <span>${lesson.title}</span>
        ${completed.includes(lesson.id) ? '✅' : locked ? '🔒' : ''}
      </li>
    `;
  });
}

// ---------- Progress ----------
function updateProgress(pctWatched = null) {
  const completedCount = getCompleted().length;
  const total = lessonsData.length;
  let text = `Lessons completed: ${completedCount} of ${total}`;
  if (pctWatched !== null) {
    text += ` • ${Math.floor(pctWatched)}% watched`;
  }
  document.getElementById('progress').innerText = text;
}

async function markLessonComplete(lessonId) {
  if (!canMarkComplete) return;
  const completed = getCompleted();
  if (!completed.includes(lessonId)) {
    try {
      const res = await fetch(`${API_BASE}/lessons/${lessonId}/complete`, {
        method: 'POST',
        headers: authHeaders()
      });
      if (!res.ok) {
        throw new Error('Failed to mark lesson complete: ' + res.status);
      }
      completed.push(lessonId);
      setCompleted(completed);
      renderSidebar();
      updateProgress();
    } catch (err) {
      console.error('Error marking complete', err);
    }
  }
}

async function loadCompletedLessons(courseId) {
  try {
    const res = await fetch(`${API_BASE}/users/courses/${courseId}/completed-lessons`, {
      headers: authHeaders()
    });
    if (!res.ok) {
      return;
    }
    const completedIds = await res.json();
    if (Array.isArray(completedIds)) {
      setCompleted(completedIds);
    }
  } catch (err) {
    console.error('Error loading completed lessons', err);
  }
}

async function saveReflection(lessonId) {
  const reflectionText = document.getElementById('reflection').value;
  const status = document.getElementById('reflection-status');
  localStorage.setItem(reflectionStorageKey(lessonId), reflectionText);

  try {
    const res = await fetch(reflectionApiUrl(lessonId), {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'text/plain' }),
      body: reflectionText
    });
    if (res.status === 401) {
      if (status) {
        status.textContent = 'Saved on this device. Sign in again to sync to your account.';
        status.className = 'status-success';
      }
      return;
    }
    if (!res.ok) {
      throw new Error('Save failed with status ' + res.status);
    }
    if (status) {
      status.textContent = '✓ Saved';
      status.className = 'status-success';
      setTimeout(() => { status.textContent = ''; status.className = ''; }, 3000);
    }
  } catch (err) {
    console.error('Error saving reflection', err);
    if (status) {
      status.textContent = 'Saved on this device.';
      status.className = 'status-success';
    }
  }
}



async function loadReflection(lessonId) {
  const box = document.getElementById('reflection');
  if (!box) return;

  const savedLocal = localStorage.getItem(reflectionStorageKey(lessonId));
  if (savedLocal) {
    box.value = savedLocal;
  }

  try {
    const res = await fetch(reflectionApiUrl(lessonId), {
      headers: authHeaders()
    });
    if (!res.ok) {
      return;
    }
    const text = await res.text();
    if (text) {
      box.value = text;
      localStorage.setItem(reflectionStorageKey(lessonId), text);
    }
  } catch (err) {
    console.error('Error loading reflection', err);
  }
}





// ---------- Tracking ----------
function clearTracking() {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
  vimeoPlayer = null;
  canMarkComplete = false;

  const completeBtn = document.getElementById('mark-complete-btn');
  if (completeBtn) {
    completeBtn.disabled = true;
  }
}

function setupVimeoTracking(iframeId, lessonId) {
  clearTracking();

  const iframe = document.getElementById(iframeId);
  if (!iframe) return;

  vimeoPlayer = new Vimeo.Player(iframe);

  vimeoPlayer.on('timeupdate', function (data) {
    const dur = data.duration || 0;
    const cur = data.seconds || 0;
    const pct = percent(cur, dur);
    updateProgress(pct);

    if (pct >= 90 && !getCompleted().includes(lessonId)) {
      canMarkComplete = true;
      const completeBtn = document.getElementById('mark-complete-btn');
      if (completeBtn) {
        completeBtn.disabled = false;
      }
    }
  });
}

// ---------- Lesson Rendering ----------
function showLesson(index) {
  currentLessonIndex = index;
  clearTracking();

  const lesson = lessonsData[index];
  const content = document.getElementById('lesson-content');
  if (!content) return;

  const url = (lesson.videoUrl || '').trim();
  const isVimeo = /vimeo\.com/i.test(url);

  content.innerHTML = `
    <h2>${lesson.title}</h2>
    <div id="video-host"></div>
    <button id="mark-complete-btn" disabled>Mark as Complete</button>
       <div class="reflection-section">
      <h3>Your Reflection</h3>
      <textarea id="reflection" rows="6" placeholder="Write your private reflection on this lesson..."></textarea>
      <div>
        <button id="save-reflection-btn">Save Reflection</button>
        <span id="reflection-status"></span>
      </div>
    </div>
  `;

  document.getElementById('mark-complete-btn').onclick = () => markLessonComplete(lesson.id);
  document.getElementById('save-reflection-btn').onclick = () => saveReflection(lesson.id);
  loadReflection(lesson.id);



  
  document.getElementById('mark-complete-btn').onclick = () => markLessonComplete(lesson.id);

  const host = document.getElementById('video-host');
  if (isVimeo) {
    let vimeoId = url.split('/').pop();
    const iframeId = 'vimeo-player-' + lesson.id;
    host.innerHTML = `
      <div style="position:relative; padding-top:56.25%;">
        <iframe id="${iframeId}" src="https://player.vimeo.com/video/${vimeoId}"
          frameborder="0" allow="autoplay; fullscreen; picture-in-picture"
          allowfullscreen
          style="position:absolute; top:0; left:0; width:100%; height:100%;"></iframe>
      </div>
    `;
    setupVimeoTracking(iframeId, lesson.id);
  } else {
    host.innerHTML = `<p style="color:red;">Unsupported video format. Please use Vimeo links.</p>`;
  }

  updateProgress();
  renderSidebar();
}

// ---------- Init ----------

function normalizeId(x) {
  if (x == null) return "";
  return String(x).trim();
}

function idInList(id, list) {
  return (Array.isArray(list) ? list : []).map(normalizeId).includes(normalizeId(id));
}

async function userOwnsCourse(courseId, token) {
  const res = await fetch(`${API_BASE}/users/profile`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return false;
  const profile = await res.json();
  const ownedIds = profile.ownedCourseIds || [];
  const freeIds = profile.freeCourseIds || [];
  return idInList(courseId, ownedIds) || idInList(courseId, freeIds);
}

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const courseId = params.get('courseId');
  const lessonContent = document.getElementById('lesson-content');

  if (!courseId) {
    if (lessonContent) {
      lessonContent.innerHTML = "<p style='color:red;'>No course selected.</p>";
    }
    return;
  }

  const token = getToken();
  if (!token) {
    if (lessonContent) {
      lessonContent.innerHTML =
        "<p style='color:red;'>Please <a href='sign-in.html'>sign in</a> to view lessons.</p>";
    }
    return;
  }

  const owns = await userOwnsCourse(courseId, token);
  if (!owns) {
    if (lessonContent) {
      lessonContent.innerHTML =
        `<p style='color:red;'>You need to own this course first. ` +
        `<a href='course-details.html?id=${encodeURIComponent(courseId)}'>Go to course page</a></p>`;
    }
    return;
  }

  currentCourseId = courseId;

  try {
    const [lessonsRes] = await Promise.all([
      fetch(`${API_BASE}/lessons/by-course/${courseId}`, { headers: authHeaders() }),
      loadCompletedLessons(courseId)
    ]);

    const lessons = await lessonsRes.json();
    lessonsData = lessons || [];
    renderSidebar();

    if (lessonsData.length > 0) {
      const completed = getCompleted();
      const firstUnlockedIndex = lessonsData.findIndex((lesson, i) =>
        !isLocked(i) && !completed.includes(lesson.id)
      );
      const startIndex = firstUnlockedIndex >= 0 ? firstUnlockedIndex : 0;
      showLesson(startIndex);
    } else if (lessonContent) {
      lessonContent.innerHTML = "<p>No lessons found.</p>";
    }
  } catch (err) {
    console.error(err);
    if (lessonContent) {
      lessonContent.innerHTML = "<p style='color:red;'>Could not load lessons.</p>";
    }
  }
});
