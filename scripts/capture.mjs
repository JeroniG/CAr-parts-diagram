import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'chromium', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: 'reduce',
    }),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(process.env.AUTOATLAS_CAPTURE_URL ?? 'http://127.0.0.1:5173', {
    waitUntil: 'networkidle',
  });
  await page.locator('.photo-plane img').waitFor();
  await mkdir('docs/screenshots', { recursive: true });
  await page.screenshot({ path: 'docs/screenshots/public-desktop.png' });
  await page.getByRole('button', { name: 'Hatch assembly', exact: true }).click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'docs/screenshots/public-hatch.png' });
  await page.getByRole('button', { name: 'Select Rear window in photograph', exact: true }).click();
  await page.screenshot({ path: 'docs/screenshots/public-part.png' });
  await page.getByRole('button', { name: 'Vehicle explorer', exact: true }).click();
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await page.screenshot({ path: 'docs/screenshots/public-light.png' });
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'docs/screenshots/public-mobile-inspector.png' });
  await page.goto(process.env.AUTOATLAS_CAPTURE_URL ?? 'http://127.0.0.1:5173', {
    waitUntil: 'networkidle',
  });
  await page.screenshot({ path: 'docs/screenshots/public-mobile.png' });
  await page.getByRole('button', { name: 'Change vehicle' }).click();
  await page
    .getByRole('textbox', { name: 'Search vehicle registry' })
    .fill('Honda Accord 2014 hybrid');
  await page.screenshot({ path: 'docs/screenshots/public-search.png' });
  await writeFile(
    'docs/screenshots/public-metadata.json',
    JSON.stringify(
      {
        captured: '2026-10-18',
        browser: browser.version(),
        mode: 'Actual public photo/catalog UI; no generated car or WebGL',
        photoRights: 'M 93 / Wikimedia Commons, CC BY-SA 3.0 DE; see ASSET_LICENSES.md',
        desktop: [1440, 1000],
        mobile: [390, 844],
        errors,
      },
      null,
      2,
    ) + '\n',
  );
  if (errors.length) throw Error(errors.join('\n'));
  console.log('Captured seven public views without page errors.');
} finally {
  await browser.close();
}
