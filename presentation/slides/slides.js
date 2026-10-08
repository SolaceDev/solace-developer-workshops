// Step-animated slides register their advance function here.
// Return true  = a step was revealed (don't navigate).
// Return false = all steps done (allow navigation).
window.advanceStep = null;

function goNext() {
  if (window.advanceStep && window.advanceStep()) return;
  var next = document.querySelector('.nav-next');
  if (next) next.click();
}

function goPrev() {
  var prev = document.querySelector('.nav-prev');
  if (prev) prev.click();
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
    e.preventDefault();
    goNext();
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    goPrev();
  }
});

// Click anywhere on the slide to advance / go to next slide
document.addEventListener('click', function(e) {
  if (e.target.closest('a, button')) return;
  goNext();
});
