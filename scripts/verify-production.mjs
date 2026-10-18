import { chromium } from '@playwright/test';
const browser = await chromium.launch({
  channel: 'chromium',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: 'reduce',
    }),
    errors = [],
    requests = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => requests.push(r.url()));
  await page.goto(
    process.env.AUTOATLAS_PRODUCTION_URL ?? 'http://127.0.0.1:4173/?fixture=smart-451',
    { waitUntil: 'domcontentloaded' },
  );
  await page.getByText('Vehicle geometry required', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Explore the 21-part hatch sample', exact: true }).click();
  await page.locator('.assembly-controls[data-status="ready"]').waitFor({ timeout: 60000 });
  if ((await page.locator('.scene-canvas canvas').count()) !== 1)
    throw Error('Persistent 3D canvas missing.');
  if (!(await page.locator('.fixture-banner').textContent()).includes('21-part hatch sample'))
    throw Error('Sample disclosure missing.');
  if (requests.some((url) => url.includes('educational-v1.glb')))
    throw Error('Legacy car fixture leaked into production.');
  await page.getByRole('button', { name: 'References', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.photo-plane img')?.naturalWidth > 2000);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Explode', exact: true }).click();
  if ((await page.getByRole('slider', { name: 'Exploded view' }).inputValue()) !== '100')
    throw Error('Explosion control unavailable.');
  if (await page.evaluate(() => !!window.__autoatlas))
    throw Error('Development snapshot API leaked into production.');
  if (errors.length) throw Error(errors.join('\n'));
  console.log(
    'Production preview passed: Whole Vehicle entry and explicitly opened 3D hatch sample, visible disclosure, working explosion and supporting photographs; no legacy car or debug API.',
  );
} finally {
  await browser.close();
}
