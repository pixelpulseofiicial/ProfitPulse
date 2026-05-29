const params = new URLSearchParams(window.location.search);
const company = params.get('q')?.trim();

const nameEl = document.getElementById('company-name');
const statusEl = document.getElementById('status');
const signalEl = document.getElementById('signal');
const scoreEl = document.getElementById('score-pill');
const detailsEl = document.getElementById('details');
const reasonsEl = document.getElementById('reasons');
const errorEl = document.getElementById('error');

if (!company) {
  nameEl.textContent = 'No company selected';
  statusEl.hidden = true;
  errorEl.hidden = false;
  errorEl.textContent = 'Go back and search for a company.';
} else {
  nameEl.textContent = company;
  loadAnalysis(company);
}

async function loadAnalysis(q) {
  try {
    const res = await fetch(`/api/analyze?q=${encodeURIComponent(q)}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Analysis failed');
    }

    nameEl.textContent = data.companyName || q;
    statusEl.hidden = true;

    signalEl.hidden = false;
    signalEl.textContent = data.signal;
    signalEl.className = `signal ${data.safe ? 'keep' : 'exit'}`;

    scoreEl.hidden = false;
    scoreEl.textContent = `Exit safety score: ${data.score}/100`;

    reasonsEl.innerHTML = '';
    (data.reasons || []).forEach((reason) => {
      const li = document.createElement('li');
      li.textContent = reason;
      reasonsEl.appendChild(li);
    });
    detailsEl.hidden = false;

    if (data.mode === 'demo') {
      const li = document.createElement('li');
      li.textContent =
        'Demo mode: add ANAKIN_API_KEY in .env for live Yahoo Finance & Screener data.';
      reasonsEl.appendChild(li);
    }
  } catch (err) {
    statusEl.hidden = true;
    errorEl.hidden = false;
    errorEl.textContent = err.message;
  }
}
