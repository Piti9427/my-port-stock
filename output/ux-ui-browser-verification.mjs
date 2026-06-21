const BASE_URL = 'http://127.0.0.1:5173';
const CDP_BASE = 'http://127.0.0.1:9223';

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop-1024', width: 1024, height: 768 },
  { name: 'desktop-wide', width: 1440, height: 900 },
];

const routes = [
  '/',
  '/risk',
  '/command-center',
  '/market',
  '/journal',
  '/analytics',
  '/config',
  '/ticker/NVDA',
];

const store = {
  mode: 'returning',
  delayMs: 0,
  holdings: [],
  journal: [],
  watchlists: [],
};

function quoteFor(ticker) {
  return {
    ticker,
    last_price: ticker === 'TSM' ? 220 : 200,
    currency: 'USD',
    market_session: 'regular',
    quote_timestamp: '2026-06-21T14:30:00.000Z',
    price_sources: ['Yahoo Finance', 'Nasdaq'],
    quote_delay_status: { yahoo: 'delayed', nasdaq: 'delayed' },
    current_price_acceptance_gate: 'pass',
  };
}

function addTrade(body) {
  const ticker = String(body.ticker || 'NVDA').toUpperCase();
  const price = Number(body.price ?? body.entry) || quoteFor(ticker).last_price;
  const trade = {
    id: `trade_${store.journal.length + 1}`,
    date: body.date || '2026-06-21T15:00:00.000Z',
    created_at: body.created_at || '2026-06-21T15:00:00.000Z',
    ticker,
    type: body.type || 'BUY',
    mode: body.mode || 'Swing Trade',
    status: body.status || 'OPEN',
    shares: Number(body.shares) || 1,
    price,
    entry: Number(body.entry ?? body.price) || price,
    target: body.target || price * 1.2,
    stop_loss: body.stop_loss || price * 0.92,
    risk_reward: body.risk_reward || 2.5,
    profit: body.profit,
    notes: body.notes || 'Execution thesis recorded',
    source_note: body.source_note || '',
  };
  store.journal.unshift(trade);
  if (String(trade.type).toUpperCase() === 'BUY') {
    const existing = store.holdings.find((holding) => holding.ticker === ticker);
    const next = {
      id: `holding_${ticker}`,
      ticker,
      name: `${ticker} Inc.`,
      sector: ticker === 'TSM' ? 'Semiconductors' : 'AI Infrastructure',
      shares: (Number(existing?.shares) || 0) + Number(trade.shares || 1),
      avg_cost: price,
      price,
      change: 1.5,
      changePct: 0.75,
      stop_loss: Number(trade.stop_loss) || price * 0.92,
      spark: [price * 0.96, price * 0.99, price],
    };
    if (existing) Object.assign(existing, next);
    else store.holdings.push(next);
  }
  return trade;
}

function resetStore(mode = 'returning') {
  store.mode = mode;
  store.delayMs = 0;
  store.holdings = [];
  store.journal = [];
  store.watchlists = [];

  if (mode !== 'returning') return;
  addTrade({
    ticker: 'NVDA',
    status: 'CLOSED',
    shares: 2,
    price: 180,
    entry: 180,
    target: 225,
    stop_loss: 168,
    risk_reward: 3.75,
    profit: 90,
    notes: 'Closed AI infrastructure thesis',
    source_note: 'Closed at target with lessons recorded',
  });
  addTrade({
    ticker: 'TSM',
    status: 'OPEN',
    shares: 1,
    price: 220,
    entry: 220,
    target: 250,
    stop_loss: 210,
    risk_reward: 3,
    notes: 'Returning user active setup',
  });
  store.watchlists.push({ ticker: 'RKLB', sector: 'Space', price: 14, changePct: 1.2, spark: [13, 13.5, 14] });
}

function packetFor(ticker) {
  return {
    ticker,
    ...quoteFor(ticker),
    portfolio_context: {
      source: 'supabase',
      holdings_rows: store.holdings.filter((holding) => holding.ticker === ticker),
    },
    journal_context: {
      source: 'supabase',
      trade_rows: store.journal.filter((trade) => trade.ticker === ticker),
    },
  };
}

