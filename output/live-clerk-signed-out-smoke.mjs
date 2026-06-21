const BASE_URL = 'http://127.0.0.1:5173';
const CDP_BASE = 'http://127.0.0.1:9223';

class Cdp {
  constructor(wsUrl, targetId) {
    this.ws = new WebSocket(wsUrl);
    this.targetId = targetId;
    this.id = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !this.pending.has(message.id)) return;
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result || {});
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

  async close() {
    if (this.targetId) await fetch(`${CDP_BASE}/json/close/${this.targetId}`).catch(() => {});
    this.ws.close();
  }
}

async function createPage() {
  const target = await fetch(`${CDP_BASE}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' }).then((res) => res.json());
  const cdp = new Cdp(target.webSocketDebuggerUrl, target.id);
  await Promise.all([cdp.send('Page.enable'), cdp.send('Runtime.enable'), cdp.send('Network.enable')]);
  return cdp;
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

async function waitFor(cdp, expression, timeoutMs = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = await evaluate(cdp, expression).catch(() => null);
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

async function clickByText(cdp, text) {
  const point = await evaluate(
    cdp,
    `(() => {
      const el = [...document.querySelectorAll('button,a')].find((node) => node.textContent.trim() === ${JSON.stringify(text)});
      if (!el) return null;
      el.scrollIntoView({ block: 'center', inline: 'center' });
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`
  );
  if (!point) throw new Error(`Clickable text not found: ${text}`);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y, button: 'none' });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
}

const cdp = await createPage();
try {
  await cdp.send('Page.navigate', { url: BASE_URL });
  await waitFor(cdp, 'document.readyState === "complete" || document.readyState === "interactive"');
  await waitFor(cdp, 'document.body.innerText.includes("MyPortStock")');

  const landing = await evaluate(
    cdp,
    `(() => ({
      hasLandingHeadline: document.body.innerText.includes('Quantitative Precision'),
      hasSignInButton: [...document.querySelectorAll('button,a')].some((el) => /Sign In|Enter Terminal/.test(el.textContent)),
      hasAuthenticatedShell: document.body.innerText.includes('Live Systems') || document.body.innerText.includes('Quick search'),
      hasMissingKey: document.body.innerText.includes('Missing Clerk Publishable Key')
    }))()`
  );

  await clickByText(cdp, 'Sign In');
  const clerkSurface = await waitFor(
    cdp,
    `(() => {
      const text = document.body.innerText;
      return /Sign in|Continue|Email|Google/i.test(text) || Boolean(document.querySelector('[role="dialog"], .cl-modalBackdrop, .cl-card'));
    })()`,
    10000
  ).then(() => true);

  const report = {
    generatedAt: new Date().toISOString(),
    ok: landing.hasLandingHeadline && landing.hasSignInButton && !landing.hasAuthenticatedShell && !landing.hasMissingKey && clerkSurface,
    landing,
    clerkSurface,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
} finally {
  await cdp.close();
}
