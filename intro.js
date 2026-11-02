// Opening intro: plays for 5 s on every load; the button, a click anywhere or Escape skip it.
(function () {
  const intro = document.getElementById('intro');
  if (!intro) return;
  document.body.classList.add('intro-on');
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    document.body.classList.remove('intro-on');
    document.removeEventListener('keydown', onKey);
    intro.remove();
  };
  const skip = () => {
    intro.classList.add('is-leaving');
    setTimeout(finish, 350);
  };
  const onKey = event => { if (event.key === 'Escape') skip(); };
  intro.addEventListener('click', skip);
  document.addEventListener('keydown', onKey);
  setTimeout(finish, 5000);
  intro.querySelector('.intro-skip').focus({ preventScroll: true });
})();
