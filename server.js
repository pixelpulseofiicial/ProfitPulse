import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchStockAnalysis } from './src/anakinService.js';
import {
  apiKeyHelpMessage,
  getApiKeyStatus,
  isAnakinConfigured,
} from './src/config.js';
import { evaluateExitStrategy } from './src/exitStrategy.js';
import { fetchCompanyNews } from './src/newsService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

const SERVER_TIMEOUT_MS = 120_000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  const keyStatus = getApiKeyStatus();
  res.json({
    ok: true,
    app: 'ProfitPulse',
    anakinConfigured: isAnakinConfigured(),
    apiKeyStatus: keyStatus,
    hint: keyStatus === 'ok' ? undefined : apiKeyHelpMessage(keyStatus),
  });
});

app.get('/api/analyze', async (req, res) => {
  try {
    const company = String(req.query.q ?? req.query.company ?? '').trim();
    if (!company) {
      return res.status(400).json({ error: 'Missing company name (q).' });
    }

    const fetched = await fetchStockAnalysis(company);
    const verdict = evaluateExitStrategy(fetched.metrics);

    res.json({
      companyName: fetched.companyName,
      signal: verdict.signal,
      safe: verdict.safe,
      score: verdict.score,
      reasons: verdict.reasons,
      metrics: verdict.metrics,
      sources: fetched.sources,
      mode: fetched.mode,
      note: fetched.note,
    });
  } catch (err) {
    console.error(err);
    const isAuth =
      err.name === 'AuthenticationError' ||
      err.name === 'ApiKeyConfigError' ||
      /invalid or inactive api key/i.test(err.message ?? '');
    const hint = isAuth
      ? 'Check your key in .env matches the dashboard exactly (ask_ or ak- prefix). Create a new key if needed.'
      : undefined;
    res.status(isAuth ? 401 : 500).json({
      error: err.message || 'Could not analyze this company right now.',
      hint: err.name === 'ApiKeyConfigError' ? undefined : hint,
    });
  }
});

app.get('/api/news', async (req, res) => {
  try {
    const company = String(req.query.q ?? req.query.company ?? '').trim();
    const news = await fetchCompanyNews(company);
    res.json(news);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || 'Could not load news right now.',
      items: [],
    });
  }
});

app.get('/company', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'company.html'));
});

const server = app.listen(PORT, '0.0.0.0',() => {
  console.log(`ProfitPulse running at http://localhost:${PORT}`);
  const keyStatus = getApiKeyStatus();
  if (keyStatus !== 'ok') {
    console.warn(`Anakin API key: ${keyStatus} — ${apiKeyHelpMessage(keyStatus)}`);
  } else {
    console.log('Anakin API key loaded.');
  }
});

server.timeout = SERVER_TIMEOUT_MS;
server.keepAliveTimeout = SERVER_TIMEOUT_MS + 5000;
