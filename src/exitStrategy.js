/**
 * Simple exit-score logic for ProfitPulse.
 * Higher score = safer to keep investing.
 */

function num(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function buildMetricsFromJson(json = {}) {
  return {
    peRatio: num(json.peRatio ?? json.pe ?? json.trailingPE),
    profitGrowthPct: num(
      json.profitGrowthPct ?? json.profitGrowth ?? json.earningsGrowth
    ),
    debtToEquity: num(json.debtToEquity ?? json.debtEquity ?? json.debtToEq),
    roePct: num(json.roePct ?? json.roe ?? json.returnOnEquity),
    priceChangeFromHighPct: num(
      json.priceChangeFromHighPct ??
        json.dropFrom52WeekHigh ??
        json.changeFromHigh
    ),
  };
}

export function parseMetricsFromText(text = '') {
  const metrics = {};
  const peMatch = text.match(/P\/?E\s*(?:ratio)?[:\s]*(-?\d+\.?\d*)/i);
  if (peMatch) metrics.peRatio = Number(peMatch[1]);

  const growthMatch = text.match(
    /(?:profit|earnings)\s*growth[:\s]*(-?\d+\.?\d*)\s*%/i
  );
  if (growthMatch) metrics.profitGrowthPct = Number(growthMatch[1]);

  const debtMatch = text.match(/debt[\s/-]*(?:to)?\s*equity[:\s]*(-?\d+\.?\d*)/i);
  if (debtMatch) metrics.debtToEquity = Number(debtMatch[1]);

  const roeMatch = text.match(/ROE[:\s]*(-?\d+\.?\d*)\s*%/i);
  if (roeMatch) metrics.roePct = Number(roeMatch[1]);

  const highMatch = text.match(
    /(?:from|off)\s*(?:52[- ]?week\s*)?high[:\s]*(-?\d+\.?\d*)\s*%/i
  );
  if (highMatch) metrics.priceChangeFromHighPct = Number(highMatch[1]);

  return metrics;
}

export function mergeMetrics(...parts) {
  const out = {};
  for (const part of parts) {
    if (!part) continue;
    for (const [k, v] of Object.entries(part)) {
      if (v != null && out[k] == null) out[k] = v;
    }
  }
  return out;
}

export function evaluateExitStrategy(metrics) {
  let score = 100;
  const reasons = [];

  const pe = num(metrics.peRatio);
  if (pe != null) {
    if (pe > 50) {
      score -= 35;
      reasons.push('P/E is very high — stock may be overpriced.');
    } else if (pe > 35) {
      score -= 18;
      reasons.push('P/E is elevated.');
    } else if (pe < 0) {
      score -= 40;
      reasons.push('Company has negative earnings (P/E).');
    }
  }

  const growth = num(metrics.profitGrowthPct);
  if (growth != null) {
    if (growth < 0) {
      score -= 30;
      reasons.push('Profit is shrinking year over year.');
    } else if (growth < 5) {
      score -= 10;
      reasons.push('Profit growth is weak.');
    }
  }

  const debt = num(metrics.debtToEquity);
  if (debt != null) {
    if (debt > 1.5) {
      score -= 28;
      reasons.push('Debt is high compared to equity.');
    } else if (debt > 0.8) {
      score -= 12;
      reasons.push('Debt levels need watching.');
    }
  }

  const roe = num(metrics.roePct);
  if (roe != null && roe < 8) {
    score -= 12;
    reasons.push('Return on equity is low.');
  }

  const drop = num(metrics.priceChangeFromHighPct);
  if (drop != null && drop < -25) {
    score -= 22;
    reasons.push('Price has fallen a lot from its recent high.');
  }

  score = Math.max(0, Math.min(100, score));
  const signal = score >= 55 ? 'KEEP INVESTING' : 'EXIT NOW';

  return {
    signal,
    score,
    safe: signal === 'KEEP INVESTING',
    reasons:
      reasons.length > 0
        ? reasons
        : [
            signal === 'KEEP INVESTING'
              ? 'Fundamentals look okay for now — keep watching the stock.'
              : 'Several warning signs showed up — consider exiting.',
          ],
    metrics,
  };
}
