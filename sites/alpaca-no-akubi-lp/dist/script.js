'use strict';
(function () {
  var preview = document.getElementById('preview-dialog');
  var board = document.getElementById('board-dialog');
  var info = document.getElementById('info-dialog');
  var video = document.getElementById('plaza-video');
  var lastFocus = null;

  function openDialog(dialog) {
    lastFocus = document.activeElement;
    dialog.showModal();
    document.body.classList.add('dialog-open');
  }
  document.getElementById('preview-open').addEventListener('click', function () {
    openDialog(preview);
    video.play().catch(function () {});
  });
  document.getElementById('board-preview-open').addEventListener('click', function () {
    openDialog(board);
  });
  document.getElementById('site-info-open').addEventListener('click', function () {
    openDialog(info);
  });

  [preview, board, info].forEach(function (dialog) {
    dialog.querySelector('.close-dialog').addEventListener('click', function () {
      dialog.close();
    });
    dialog.addEventListener('click', function (event) {
      if (event.target !== dialog) return;
      var rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    dialog.addEventListener('close', function () {
      if (dialog === preview) video.pause();
      document.body.classList.remove('dialog-open');
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    });
  });
})();

(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var hero = document.querySelector('.hero');
  var art = document.querySelector('.hero-logo-wrap');
  var pet = document.getElementById('pet-alpaca');
  var yawn = document.getElementById('alpaca-yawn');
  var toggle = document.getElementById('motion-toggle');
  var friendsMessage = document.getElementById('friend-message');
  var petTimer;

  function canMove() {
    return !reduced.matches && !document.body.classList.contains('motion-paused');
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
    element.classList.remove('is-greeting');
    void element.offsetWidth;
    element.classList.add('is-greeting');
    sparkle(element);
    window.setTimeout(function () { element.classList.remove('is-greeting'); }, 1300);
  }
  pet.addEventListener('click', function () {
    window.clearTimeout(petTimer);
    art.classList.remove('is-petted');
    void art.offsetWidth;
    yawn.textContent = 'ふぁ〜。';
    art.classList.add('is-petted');
    sparkle(art);
    petTimer = window.setTimeout(function () { art.classList.remove('is-petted'); yawn.textContent = ''; }, 1900);
  });
  hero.addEventListener('pointermove', function (event) {
    if (!canMove() || event.pointerType === 'touch') return;
    var rect = hero.getBoundingClientRect();
    art.style.setProperty('--wind-x', (((event.clientX - rect.left) / rect.width - .5) * 10).toFixed(1) + 'px');
    art.style.setProperty('--wind-y', (((event.clientY - rect.top) / rect.height - .5) * 5).toFixed(1) + 'px');
  });
  hero.addEventListener('pointerleave', function () {
    art.style.setProperty('--wind-x', '0px');
    art.style.setProperty('--wind-y', '0px');
  });
  document.querySelectorAll('.avatar-friend').forEach(function (friend) {
    friend.addEventListener('click', function () {
      friendsMessage.textContent = friend.getAttribute('data-message');
      greet(friend);
    });
  });
  document.querySelectorAll('.illustrated-friend').forEach(function (friend) {
    friend.addEventListener('click', function () { greet(friend); });
  });
  toggle.addEventListener('click', function () {
    var paused = document.body.classList.toggle('motion-paused');
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.textContent = paused ? 'うごきをはじめる ☁' : 'うごきをおやすみ ☁';
  });
  if (reduced.matches) {
    document.body.classList.add('motion-paused');
    toggle.setAttribute('aria-pressed', 'true');
    toggle.textContent = 'うごきはおやすみ中 ☁';
  }
})();
