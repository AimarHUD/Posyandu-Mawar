const loginPage = document.getElementById('loginPage');
const viewSwitch = document.getElementById('viewSwitch');
const viewSwitchLabel = viewSwitch.querySelector('.view-switch-label');
const viewSwitchIcon = viewSwitch.querySelector('.view-switch-icon');
const viewStatus = document.getElementById('viewStatus');

viewSwitch.addEventListener('click', () => {
  const isMobile = loginPage.classList.toggle('is-mobile-preview');
  loginPage.classList.toggle('is-desktop-preview', !isMobile);
  viewSwitch.setAttribute('aria-pressed', String(isMobile));

  if (isMobile) {
    viewSwitchLabel.textContent = 'Tampilan desktop';
    viewSwitchIcon.textContent = '▭';
    viewSwitch.setAttribute('aria-label', 'Ubah ke tampilan desktop');
    viewStatus.textContent = 'Tampilan mobile aktif';
  } else {
    viewSwitchLabel.textContent = 'Tampilan mobile';
    viewSwitchIcon.textContent = '▯';
    viewSwitch.setAttribute('aria-label', 'Ubah ke tampilan mobile');
    viewStatus.textContent = 'Tampilan desktop aktif';
  }
});
