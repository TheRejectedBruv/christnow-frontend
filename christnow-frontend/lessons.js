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
      await fetch(`http://localhost:8085/lessons/${lessonId}/complete`, {
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
  try {
    await fetch(`http://localhost:8085/lessons/${lessonId}/reflection`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: reflectionText })
    });
    alert('Reflection saved!');
  } catch (err) {
    console.error('Error saving reflection', err);
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
    <textarea id="reflection" placeholder="Write your reflection here">${savedReflection}</textarea>
    <br/>
    <button id="save-reflection-btn">Save Reflection</button>
    <button id="mark-complete-btn" disabled>Mark as Complete</button>
  `;

  document.getElementById('save-reflection-btn').onclick = () => saveReflection(lesson.id);
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
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const courseId = params.get('courseId');

  localStorage.removeItem('completedLessons');

  if (!courseId) {
    document.getElementById('lesson-content').innerHTML =
      "<p style='color:red;'>No course selected.</p>";
    return;
  }

  fetch(`http://localhost:8085/lessons/by-course/${courseId}`, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  })
    .then(res => res.json())
    .then(lessons => {
      lessonsData = lessons || [];
      renderSidebar();
      if (lessonsData.length > 0) {
        showLesson(0);
      } else {
        document.getElementById('lesson-content').innerHTML =
          "<p>No lessons found.</p>";
      }
    })
    .catch(err => {
      console.error(err);
      document.getElementById('lesson-content').innerHTML =
        "<p style='color:red;'>Could not load lessons.</p>";
    });
});
