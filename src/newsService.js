import { Anakin } from '@anakin-io/sdk';
import { getAnakinApiKey, isAnakinConfigured } from './config.js';

let client = null;

function getClient() {
  const apiKey = getAnakinApiKey();
  if (!apiKey) return null;
  if (!client) client = new Anakin({ apiKey, pollTimeoutMs: 20_000 });
  return client;
}

const DEMO_NEWS = {
  market: [
    {
      title: 'Indian markets steady as IT stocks gain',
      snippet: 'Nifty holds range while TCS and Infosys lead sector gains ahead of earnings.',
      url: 'https://finance.yahoo.com',
      date: '2026-05-28',
    },
    {
      title: 'Reliance Industries expands clean energy push',
      snippet: 'Reliance announces new solar investments as analysts watch debt levels.',
      url: 'https://www.screener.in',
      date: '2026-05-27',
    },
    {
      title: 'Retail investors watch mid-cap volatility',
      snippet: 'Brokers caution on high P/E names after recent pullbacks from 52-week highs.',
      url: 'https://finance.yahoo.com',
      date: '2026-05-26',
    },
  ],
  tcs: [
    {
      title: 'TCS wins large digital deal',
      snippet: 'Tata Consultancy Services signs multi-year contract with a global bank.',
      url: 'https://finance.yahoo.com/quote/TCS.NS',
      date: '2026-05-28',
    },
    {
      title: 'TCS Q4 results in focus',
      snippet: 'Street expects steady margins and strong deal pipeline commentary.',
      url: 'https://www.screener.in/company/TCS/',
      date: '2026-05-25',
    },
  ],
  reliance: [
    {
      title: 'Reliance Jio adds subscribers',
      snippet: 'Telecom arm reports user growth; retail and O2C segments in spotlight.',
      url: 'https://finance.yahoo.com/quote/RELIANCE.NS',
      date: '2026-05-27',
    },
  ],
};

function getDemoNews(company) {
  const key = (company ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (key.includes('tcs')) return DEMO_NEWS.tcs;
  if (key.includes('reliance')) return DEMO_NEWS.reliance;
  if (key.includes('infosys')) return [...DEMO_NEWS.tcs.slice(0, 1), ...DEMO_NEWS.market.slice(0, 1)];
  return DEMO_NEWS.market;
}

function mapResults(results = []) {
  return results
    .filter((r) => r.url && r.title)
    .map((r) => ({
      title: r.title,
      snippet: r.snippet ?? '',
      url: r.url,
      date: r.date ?? r.lastUpdated ?? null,
    }));
}

export async function fetchCompanyNews(company) {
  const name = company?.trim() || '';
  const label = name || 'Indian stock market';

  if (!isAnakinConfigured()) {
    return {
      company: label,
      items: getDemoNews(name),
      mode: 'demo',
    };
  }

  const anakin = getClient();
  if (!anakin) {
    return { company: label, items: getDemoNews(name), mode: 'demo' };
  }

  const prompt = name
    ? `${name} stock company latest news India earnings`
    : 'Indian stock market Nifty Sensex top company news this week';

  const result = await anakin.search(prompt, { limit: 6 });
  const items = mapResults(result.results);

  return {
    company: label,
    items: items.length > 0 ? items : getDemoNews(name),
    mode: items.length > 0 ? 'live' : 'fallback',
  };
}
