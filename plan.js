function setLang(lang) {
  document.querySelectorAll('.lang-btn').forEach(b =>
    b.classList.toggle('active', b.textContent.trim().toUpperCase() === lang.toUpperCase()));
  document.querySelectorAll('.vi').forEach(el =>
    el.style.display = lang === 'vi' ? '' : 'none');
  document.querySelectorAll('.en').forEach(el =>
    el.style.display = lang === 'en' ? '' : 'none');
  document.documentElement.lang = lang;
}
