import { Anakin } from '@anakin-io/sdk';
import { getDemoMetrics } from './demoData.js';
import {
  buildMetricsFromJson,
  mergeMetrics,
  parseMetricsFromText,
} from './exitStrategy.js';

import {
  apiKeyHelpMessage,
  getAnakinApiKey,
  getApiKeyStatus,
  isAnakinConfigured,
} from './config.js';

const SCRAPE_TIMEOUT_MS = 50_000;
const TOTAL_TIMEOUT_MS = 70_000;

const SCRAPE_OPTS = {
  formats: ['markdown'],
  country: 'in',
  useBrowser: false,
  generateJson: true,
  pollTimeoutMs: SCRAPE_TIMEOUT_MS,
};

let client = null;

export { isAnakinConfigured, getApiKeyStatus, apiKeyHelpMessage };

function getClient() {
  const apiKey = getAnakinApiKey();
  if (!apiKey) return null;
  if (!client) {
    client = new Anakin({ apiKey, pollTimeoutMs: SCRAPE_TIMEOUT_MS });
  }
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

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
    }),
  ]);
}

async function fetchViaSearch(companyName) {
  const anakin = getClient();
  if (!anakin) return null;

  const result = await anakin.search(
    `${companyName} stock P/E ratio debt to equity profit growth ROE 52 week high`,
    { limit: 5 }
  );

  const text = (result.results ?? [])
    .map((r) => `${r.title ?? ''} ${r.snippet ?? ''}`)
    .join('\n');

  const metrics = parseMetricsFromText(text);
  if (Object.keys(metrics).length === 0) return null;

  return { metrics, source: 'anakin search' };
}

async function scrapeScreener(companyName) {
  const anakin = getClient();
  if (!anakin) return null;

  const slug = slugify(companyName);
  const searchUrl = `https://www.screener.in/company/${slug}/`;
  const doc = await anakin.scrape(searchUrl, SCRAPE_OPTS);

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
  const url = `https://finance.yahoo.com/quote/${symbolGuess}.NS/`;

  const doc = await anakin.scrape(url, SCRAPE_OPTS);
  if (!doc.markdown && !doc.generatedJson) return null;

  return {
    markdown: doc.markdown ?? '',
    json: doc.generatedJson ?? {},
    url,
    source: 'yahoo finance',
  };
}

function metricsFromScrape(result) {
  if (!result) return {};
  return mergeMetrics(
    buildMetricsFromJson(result.json),
    parseMetricsFromText(result.markdown)
  );
}

export class ApiKeyConfigError extends Error {
  constructor(status) {
    super(apiKeyHelpMessage(status));
    this.name = 'ApiKeyConfigError';
    this.status = status;
  }
}

export async function fetchStockAnalysis(companyName) {
  const name = companyName?.trim();
  if (!name) {
    throw new Error('Please enter a company name.');
  }

  const keyStatus = getApiKeyStatus();
  if (keyStatus !== 'ok' && keyStatus !== 'missing') {
    throw new ApiKeyConfigError(keyStatus);
  }

  if (!isAnakinConfigured()) {
    const demo = getDemoMetrics(name);
    return {
      companyName: demo.companyName,
      metrics: demo,
      sources: demo.sources,
      mode: 'demo',
    };
  }

  const work = async () => {
    const sources = [];
    let metrics = {};

    // Fast path: Anakin search usually finishes in a few seconds
    const searchOut = await Promise.allSettled([
      withTimeout(fetchViaSearch(name), 20_000, 'Search'),
    ]).then(([r]) => r);

    if (searchOut.status === 'fulfilled' && searchOut.value) {
      sources.push(searchOut.value.source);
      metrics = mergeMetrics(metrics, searchOut.value.metrics);
    }

    if (Object.keys(metrics).length > 0) {
      return {
        companyName: name,
        metrics,
        sources,
        mode: 'live',
      };
    }

    // Slower: scrape Screener + Yahoo in parallel (only if search had no metrics)
    const [screenerOut, yahooOut] = await Promise.allSettled([
      withTimeout(scrapeScreener(name), SCRAPE_TIMEOUT_MS, 'Screener'),
      withTimeout(scrapeYahoo(name), SCRAPE_TIMEOUT_MS, 'Yahoo'),
    ]);

    if (screenerOut.status === 'fulfilled' && screenerOut.value) {
      sources.push(screenerOut.value.source);
      metrics = mergeMetrics(metrics, metricsFromScrape(screenerOut.value));
    }

    if (yahooOut.status === 'fulfilled' && yahooOut.value) {
      sources.push(yahooOut.value.source);
      metrics = mergeMetrics(metrics, metricsFromScrape(yahooOut.value));
    }

    if (Object.keys(metrics).length === 0) {
      const demo = getDemoMetrics(name);
      return {
        companyName: name,
        metrics: demo,
        sources: [...sources, 'demo-fallback'],
        mode: 'fallback',
        note: 'Could not fetch live data in time — showing estimated metrics.',
      };
    }

    return {
      companyName: name,
      metrics,
      sources,
      mode: 'live',
    };
  };

  return withTimeout(work(), TOTAL_TIMEOUT_MS, 'Analysis');
}
