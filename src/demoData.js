/** Demo metrics when ANAKIN_API_KEY is not set (hackathon demo mode). */
const DEMO_COMPANIES = {
  reliance: {
    companyName: 'Reliance Industries',
    peRatio: 28.5,
    profitGrowthPct: 12,
    debtToEquity: 0.45,
    roePct: 11,
    priceChangeFromHighPct: -8,
    sources: ['demo'],
  },
  tcs: {
    companyName: 'TCS',
    peRatio: 32,
    profitGrowthPct: 8,
    debtToEquity: 0.05,
    roePct: 48,
    priceChangeFromHighPct: -5,
    sources: ['demo'],
  },
  infosys: {
    companyName: 'Infosys',
    peRatio: 26,
    profitGrowthPct: 6,
    debtToEquity: 0.02,
    roePct: 32,
    priceChangeFromHighPct: -12,
    sources: ['demo'],
  },
  adani: {
    companyName: 'Adani Enterprises',
    peRatio: 85,
    profitGrowthPct: -15,
    debtToEquity: 1.8,
    roePct: 4,
    priceChangeFromHighPct: -35,
    sources: ['demo'],
  },
  default: {
    companyName: 'Sample Company',
    peRatio: 22,
    profitGrowthPct: 10,
    debtToEquity: 0.3,
    roePct: 18,
    priceChangeFromHighPct: -6,
    sources: ['demo'],
  },
};

export function getDemoMetrics(query) {
  const key = query.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [slug, data] of Object.entries(DEMO_COMPANIES)) {
    if (slug !== 'default' && key.includes(slug)) {
      return { ...data, companyName: query.trim() || data.companyName };
    }
  }
  return {
    ...DEMO_COMPANIES.default,
    companyName: query.trim() || DEMO_COMPANIES.default.companyName,
  };
}
