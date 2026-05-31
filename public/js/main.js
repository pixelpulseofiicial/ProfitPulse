const form = document.getElementById('search-form');
const input = document.getElementById('company-input');
const newsSubtitle = document.getElementById('news-subtitle');
const newsLoading = document.getElementById('news-loading');
const newsGrid = document.getElementById('news-grid');
const newsError = document.getElementById('news-error');

let newsDebounceTimer = null;
let newsRequestId = 0;

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

input?.addEventListener('input', () => {
  clearTimeout(newsDebounceTimer);
  newsDebounceTimer = setTimeout(() => {
    const q = input.value.trim();
    loadNews(q);
  }, 450);
});

loadNews(input?.value.trim() ?? '');

async function loadNews(company) {
  const id = ++newsRequestId;
  newsLoading.hidden = false;
  newsError.hidden = true;
  newsGrid.hidden = true;

  const label = company || 'the market';
  newsSubtitle.textContent = company
    ? `Headlines for ${company}`
    : 'Latest headlines from the market';

  try {
    const url = company
      ? `/api/news?q=${encodeURIComponent(company)}`
      : '/api/news';
    const res = await fetch(url);
    const data = await res.json();
    if (id !== newsRequestId) return;

    if (!res.ok) {
      throw new Error(data.error || 'Could not load news');
    }

    renderNews(data.items ?? []);
  } catch (err) {
    if (id !== newsRequestId) return;
    newsLoading.hidden = true;
    newsError.hidden = false;
    newsError.textContent = err.message;
  }
}

function renderNews(items) {
  newsLoading.hidden = true;
  newsGrid.innerHTML = '';

  if (!items.length) {
    newsError.hidden = false;
    newsError.textContent = 'No news found. Try another company name.';
    return;
  }

  newsError.hidden = true;
  newsGrid.hidden = false;

  for (const item of items) {
    const li = document.createElement('li');
    li.className = 'news-card';

    const titleLink = document.createElement('a');
    titleLink.className = 'news-title';
    titleLink.href = item.url;
    titleLink.target = '_blank';
    titleLink.rel = 'noopener noreferrer';
    titleLink.textContent = item.title;

    const snippet = document.createElement('p');
    snippet.className = 'news-snippet';
    snippet.textContent = item.snippet || '';

    li.appendChild(titleLink);
    if (item.snippet) li.appendChild(snippet);

    if (item.date) {
      const date = document.createElement('p');
      date.className = 'news-date';
      date.textContent = item.date;
      li.appendChild(date);
    }

    newsGrid.appendChild(li);
  }
}
