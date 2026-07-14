document.addEventListener('keydown', function(e) {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    var next = document.querySelector('.nav-next');
    if (next) next.click();
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    var prev = document.querySelector('.nav-prev');
    if (prev) prev.click();
  }
});
