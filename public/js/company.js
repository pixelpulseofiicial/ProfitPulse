const params = new URLSearchParams(window.location.search);
const company = params.get('q')?.trim();

const nameEl = document.getElementById('company-name');
const statusEl = document.getElementById('status');
const signalEl = document.getElementById('signal');
const scoreEl = document.getElementById('score-pill');
const detailsEl = document.getElementById('details');
const reasonsEl = document.getElementById('reasons');
const errorEl = document.getElementById('error');
const chartSectionEl = document.getElementById('chart-section');

const STATUS_MESSAGES = [
  'Analyzing stock data…',
  'Searching Yahoo Finance & Screener…',
  'Crunching P/E, debt, and growth…',
  'Almost done…',
];

const FETCH_TIMEOUT_MS = 100_000;

if (!company) {
  nameEl.textContent = 'No company selected';
  statusEl.hidden = true;
  errorEl.hidden = false;
  errorEl.textContent = 'Go back and search for a company.';
} else {
  nameEl.textContent = company;
  loadAnalysis(company);
}

function startStatusRotation() {
  let i = 0;
  statusEl.textContent = STATUS_MESSAGES[0];
  return setInterval(() => {
    i = (i + 1) % STATUS_MESSAGES.length;
    statusEl.textContent = STATUS_MESSAGES[i];
  }, 8000);
}

async function loadAnalysis(q) {
  const statusTimer = startStatusRotation();
  const controller = new AbortController();
  const fetchTimer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`/api/analyze?q=${encodeURIComponent(q)}`, {
      signal: controller.signal,
    });
    const data = await res.json();

    if (!res.ok) {
      const parts = [data.error, data.hint].filter(Boolean);
      const msg = [...new Set(parts)].join(' ');
      throw new Error(msg || 'Analysis failed');
    }

    nameEl.textContent = data.companyName || q;
    statusEl.hidden = true;

    signalEl.hidden = false;
    signalEl.textContent = data.signal;
    signalEl.className = `signal ${data.safe ? 'keep' : 'exit'}`;

    scoreEl.hidden = false;
    scoreEl.textContent = `Exit safety score: ${data.score}/100`;

    if (data.metrics) {
      renderChart(data.metrics);
      chartSectionEl.hidden = false;
    }

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
        'Demo mode: put your key in a .env file (not .env.example) and restart the server.';
      reasonsEl.appendChild(li);
    } else if (data.mode === 'fallback') {
      const li = document.createElement('li');
      li.textContent =
        data.note ||
        'Live scrape returned limited data — showing estimated metrics.';
      reasonsEl.appendChild(li);
    } else if (data.sources?.length) {
      const li = document.createElement('li');
      li.textContent = `Data from: ${data.sources.join(', ')}`;
      reasonsEl.appendChild(li);
    }
  } catch (err) {
    statusEl.hidden = true;
    errorEl.hidden = false;
    if (err.name === 'AbortError') {
      errorEl.textContent =
        'This is taking too long. Try again, or search a well-known company like TCS or Reliance.';
    } else {
      errorEl.textContent = err.message;
    }
  } finally {
    clearInterval(statusTimer);
    clearTimeout(fetchTimer);
  }
}

function renderChart(metrics) {
  const ctx = document.getElementById('metricsChart').getContext('2d');

  // Normalize metrics for Radar chart (0 to 100 scale)
  const pe = metrics.peRatio || 0;
  const growth = metrics.profitGrowthPct || 0;
  const debt = metrics.debtToEquity || 0;
  const roe = metrics.roePct || 0;
  const drop = metrics.priceChangeFromHighPct || 0;

  // Values are capped at 0-100 for visual consistency
  const peScore = Math.max(0, Math.min(100, 100 - (pe * 1.5))); // 0 PE = 100, 66 PE = 0
  const growthScore = Math.max(0, Math.min(100, growth * 3)); // 33%+ growth = 100
  const debtScore = Math.max(0, Math.min(100, 100 - (debt * 40))); // 0 debt = 100, 2.5 debt = 0
  const roeScore = Math.max(0, Math.min(100, roe * 3)); // 33%+ ROE = 100
  const stabilityScore = Math.max(0, Math.min(100, 100 + drop)); // 0% drop = 100, -100% drop = 0

  new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Value (P/E)', 'Growth', 'Debt Health', 'ROE', 'Stability'],
      datasets: [
        {
          label: 'Stock Health Metrics',
          data: [peScore, growthScore, debtScore, roeScore, stabilityScore],
          backgroundColor: 'rgba(34, 197, 94, 0.2)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(34, 197, 94, 1)',
        },
      ],
    },
    options: {
      scales: {
        r: {
          angleLines: { color: '#333' },
          grid: { color: '#333' },
          pointLabels: { color: '#aaa', font: { size: 12 } },
          ticks: { display: false, stepSize: 20 },
          min: 0,
          max: 100,
        },
      },
      plugins: {
        legend: { display: false },
      },
    },
  });
}

