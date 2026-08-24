let lessonsData = [];
let currentLessonIndex = 0;
let progressTimer = null;
let vimeoPlayer = null;
let canMarkComplete = false;
let currentCourseId = null;
let completedLessonIds = [];

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
function completedStorageKey(courseId = currentCourseId) {
  return courseId ? `completedLessons_${courseId}` : 'completedLessons';
}

function getCompleted() {
  return completedLessonIds.slice();
}

function setCompleted(arr) {
  completedLessonIds = (Array.isArray(arr) ? arr : []).map(normalizeId);
  if (currentCourseId) {
    localStorage.setItem(completedStorageKey(), JSON.stringify(completedLessonIds));
  }
}

function loadCompletedFromStorage(courseId) {
  const stored = localStorage.getItem(completedStorageKey(courseId));
  if (!stored) {
    const legacy = localStorage.getItem('completedLessons');
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed) && parsed.length > 0) {
          completedLessonIds = parsed.map(normalizeId);
          localStorage.setItem(completedStorageKey(courseId), JSON.stringify(completedLessonIds));
          return;
        }
      } catch (e) {
        console.error('Could not parse legacy completed lessons', e);
      }
    }
    completedLessonIds = [];
    return;
  }
  try {
    completedLessonIds = JSON.parse(stored).map(normalizeId);
  } catch (e) {
    console.error('Could not parse completed lessons', e);
    completedLessonIds = [];
  }
}

function mergeCompletedIds(...lists) {
  const merged = new Set();
  lists.forEach((list) => {
    (Array.isArray(list) ? list : []).forEach((id) => merged.add(normalizeId(id)));
  });
  setCompleted([...merged]);
}

function isLessonCompleted(lessonId) {
  return idInList(lessonId, completedLessonIds);
}
function percent(n, d) {
  return d > 0 ? (n / d) * 100 : 0;
}
function isLocked(i) {
  if (i === 0) return false;
  return !isLessonCompleted(lessonsData[i - 1].id);
}

// ---------- Sidebar ----------
function renderSidebar() {
  const ul = document.getElementById('lesson-list');
  if (!ul) return;
  ul.innerHTML = '';
  const completed = getCompleted();

  lessonsData.forEach((lesson, i) => {
    const locked = isLocked(i);
    const done = isLessonCompleted(lesson.id);
    let liClass = '';
    if (i === currentLessonIndex) liClass += 'active ';
    if (done) liClass += 'completed ';
    if (locked) liClass += 'locked ';

    ul.innerHTML += `
      <li class="${liClass.trim()}" ${locked ? '' : `onclick="showLesson(${i})"`}>
        <span>${lesson.title}</span>
        ${done ? '✅' : locked ? '🔒' : ''}
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
  if (!canMarkComplete || isLessonCompleted(lessonId)) return;

  const previous = getCompleted();
  mergeCompletedIds(previous, [lessonId]);
  renderSidebar();
  updateProgress();

  try {
    const res = await fetch(`${API_BASE}/lessons/${lessonId}/complete`, {
      method: 'POST',
      headers: authHeaders()
    });
    if (!res.ok) {
      throw new Error('Failed to mark lesson complete: ' + res.status);
    }
  } catch (err) {
    console.error('Error marking complete on server (saved on this device)', err);
  }
}

async function loadCompletedLessons(courseId) {
  const localCompleted = getCompleted();
  try {
    const res = await fetch(`${API_BASE}/users/courses/${courseId}/completed-lessons`, {
      headers: authHeaders()
    });
    if (!res.ok) {
      return;
    }
    const completedIds = await res.json();
    if (Array.isArray(completedIds)) {
      mergeCompletedIds(localCompleted, completedIds);
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

    if (pct >= 90 && !isLessonCompleted(lessonId)) {
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
    <div class="lesson-actions">
      <button id="mark-complete-btn" disabled>Mark as Complete</button>
    </div>
    <div class="reflection-section">
      <h3>Your Reflection</h3>
      <textarea id="reflection" rows="6" placeholder="Write your private reflection on this lesson..."></textarea>
      <div class="reflection-actions">
        <button id="save-reflection-btn">Save Reflection</button>
        <span id="reflection-status"></span>
      </div>
    </div>
  `;

  document.getElementById('mark-complete-btn').onclick = () => markLessonComplete(lesson.id);
  document.getElementById('save-reflection-btn').onclick = () => saveReflection(lesson.id);
  loadReflection(lesson.id);

  const host = document.getElementById('video-host');
  if (isVimeo) {
    let vimeoId = url.split('/').pop();
    const iframeId = 'vimeo-player-' + lesson.id;
    host.innerHTML = `
      <div class="video-embed">
        <iframe id="${iframeId}" src="https://player.vimeo.com/video/${vimeoId}"
          allow="autoplay; fullscreen; picture-in-picture"
          allowfullscreen></iframe>
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

function setupBackButton(courseId) {
  const backEl = document.getElementById('lesson-back');
  if (!backEl) return;

  const params = new URLSearchParams(window.location.search);
  const from = (params.get('from') || '').toLowerCase();
  let backUrl = '';
  let backLabel = 'Back';

  if (from === 'profile') {
    backUrl = 'profile.html';
    backLabel = 'Back to Profile';
  } else if (from === 'course' || from === 'course-details') {
    backUrl = `course-details.html?id=${encodeURIComponent(courseId)}`;
    backLabel = 'Back to Course';
  } else {
    try {
      const ref = document.referrer;
      if (ref) {
        const refUrl = new URL(ref);
        const refPath = refUrl.pathname.toLowerCase();
        if (refPath.endsWith('/profile.html') || refPath.endsWith('profile.html')) {
          backUrl = 'profile.html';
          backLabel = 'Back to Profile';
        } else if (refPath.endsWith('/course-details.html') || refPath.endsWith('course-details.html')) {
          backUrl = `course-details.html${refUrl.search}`;
          backLabel = 'Back to Course';
        }
      }
    } catch (err) {
      console.error('Could not parse referrer for back navigation', err);
    }
  }

  if (!backUrl) {
    backUrl = `course-details.html?id=${encodeURIComponent(courseId)}`;
    backLabel = 'Back to Course';
  }

  backEl.href = backUrl;
  const labelEl = backEl.querySelector('.lesson-back-label');
  if (labelEl) {
    labelEl.textContent = backLabel;
  }
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
  setupBackButton(courseId);
  loadCompletedFromStorage(courseId);

  try {
    const [lessonsRes] = await Promise.all([
      fetch(`${API_BASE}/lessons/by-course/${courseId}`, { headers: authHeaders() }),
      loadCompletedLessons(courseId)
    ]);

    const lessons = await lessonsRes.json();
    lessonsData = lessons || [];
    renderSidebar();

    if (lessonsData.length > 0) {
      const firstUnlockedIndex = lessonsData.findIndex((lesson, i) =>
        !isLocked(i) && !isLessonCompleted(lesson.id)
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