function apiPayload(path, method, body) {
  if (store.mode === 'error') {
    return { status: 503, body: { error: 'Supabase runtime data unavailable for authenticated analysis context' } };
  }
  if (store.mode === 'partial' && path.startsWith('/api/quote/')) {
    return { status: 200, body: {} };
  }
  if (path === '/api/holdings') return { status: 200, body: [...store.holdings] };
  if (path === '/api/watchlists') return { status: 200, body: [...store.watchlists] };
  if (path === '/api/journal' && method === 'POST') {
    const trade = addTrade(body || {});
    return { status: 200, body: { id: trade.id, trade } };
  }
  if (path === '/api/journal') return { status: 200, body: { trades: [...store.journal] } };
  if (path.startsWith('/api/journal/')) {
    const ticker = decodeURIComponent(path.slice('/api/journal/'.length)).toUpperCase();
    return { status: 200, body: { trades: store.journal.filter((trade) => trade.ticker === ticker) } };
  }
  if (path.startsWith('/api/quote/')) {
    const ticker = decodeURIComponent(path.slice('/api/quote/'.length)).toUpperCase();
    return { status: 200, body: quoteFor(ticker) };
  }
  if (path.startsWith('/api/packet/')) {
    const ticker = decodeURIComponent(path.slice('/api/packet/'.length).split('?')[0]).toUpperCase();
    return { status: 200, body: packetFor(ticker) };
  }
  if (path.startsWith('/api/price/')) {
    const ticker = decodeURIComponent(path.slice('/api/price/'.length)).toUpperCase();
    return { status: 200, body: store.mode === 'empty' || store.mode === 'partial' ? {} : { ticker, price: 200, changePct: 0.75 } };
  }
  if (path === '/api/analyze') {
    const ticker = String(body?.ticker || 'NVDA').toUpperCase();
    return {
      status: 200,
      body: {
        ticker,
        decision_snapshot: {
          verdict: 'Wait',
          score: 6.4,
          one_line_reason: 'Needs broker confirmation before execution.',
          immediate_next_action: 'Confirm Tier 1 quote before adding risk.',
        },
        agent_results: {
          fundamental: { score: 6, reason: 'Quality setup, wait for execution gate.' },
        },
      },
    };
  }
  if (path === '/api/chat') return { status: 200, body: { message: 'Mock response' } };
  return { status: 404, body: { error: `Unexpected API URL: ${path}` } };
}

class Cdp {
  constructor(wsUrl, targetId) {
    this.targetId = targetId;
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.handlers = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result || {});
        return;
      }
      const listeners = this.handlers.get(message.method) || [];
      for (const listener of listeners) listener(message.params || {});
    });
  }

  async send(method, params = {}) {
    await this.ready;
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, 10000);
    });
  }

  on(method, listener) {
    const listeners = this.handlers.get(method) || [];
    listeners.push(listener);
    this.handlers.set(method, listeners);
  }

  async close() {
    if (this.targetId) await fetch(`${CDP_BASE}/json/close/${this.targetId}`).catch(() => {});
    this.ws.close();
  }
}

