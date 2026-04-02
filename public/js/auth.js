function togglePassword() {
  const input = document.getElementById('password');
  const icon = document.getElementById('eyeIcon');
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fa-regular fa-eye';
  } else {
    input.type = 'password';
    icon.className = 'fa-regular fa-eye-slash';
  }
}

// clear password if browser restores this page from back-forward cache (bfcache) this keeps previous credentials from being exposed
window.addEventListener('pageshow', e => {
  if (e.persisted) document.getElementById('password').value = '';
});
