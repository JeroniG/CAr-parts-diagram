import { test, expect, type Page } from '@playwright/test';
const snapshot = (page: Page) => page.evaluate(() => window.__autoatlas!.snapshot());
async function ready(page: Page) {
  await page.goto('/');
  await expect(page.locator('.assembly-controls')).toHaveAttribute('data-status', 'ready', {
    timeout: 45000,
  });
}
async function explore(page: Page) {
  const button = page.getByRole('button', { name: 'Explore', exact: true });
  if (await button.isVisible()) await button.click();
}
test('four modes share one canvas, keep internals opaque, and restore authored transforms', async ({
  page,
}) => {
  await ready(page);
  const before = await snapshot(page);
  expect(before.parts).toHaveLength(21);
  await page.getByRole('button', { name: 'X-ray', exact: true }).click();
  await page.getByRole('slider', { name: 'Surface opacity' }).fill('0.25');
  let state = await snapshot(page);
  expect(state.parts.find((p) => p.id === 'hatch-lower-panel')!.opacity).toBe(0.25);
  expect(state.parts.find((p) => p.id === 'hatch-wiper-motor')!.opacity).toBe(1);
  await page.getByRole('button', { name: 'Cutaway', exact: true }).click();
  for (const side of ['front', 'rear', 'left', 'right', 'upper']) {
    await page.getByLabel('Section plane', { exact: true }).selectOption(side);
    state = await snapshot(page);
    expect(state.section).toBe(side);
    expect(state.parts.find((p) => p.id === 'hatch-lower-panel')!.clippingPlanes).toHaveLength(1);
    expect(state.parts.find((p) => p.id === 'hatch-wiper-motor')!.clippingPlanes).toHaveLength(0);
  }
  await page.getByLabel('Clip exterior only').uncheck();
  expect(
    (await snapshot(page)).parts.find((p) => p.id === 'hatch-wiper-motor')!.clippingPlanes,
  ).toHaveLength(1);
  await page.getByLabel('Section position', { exact: true }).fill('0.7');
  const plane = (await snapshot(page)).parts[0].clippingPlanes[0];
  await page.getByLabel('Section position', { exact: true }).fill('-0.7');
  expect((await snapshot(page)).parts[0].clippingPlanes[0].constant).not.toBe(plane.constant);
  await page.getByRole('button', { name: 'Close section controls' }).click();
  await page.getByRole('button', { name: 'Cutaway', exact: true }).click();
  await page.getByRole('button', { name: 'Explode', exact: true }).click();
  await page.getByRole('slider', { name: 'Exploded view' }).fill('50');
  expect((await snapshot(page)).displayedExplosion).toBe(0.5);
  await page.getByRole('slider', { name: 'Exploded view' }).fill('0');
  expect(
    (await snapshot(page)).parts.every((p) => p.position.every((n, i) => n === p.base[i])),
  ).toBe(true);
  await page.getByRole('slider', { name: 'Exploded view' }).fill('100');
  expect(
    (await snapshot(page)).parts.every((p) => p.position.some((n, i) => n !== p.base[i])),
  ).toBe(true);
  await page.getByRole('button', { name: 'Assembled', exact: true }).click();
  for (const p of (await snapshot(page)).parts) {
    expect(p.position).toEqual(p.base);
    expect(p.rotation).toEqual([0, 0, 0, 1]);
  }
  await page.getByRole('button', { name: 'References', exact: true }).click();
  await expect(page.getByTestId('photo-viewer')).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  expect((await snapshot(page)).canvasId).toBe(before.canvasId);
  await page.getByRole('button', { name: 'Whole vehicle', exact: true }).click();
  await expect(page.getByText('Vehicle geometry required', { exact: true })).toBeVisible();
  expect((await snapshot(page)).parts).toHaveLength(0);
  expect((await snapshot(page)).canvasId).toBe(before.canvasId);
});
test('component search highlights, isolates, rotates and returns without loading the legacy car', async ({
  page,
}) => {
  const models: string[] = [];
  page.on('request', (r) => {
    if (r.url().endsWith('.glb')) models.push(r.url());
  });
  await ready(page);
  const systems = page.getByRole('button', { name: 'Systems', exact: true });
  if (await systems.isVisible()) await systems.click();
  await page.getByRole('textbox', { name: 'Filter components' }).fill('left rear hatch gas strut');
  await page.locator('.search-result').first().click();
  await expect(page.locator('.inspector-title h2')).toHaveText('Left rear hatch gas strut');
  const selected = (await snapshot(page)).parts.find((p) => p.id === 'hatch-strut-left')!;
  expect(selected.emissive).toBe('2787ff');
  await page.getByRole('button', { name: 'Isolate', exact: true }).click();
  expect((await snapshot(page)).parts.filter((p) => p.visible).map((p) => p.id)).toEqual([
    'hatch-strut-left',
  ]);
  await page.getByRole('slider', { name: 'Rotate isolated component' }).fill('1.2');
  expect((await snapshot(page)).inspectionRotation).toBe(1.2);
  await page.getByRole('button', { name: 'Return to assembly', exact: true }).click();
  expect((await snapshot(page)).parts.filter((p) => p.visible)).toHaveLength(21);
  await explore(page);
  expect(models.some((url) => url.includes('educational-v1'))).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
