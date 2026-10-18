import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
async function ready(page: Page) {
  await page.goto('/?fixture=smart-451', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('scene')).toHaveAttribute('data-status', 'ready', {
    timeout: 45000,
  });
  await expect.poll(async () => (await snapshot(page)).triangles).toBeGreaterThan(1000);
}
async function openSystems(page: Page) {
  const button = page.getByRole('button', { name: 'Systems', exact: true });
  if (await button.isVisible()) await button.click();
}
async function search(page: Page, q: string) {
  await openSystems(page);
  await page.getByRole('textbox', { name: 'Filter components' }).fill(q);
}
async function snapshot(page: Page) {
  return page.evaluate(() => window.__autoatlas!.snapshot());
}
async function selectSearch(page: Page, q: string) {
  await search(page, q);
  await page.locator('.search-result').first().click();
}
async function explore(page: Page) {
  const button = page.getByRole('button', { name: 'Explore', exact: true });
  if (await button.isVisible()) await button.click();
}

test('loads an interactive vehicle and has no page errors or horizontal overflow', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await ready(page);
  expect((await snapshot(page)).parts).toHaveLength(56);
  await expect.poll(async () => (await snapshot(page)).triangles).toBeGreaterThan(1000);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
test('right headlight search identifies the component and discloses mismatched OEM evidence', async ({
  page,
}) => {
  await ready(page);
  await selectSearch(page, 'right headlight');
  await expect(page.locator('.inspector-title h2')).toHaveText('Right headlight');
  expect((await snapshot(page)).selected).toBe('headlight-right');
  await page.getByRole('tab', { name: 'Part references' }).click();
  await expect(page.getByText('4518202459', { exact: true })).toBeVisible();
  await expect(
    page.getByText(/Applicability to this gasoline configuration has NOT been established/),
  ).toBeVisible();
  await expect(page.getByText('Fitment unknown', { exact: true })).toBeVisible();
});
test('unmodeled connector stays searchable without substitute geometry', async ({ page }) => {
  await ready(page);
  await selectSearch(page, 'Clutch actuator electrical connector');
  await expect(page.getByText('3D geometry is not yet available')).toBeVisible();
  expect((await snapshot(page)).parts.some((p) => p.id === 'actuator-connector')).toBe(false);
  await expect(page.getByRole('button', { name: 'Focus', exact: true })).toHaveCount(0);
});
test('exterior visibility is inherited and Show all restores it', async ({ page }) => {
  await ready(page);
  await openSystems(page);
  await page.getByRole('button', { name: 'Hide Exterior & body', exact: true }).click();
  expect((await snapshot(page)).parts.find((p) => p.id === 'service-panel')?.visible).toBe(false);
  expect((await snapshot(page)).parts.find((p) => p.id === 'engine-block')?.visible).toBe(true);
  await page.getByRole('button', { name: 'Show all', exact: true }).click();
  expect((await snapshot(page)).parts.every((p) => p.visible)).toBe(true);
});
test('transmission isolation, explosion and reset preserve original transforms', async ({
  page,
}) => {
  await ready(page);
  await selectSearch(page, 'Transmission & clutch');
  await page.getByRole('button', { name: 'Isolate', exact: true }).click();
  expect((await snapshot(page)).parts.find((p) => p.id === 'engine-block')?.visible).toBe(false);
  expect((await snapshot(page)).parts.find((p) => p.id === 'actuator-rod')?.visible).toBe(true);
  await explore(page);
  await expect(page.getByRole('button', { name: 'Exploded', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Inventory', exact: true }).click();
  await page.getByRole('slider', { name: 'Exploded view', exact: true }).fill('100');
  await expect.poll(async () => (await snapshot(page)).explode).toBe(1);
  const p = (await snapshot(page)).parts.find((p) => p.id === 'actuator-rod')!;
  expect(p.position).not.toEqual(p.base);
  await page.getByRole('button', { name: 'Reset all', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).explode).toBe(0);
  const all = (await snapshot(page)).parts;
  expect(all.every((p) => p.visible)).toBe(true);
  for (const p of all) expect(p.position).toEqual(p.base);
});
test('inventory positions remain individually selectable and reset', async ({ page }) => {
  await ready(page);
  await page.getByRole('button', { name: 'Inventory', exact: true }).click();
  expect((await snapshot(page)).explode).toBe(1);
  await page.getByRole('button', { name: 'Assembled', exact: true }).click();
  expect((await snapshot(page)).explode).toBe(0);
});
test('camera presets and zoom move the actual Three.js camera', async ({ page }) => {
  await ready(page);
  await page.waitForTimeout(1000);
  const before = (await snapshot(page)).camera;
  await page.getByLabel('Camera view', { exact: true }).selectOption('rear');
  await page.waitForTimeout(1200);
  expect((await snapshot(page)).camera[2]).toBeLessThan(0);
  expect((await snapshot(page)).camera).not.toEqual(before);
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await page.waitForTimeout(600);
  expect(Math.abs((await snapshot(page)).camera[2])).toBeLessThan(Math.abs(before[2]));
});
test('mechanism can scrub, play, pause and restart without timing claims', async ({ page }) => {
  await ready(page);
  await page.getByRole('button', { name: /Mechanism lab/ }).click();
  await expect(page.getByText('Conceptual animation', { exact: false })).toBeVisible();
  const timeline = page.getByRole('slider', { name: 'Animation timeline' });
  await timeline.fill('0.5');
  const released = (await snapshot(page)).parts.find((p) => p.id === 'actuator-rod')!;
  expect(released.position[0]).toBeLessThan(released.base[0]);
  await page.getByRole('button', { name: 'Play animation' }).click();
  await expect.poll(async () => Number(await timeline.inputValue())).toBeGreaterThan(0.5);
  await page.getByRole('button', { name: 'Pause animation' }).click();
  const paused = await timeline.inputValue();
  await page.waitForTimeout(250);
  expect(await timeline.inputValue()).toBe(paused);
  await page.getByRole('button', { name: 'Restart animation' }).click();
  expect(await timeline.inputValue()).toBe('0');
});
test('X-ray, clipping controls, theme and quality respond', async ({ page }) => {
  await ready(page);
  await page.getByRole('button', { name: 'Toggle X-ray mode' }).click();
  await expect(page.getByRole('button', { name: 'Toggle X-ray mode' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Section cut controls' }).click();
  await page.getByLabel('Section plane', { exact: true }).selectOption('horizontal');
  await page.getByRole('slider', { name: 'Section position' }).fill('0.4');
  await page.getByRole('button', { name: 'Close section controls' }).click();
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Open settings' }).click();
  await page.getByLabel('Rendering quality', { exact: true }).selectOption('low');
  await page.getByLabel('Lighting preset', { exact: true }).selectOption('inspection');
  await page.getByRole('button', { name: 'Back to exploring' }).click();
  await expect(page.locator('.quality-select')).toContainText('low');
});
test('keyboard access and dialog focus return work', async ({ page, isMobile }) => {
  await ready(page);
  const settings = page.getByRole('button', { name: 'Open settings' });
  await settings.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(settings).toBeFocused();
  if (!isMobile) {
    await page.keyboard.press('/');
    await expect(
      page.getByRole('button', { name: 'Search vehicles by name, year or VIN' }),
    ).toBeFocused();
  }
});
test('VIN service results reject a different platform without switching the vehicle', async ({
  page,
}) => {
  await page.route('**/DecodeVinValues/**', (route) =>
    route.fulfill({
      json: {
        Results: [
          {
            Make: 'SMART',
            Model: 'Fortwo',
            ModelYear: '2016',
            FuelTypePrimary: 'Gasoline',
            ErrorCode: '0',
          },
        ],
      },
    }),
  );
  await ready(page);
  await page.locator('.vehicle-switcher').click();
  await page.getByLabel('OPTIONAL VIN LOOKUP').fill('WMEEJ3BA0FK000001');
  await page.getByRole('button', { name: 'Decode', exact: true }).click();
  await expect(page.getByText('Vehicle identified; catalog not connected')).toBeVisible();
  await expect(page.locator('.vehicle-switcher')).toContainText('2015');
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});
test('missing model leaves a working component catalog', async ({ page }) => {
  await page.route('**/models/smart-451/*.glb', (route) =>
    route.fulfill({ status: 404, body: 'missing' }),
  );
  await page.goto('/?fixture=smart-451', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('scene')).toHaveAttribute('data-status', 'error');
  await expect(page.getByText('Explore through the catalog')).toBeVisible();
  await selectSearch(page, 'radiator');
  await expect(page.locator('.inspector-title h2')).toHaveText('Radiator');
});
test('WebGL failure exposes the 2D fallback', async ({ page }) => {
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type.includes('webgl')) return null;
      return Reflect.apply(get, this, [type, ...args]);
    } as typeof get;
  });
  await page.goto('/?fixture=smart-451', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('scene')).toHaveAttribute('data-status', 'error');
  await selectSearch(page, 'electrical connector');
  await expect(page.getByText('3D geometry is not yet available')).toBeVisible();
});
test('mobile catalog leaves a visible 3D viewport', async ({ page, isMobile }) => {
  test.skip(!isMobile);
  await ready(page);
  await openSystems(page);
  const canvas = await page.getByTestId('scene').boundingBox();
  const catalog = await page.locator('.systems-wrap').boundingBox();
  expect(canvas!.height).toBeGreaterThan(100);
  expect(canvas!.y + canvas!.height).toBeLessThanOrEqual(catalog!.y + 2);
  await page.getByRole('textbox', { name: 'Filter components' }).fill('clutch actuator');
  await page.locator('.search-result').first().click();
  await expect(page.locator('.inspector-title h2')).toContainText('Clutch actuator');
});

test('raycasting selects a real mesh while an orbit drag does not select', async ({ page }) => {
  await ready(page);
  await page.waitForTimeout(800);
  let rect = (await page.getByTestId('scene').boundingBox())!;
  const before = (await snapshot(page)).camera;
  await page.mouse.move(rect.x + rect.width * 0.5, rect.y + rect.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width * 0.58, rect.y + rect.height * 0.53, { steps: 8 });
  await page.mouse.up();
  expect((await snapshot(page)).selected).toBeNull();
  expect((await snapshot(page)).camera).not.toEqual(before);
  await page.waitForTimeout(500);
  rect = (await page.getByTestId('scene').boundingBox())!;
  for (const [x, y] of [
    [0.5, 0.5],
    [0.5, 0.6],
    [0.45, 0.55],
    [0.6, 0.5],
  ]) {
    await page.mouse.click(rect.x + rect.width * x, rect.y + rect.height * y);
    if ((await snapshot(page)).selected) break;
  }
  expect((await snapshot(page)).selected).not.toBeNull();
  await expect(page.locator('.inspector-title h2')).not.toHaveText('Smart Fortwo');
});
