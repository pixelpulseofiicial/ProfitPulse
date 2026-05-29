import { Anakin } from '@anakin-io/sdk';
import { getDemoMetrics } from './demoData.js';
import {
  buildMetricsFromJson,
  mergeMetrics,
  parseMetricsFromText,
} from './exitStrategy.js';

const API_KEY = process.env.ANAKIN_API_KEY;
const BASE_URL = 'https://api.anakin.io/v1';

let client = null;

function getClient() {
  if (!API_KEY) return null;
  if (!client) client = new Anakin({ apiKey: API_KEY, pollTimeoutMs: 180_000 });
  return client;
}

function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function holocronSearch(query) {
  if (!API_KEY) return [];
  const url = new URL(`${BASE_URL}/holocron/search`);
  url.searchParams.set('q', query);
  const res = await fetch(url, {
    headers: { 'X-API-Key': API_KEY },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.actions ?? data.results ?? [];
}

async function tryWireStockAction(companyName) {
  const anakin = getClient();
  if (!anakin) return null;

  const queries = [
    `screener ${companyName}`,
    'screener.in company',
    `yahoo finance ${companyName}`,
    'yahoo finance quote',
  ];

  for (const q of queries) {
    const actions = await holocronSearch(q);
    const match = actions.find((a) => {
      const hay = `${a.name ?? ''} ${a.catalogSlug ?? ''} ${a.description ?? ''}`.toLowerCase();
      return (
        hay.includes('screener') ||
        hay.includes('yahoo') ||
        hay.includes('finance')
      );
    });
    if (!match?.actionId && !match?.id) continue;

    const actionId = match.actionId ?? match.id;
    try {
      const result = await anakin.wire(actionId, {
        query: companyName,
        symbol: companyName,
        company: companyName,
        url: `https://www.screener.in/company/${slugify(companyName)}/`,
      });
      if (result.status === 'completed' && result.data) {
        return { data: result.data, source: `wire:${actionId}` };
      }
    } catch {
      // Try next action
    }
  }
  return null;
}

async function scrapeScreener(companyName) {
  const anakin = getClient();
  if (!anakin) return null;

  const slug = slugify(companyName);
  const searchUrl = `https://www.screener.in/company/${slug}/`;
  const doc = await anakin.scrape(searchUrl, {
    formats: ['markdown'],
    country: 'in',
    useBrowser: true,
    generateJson: true,
    pollTimeoutMs: 180_000,
  });

  return {
    markdown: doc.markdown ?? '',
    json: doc.generatedJson ?? {},
    url: searchUrl,
    source: 'screener.in',
  };
}

async function scrapeYahoo(companyName) {
  const anakin = getClient();
  if (!anakin) return null;

  const symbolGuess = companyName.trim().toUpperCase().replace(/\s+/g, '');
  const urls = [
    `https://finance.yahoo.com/quote/${symbolGuess}.NS/`,
    `https://finance.yahoo.com/quote/${symbolGuess}/`,
    `https://finance.yahoo.com/lookup?s=${encodeURIComponent(companyName)}`,
  ];

  for (const url of urls) {
    try {
      const doc = await anakin.scrape(url, {
        formats: ['markdown'],
        country: 'in',
        useBrowser: true,
        generateJson: true,
        pollTimeoutMs: 180_000,
      });
      if (doc.markdown || doc.generatedJson) {
        return {
          markdown: doc.markdown ?? '',
          json: doc.generatedJson ?? {},
          url,
          source: 'yahoo finance',
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}

function extractMetricsFromWireData(data) {
  const flat = JSON.stringify(data).toLowerCase();
  return mergeMetrics(
    buildMetricsFromJson(data),
    parseMetricsFromText(flat)
  );
}

export async function fetchStockAnalysis(companyName) {
  const name = companyName?.trim();
  if (!name) {
    throw new Error('Please enter a company name.');
  }

  if (!API_KEY) {
    const demo = getDemoMetrics(name);
    return {
      companyName: demo.companyName,
      metrics: demo,
      sources: demo.sources,
      mode: 'demo',
    };
  }

  const sources = [];
  let metrics = {};

  const wire = await tryWireStockAction(name);
  if (wire?.data) {
    sources.push(wire.source);
    metrics = mergeMetrics(metrics, extractMetricsFromWireData(wire.data));
  }

  const screener = await scrapeScreener(name);
  if (screener) {
    sources.push(screener.source);
    metrics = mergeMetrics(
      metrics,
      buildMetricsFromJson(screener.json),
      parseMetricsFromText(screener.markdown)
    );
  }

  const yahoo = await scrapeYahoo(name);
  if (yahoo) {
    sources.push(yahoo.source);
    metrics = mergeMetrics(
      metrics,
      buildMetricsFromJson(yahoo.json),
      parseMetricsFromText(yahoo.markdown)
    );
  }

  if (Object.keys(metrics).length === 0) {
    const demo = getDemoMetrics(name);
    return {
      companyName: name,
      metrics: demo,
      sources: [...sources, 'demo-fallback'],
      mode: 'fallback',
      note: 'Live scrape returned limited data — showing estimated demo metrics.',
    };
  }

  return {
    companyName: name,
    metrics,
    sources,
    mode: 'live',
  };
}
