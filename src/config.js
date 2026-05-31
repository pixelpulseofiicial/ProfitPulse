export function getApiKey() {
  return (process.env.ANAKIN_API_KEY ?? '').trim().replace(/^["']|["']$/g, '');
}

/**
 * Key sent to Anakin SDK / HTTP headers.
 * ask_ keys (Build-a-thon / dashboard) must be sent as-is — do not convert to ak-.
 */
export function getAnakinApiKey() {
  const k = getApiKey();
  if (!k) return '';
  if (k.startsWith('ask_') || k.startsWith('ak-')) return k;
  // Some exports use ak_ instead of ak- (hyphen)
  if (k.startsWith('ak_')) return `ak-${k.slice(3)}`;
  return k;
}

/** @returns {'missing' | 'placeholder' | 'invalid_format' | 'ok'} */
export function getApiKeyStatus() {
  const key = getApiKey();
  if (!key) return 'missing';
  if (/your-key|replace|example|xxx/i.test(key)) return 'placeholder';
  if (!/^(ask_|ak[-_])[a-zA-Z0-9]/i.test(key)) return 'invalid_format';
  return 'ok';
}

export function isAnakinConfigured() {
  return getApiKeyStatus() === 'ok';
}

export function apiKeyHelpMessage(status = getApiKeyStatus()) {
  switch (status) {
    case 'missing':
      return 'Add ANAKIN_API_KEY to a .env file (copy from .env.example).';
    case 'placeholder':
      return 'Your .env still has the placeholder. Paste your real key from https://anakin.io/dashboard';
    case 'invalid_format':
      return 'Paste your full Anakin key from the dashboard (starts with ask_ or ak-).';
    default:
      return '';
  }
}
