import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'chromium', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
    errors = [],
    requests = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => requests.push(r.url()));
  await page.goto(
    process.env.AUTOATLAS_PRODUCTION_URL ?? 'http://127.0.0.1:4173/?fixture=smart-451',
    { waitUntil: 'networkidle' },
  );
  if (await page.locator('canvas').count())
    throw Error('Production must not load a development model.');
  if ((await page.locator('.photo-plane img').evaluate((e) => e.naturalWidth)) < 2000)
    throw Error('Production photograph did not load.');
  await page.getByRole('button', { name: 'Open settings' }).click();
  if (await page.getByLabel('Enable development fixture').count())
    throw Error('Development opt-in leaked into production.');
  if (await page.evaluate(() => !!window.__autoatlas))
    throw Error('Development snapshot API leaked into production.');
  if (requests.some((url) => url.endsWith('.glb')))
    throw Error('Production default downloaded sample geometry.');
  if (errors.length) throw Error(errors.join('\n'));
  console.log(
    'Production preview passed: real photograph loaded, zero canvas/GLB requests, no fixture toggle or debug snapshot API, no page errors.',
  );
} finally {
  await browser.close();
}
