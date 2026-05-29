import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchStockAnalysis } from './src/anakinService.js';
import { evaluateExitStrategy } from './src/exitStrategy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    app: 'ProfitPulse',
    anakinConfigured: Boolean(process.env.ANAKIN_API_KEY),
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
    res.status(500).json({
      error: err.message || 'Could not analyze this company right now.',
    });
  }
});

app.get('/company', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'company.html'));
});

app.listen(PORT, () => {
  console.log(`ProfitPulse running at http://localhost:${PORT}`);
  if (!process.env.ANAKIN_API_KEY) {
    console.log('Tip: set ANAKIN_API_KEY in .env to use live Anakin scraping.');
  }
});
