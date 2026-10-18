import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({
  channel: 'chromium',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(process.env.AUTOATLAS_CAPTURE_URL ?? 'http://127.0.0.1:5173/?fixture=smart-451', {
    waitUntil: 'domcontentloaded',
  });
  await page.locator('[data-testid="scene"][data-status="ready"]').waitFor({ timeout: 60000 });
  await page.getByRole('button', { name: 'Hatch assembly', exact: true }).click();
  await page.locator('.assembly-controls[data-status="ready"]').waitFor({ timeout: 60000 });
  await page.getByRole('button', { name: 'Open settings' }).click();
  await page.getByLabel('Rendering quality', { exact: true }).selectOption('medium');
  await page.getByRole('button', { name: 'Back to exploring' }).click();
  await page.locator('.assembly-controls[data-status="ready"]').waitFor({ timeout: 60000 });
  await mkdir('docs/screenshots', { recursive: true });
  await page.screenshot({ path: 'docs/screenshots/hatch-assembled.png' });
  await page.getByRole('button', { name: 'Exploded', exact: true }).click();
  await page.screenshot({ path: 'docs/screenshots/hatch-exploded.png' });
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await page.screenshot({ path: 'docs/screenshots/hatch-light.png' });
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await page.getByRole('button', { name: 'Assembled', exact: true }).click();
  await page.getByRole('button', { name: 'Open rear hatch', exact: true }).click();
  await page.screenshot({ path: 'docs/screenshots/hatch-open.png' });
  await page.getByRole('button', { name: 'Assembled', exact: true }).click();
  await page.getByRole('textbox', { name: 'Filter components' }).fill('left rear hatch gas strut');
  await page.locator('.search-result').first().click();
  await page.getByRole('button', { name: 'Isolate', exact: true }).click();
  await page.screenshot({ path: 'docs/screenshots/hatch-isolated.png' });
  await page.getByRole('button', { name: 'Return to assembly', exact: true }).click();
  await page.getByRole('button', { name: 'Hatch assembly', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Exploded', exact: true }).click();
  await page.screenshot({ path: 'docs/screenshots/hatch-mobile.png' });
  // Measure an actively rotating current scene, separately from deterministic captures.
  await page.close();
  const benchmark = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'no-preference',
  });
  benchmark.on('pageerror', (e) => errors.push(e.message));
  await benchmark.goto('http://127.0.0.1:5173/?fixture=smart-451', {
    waitUntil: 'domcontentloaded',
  });
  await benchmark.locator('[data-testid="scene"][data-status="ready"]').waitFor({ timeout: 60000 });
  await benchmark.getByRole('button', { name: 'Hatch assembly', exact: true }).click();
  await benchmark.locator('.assembly-controls[data-status="ready"]').waitFor({ timeout: 60000 });
  await benchmark.getByRole('button', { name: 'Auto-rotate', exact: true }).click();
  const performance = await benchmark.evaluate(
    () =>
      new Promise((resolve) => {
        const started = window.performance.now();
        let frames = 0;
        function tick(now) {
          frames++;
          if (now - started >= 6000)
            resolve({
              frames,
              elapsedMs: now - started,
              framesPerSecond: frames / ((now - started) / 1000),
              quality: document.querySelector('.quality-select')?.textContent,
              triangles: window.__autoatlas.snapshot().triangles,
            });
          else requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }),
  );
  await writeFile(
    'docs/screenshots/hatch-metadata.json',
    JSON.stringify(
      {
        captured: '2026-10-18',
        browser: browser.version(),
        renderer:
          'SwiftShader software, medium quality, detailed geometry; no GPU-only transmission/AO',
        desktop: [1440, 1000],
        mobile: [390, 844],
        performance,
        errors,
      },
      null,
      2,
    ) + '\n',
  );
  if (errors.length) throw Error(errors.join('\n'));
  console.log('Captured six hatch views; no page errors.');
} finally {
  await browser.close();
}
