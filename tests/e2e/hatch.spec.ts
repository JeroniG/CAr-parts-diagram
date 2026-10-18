import { strutEndpoints } from '../../src/scene/animations/hatch';
import { test, expect, type Page } from '@playwright/test';
const snapshot = (page: Page) => page.evaluate(() => window.__autoatlas!.snapshot());
async function ready(page: Page) {
  await page.goto('/?fixture=smart-451', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('scene')).toHaveAttribute('data-status', 'ready', {
    timeout: 45000,
  });
}
async function hatch(page: Page) {
  await page.getByRole('button', { name: 'Hatch assembly', exact: true }).click();
  await expect(page.locator('.assembly-controls')).toHaveAttribute('data-status', 'ready', {
    timeout: 45000,
  });
}
async function explore(page: Page) {
  const button = page.getByRole('button', { name: 'Explore', exact: true });
  if (await button.isVisible()) await button.click();
}
async function selectStrut(page: Page) {
  const systems = page.getByRole('button', { name: 'Systems', exact: true });
  if (await systems.isVisible()) await systems.click();
  await page.getByRole('textbox', { name: 'Filter components' }).fill('left rear hatch gas strut');
  await page.locator('.search-result').first().click();
}
test('loads the hatch only on demand, opens both leaves, explodes and reassembles exactly', async ({
  page,
}) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/rear-hatch/')) requests.push(r.url());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await ready(page);
  expect(requests).toEqual([]);
  await hatch(page);
  expect(requests.some((r) => r.endsWith('.glb'))).toBe(true);
  expect((await snapshot(page)).parts).toHaveLength(21);
  await page.getByRole('button', { name: 'Open rear hatch', exact: true }).click();
  const opened = await snapshot(page);
  expect(opened.hatchOpen).toBe(1);
  for (const attachment of opened.strutAttachments) {
    const expected = strutEndpoints(attachment.id.includes('left') ? 1 : -1, 1);
    attachment.body.forEach((n, i) => expect(n).toBeCloseTo(expected.body.toArray()[i], 5));
    attachment.hatch.forEach((n, i) => expect(n).toBeCloseTo(expected.hatch.toArray()[i], 5));
  }
  expect(opened.parts.find((p) => p.id === 'rear-glass')!.rotation[0]).toBeGreaterThan(0);
  expect(opened.parts.find((p) => p.id === 'tailgate')!.rotation[0]).toBeLessThan(0);
  await page.getByRole('button', { name: 'Exploded', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).displayedExplosion).toBe(1);
  expect(
    (await snapshot(page)).parts.every((p) => p.position.some((n, i) => n !== p.base[i])),
  ).toBe(true);
  await page.getByRole('button', { name: 'Assembled', exact: true }).click();
  for (const part of (await snapshot(page)).parts) {
    expect(part.position).toEqual(part.base);
    expect(part.rotation).toEqual([0, 0, 0, 1]);
  }
  await page.getByRole('button', { name: 'In vehicle', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Assembly only', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Whole vehicle', exact: true }).click();
  expect((await snapshot(page)).activeAssembly).toBeNull();
  expect((await snapshot(page)).parts).toHaveLength(56);
  expect(errors).toEqual([]);
});
test('search selects a strut, isolates and independently rotates it, then restores the assembly', async ({
  page,
}) => {
  await ready(page);
  await hatch(page);
  await selectStrut(page);
  await expect(page.locator('.inspector-title h2')).toHaveText('Left rear hatch gas strut');
  expect((await snapshot(page)).selected).toBe('hatch-strut-left');
  await page.getByRole('button', { name: 'Isolate', exact: true }).click();
  expect((await snapshot(page)).parts.filter((p) => p.visible).map((p) => p.id)).toEqual([
    'hatch-strut-left',
  ]);
  await page.getByRole('slider', { name: 'Rotate isolated component' }).fill('1.2');
  expect(
    (await snapshot(page)).parts.find((p) => p.id === 'hatch-strut-left')!.rotation,
  ).not.toEqual([0, 0, 0, 1]);
  await page.getByRole('button', { name: 'Return to assembly', exact: true }).click();
  expect((await snapshot(page)).parts.every((p) => p.visible)).toBe(true);
  await page.getByRole('button', { name: 'Separate this part', exact: true }).click();
  const separated = (await snapshot(page)).parts.find((p) => p.id === 'hatch-strut-left')!;
  expect(separated.position).not.toEqual(separated.base);
  await page.getByRole('button', { name: 'Restore this part', exact: true }).click();
  await page.getByRole('button', { name: 'Hide', exact: true }).click();
  expect((await snapshot(page)).parts.find((p) => p.id === 'hatch-strut-left')!.visible).toBe(
    false,
  );
  await explore(page);
  await page.getByRole('button', { name: 'Assembled', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('failed assembly download is retryable and preserves the vehicle catalog', async ({
  page,
}) => {
  await page.route('**/rear-hatch/*.glb', (route) =>
    route.fulfill({ status: 503, body: 'unavailable' }),
  );
  await ready(page);
  await page.getByRole('button', { name: 'Hatch assembly', exact: true }).click();
  await expect(page.locator('.assembly-controls')).toHaveAttribute('data-status', 'error');
  expect((await snapshot(page)).parts).toHaveLength(56);
  await page.unroute('**/rear-hatch/*.glb');
  await page.route('**/rear-hatch/*.glb', (route) =>
    route.fulfill({ status: 200, body: 'unreviewed replacement bytes' }),
  );
  await page.getByRole('button', { name: 'Retry assembly' }).click();
  await expect(page.locator('.assembly-error')).toContainText('integrity check failed');
  await page.unroute('**/rear-hatch/*.glb');
  await page.getByRole('button', { name: 'Retry assembly' }).click();
  await expect(page.locator('.assembly-controls')).toHaveAttribute('data-status', 'ready', {
    timeout: 45000,
  });
  expect((await snapshot(page)).parts).toHaveLength(21);
});
test('detail switching retains selection and stale downloads cannot replace the whole vehicle', async ({
  page,
}) => {
  await ready(page);
  await hatch(page);
  await selectStrut(page);
  await explore(page);
  await page.getByRole('button', { name: 'Open settings' }).click();
  await page.getByLabel('Rendering quality', { exact: true }).selectOption('medium');
  await page.getByRole('button', { name: 'Back to exploring' }).click();
  await expect(page.locator('.assembly-controls')).toHaveAttribute('data-status', 'ready', {
    timeout: 45000,
  });
  expect((await snapshot(page)).assemblyLod).toBe('rear-hatch-high');
  expect((await snapshot(page)).selected).toBe('hatch-strut-left');
  await page.getByRole('button', { name: 'Whole vehicle', exact: true }).click();
  let release: (() => void) | undefined;
  await page.route('**/rear-hatch/*.glb', async (route) => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route.continue().catch(() => {});
  });
  await page.getByRole('button', { name: 'Hatch assembly', exact: true }).click();
  await expect.poll(() => !!release).toBe(true);
  await page.getByRole('button', { name: 'Whole vehicle', exact: true }).click();
  release!();
  await page.waitForTimeout(500);
  expect((await snapshot(page)).activeAssembly).toBeNull();
  expect((await snapshot(page)).parts).toHaveLength(56);
});
test('measures two actual hatch surfaces without selecting a part and clears on transform', async ({
  page,
}) => {
  await ready(page);
  await hatch(page);
  await page.getByLabel('Camera view', { exact: true }).selectOption('rear');
  await page.getByRole('button', { name: 'Measure', exact: true }).click();
  const hud = page.locator('.measurement-hud');
  await expect(hud).toContainText('Select two surface points');
  const rect = (await page.getByTestId('scene').boundingBox())!;
  for (const [x, y] of [
    [0.5, 0.66],
    [0.55, 0.66],
    [0.45, 0.66],
    [0.5, 0.72],
    [0.55, 0.72],
    [0.45, 0.72],
    [0.5, 0.6],
    [0.55, 0.6],
  ]) {
    await page.mouse.click(rect.x + rect.width * x, rect.y + rect.height * y);
    if ((await hud.innerText()).includes('mm · model distance')) break;
  }
  await expect(hud).toContainText('mm · model distance');
  expect((await snapshot(page)).selected).toBe('rear-hatch');
  await page.getByRole('button', { name: 'Exploded', exact: true }).click();
  await expect(hud).toContainText('Select two surface points');
  await page.getByRole('button', { name: 'Close measurement' }).click();
  await expect(hud).toHaveCount(0);
});
test('normal-motion explosion passes through intermediate positions and reverses', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await ready(page);
  await hatch(page);
  await page.evaluate(() => {
    const capture = window as unknown as { __motionSamples: number[] };
    capture.__motionSamples = [];
    const end = performance.now() + 6000;
    function sample() {
      capture.__motionSamples.push(window.__autoatlas!.snapshot().displayedExplosion);
      if (performance.now() < end) requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
  await page.getByRole('button', { name: 'Exploded', exact: true }).click();
  await expect
    .poll(async () => (await snapshot(page)).displayedExplosion, { timeout: 15000 })
    .toBe(1);
  const samples = await page.evaluate(
    () => (window as unknown as { __motionSamples: number[] }).__motionSamples,
  );
  expect(samples.some((n) => n > 0 && n < 1)).toBe(true);
  await page.getByRole('button', { name: 'Assembled', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).displayedExplosion).toBe(0);
  for (const part of (await snapshot(page)).parts) expect(part.position).toEqual(part.base);
});
