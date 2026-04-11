/**
 * Loom — Content Script
 *
 * Phase 2.1 passive ingestion:
 * - 30s dwell threshold
 * - Main content extraction
 * - Exclusion rules
 * - SPA route-change re-trigger
 */

console.log('Loom content script initialized (Phase 2.1).');

const MIN_DWELL_MS = 30_000;
const MAX_WORDS = 2_000;

const EXCLUDES = [
  'chase.com',
  'bankofamerica.com',
  'wellsfargo.com',
  'paypal.com',
  'mychart.com',
  'webmd.com',
  'mayoclinic.org',
  'mail.google.com',
  'outlook.com',
  'localhost',
  '127.0.0.1',
  '192.168.',
  'accounts.google.com',
  'login.',
  'signin.',
  'auth.',
];

let currentRoute = window.location.href;
let routeStartedAt = Date.now();
let routeTimer = null;
let routeProcessed = false;

function isExcludedCurrentPage() {
  const host = window.location.hostname.toLowerCase();
  return EXCLUDES.some((pattern) => host.includes(pattern.toLowerCase()));
}

function cleanText(rawText) {
  const words = String(rawText || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, MAX_WORDS);

  return words.join(' ');
}

function collectMainContentText() {
  const selectors = [
    'main',
    'article',
    '[role="main"]',
    '.post-content',
    '.article-content',
    '.content',
  ];

  let root = null;
  for (const selector of selectors) {
    const candidate = document.querySelector(selector);
    if (candidate && candidate.innerText && candidate.innerText.length > 200) {
      root = candidate;
      break;
    }
  }

  const source = root || document.body;
  if (!source) return '';

  const clone = source.cloneNode(true);
  clone.querySelectorAll('nav, footer, aside, form, button, [role="navigation"], .cookie, .banner, script, style').forEach((el) => el.remove());

  return cleanText(clone.innerText || '');
}

function sendPageVisitIfEligible() {
  if (routeProcessed) return;
  if (document.visibilityState !== 'visible') return;
  if (isExcludedCurrentPage()) return;

  const dwellTimeSeconds = Math.floor((Date.now() - routeStartedAt) / 1000);
  const text = collectMainContentText();
  if (!text || text.length < 120) return;

  routeProcessed = true;

  const payload = {
    id: `visit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    url: window.location.href,
    domain: window.location.hostname,
    title: document.title,
    text,
    timestamp: Date.now(),
    dwellTime: dwellTimeSeconds,
  };

  try {
    chrome.runtime.sendMessage({ type: 'PAGE_VISITED', payload });
  } catch {
    // Background may not be ready.
  }
}

function scheduleRouteExtraction() {
  if (routeTimer) {
    clearTimeout(routeTimer);
  }

  routeProcessed = false;
  routeStartedAt = Date.now();

  routeTimer = setTimeout(sendPageVisitIfEligible, MIN_DWELL_MS);
}

function handleRouteChangeIfNeeded() {
  const nextRoute = window.location.href;
  if (nextRoute === currentRoute) return;

  currentRoute = nextRoute;
  scheduleRouteExtraction();
}

function patchHistoryForSpaRouting() {
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function pushStatePatched(...args) {
    const result = originalPushState.apply(this, args);
    handleRouteChangeIfNeeded();
    return result;
  };

  history.replaceState = function replaceStatePatched(...args) {
    const result = originalReplaceState.apply(this, args);
    handleRouteChangeIfNeeded();
    return result;
  };
}

window.addEventListener('popstate', handleRouteChangeIfNeeded);
window.addEventListener('hashchange', handleRouteChangeIfNeeded);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !routeProcessed) {
    const elapsed = Date.now() - routeStartedAt;
    if (elapsed >= MIN_DWELL_MS) {
      sendPageVisitIfEligible();
    }
  }
});

patchHistoryForSpaRouting();
scheduleRouteExtraction();
