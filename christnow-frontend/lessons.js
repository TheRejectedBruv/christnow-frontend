let lessonsData = [];
let currentLessonIndex = 0;
let progressTimer = null;
let vimeoPlayer = null;
let canMarkComplete = false;

// ---------- Storage ----------
function getCompleted() {
  return JSON.parse(localStorage.getItem('completedLessons') || '[]');
}
function setCompleted(arr) {
  localStorage.setItem('completedLessons', JSON.stringify(arr));
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
      await fetch(`https://christnow-backend-777aa5f9a483.herokuapp.com/lessons/${lessonId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      completed.push(lessonId);
      setCompleted(completed);
      renderSidebar();
      updateProgress();
    } catch (err) {
      console.error('Error marking complete', err);
    }
  }
}

async function saveReflection(lessonId) {
  const reflectionText = document.getElementById('reflection').value;
  const status = document.getElementById('reflection-status');
  try {
    await fetch(`https://christnow-backend-777aa5f9a483.herokuapp.com/lessons/${lessonId}/reflection`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'text/plain'
      },
      body: reflectionText
    });
    if (status) {
      status.textContent = '✓ Saved';
      status.className = 'status-success';
      setTimeout(() => { status.textContent = ''; status.className = ''; }, 3000);
    }
  } catch (err) {
    console.error('Error saving reflection', err);
    if (status) {
      status.textContent = 'Could not save. Try again.';
      status.className = 'status-error';
    }
  }
}



async function loadReflection(lessonId) {
  try {
    const res = await fetch(`https://christnow-backend-777aa5f9a483.herokuapp.com/lessons/${lessonId}/reflection`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const text = await res.text();
    const box = document.getElementById('reflection');
    if (box) {
      box.value = text || '';
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

  const savedReflection = localStorage.getItem('reflection_' + lesson.id) || '';
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
const API_BASE = "https://christnow-backend-777aa5f9a483.herokuapp.com";

function normalizeId(x) {
  if (x == null) return "";
  return String(x).trim();
}

function idInList(id, list) {
  return (Array.isArray(list) ? list : []).map(normalizeId).includes(normalizeId(id));
}

async function userOwnsCourse(courseId, token) {
  const res = await fetch(`${API_BASE}/api/users/profile`, {
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

  localStorage.removeItem('completedLessons');

  if (!courseId) {
    if (lessonContent) {
      lessonContent.innerHTML = "<p style='color:red;'>No course selected.</p>";
    }
    return;
  }

  const token = localStorage.getItem('token');
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

  fetch(`${API_BASE}/lessons/by-course/${courseId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(lessons => {
      lessonsData = lessons || [];
      renderSidebar();
      if (lessonsData.length > 0) {
        showLesson(0);
      } else if (lessonContent) {
        lessonContent.innerHTML = "<p>No lessons found.</p>";
      }
    })
    .catch(err => {
      console.error(err);
      if (lessonContent) {
        lessonContent.innerHTML = "<p style='color:red;'>Could not load lessons.</p>";
      }
    });
});
