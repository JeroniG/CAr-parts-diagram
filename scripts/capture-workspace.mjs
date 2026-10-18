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
  const errors = [],
    states = {};
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(process.env.AUTOATLAS_CAPTURE_URL ?? 'http://127.0.0.1:5173/', {
    waitUntil: 'domcontentloaded',
  });
  await page.locator('.assembly-controls[data-status="ready"]').waitFor({ timeout: 60000 });
  await page.getByRole('button', { name: 'Open settings' }).click();
  await page.getByLabel('Adaptive quality').uncheck();
  await page.getByLabel('Rendering quality', { exact: true }).selectOption('medium');
  await page.getByRole('button', { name: 'Back to exploring' }).click();
  await page.locator('.assembly-controls[data-status="ready"]').waitFor({ timeout: 60000 });
  await mkdir('docs/screenshots', { recursive: true });
  async function capture(name) {
    // Wait for a rendered frame after state updates, without manufacturing visual content.
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    await page.screenshot({ path: `docs/screenshots/workspace-${name}.png` });
    states[name] = await page.evaluate(() => window.__autoatlas?.snapshot());
  }
  await capture('a-sample');
  await page.getByRole('button', { name: 'X-ray', exact: true }).click();
  await capture('b-xray');
  await page.getByRole('button', { name: 'X-ray', exact: true }).click();
  await page.getByRole('button', { name: 'Explode', exact: true }).click();
  await capture('c-exploded');
  await page.getByRole('button', { name: 'Assembled', exact: true }).click();
  await page.getByRole('button', { name: 'Cutaway', exact: true }).click();
  await page.getByLabel('Section plane', { exact: true }).selectOption('left');
  await capture('d-cutaway');
  await page.getByRole('button', { name: 'Close section controls' }).click();
  await page.getByRole('button', { name: 'Cutaway', exact: true }).click();
  await page.getByRole('textbox', { name: 'Filter components' }).fill('left rear hatch gas strut');
  await page.locator('.search-result').first().click();
  await page.getByRole('button', { name: 'Isolate', exact: true }).click();
  await capture('e-focus');
  await page.getByRole('button', { name: 'Return to assembly', exact: true }).click();
  await page.getByRole('button', { name: 'Hatch assembly', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Explode', exact: true }).click();
  await capture('mobile');
  await page.setViewportSize({ width: 390, height: 664 });
  await page.getByRole('button', { name: 'Assembled', exact: true }).click();
  await page.getByLabel('Camera view', { exact: true }).selectOption('rear');
  await page.getByRole('button', { name: 'Measure', exact: true }).click();
  const rect = await page.getByTestId('scene').boundingBox();
  for (const [x, y] of [
    [0.5, 0.66],
    [0.55, 0.66],
    [0.45, 0.66],
    [0.5, 0.72],
  ]) {
    await page.mouse.click(rect.x + rect.width * x, rect.y + rect.height * y);
    if ((await page.locator('.measurement-hud').innerText()).includes('mm · model distance')) break;
  }
  if (!(await page.locator('.measurement-hud').innerText()).includes('mm · model distance'))
    throw Error('Short phone surface measurement failed.');
  await capture('phone-measure');
  await writeFile(
    'docs/screenshots/workspace-metadata.json',
    JSON.stringify(
      {
        captured: new Date().toISOString(),
        browser: browser.version(),
        viewport: '1440×1000; mobile 390×844 and short phone 390×664',
        renderer: 'SwiftShader; medium quality; no hardware-only AO/transmission',
        scope:
          'Actual running application; original unverified hatch fixture. NOT photorealistic full-vehicle completion.',
        errors,
        states,
      },
      null,
      2,
    ),
  );
  if (errors.length) throw Error(errors.join('\n'));
} finally {
  await browser.close();
}
