const form = document.getElementById('search-form');
const input = document.getElementById('company-input');

form?.addEventListener('submit', (e) => {
  const q = input.value.trim();
  if (!q) {
    e.preventDefault();
    return;
  }
  e.preventDefault();
  window.location.href = `/company.html?q=${encodeURIComponent(q)}`;
});

const params = new URLSearchParams(window.location.search);
if (params.get('q')) {
  input.value = params.get('q');
}
