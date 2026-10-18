import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({
  channel: 'chromium',
  headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  page.on('pageerror', (error) => console.error('PAGE ERROR', error.message));
  page.on('console', (m) => {
    if (m.type() === 'error') console.error('CONSOLE', m.text().slice(0, 250));
  });
  await page.goto(process.env.AUTOATLAS_CAPTURE_URL ?? 'http://localhost:5173', {
    waitUntil: 'domcontentloaded',
  });
  await page.locator('[data-testid="scene"][data-status="ready"]').waitFor({ timeout: 60000 });
  await page.getByRole('button', { name: 'Open settings' }).click();
  await page.getByLabel('Rendering quality', { exact: true }).selectOption('low');
  await page.getByRole('button', { name: 'Back to exploring' }).click();
  await page.waitForTimeout(1500);
  await mkdir('docs/screenshots', { recursive: true });
  await page.screenshot({ path: 'docs/screenshots/desktop.png', fullPage: true });
  console.log(
    'OVERFLOW',
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  );
  await page.getByRole('button', { name: 'Auto-rotate', exact: true }).click();
  const frameMeasurement = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const start = performance.now();
        let frames = 0;
        function sample(now) {
          frames++;
          if (now - start >= 6500)
            resolve({
              animationFrames: frames,
              elapsedMilliseconds: now - start,
              animationFramesPerSecond: (frames * 1000) / (now - start),
            });
          else requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      }),
  );
  const performanceSummary = await page.locator('.statusbar').innerText();
  console.log('PERFORMANCE', performanceSummary);
  await page.getByRole('button', { name: 'Reset all', exact: true }).click();
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'docs/screenshots/dark.png' });
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await page.getByRole('button', { name: /Mechanism lab/ }).click();
  await page.waitForTimeout(1500);
  await page.getByRole('slider', { name: 'Animation timeline' }).fill('0.45');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'docs/screenshots/mechanism.png' });
  await page.getByRole('button', { name: 'Close lesson' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'docs/screenshots/mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Systems', exact: true }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/screenshots/mobile-catalog.png', fullPage: true });
  await writeFile(
    'docs/screenshots/metadata.json',
    JSON.stringify(
      {
        browser: browser.version(),
        renderer: 'Chromium headless / SwiftShader software rendering, low quality',
        desktop: [1440, 1000],
        mobile: [390, 844],
        captured: '2026-10-17',
        performanceSummary,
        frameMeasurement,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