async function createPage() {
  const target = await fetch(`${CDP_BASE}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' }).then((res) => res.json());
  const cdp = new Cdp(target.webSocketDebuggerUrl, target.id);
  const consoleErrors = [];
  const failedRequests = [];
  await Promise.all([
    cdp.send('Page.enable'),
    cdp.send('Runtime.enable'),
    cdp.send('Network.enable'),
    cdp.send('Fetch.enable', { patterns: [{ urlPattern: `${BASE_URL}/api/*`, requestStage: 'Request' }] }),
  ]);

  cdp.on('Runtime.consoleAPICalled', (params) => {
    if (['error', 'warning'].includes(params.type)) {
      consoleErrors.push(params.args.map((arg) => arg.value || arg.description || '').join(' '));
    }
  });
  cdp.on('Runtime.exceptionThrown', (params) => {
    consoleErrors.push(params.exceptionDetails?.text || params.exceptionDetails?.exception?.description || 'runtime exception');
  });
  cdp.on('Network.responseReceived', (params) => {
    const { response } = params;
    if (response.status >= 400 && !response.url.includes('tradingview-widget.com/support')) {
      failedRequests.push(`${response.status} ${response.url}`);
    }
  });
  cdp.on('Fetch.requestPaused', async (params) => {
    const url = new URL(params.request.url);
    let body = null;
    if (params.request.postData) {
      try {
        body = JSON.parse(params.request.postData);
      } catch {
        body = null;
      }
    }
    const result = apiPayload(`${url.pathname}${url.search}`, params.request.method, body);
    const fulfill = () =>
      cdp
        .send('Fetch.fulfillRequest', {
          requestId: params.requestId,
          responseCode: result.status,
          responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
          body: Buffer.from(JSON.stringify(result.body)).toString('base64'),
        })
        .catch(() => {});
    if (store.delayMs > 0) setTimeout(fulfill, store.delayMs);
    else await fulfill();
  });

  return { cdp, consoleErrors, failedRequests };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || result.exceptionDetails.exception?.description || 'Runtime.evaluate failed');
  }
  return result.result?.value;
}

async function waitFor(cdp, expression, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = await evaluate(cdp, expression).catch(() => null);
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

async function setViewport(cdp, viewport) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.width < 768,
  });
}

async function navigate(cdp, path) {
  await cdp.send('Page.navigate', { url: `${BASE_URL}${path}` });
  await waitFor(cdp, 'document.readyState === "complete" || document.readyState === "interactive"', 5000);
  await waitFor(cdp, 'document.querySelector("h1")?.textContent?.trim().length > 0', 7000);
  await new Promise((resolve) => setTimeout(resolve, 250));
}

async function clickSelector(cdp, selector) {
  const point = await evaluate(
    cdp,
    `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      el.scrollIntoView({ block: 'center', inline: 'center' });
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`
  );
  if (!point) throw new Error(`Selector not found: ${selector}`);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y, button: 'none' });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
}

async function routeMatrix() {
  resetStore('returning');
  const { cdp, consoleErrors, failedRequests } = await createPage();
  const failures = [];
  const results = [];
  for (const viewport of viewports) {
    await setViewport(cdp, viewport);
    for (const route of routes) {
      await navigate(cdp, route);
      const info = await evaluate(
        cdp,
        `(() => {
          const visible = (el) => {
            const r = el.getBoundingClientRect();
            const s = getComputedStyle(el);
            return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
          };
          const h1s = [...document.querySelectorAll('h1')].filter(visible).map((el) => el.textContent.trim());
          const bodyOverflow = document.documentElement.scrollWidth - window.innerWidth;
          const smallTargets = [...document.querySelectorAll('a,button,input,select,textarea,[role="button"]')]
            .filter(visible)
            .map((el) => {
              const r = el.getBoundingClientRect();
              return { label: el.getAttribute('aria-label') || el.textContent.trim().slice(0, 60), w: Math.round(r.width), h: Math.round(r.height) };
            })
            .filter((x) => x.w < 40 || x.h < 40);
          const insideHorizontalScroller = (el) => {
            for (let node = el.parentElement; node; node = node.parentElement) {
              const s = getComputedStyle(node);
              if (node.scrollWidth > node.clientWidth + 2 && /(auto|scroll)/.test(s.overflowX)) return true;
            }
            return false;
          };
          const offscreen = [...document.body.querySelectorAll('*')]
            .filter(visible)
            .map((el) => {
              const r = el.getBoundingClientRect();
              return {
                tag: el.tagName,
                cls: el.className,
                text: el.textContent.trim().slice(0, 40),
                left: Math.round(r.left),
                right: Math.round(r.right),
                inScroller: insideHorizontalScroller(el),
              };
            })
            .filter((x) => x.left < -2 || x.right > window.innerWidth + 2)
            .filter((x) => !x.inScroller && !String(x.cls).includes('ui-data-table') && x.tag !== 'HTML' && x.tag !== 'BODY');
          return { path: location.pathname, h1s, bodyOverflow, smallTargets: smallTargets.slice(0, 5), offscreen: offscreen.slice(0, 5) };
        })()`
      );
      const ok =
        info.h1s.length === 1 &&
        info.bodyOverflow <= 2 &&
        info.offscreen.length === 0;
      if (!ok) failures.push({ viewport: viewport.name, route, info });
      results.push({ viewport: viewport.name, route, h1: info.h1s[0], overflow: info.bodyOverflow });
    }
  }
  await cdp.close();
  return { ok: failures.length === 0 && failedRequests.length === 0, failures, failedRequests, consoleErrors, checked: results.length };
}

async function contrastAudit() {
  resetStore('returning');
  const { cdp, consoleErrors, failedRequests } = await createPage();
  await setViewport(cdp, { name: 'desktop-wide', width: 1440, height: 900 });
  const failures = [];
  for (const route of routes) {
    await navigate(cdp, route);
    const result = await evaluate(
      cdp,
      `(() => {
        const parseColor = (value) => {
          const m = value.match(/rgba?\\(([^)]+)\\)/);
          if (!m) return null;
          const parts = m[1].split(',').map((x) => Number.parseFloat(x.trim()));
          if (parts.length < 3 || parts[3] === 0) return null;
          return { rgb: parts.slice(0, 3), alpha: parts[3] ?? 1 };
        };
        const composite = (fg, bg) => {
          const alpha = fg.alpha ?? 1;
          return fg.rgb.map((value, index) => value * alpha + bg[index] * (1 - alpha));
        };
        const luminance = ([r, g, b]) => {
          const vals = [r, g, b].map((v) => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * vals[0] + 0.7152 * vals[1] + 0.0722 * vals[2];
        };
        const ratio = (a, b) => {
          const l1 = luminance(a);
          const l2 = luminance(b);
          return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        };
        const visible = (el) => {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0';
        };
        const bgFor = (el) => {
          let bg = [10, 10, 10];
          const chain = [];
          for (let node = el; node; node = node.parentElement) {
            chain.unshift(node);
          }
          for (const node of chain) {
            const color = parseColor(getComputedStyle(node).backgroundColor);
            if (color) bg = composite(color, bg);
          }
          return bg;
        };
        return [...document.body.querySelectorAll('a,button,label,span,p,td,th,h1,h2,h3,h4,div')]
          .filter(visible)
          .filter((el) => !el.classList.contains('sr-only'))
          .filter((el) => el.innerText && el.innerText.trim().length > 0 && el.children.length === 0)
          .map((el) => {
            const style = getComputedStyle(el);
            const fg = parseColor(style.color);
            const bg = bgFor(el);
            const size = Number.parseFloat(style.fontSize);
            const weight = Number.parseInt(style.fontWeight, 10);
            const required = size >= 24 || (size >= 18.66 && weight >= 700) ? 3 : 4.5;
            const value = fg ? ratio(composite(fg, bg), bg) : 99;
            return { text: el.innerText.trim().slice(0, 60), cls: el.className, tag: el.tagName, ratio: Number(value.toFixed(2)), required };
          })
          .filter((x) => x.ratio < x.required)
          .slice(0, 20);
      })()`
    );
    if (result.length) failures.push({ route, failures: result });
  }
  await cdp.close();
  return { ok: failures.length === 0 && failedRequests.length === 0, failures, failedRequests, consoleErrors };
}

async function stateMatrix() {
  const checks = [];
  const scenarios = [
    { mode: 'empty', route: '/', expect: 'เริ่มต้นโดยเพิ่มหุ้นในพอร์ต' },
    { mode: 'error', route: '/', expect: 'Supabase holdings could not be loaded' },
    { mode: 'partial', route: '/market', expect: 'Retry quote' },
    { mode: 'error', route: '/ticker/NVDA', expect: 'Ticker detail unavailable' },
  ];
  for (const scenario of scenarios) {
    resetStore(scenario.mode);
    const { cdp, consoleErrors, failedRequests } = await createPage();
    await setViewport(cdp, { name: 'desktop-wide', width: 1440, height: 900 });
    await navigate(cdp, scenario.route).catch(() => {});
    const found = await evaluate(cdp, `document.body.innerText.includes(${JSON.stringify(scenario.expect)})`);
    checks.push({ ...scenario, ok: found, consoleErrors, failedRequests });
    await cdp.close();
  }

  resetStore('returning');
  store.delayMs = 700;
  const { cdp, consoleErrors, failedRequests } = await createPage();
  await setViewport(cdp, { name: 'desktop-wide', width: 1440, height: 900 });
  const nav = cdp.send('Page.navigate', { url: `${BASE_URL}/` });
  await new Promise((resolve) => setTimeout(resolve, 150));
  const loadingVisible = await evaluate(cdp, 'Boolean(document.querySelector(".ui-skeleton")) || document.body.innerText.includes("Loading")');
  await nav.catch(() => {});
  await waitFor(cdp, 'document.querySelector("h1")?.textContent?.trim().length > 0', 7000).catch(() => {});
  checks.push({ mode: 'loading', route: '/', expect: 'skeleton/loading', ok: loadingVisible, consoleErrors, failedRequests });
  await cdp.close();

  return { ok: checks.every((check) => check.ok && check.consoleErrors.length === 0), checks };
}

async function keyboardFlow() {
  resetStore('returning');
  const { cdp, consoleErrors, failedRequests } = await createPage();
  await setViewport(cdp, { name: 'desktop-wide', width: 1440, height: 900 });
  await navigate(cdp, '/');
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab' });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab' });
  const focusOutline = await evaluate(cdp, '(() => { const el=document.activeElement; const s=getComputedStyle(el); return { tag: el.tagName, label: el.getAttribute("aria-label") || el.textContent.trim(), outline: s.outlineStyle, width: s.outlineWidth, color: s.outlineColor }; })()');
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'k', code: 'KeyK', modifiers: 4 });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'k', code: 'KeyK', modifiers: 4 });
  const paletteOpened = await waitFor(cdp, 'Boolean(document.querySelector("[role=dialog]"))', 3000).then(() => true).catch(() => false);
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'g', code: 'KeyG' });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'g', code: 'KeyG' });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'j', code: 'KeyJ' });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'j', code: 'KeyJ' });
  const navigatedJournal = await waitFor(cdp, 'location.pathname === "/journal"', 3000).then(() => true).catch(() => false);
  await cdp.close();
  return {
    ok: paletteOpened && navigatedJournal && focusOutline.outline === 'solid' && focusOutline.width !== '0px' && consoleErrors.length === 0 && failedRequests.length === 0,
    paletteOpened,
    navigatedJournal,
    focusOutline,
    consoleErrors,
    failedRequests,
  };
}

async function browserFlows() {
  const checks = [];

  resetStore('empty');
  let page = await createPage();
  await setViewport(page.cdp, { name: 'desktop-wide', width: 1440, height: 900 });
  await navigate(page.cdp, '/');
  await evaluate(page.cdp, `document.querySelector('a[aria-label="วิเคราะห์หุ้น"],button[aria-label="วิเคราะห์หุ้น"]')?.click()`);
  await waitFor(page.cdp, 'location.pathname === "/command-center"', 3000);
  await waitFor(page.cdp, 'Boolean(document.querySelector("#command-ticker"))', 3000);
  await evaluate(
    page.cdp,
    `(() => {
      const input = document.querySelector('#command-ticker');
      if (!input) throw new Error('Ticker input not found');
      input.focus();
      input.select();
    })()`
  );
  await page.cdp.send('Input.insertText', { text: 'NVDA' });
  await evaluate(page.cdp, `[...document.querySelectorAll('button')].find((button) => button.textContent.includes('Load quote'))?.click()`);
  const newQuote = await waitFor(page.cdp, 'document.body.innerText.toLowerCase().includes("gate-passed quote") || document.body.innerText.includes("Quote unavailable")', 4000).then(() => true).catch(() => false);
  await clickSelector(page.cdp, '.command-run-analysis');
  const analyzed = await waitFor(page.cdp, 'document.body.innerText.includes("Confirm Tier 1 quote")', 5000).then(() => true).catch(() => false);
  const newFlowText = await evaluate(page.cdp, 'document.body.innerText.slice(0, 1000)');
  checks.push({ name: 'new-user command analyze', ok: newQuote && analyzed, newQuote, analyzed, body: newFlowText, consoleErrors: page.consoleErrors, failedRequests: page.failedRequests });
  await page.cdp.close();

  resetStore('returning');
  page = await createPage();
  await setViewport(page.cdp, { name: 'desktop-wide', width: 1440, height: 900 });
  await navigate(page.cdp, '/');
  await waitFor(page.cdp, '[...document.querySelectorAll("tr")].some((row) => row.innerText.includes("NVDA"))', 4000);
  await evaluate(page.cdp, `[...document.querySelectorAll('tr')].find((row) => row.innerText.includes('NVDA'))?.click()`);
  let detail = await waitFor(page.cdp, 'location.pathname === "/ticker/NVDA" && document.body.innerText.includes("Supabase per-user context")', 4000).then(() => true).catch(() => false);
  if (!detail) {
    await navigate(page.cdp, '/ticker/NVDA');
    detail = await waitFor(page.cdp, 'location.pathname === "/ticker/NVDA" && document.body.innerText.includes("Supabase per-user context")', 4000).then(() => true).catch(() => false);
  }
  const hasAnalyzeButton = await waitFor(page.cdp, 'Boolean(document.querySelector("button.btn-analyze"))', 3000).then(() => true).catch(() => false);
  if (hasAnalyzeButton) await clickSelector(page.cdp, 'button.btn-analyze');
  const detailAnalysis = await waitFor(page.cdp, 'document.body.innerText.includes("Latest Analysis")', 5000).then(() => true).catch(() => false);
  const hasPlannerButton = await waitFor(page.cdp, 'Boolean(document.querySelector(".ticker-detail-actions button.btn-secondary"))', 3000).then(() => true).catch(() => false);
  if (hasPlannerButton) await clickSelector(page.cdp, '.ticker-detail-actions button.btn-secondary');
  const planner = await waitFor(page.cdp, 'document.querySelector("[role=dialog]")?.innerText.includes("Scenario Planner")', 3000).then(() => true).catch(() => false);
  const returningText = await evaluate(page.cdp, 'document.body.innerText.slice(0, 1000)');
  checks.push({
    name: 'returning detail analysis planner',
    ok: detail && hasAnalyzeButton && detailAnalysis && hasPlannerButton && planner,
    detail,
    hasAnalyzeButton,
    detailAnalysis,
    hasPlannerButton,
    planner,
    body: returningText,
    consoleErrors: page.consoleErrors,
    failedRequests: page.failedRequests,
  });
  await page.cdp.close();

  return { ok: checks.every((check) => check.ok && check.consoleErrors.length === 0 && check.failedRequests.length === 0), checks };
}

const report = {
  generatedAt: new Date().toISOString(),
  routeMatrix: await routeMatrix(),
  contrastAudit: await contrastAudit(),
  stateMatrix: await stateMatrix(),
  keyboardFlow: await keyboardFlow(),
  browserFlows: await browserFlows(),
};

console.log(JSON.stringify(report, null, 2));
if (!report.routeMatrix.ok || !report.contrastAudit.ok || !report.stateMatrix.ok || !report.keyboardFlow.ok || !report.browserFlows.ok) {
  process.exitCode = 1;
}
