console.log('Hello World!');
// Конфігурація
const CONFIG = {
  PASSWORD: "111", // Пароль доступу
  ACCESS_DURATION: 60000, // 1 хвилина (у мс)
};

// Стан програми
let currentPage = 0;
let accessTimer;
let hasAccess = false;

// DOM елементи
const container = document.getElementById('container');
const navDots = document.querySelectorAll('.nav-dot');
const passwordDialog = document.getElementById('password-dialog');
const passwordInput = document.getElementById('password-input');
const submitPasswordBtn = document.getElementById('submit-password');
const passwordError = document.getElementById('password-error');
const content2 = document.getElementById('content-2');
const content3 = document.getElementById('content-3');
const content4 = document.getElementById('content-4');
const accessBtn = document.getElementById('access-btn');
const timerElement = document.getElementById('timer');

// Ініціалізація полярних графіків
function initPolarPlots() {
  drawPolarPlot('polar-plot-1');
  drawPolarPlot('polar-plot-2');
  drawPolarPlot('polar-plot-3');
  drawPolarPlot('polar-plot-4')
}

// Малювання полярного графіка
function drawPolarPlot(canvasId) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  const page = canvas.closest('.page');

  // Важливо: встановлюємо розміри canvas як атрибути, не тільки CSS
  canvas.width = page.clientWidth;
  canvas.height = page.clientHeight;

  // Очищення
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Центри для 4 фігур
  const centers = [
    { x: canvas.width * 0.25, y: canvas.height * 0.25 },
    { x: canvas.width * 0.75, y: canvas.height * 0.25 },
    { x: canvas.width * 0.25, y: canvas.height * 0.75 },
    { x: canvas.width * 0.75, y: canvas.height * 0.75 }
  ];

  ctx.strokeStyle = 'rgba(128, 0, 0, 0.5)';
  ctx.lineWidth = 1.5;

  centers.forEach(center => {
    ctx.beginPath();
    for (let μ = 0; μ < 8 * Math.PI; μ += 0.05) {
      const r = 208 * Math.sin(7 * μ / 4);
      const x = center.x + r * Math.cos(μ);
      const y = center.y + r * Math.sin(μ);
      if (μ === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  });
}

function checkAccess() {
  const accessUntil = localStorage.getItem('accessUntil');
  let a = accessUntil && Date.now() < parseInt(accessUntil);
  console.log(a, accessUntil, Date.now(), parseInt(accessUntil));
  if ((accessUntil && Date.now()) < parseInt(accessUntil)) {
    grantAccess(false);
  } else {
    showAccessButton();
  }
}

function startTimer(endTime) {
  clearInterval(accessTimer);

  function update() {
    const remaining = endTime - Date.now();
    if (remaining <= 0) {
      clearInterval(accessTimer);
      enableBlur();
      timerElement.textContent = '';
      return;
    }

    const seconds = Math.floor(remaining / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    timerElement.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  update();
  accessTimer = setInterval(update, 1000);
}

// Включення blur
function enableBlur() {
  content2.classList.remove('unblurred');
  content3.classList.remove('unblurred');
  content4.classList.remove('unblurred');
  hasAccess = false;
  timerElement.textContent = '';
  showAccessButton();
}

// Показуємо кнопку access для сторінок 2-4
function showAccessButton() {
  if (currentPage === 1 || currentPage === 2 || currentPage === 3) {
    accessBtn.style.display = 'block';
  }
}

// Перехід до сторінки
function goToPage(pageIndex) {
  if (pageIndex < 0 || pageIndex > 4) return;
  currentPage = pageIndex;
  container.style.transform = `translateX(-${currentPage * 20}%)`;

  // Оновлення активних точок
  navDots.forEach((dot, index) => {
    dot.classList.toggle('active', index === currentPage);
  });

  // Нове Оновлюємо видимість кнопки доступу
  if (!hasAccess) {
    if (currentPage === 1 || currentPage === 2 || currentPage === 3) {
      showAccessButton();
    } else {
      hideAccessButton();
    }
  }
}

// Вимкнення blur
function grantAccess(showTimer = true) {
  const accessUntil = Date.now() + CONFIG.ACCESS_DURATION;
  localStorage.setItem('accessUntil', accessUntil);

  // Вимкнути blur
  content2.classList.add('unblurred');
  content3.classList.add('unblurred');
  content4.classList.add('unblurred');
  passwordDialog.style.display = 'none';
  passwordError.style.display = 'none';
  passwordInput.value = '';
  hideAccessButton();
  hasAccess = true;

  // Запустити таймер
  if (showTimer) {
    startTimer(accessUntil);
  }
}

function hideAccessButton() {
  accessBtn.style.display = 'none';
}

// Запуск Ініціалізація
window.addEventListener('load', () => {
  localStorage.setItem('accessUntil', 0);
  initPolarPlots();
  setupEventListeners();
  checkAccess();
});

window.addEventListener('resize', () => {
  initPolarPlots();
});

// Обробники подій
function setupEventListeners() {
  // Навігація по точкам
  navDots.forEach(dot => {
    dot.addEventListener('click', () => {
      const pageIndex = parseInt(dot.getAttribute('data-page'));
      goToPage(pageIndex);
    });
  });

  // Кнопка access доступу blur
  accessBtn.addEventListener('click', () => {
    passwordDialog.style.display = 'block';
    passwordInput.focus();
  });

  // Підтвердження паролю
  submitPasswordBtn.addEventListener('click', () => {
    if (passwordInput.value === CONFIG.PASSWORD) {
      grantAccess();
    } else {
      passwordError.style.display = 'block';
    }
  });

  // Закриття діалогу
  document.addEventListener('click', (e) => {
    if (e.target === passwordDialog) {
      passwordDialog.style.display = 'none';
      passwordError.style.display = 'none';
    }
  });

  // Клавіатура
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' && currentPage < 4) {
      goToPage(currentPage + 1);
    } else if (e.key === 'ArrowLeft' && currentPage > 0) {
      goToPage(currentPage - 1);
    } else if (e.key === 'Escape') {
      passwordDialog.style.display = 'none';
      passwordError.style.display = 'none';
    }
  });

  // Touch-свайпи
  let touchStartX = 0;
  let touchEndX = 0;

  document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  // Обробка свайпів
  function handleSwipe() {
    const threshold = 50;
    if (touchEndX < touchStartX - threshold) {
      // Свайп вліво
      if (currentPage < 4) goToPage(currentPage + 1);
    } else if (touchEndX > touchStartX + threshold) {
      // Свайп вправо
      if (currentPage > 0) goToPage(currentPage - 1);
    }
  }

}


