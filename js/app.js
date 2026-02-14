/* ============================================================
   BIRTHDAY SURPRISE — APP LOGIC
   ============================================================ */

(() => {
  'use strict';

  // ─────────── CONFIG ───────────
  const QUESTIONS = {
    boy: [
      { emoji: '🇺🇸', text: 'Are you in the United States?' },
      { emoji: '😎', text: 'Is your nickname "Lenny"?' },
      { emoji: '💪', text: 'Are you jacked?' },
    ],
    girl: [
      { emoji: '💍', text: 'Are you married?' },
      { emoji: '🌍', text: 'Do you stay in Lagos?' },
      { emoji: '💅', text: 'Are you pretty?' },
    ],
  };

  // Number of collage slides to generate per theme
  const SLIDE_COUNT = 6;

  // Floating icon sets
  const ICONS = {
    boy: ['⭐', '🌟', '💙', '🎈', '🚀', '🏆', '✨', '🎮', '⚡', '🫧'],
    girl: ['💖', '🌸', '🦋', '🌷', '💗', '🎀', '✨', '🌺', '💐', '🫧'],
    neutral: ['🎂', '🎉', '🎈', '🎊', '✨', '🎁', '⭐', '🌟'],
  };

  const SLIDE_EMOJIS = {
    boy: ['📸', '🎉', '🏆', '🎈', '🎂', '💙'],
    girl: ['📸', '🎉', '🌸', '🎈', '🎂', '💖'],
  };

  // ─────────── STATE ───────────
  let currentTheme = null; // 'boy' | 'girl'
  let currentQuestion = 0;
  let noDodgeCount = 0;
  let collageIndex = 0;
  let touchStartX = 0;
  let floatInterval = null;

  // ─────────── DOM REFS ───────────
  const $body = document.body;
  const $screenSelect = document.getElementById('screen-select');
  const $screenQ = document.getElementById('screen-questions');
  const $screenReveal = document.getElementById('screen-reveal');
  const $btnBoy = document.getElementById('btn-boy');
  const $btnGirl = document.getElementById('btn-girl');
  const $qCard = document.getElementById('question-card');
  const $qEmoji = document.getElementById('question-emoji');
  const $qText = document.getElementById('question-text');
  const $btnYes = document.getElementById('btn-yes');
  const $btnNo = document.getElementById('btn-no');
  const $progressFill = document.getElementById('progress-fill');
  const $progressText = document.getElementById('progress-text');
  const $revealTitle = document.getElementById('reveal-title');
  const $revealSub = document.getElementById('reveal-subtitle');
  const $collageTrack = document.getElementById('collage-track');
  const $collageDots = document.getElementById('collage-dots');
  const $collagePrev = document.getElementById('collage-prev');
  const $collageNext = document.getElementById('collage-next');
  const $btnSwitch = document.getElementById('btn-switch');
  const $btnRestart = document.getElementById('btn-restart');
  const $floatingIcons = document.getElementById('floating-icons');
  const $confettiCanvas = document.getElementById('confetti-canvas');

  // ─────────── INIT ───────────
  function init() {
    $btnBoy.addEventListener('click', () => startTheme('boy'));
    $btnGirl.addEventListener('click', () => startTheme('girl'));
    $btnYes.addEventListener('click', onYes);
    $btnNo.addEventListener('click', onNoClick);
    $collagePrev.addEventListener('click', () => moveCollage(-1));
    $collageNext.addEventListener('click', () => moveCollage(1));
    $btnSwitch.addEventListener('click', onSwitch);
    $btnRestart.addEventListener('click', onRestart);

    // Touch swipe
    const $wrapper = document.getElementById('collage-wrapper');
    $wrapper.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    $wrapper.addEventListener('touchend', (e) => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) moveCollage(diff > 0 ? 1 : -1);
    });

    // Start neutral floating icons on select screen
    spawnFloatingIcons('neutral');
  }

  // ─────────── SCREEN NAVIGATION ───────────
  function showScreen(screen) {
    [$screenSelect, $screenQ, $screenReveal].forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
  }

  // ─────────── THEME START ───────────
  function startTheme(theme) {
    currentTheme = theme;
    currentQuestion = 0;
    noDodgeCount = 0;

    $body.className = `theme-${theme}`;
    showScreen($screenQ);
    renderQuestion();
    spawnFloatingIcons(theme);
  }

  // ─────────── QUESTIONS ───────────
  function renderQuestion() {
    const q = QUESTIONS[currentTheme][currentQuestion];
    // Exit animation
    $qCard.classList.add('card-exit');

    setTimeout(() => {
      $qEmoji.textContent = q.emoji;
      $qText.textContent = q.text;

      // Reset No button
      $btnNo.classList.remove('dodging', 'shrinking');
      $btnNo.style.cssText = '';
      noDodgeCount = 0;

      // Reset Yes button size
      $btnYes.style.transform = '';

      // Progress
      const pct = ((currentQuestion + 1) / QUESTIONS[currentTheme].length) * 100;
      $progressFill.style.width = `${pct}%`;
      $progressText.textContent = `${currentQuestion + 1} / ${QUESTIONS[currentTheme].length}`;

      // Re-enter
      $qCard.classList.remove('card-exit');
      $qCard.style.animation = 'none';
      // Force reflow
      void $qCard.offsetHeight;
      $qCard.style.animation = '';
    }, currentQuestion === 0 ? 50 : 350);
  }

  function onYes() {
    currentQuestion++;
    if (currentQuestion >= QUESTIONS[currentTheme].length) {
      showReveal();
    } else {
      renderQuestion();
    }
  }

  // ─────────── NO-BUTTON DODGE LOGIC ───────────
  function onNoClick() {
    noDodgeCount++;

    // Grow the Yes button with each No click
    const yesScale = 1 + noDodgeCount * 0.15;
    $btnYes.style.transform = `scale(${yesScale})`;
    $btnYes.style.zIndex = '10';

    if (noDodgeCount >= 4) {
      // Shrink and hide behind Yes
      $btnNo.classList.add('shrinking');
      return;
    }

    // Position randomly within the question card
    const container = $qCard.querySelector('.question-buttons');
    const containerRect = container.getBoundingClientRect();
    const btnRect = $btnNo.getBoundingClientRect();

    // Make it dodging (absolute within container)
    $btnNo.classList.add('dodging');

    // Random position within container bounds
    const maxX = containerRect.width - btnRect.width;
    const maxY = 80; // keep it within a reasonable area

    let newX = Math.random() * maxX;
    let newY = -(Math.random() * maxY + 20);

    // On later dodges, make it move more erratically
    if (noDodgeCount >= 2) {
      newX = Math.random() * maxX * 0.8 + maxX * 0.1;
      newY = -(Math.random() * 100 + 30);
    }
    if (noDodgeCount >= 3) {
      $btnNo.style.transform = `scale(${0.7}) rotate(${(Math.random() - 0.5) * 30}deg)`;
      $btnNo.style.opacity = '0.6';
    }

    $btnNo.style.left = `${newX}px`;
    $btnNo.style.top = `${newY}px`;
  }

  // ─────────── REVEAL SCREEN ───────────
  function showReveal() {
    showScreen($screenReveal);

    // Update title
    const name = currentTheme === 'boy' ? 'Birdy Blue' : 'Aunty Nikky';
    $revealTitle.textContent = `Happy Birthday, ${name}!`;
    $revealSub.textContent = 'Swipe through these memories!';

    // Switch button text
    const otherName = currentTheme === 'boy' ? 'Aunty Nikky' : 'Birdy Blue';
    $btnSwitch.textContent = `Check out your twin!`;
    // $btnSwitch.textContent = `Celebrate ${otherName}!`;

    // Build collage slides
    buildCollage();

    // Re-trigger reveal animations
    $revealTitle.style.animation = 'none';
    void $revealTitle.offsetHeight;
    $revealTitle.style.animation = '';

    // Confetti!
    launchConfetti();
  }

  function buildCollage() {
    collageIndex = 0;
    $collageTrack.innerHTML = '';
    $collageDots.innerHTML = '';

    const emojis = SLIDE_EMOJIS[currentTheme];

    for (let i = 0; i < SLIDE_COUNT; i++) {
      const slide = document.createElement('div');
      slide.className = 'collage-slide';

      // Check if user has uploaded an image
      const prefix = currentTheme === 'boy' ? 'b' : 'g';
      const imgPath = `assets/${currentTheme}/${prefix}-photo-${i + 1}.jpg`;
      const img = new Image();
      img.src = imgPath;

      img.onload = () => {
        slide.innerHTML = '';
        const imgEl = document.createElement('img');
        imgEl.src = imgPath;
        imgEl.alt = `Memory ${i + 1}`;
        imgEl.draggable = false;
        slide.appendChild(imgEl);
      };

      img.onerror = () => {
        // Show placeholder
        slide.innerHTML = `
          <div class="slide-placeholder">
            <div class="placeholder-emoji">${emojis[i] || '📸'}</div>
            <div class="placeholder-text">Memory #${i + 1}</div>
            <div class="placeholder-hint">Add ${prefix}-photo-${i + 1}.jpg to assets/${currentTheme}/</div>
          </div>
        `;
      };

      $collageTrack.appendChild(slide);

      // Dots
      const dot = document.createElement('button');
      dot.className = `collage-dot${i === 0 ? ' active' : ''}`;
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.addEventListener('click', () => goToSlide(i));
      $collageDots.appendChild(dot);
    }

    updateCollagePosition();
  }

  // ─────────── COLLAGE / CAROUSEL ───────────
  function moveCollage(dir) {
    const maxIndex = SLIDE_COUNT - 1;
    collageIndex = Math.max(0, Math.min(maxIndex, collageIndex + dir));
    updateCollagePosition();
  }

  function goToSlide(index) {
    collageIndex = index;
    updateCollagePosition();
  }

  function updateCollagePosition() {
    $collageTrack.style.transform = `translateX(-${collageIndex * 100}%)`;

    // Update dots
    const dots = $collageDots.querySelectorAll('.collage-dot');
    dots.forEach((d, i) => d.classList.toggle('active', i === collageIndex));

    // Update nav visibility
    $collagePrev.style.opacity = collageIndex === 0 ? '0.3' : '1';
    $collageNext.style.opacity = collageIndex === SLIDE_COUNT - 1 ? '0.3' : '1';
  }

  // ─────────── SWITCH & RESTART ───────────
  function onSwitch() {
    const otherTheme = currentTheme === 'boy' ? 'girl' : 'boy';
    startTheme(otherTheme);
  }

  function onRestart() {
    $body.className = '';
    currentTheme = null;
    currentQuestion = 0;
    showScreen($screenSelect);
    spawnFloatingIcons('neutral');
  }

  // ─────────── FLOATING ICONS ───────────
  function spawnFloatingIcons(theme) {
    // Clear existing
    $floatingIcons.innerHTML = '';
    if (floatInterval) clearInterval(floatInterval);

    const icons = ICONS[theme];
    const count = window.innerWidth < 600 ? 8 : 15;

    // Create initial batch
    for (let i = 0; i < count; i++) {
      setTimeout(() => createFloatIcon(icons), i * 400);
    }

    // Continuously spawn
    floatInterval = setInterval(() => {
      if ($floatingIcons.children.length < (window.innerWidth < 600 ? 12 : 20)) {
        createFloatIcon(icons);
      }
    }, 1200);
  }

  function createFloatIcon(icons) {
    const el = document.createElement('span');
    el.className = 'float-icon';
    el.textContent = icons[Math.floor(Math.random() * icons.length)];
    el.style.left = `${Math.random() * 100}%`;
    el.style.animationDuration = `${6 + Math.random() * 6}s`;
    el.style.animationDelay = `${Math.random() * 2}s`;
    el.style.fontSize = `${1 + Math.random() * 1.5}rem`;
    $floatingIcons.appendChild(el);

    // Remove after animation ends
    const dur = parseFloat(el.style.animationDuration) + parseFloat(el.style.animationDelay);
    setTimeout(() => el.remove(), dur * 1000 + 500);
  }

  // ─────────── CONFETTI ───────────
  function launchConfetti() {
    const ctx = $confettiCanvas.getContext('2d');
    $confettiCanvas.width = window.innerWidth;
    $confettiCanvas.height = window.innerHeight;

    const pieces = [];
    const colors = currentTheme === 'boy'
      ? ['#4f8cff', '#7ec8ff', '#1b4aaa', '#ffffff', '#a8d4ff']
      : ['#ff6fa3', '#ffb3d9', '#aa1b6a', '#ffffff', '#ffd6eb'];

    for (let i = 0; i < 150; i++) {
      pieces.push({
        x: Math.random() * $confettiCanvas.width,
        y: Math.random() * $confettiCanvas.height - $confettiCanvas.height,
        w: 6 + Math.random() * 8,
        h: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: 2 + Math.random() * 4,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.2,
        drift: (Math.random() - 0.5) * 2,
        opacity: 1,
      });
    }

    let frame = 0;
    const maxFrames = 200;

    function animate() {
      frame++;
      ctx.clearRect(0, 0, $confettiCanvas.width, $confettiCanvas.height);

      for (const p of pieces) {
        p.y += p.speed;
        p.x += p.drift + Math.sin(p.angle) * 0.5;
        p.angle += p.spin;

        if (frame > maxFrames * 0.6) {
          p.opacity = Math.max(0, p.opacity - 0.015);
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      if (frame < maxFrames) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, $confettiCanvas.width, $confettiCanvas.height);
      }
    }

    requestAnimationFrame(animate);
  }

  // ─────────── KEYBOARD NAVIGATION ───────────
  document.addEventListener('keydown', (e) => {
    if ($screenReveal.classList.contains('active')) {
      if (e.key === 'ArrowLeft') moveCollage(-1);
      if (e.key === 'ArrowRight') moveCollage(1);
    }
  });

  // ─────────── RESIZE HANDLER ───────────
  window.addEventListener('resize', () => {
    if ($confettiCanvas) {
      $confettiCanvas.width = window.innerWidth;
      $confettiCanvas.height = window.innerHeight;
    }
  });

  // ─────────── GO! ───────────
  init();
})();
