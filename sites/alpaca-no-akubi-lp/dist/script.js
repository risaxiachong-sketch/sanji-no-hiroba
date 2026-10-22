'use strict';
(function () {
  var body = document.body;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var phone = window.matchMedia('(max-width: 600px)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var canObserve = 'IntersectionObserver' in window;

  function canMove() {
    return !reduced.matches && !body.classList.contains('motion-paused');
  }
  function replay(element, className, duration) {
    window.clearTimeout(element._replayTimer);
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
    element._replayTimer = window.setTimeout(function () { element.classList.remove(className); }, duration);
  }
  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }
  function sparkle(container) {
    if (!canMove()) return;
    ['♡', '✿', '♡', '✦', '♡'].forEach(function (shape, index) {
      var spark = document.createElement('span');
      spark.className = 'pet-spark';
      spark.setAttribute('aria-hidden', 'true');
      spark.textContent = shape;
      spark.style.setProperty('--dx', ((index - 2) * 37) + 'px');
      spark.style.setProperty('--dy', (-65 - Math.abs(index - 2) * 15) + 'px');
      spark.style.setProperty('--spin', ((index - 2) * 16) + 'deg');
      spark.style.setProperty('--spark-color', ['#e4ab9d', '#c7cda6', '#eac780', '#b7d3de', '#e4ab9d'][index]);
      spark.style.animationDelay = (index * .045) + 's';
      container.appendChild(spark);
      window.setTimeout(function () { spark.remove(); }, 1800);
    });
  }
  function greet(element) {
    replay(element, 'is-greeting', 1300);
    sparkle(element);
  }

  /* ---------- Dialogs ---------- */
  var preview = document.getElementById('preview-dialog');
  var board = document.getElementById('board-dialog');
  var info = document.getElementById('info-dialog');
  var video = document.getElementById('plaza-video');
  var lastFocus = null;

  function openDialog(dialog) {
    lastFocus = document.activeElement;
    dialog.classList.remove('is-closing');
    dialog.showModal();
    body.classList.add('dialog-open');
  }
  function closeDialog(dialog) {
    if (!dialog.open || dialog.classList.contains('is-closing')) return;
    if (!canMove()) { dialog.close(); return; }
    dialog.classList.add('is-closing');
    window.setTimeout(function () { dialog.close(); }, 230);
  }
  // On phones the dialogs are bottom sheets that can be pulled down to close.
  function pullToClose(dialog) {
    var startY = null;
    var pulled = 0;
    dialog.addEventListener('pointerdown', function (event) {
      if (!phone.matches || event.pointerType === 'mouse' || event.target.closest('.close-dialog, a, video')) return;
      if (event.clientY - dialog.getBoundingClientRect().top > 80) return;
      startY = event.clientY;
      pulled = 0;
      dialog.style.transition = 'none';
      dialog.setPointerCapture(event.pointerId);
    });
    dialog.addEventListener('pointermove', function (event) {
      if (startY === null) return;
      pulled = Math.max(0, event.clientY - startY);
      dialog.style.transform = 'translateY(' + pulled + 'px)';
    });
    function release() {
      if (startY === null) return;
      startY = null;
      dialog.style.transition = 'transform .3s cubic-bezier(.2, .8, .2, 1)';
      if (pulled > 90) {
        dialog.style.transform = 'translateY(100%)';
        window.setTimeout(function () { dialog.close(); }, 280);
      } else {
        dialog.style.transform = '';
      }
    }
    dialog.addEventListener('pointerup', release);
    dialog.addEventListener('pointercancel', release);
  }

  document.getElementById('preview-open').addEventListener('click', function () {
    openDialog(preview);
    video.play().catch(function () {});
  });
  document.getElementById('board-preview-open').addEventListener('click', function () { openDialog(board); });
  document.getElementById('site-info-open').addEventListener('click', function () { openDialog(info); });

  [preview, board, info].forEach(function (dialog) {
    pullToClose(dialog);
    dialog.querySelector('.close-dialog').addEventListener('click', function () { closeDialog(dialog); });
    dialog.addEventListener('cancel', function (event) {
      event.preventDefault();
      closeDialog(dialog);
    });
    dialog.addEventListener('click', function (event) {
      if (event.target !== dialog) return;
      var rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(dialog);
    });
    dialog.addEventListener('close', function () {
      dialog.classList.remove('is-closing');
      dialog.style.transform = '';
      dialog.style.transition = '';
      if (dialog === preview) video.pause();
      body.classList.remove('dialog-open');
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    });
  });

  /* ---------- Motion switch ---------- */
  var toggle = document.getElementById('motion-toggle');
  var toggleState = toggle.querySelector('.motion-state');
  var toggleIcon = toggle.querySelector('.motion-icon');
  var motionListeners = [];

  function setPaused(paused) {
    body.classList.toggle('motion-paused', paused);
    toggle.setAttribute('aria-pressed', String(paused));
    toggleState.textContent = paused ? 'はじめる' : 'おやすみ';
    toggleIcon.textContent = paused ? '☀' : '☾';
    motionListeners.forEach(function (listener) { listener(); });
  }
  toggle.addEventListener('click', function () {
    var paused = !body.classList.contains('motion-paused');
    setPaused(paused);
    try { window.localStorage.setItem('alpaca-motion', paused ? 'paused' : 'moving'); } catch (error) {}
  });
  function followSystemMotion() {
    // The device setting already stills everything, so the switch steps aside.
    toggle.hidden = reduced.matches;
    if (reduced.matches) body.classList.add('motion-paused');
  }
  followSystemMotion();
  if (reduced.addEventListener) reduced.addEventListener('change', followSystemMotion);
  try { if (window.localStorage.getItem('alpaca-motion') === 'paused') setPaused(true); } catch (error) {}

  /* ---------- Hero: the sleepy alpaca ---------- */
  var hero = document.querySelector('.hero');
  var art = document.getElementById('hero-art');
  var pet = document.getElementById('pet-alpaca');
  var heroVisible = true;
  var lastPet = 0;

  function petAlpaca() {
    lastPet = Date.now();
    art.classList.add('has-been-petted');
    art.classList.remove('is-yawning');
    replay(art, 'is-petted', 2000);
    sparkle(art);
  }
  pet.addEventListener('click', petAlpaca);

  // Stroking the alpaca (a hovering mouse, or a finger sliding sideways) leaves little hearts.
  var strokeDistance = 0;
  var heartDistance = 0;
  var lastPoint = null;
  var touching = false;
  pet.addEventListener('pointerdown', function (event) {
    touching = true;
    lastPoint = { x: event.clientX, y: event.clientY };
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (type) {
    pet.addEventListener(type, function () {
      touching = false;
      lastPoint = null;
      strokeDistance = 0;
    });
  });
  pet.addEventListener('pointermove', function (event) {
    if (!canMove() || (event.pointerType !== 'mouse' && !touching)) return;
    if (!lastPoint) { lastPoint = { x: event.clientX, y: event.clientY }; return; }
    var step = Math.hypot(event.clientX - lastPoint.x, event.clientY - lastPoint.y);
    lastPoint = { x: event.clientX, y: event.clientY };
    strokeDistance += step;
    heartDistance += step;
    if (heartDistance > 38 && art.querySelectorAll('.pet-heart').length < 12) {
      heartDistance = 0;
      var rect = art.getBoundingClientRect();
      var heart = document.createElement('span');
      heart.className = 'pet-heart';
      heart.setAttribute('aria-hidden', 'true');
      heart.textContent = pick(['♡', '♡', '✿', '✦']);
      heart.style.left = (event.clientX - rect.left) + 'px';
      heart.style.top = (event.clientY - rect.top) + 'px';
      heart.style.setProperty('--heart', pick(['#e4ab9d', '#eac780', '#b7d3de', '#e8b4c2']));
      heart.style.setProperty('--dx', (Math.random() * 30 - 15).toFixed(0) + 'px');
      heart.style.setProperty('--r', (Math.random() * 30 - 15).toFixed(0) + 'deg');
      art.appendChild(heart);
      window.setTimeout(function () { heart.remove(); }, 1250);
    }
    if (strokeDistance > 260 && Date.now() - lastPet > 2200) {
      strokeDistance = 0;
      petAlpaca();
    }
  });

  // Now and then, the alpaca lives up to its name.
  function scheduleYawn() {
    window.setTimeout(function () {
      if (canMove() && heroVisible && !document.hidden && Date.now() - lastPet > 6000) replay(art, 'is-yawning', 2500);
      scheduleYawn();
    }, 9000 + Math.random() * 7000);
  }
  scheduleYawn();

  hero.addEventListener('pointermove', function (event) {
    if (!canMove() || !finePointer.matches) return;
    var rect = hero.getBoundingClientRect();
    art.style.setProperty('--wind-x', (((event.clientX - rect.left) / rect.width - .5) * 10).toFixed(1) + 'px');
    art.style.setProperty('--wind-y', (((event.clientY - rect.top) / rect.height - .5) * 5).toFixed(1) + 'px');
  });
  hero.addEventListener('pointerleave', function () {
    art.style.setProperty('--wind-x', '0px');
    art.style.setProperty('--wind-y', '0px');
  });

  /* ---------- Scroll: floating header, sky parallax ---------- */
  var header = document.getElementById('site-header');
  var lastY = window.scrollY;
  var scrollQueued = false;

  function setFloating(floating) {
    if (header.classList.contains('is-floating') === floating) return;
    header.style.transition = 'none';
    header.classList.toggle('is-floating', floating);
    header.classList.remove('is-shown');
    void header.offsetWidth;
    header.style.transition = '';
  }
  function onScroll() {
    scrollQueued = false;
    var y = window.scrollY;
    if (phone.matches || y <= 2) setFloating(false);
    else if (y > 160) setFloating(true);
    if (header.classList.contains('is-floating')) {
      if (y < lastY - 6 || y < 160) header.classList.add('is-shown');
      else if (y > lastY + 6) header.classList.remove('is-shown');
    }
    lastY = y;
    if (canMove() && y < hero.offsetHeight) hero.style.setProperty('--hero-shift', (y * .2).toFixed(1) + 'px');
  }
  window.addEventListener('scroll', function () {
    if (scrollQueued) return;
    scrollQueued = true;
    window.requestAnimationFrame(onScroll);
  }, { passive: true });
  header.addEventListener('focusin', function () {
    if (header.classList.contains('is-floating')) header.classList.add('is-shown');
  });

  /* ---------- Plaza: a small, living scene ---------- */
  var landscape = document.getElementById('plaza-landscape');
  var walkers = [].slice.call(landscape.querySelectorAll('.walker'));
  var stampLayer = document.getElementById('stamp-layer');
  var reactionStatus = document.getElementById('reaction-status');
  var notes = ['寝かしつけ、完了〜。', '今日は公園に行ったよ。', 'レポート、あと少し…！', 'ちょっと、ひと休み。', '雨の日の遊び場、気になる。', '朝ごはん、ぜんぶ食べてくれた！'];
  var hellos = ['こんにちは〜。', 'ゆっくりしてってね。', 'いい天気だね。'];
  var replies = [
    { text: 'わかるよ', mark: '♡', color: 'var(--rose)' },
    { text: 'おつかれさま', mark: '✧', color: 'var(--honey)' },
    { text: 'ここにいるよ', mark: '✿', color: 'var(--sage)' },
    { text: 'よかったね', mark: '♪', color: 'var(--sky)' }
  ];
  var talker = null;
  var noteIndex = 0;
  var plazaVisible = false;
  var chatTimer = null;

  function say(walker, text) {
    walkers.forEach(function (other) { if (other !== walker) other.classList.remove('is-talking'); });
    walker.querySelector('.walker-bubble').textContent = text;
    walker.classList.add('is-talking');
    talker = walker;
  }
  function sendStamp(reaction, walker) {
    var box = landscape.getBoundingClientRect();
    var figure = walker.querySelector('.walker-body').getBoundingClientRect();
    var side = Math.random() < .5 ? -1 : 1;
    // Beside the speaker, never on top of them, then drifting up past the bubble.
    var x = (figure.left + figure.width / 2 + side * (figure.width / 2 + 46 + Math.random() * 12) - box.left) / box.width * 100;
    var y = (figure.top + figure.height * .55 - box.top) / box.height * 100;
    var stamp = document.createElement('span');
    var mark = document.createElement('b');
    stamp.className = 'stamp' + (canMove() ? '' : ' is-still');
    mark.textContent = reaction.mark;
    stamp.appendChild(mark);
    stamp.appendChild(document.createTextNode(reaction.text));
    stamp.style.setProperty('--sx', Math.min(90, Math.max(10, x)).toFixed(1) + '%');
    stamp.style.setProperty('--sy', Math.max(8, y).toFixed(1) + '%');
    stamp.style.setProperty('--dx', (side * (8 + Math.random() * 18)).toFixed(0) + 'px');
    stamp.style.setProperty('--r', (side * (2 + Math.random() * 5)).toFixed(1) + 'deg');
    stamp.style.setProperty('--mark', reaction.color);
    stampLayer.appendChild(stamp);
    window.setTimeout(function () { stamp.remove(); }, 2100);
  }
  function chatter() {
    window.clearTimeout(chatTimer);
    if (!plazaVisible || !canMove() || document.hidden) return;
    var speaker = walkers[(walkers.indexOf(talker) + 1) % walkers.length];
    say(speaker, notes[noteIndex++ % notes.length]);
    chatTimer = window.setTimeout(function () {
      if (canMove()) sendStamp(pick(replies), speaker);
      chatTimer = window.setTimeout(function () {
        speaker.classList.remove('is-talking');
        chatTimer = window.setTimeout(chatter, 1200);
      }, 2600);
    }, 1500);
  }
  function quietPlaza() {
    window.clearTimeout(chatTimer);
    walkers.forEach(function (walker) { walker.classList.remove('is-talking'); });
  }

  walkers.forEach(function (walker) {
    walker.querySelector('.walker-body').addEventListener('click', function () {
      window.clearTimeout(chatTimer);
      say(walker, pick(hellos));
      greet(walker);
      if (canMove()) chatTimer = window.setTimeout(chatter, 3400);
    });
  });
  document.querySelectorAll('.reaction-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var target = talker && talker.classList.contains('is-talking') ? talker : walkers[noteIndex % walkers.length];
      window.clearTimeout(chatTimer);
      if (!target.classList.contains('is-talking')) say(target, notes[noteIndex++ % notes.length]);
      sendStamp({ text: chip.getAttribute('data-reaction'), mark: chip.getAttribute('data-mark'), color: getComputedStyle(chip).getPropertyValue('--chip') }, target);
      replay(target, 'is-greeting', 1100);
      replay(chip, 'is-sent', 650);
      reactionStatus.textContent = '「' + chip.getAttribute('data-reaction') + '」を送りました。（紹介用の体験です）';
      if (canMove()) chatTimer = window.setTimeout(chatter, 3600);
    });
  });
  motionListeners.push(function () { if (canMove()) chatter(); else quietPlaza(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) chatter(); });

  /* ---------- Friends who say hello ---------- */
  var friendsMessage = document.getElementById('friend-message');
  document.querySelectorAll('.avatar-friend').forEach(function (friend) {
    friend.addEventListener('click', function () {
      friendsMessage.textContent = friend.getAttribute('data-message');
      replay(friendsMessage, 'is-speaking', 800);
      greet(friend);
    });
  });
  document.querySelectorAll('.illustrated-friend').forEach(function (friend) {
    friend.addEventListener('click', function () { greet(friend); });
  });

  var faqAlpaca = document.getElementById('faq-alpaca');
  var faqMessage = document.getElementById('faq-companion-message');
  function answerWithAlpaca(message) {
    faqMessage.textContent = message;
    replay(faqMessage, 'is-answering', 900);
    greet(faqAlpaca);
  }
  // Native details retain keyboard controls and work without JavaScript.
  document.querySelectorAll('.faq-cloud-question').forEach(function (question) {
    question.addEventListener('toggle', function () {
      if (question.open) answerWithAlpaca(question.getAttribute('data-companion'));
    });
  });
  faqAlpaca.addEventListener('click', function () { answerWithAlpaca('いっしょに、のんびり読もうね。'); });

  /* ---------- Scenes coming into view ---------- */
  var revealables = document.querySelectorAll('[data-reveal]');
  function whenImagesReady(element, done) {
    var pending = [].filter.call(element.querySelectorAll('img'), function (img) { return !img.complete; });
    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      done();
    }
    if (!pending.length) return finish();
    var left = pending.length;
    pending.forEach(function (img) {
      function settle() { if (--left === 0) finish(); }
      img.addEventListener('load', settle, { once: true });
      img.addEventListener('error', settle, { once: true });
    });
    window.setTimeout(finish, 2500);
  }

  if (!canObserve) {
    revealables.forEach(function (element) { element.classList.add('is-revealed'); });
    plazaVisible = true;
    chatter();
    return;
  }

  var revealer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      revealer.unobserve(entry.target);
      whenImagesReady(entry.target, function () { entry.target.classList.add('is-revealed'); });
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: .04 });
  revealables.forEach(function (element) { revealer.observe(element); });

  var scenes = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      entry.target.classList.toggle('is-idle', !entry.isIntersecting);
      if (entry.target === hero) heroVisible = entry.isIntersecting;
    });
  }, { rootMargin: '120px 0px' });
  document.querySelectorAll('[data-scene]').forEach(function (scene) { scenes.observe(scene); });

  new IntersectionObserver(function (entries) {
    plazaVisible = entries[0].isIntersecting;
    if (plazaVisible) chatter();
    else quietPlaza();
  }, { threshold: .35 }).observe(landscape);

  // On phones a call-to-action rests at the bottom once the first one has scrolled away.
  var dock = document.getElementById('dock');
  var ctaInView = new Set();
  var ctaWatcher = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) ctaInView.add(entry.target);
      else ctaInView.delete(entry.target);
    });
    dock.classList.toggle('has-cta', ctaInView.size === 0);
  });
  [hero, document.querySelector('.start-button'), document.getElementById('closing')].forEach(function (target) { ctaWatcher.observe(target); });

  // The header marks where the reader is.
  var navLinks = {};
  document.querySelectorAll('.site-header nav a').forEach(function (link) { navLinks[link.getAttribute('href').slice(1)] = link; });
  var navWatcher = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) { navLinks[entry.target.id].classList.toggle('is-current', entry.isIntersecting); });
  }, { rootMargin: '-45% 0px -50% 0px' });
  Object.keys(navLinks).forEach(function (id) { navWatcher.observe(document.getElementById(id)); });
})();
