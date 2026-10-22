'use strict';
(function () {
  var preview = document.getElementById('preview-dialog');
  var video = document.getElementById('plaza-video');
  var info = document.getElementById('info-dialog');
  var lastFocus = null;

  function openDialog(dialog) {
    lastFocus = document.activeElement;
    dialog.showModal();
    document.body.classList.add('dialog-open');
  }
  function closeDialog(dialog) {
    dialog.close();
  }
  document.getElementById('preview-open').addEventListener('click', function () {
    openDialog(preview);
    video.play().catch(function () {
      // Native playback controls remain available if the browser blocks playback.
    });
  });
  document.getElementById('site-info-open').addEventListener('click', function (event) {
    event.preventDefault();
    openDialog(info);
  });

  [preview, info].forEach(function (dialog) {
    dialog.querySelector('.close-dialog').addEventListener('click', function () {
      closeDialog(dialog);
    });
    dialog.addEventListener('click', function (event) {
      if (event.target !== dialog) return;
      var rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(dialog);
    });
    dialog.addEventListener('close', function () {
      if (dialog === preview) video.pause();
      document.body.classList.remove('dialog-open');
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    });
  });
})();
