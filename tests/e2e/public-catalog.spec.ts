import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
const registry = JSON.parse(readFileSync('public/vehicles/registry.json', 'utf8'));
import { makeTestPackage, testRaster } from '../fixtures/vehiclePackage';
async function references(page: Page) {
  await page.getByRole('button', { name: 'References', exact: true }).click();
}
async function openSearch(page: Page) {
  await page.getByRole('button', { name: 'Change vehicle', exact: true }).click();
}
async function explore(page: Page) {
  const b = page.getByRole('button', { name: 'Explore', exact: true });
  if (await b.isVisible()) await b.click();
}
async function registerFixture(page: Page, broken = false) {
  const f = makeTestPackage();
  await page.route('**/vehicles/registry.json', (route) =>
    route.fulfill({ json: { schemaVersion: 1, vehicles: [...registry.vehicles, f.entry] } }),
  );
  await page.route('**/vehicles/atlas-test-vehicle/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({
      body: path.endsWith('manifest.json')
        ? broken
          ? 'tampered'
          : f.manifestText
        : path.endsWith('catalog.json')
          ? f.catalogText
          : testRaster,
      contentType: path.endsWith('.png') ? 'image/png' : 'application/json',
    });
  });
  return f;
}
test('public entry starts at Whole Vehicle and opens the sample only on request', async ({
  page,
}) => {
  const errors: string[] = [],
    models: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (r.url().endsWith('.glb')) models.push(r.url());
  });
  await page.goto('/');
  await expect(page.getByText('Vehicle geometry required', { exact: true })).toBeVisible();
  await expect(page.locator('.fixture-banner')).toHaveCount(0);
  await page.getByRole('button', { name: 'Explore the 21-part hatch sample', exact: true }).click();
  await expect(page.locator('.assembly-controls')).toHaveAttribute('data-status', 'ready', {
    timeout: 45000,
  });
  await expect(page.locator('.fixture-banner')).toContainText('21-part hatch sample');
  await references(page);
  await expect(page.getByTestId('photo-viewer')).toBeVisible();
  await expect
    .poll(() => page.locator('.photo-plane img').evaluate((e: HTMLImageElement) => e.naturalWidth))
    .toBeGreaterThan(2000);
  await expect(page.locator('.photo-caption')).toContainText(
    'not the selected 2015 U.S. equipment',
  );
  await expect(page.locator('.photo-credit')).toContainText('M 93');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.scene-canvas canvas')).toHaveCount(1);
  expect(models.some((url) => url.includes('/rear-hatch/'))).toBe(true);
  expect(models.some((url) => url.includes('educational-v1'))).toBe(false);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('photo hotspot selects the exact component and offers reversible zoom', async ({ page }) => {
  await page.goto('/');
  await references(page);
  await page.getByRole('button', { name: 'Select Left door in photograph', exact: true }).click();
  await expect(page.locator('.inspector-title h2')).toHaveText('Left door');
  await explore(page);
  await references(page);
  await page.getByRole('button', { name: 'Zoom in photograph' }).click();
  await expect(page.locator('.reference-toolbar')).toContainText('125%');
  await page.getByRole('button', { name: 'Reset view', exact: true }).click();
  await expect(page.locator('.reference-toolbar')).toContainText('100%');
  await page.getByRole('button', { name: 'Next photograph' }).click();
  await expect(page.locator('.photo-caption strong')).toContainText('Rear');
  await page.getByRole('button', { name: 'Select Rear window in photograph', exact: true }).click();
  await expect(page.locator('.inspector-title h2')).toHaveText('Rear window');
});
test('hatch and unavailable modes keep the same 3D canvas', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Vehicle geometry required', { exact: true })).toBeVisible();
  await expect(page.locator('.fixture-banner')).toHaveCount(0);
  await page.getByRole('button', { name: 'Explore the 21-part hatch sample', exact: true }).click();
  await expect(page.locator('.assembly-controls')).toHaveAttribute('data-status', 'ready', {
    timeout: 45000,
  });
  const before = await page.evaluate(() => window.__autoatlas!.snapshot().canvasId);
  await page.getByRole('button', { name: 'Choose exploration mode' }).click();
  await page.getByRole('menuitem', { name: /Transparent \/ X-ray/ }).click();
  expect(await page.evaluate(() => window.__autoatlas!.snapshot().xray)).toBe(true);
  await page.getByRole('button', { name: 'Choose exploration mode' }).click();
  await page.getByRole('menuitem', { name: /Engine \/ powertrain/ }).click();
  await expect(page.locator('.mode-unavailable')).toContainText('No reviewed powertrain model');
  expect(await page.evaluate(() => window.__autoatlas!.snapshot().canvasId)).toBe(before);
  await page.getByRole('button', { name: 'Vehicle explorer', exact: true }).click();
  await expect(page.getByText('Vehicle geometry required', { exact: true })).toBeVisible();
  await expect(page.locator('.scene-canvas canvas')).toHaveCount(1);
});
test('unsupported search records a local request without substituting a vehicle', async ({
  page,
}) => {
  await page.goto('/');
  await openSearch(page);
  await page
    .getByRole('textbox', { name: 'Search vehicle registry' })
    .fill('Honda Accord 2014 hybrid');
  await expect(page.getByText('No published configuration matches')).toBeVisible();
  await page.getByRole('button', { name: 'Save coverage request', exact: true }).click();
  await expect(
    page.getByText('Coverage request saved on this device.', { exact: false }),
  ).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export saved requests' }).click();
  expect((await download).suggestedFilename()).toBe('autoatlas-coverage-requests.json');
  await page.keyboard.press('Escape');
  await expect(page.locator('.vehicle-switcher')).toContainText('2015 smart Fortwo');
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('autoatlas-coverage-requests-v1')!)[0].query,
    ),
  ).toBe('Honda Accord 2014 hybrid');
});
test('global VIN search finds candidates but never establishes part fitment', async ({ page }) => {
  await page.route('**/DecodeVinValues/**', (route) =>
    route.fulfill({
      json: {
        Results: [
          {
            Make: 'SMART',
            Model: 'Fortwo',
            ModelYear: '2015',
            FuelTypePrimary: 'Gasoline',
            ErrorCode: '0',
          },
        ],
      },
    }),
  );
  await page.goto('/');
  await openSearch(page);
  await page.getByRole('textbox', { name: 'Search vehicle registry' }).fill('WMEEJ3BA0FK000001');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.locator('.vehicle-result')).toHaveCount(1);
  await expect(page.locator('.decoded-identity')).toContainText('fitment still need confirmation');
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});
test('same workspace loads a second test-only vehicle with separate instance callouts', async ({
  page,
}) => {
  await registerFixture(page);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Hatch assembly', exact: true }).click();
  await openSearch(page);
  await page.getByRole('textbox', { name: 'Search vehicle registry' }).fill('Atlas');
  await page.locator('.vehicle-result').click();
  await expect(page.locator('.workspace-heading h1')).toHaveText('Atlas TEST ONLY');
  await references(page);
  await expect(page.locator('.media-kind')).toContainText('CATALOG DIAGRAM');
  await page
    .getByRole('button', {
      name: 'Select Figure 10 · Test attachment left in diagram',
      exact: true,
    })
    .click();
  await expect(page.locator('.inspector-title h2')).toHaveText('Test attachment left');
  await explore(page);
  await references(page);
  await page
    .getByRole('button', {
      name: 'Select Figure 10 · Test attachment right in diagram',
      exact: true,
    })
    .click();
  await expect(page.locator('.inspector-title h2')).toHaveText('Test attachment right');
  await openSearch(page);
  await page.getByRole('textbox', { name: 'Search vehicle registry' }).fill('2015 smart');
  await page.locator('.vehicle-result').click();
  await expect(page.locator('.workspace-heading h1')).toHaveText('smart Fortwo');
  await references(page);
  await expect(page.locator('.photo-caption strong')).toContainText('Front');
  expect(errors).toEqual([]);
});
test('failed package integrity preserves the current vehicle and can retry', async ({ page }) => {
  await registerFixture(page, true);
  await page.goto('/');
  await openSearch(page);
  await page.getByRole('textbox', { name: 'Search vehicle registry' }).fill('Atlas');
  await page.locator('.vehicle-result').click();
  await expect(page.getByRole('dialog')).toContainText('integrity check failed');
  await expect(page.locator('.vehicle-switcher')).toContainText('2015 smart Fortwo');
  await registerFixture(page);
  await page.locator('.vehicle-result').click();
  await expect(page.locator('.workspace-heading h1')).toHaveText('Atlas TEST ONLY');
});
test('resize handles support keyboard and photo fallback survives image errors', async ({
  page,
  isMobile,
}) => {
  await page.route('**/photos/smart-451/front.jpg', (route) => route.fulfill({ status: 404 }));
  await page.goto('/');
  await references(page);
  await expect(
    page.getByText('The photograph could not be loaded.', { exact: false }),
  ).toBeVisible();
  if (!isMobile) {
    await page.getByRole('button', { name: 'Close dialog' }).click();
    const handle = page.getByRole('separator', { name: 'Resize systems panel' });
    await handle.focus();
    await page.keyboard.press('ArrowRight');
    await expect(handle).toHaveAttribute('aria-valuenow', '254');
    await references(page);
  }
  await page.getByRole('button', { name: 'Next photograph' }).click();
  await expect(page.locator('.photo-plane img')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
