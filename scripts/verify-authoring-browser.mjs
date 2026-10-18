/** Exercise a staged editor export in the real viewer without replacing published assets. */
import { chromium, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const args = process.argv.slice(2);
const option = (key) => {
  const index = args.indexOf(key);
  if (index < 0 || !args[index + 1]) throw Error(`Missing ${key}`);
  return args[index + 1];
};
const directory = resolve(option('--asset-dir'));
const output = resolve(option('--out'));
const manifest = JSON.parse(await readFile(resolve(directory, 'high.manifest.json'), 'utf8'));
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
  let loads = 0;
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/models/smart-451/rear-hatch/high.manifest.json', (route) =>
    route.fulfill({ json: manifest }),
  );
  await page.route('**/models/smart-451/rear-hatch/high.glb', (route) => {
    loads++;
    return route.fulfill({
      path: resolve(directory, 'high.glb'),
      contentType: 'model/gltf-binary',
    });
  });
  await page.goto(process.env.AUTOATLAS_CAPTURE_URL ?? 'http://127.0.0.1:5173/');
  await page.locator('.assembly-controls[data-status="ready"]').waitFor({ timeout: 60000 });
  await page.getByRole('button', { name: 'Open settings' }).click();
  await page.getByLabel('Adaptive quality').uncheck();
  await page.getByLabel('Rendering quality', { exact: true }).selectOption('medium');
  await page.getByRole('button', { name: 'Back to exploring' }).click();
  await page.locator('.assembly-controls[data-status="ready"]').waitFor({ timeout: 60000 });
  expect(loads).toBeGreaterThan(0);
  const snapshot = () => page.evaluate(() => window.__autoatlas.snapshot());
  const baseline = await snapshot();
  expect(baseline.parts.map((p) => p.id).sort()).toEqual(
    manifest.bindings.map((b) => b.componentId).sort(),
  );
  await mkdir(output, { recursive: true });
  async function capture(name) {
    await page.evaluate(
      () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
    );
    states[name] = await snapshot();
    expect(states[name].canvasId).toBe(baseline.canvasId);
    await page.screenshot({ path: resolve(output, `authoring-${name}.png`) });
  }
  await capture('assembled');
  await page.getByRole('button', { name: 'X-ray', exact: true }).click();
  await page.getByRole('slider', { name: 'Surface opacity' }).fill('0.25');
  const xray = await snapshot();
  expect(xray.parts.find((p) => p.id === 'hatch-lower-panel').opacity).toBe(0.25);
  expect(xray.parts.find((p) => p.id === 'hatch-wiper-motor').opacity).toBe(1);
  await capture('xray');
  await page.getByRole('button', { name: 'X-ray', exact: true }).click();
  await page.getByRole('button', { name: 'Explode', exact: true }).click();
  await capture('exploded');
  expect((await snapshot()).parts.every((p) => p.position.some((n, i) => n !== p.base[i]))).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Assembled', exact: true }).click();
  expect((await snapshot()).parts.every((p) => p.position.every((n, i) => n === p.base[i]))).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Cutaway', exact: true }).click();
  await page.getByLabel('Section plane', { exact: true }).selectOption('left');
  expect(
    (await snapshot()).parts.find((p) => p.id === 'hatch-lower-panel').clippingPlanes,
  ).toHaveLength(1);
  await capture('cutaway');
  await page.getByRole('button', { name: 'Close section controls' }).click();
  await page.getByRole('button', { name: 'Cutaway', exact: true }).click();
  await page.getByRole('textbox', { name: 'Filter components' }).fill('left rear hatch gas strut');
  await page.locator('.search-result').first().click();
  expect((await snapshot()).parts.find((p) => p.id === 'hatch-strut-left').emissive).toBe('2787ff');
  await page.getByRole('button', { name: 'Isolate', exact: true }).click();
  expect((await snapshot()).parts.filter((p) => p.visible).map((p) => p.id)).toEqual([
    'hatch-strut-left',
  ]);
  await page.getByRole('slider', { name: 'Rotate isolated component' }).fill('1.2');
  expect((await snapshot()).inspectionRotation).toBe(1.2);
  await capture('focus');
  await page.getByRole('button', { name: 'Return to assembly', exact: true }).click();
  expect((await snapshot()).parts.filter((p) => p.visible)).toHaveLength(21);
  expect(errors).toEqual([]);
  await writeFile(
    resolve(output, 'authoring-browser.json'),
    JSON.stringify(
      {
        assetHash: manifest.asset.contentHash,
        browser: browser.version(),
        loads,
        errors,
        scope:
          'Actual running app with staged Bforartists export served through local test routes. Unverified sample; no production assets replaced.',
        states,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    'Staged editor GLB passed selection, isolation, rotation, X-ray, clipping and exact reassembly in one canvas.',
  );
} finally {
  await browser.close();
}
