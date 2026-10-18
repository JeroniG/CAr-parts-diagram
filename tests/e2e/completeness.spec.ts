import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
test('Whole Vehicle entry exposes required milestones and a persistent, exportable modeling queue', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByText('Vehicle geometry required', { exact: true })).toBeVisible();
  await expect(page.locator('.assembly-controls')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Measure', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Vehicle progress', exact: true }).click();
  await expect(page.getByTestId('milestone-1')).toContainText('Incomplete');
  await expect(page.getByTestId('milestone-2')).toContainText('0 / 14');
  await page.getByLabel('Filter modeling area').selectOption('engine');
  await page.getByLabel('Search modeling tasks').fill('dipstick');
  await page.getByRole('button', { name: /Engine oil dipstick.*geometry required/ }).click();
  await expect(page.getByRole('region', { name: 'Modeling task details' })).toContainText(
    'Validated installed position',
  );
  await page
    .getByLabel('Modeling notes', { exact: true })
    .fill('Need measured mounting datum and donor variant.');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export report' }).click();
  const download = await downloadPromise;
  const report = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(report.catalog.instances).toBe(162);
  expect(report.milestones.every((m: { complete: boolean }) => !m.complete)).toBe(true);
  expect(Object.values(report.modelingNotes)).toContain(
    'Need measured mounting datum and donor variant.',
  );
  await page.reload();
  await page.getByRole('button', { name: 'Vehicle progress', exact: true }).click();
  await page.getByLabel('Search modeling tasks').fill('dipstick');
  await page.getByRole('button', { name: /Engine oil dipstick.*geometry required/ }).click();
  await expect(page.getByLabel('Modeling notes', { exact: true })).toHaveValue(
    'Need measured mounting datum and donor variant.',
  );
  await page.getByRole('button', { name: 'Open component information' }).click();
  await expect(page.locator('.inspector-title h2')).toHaveText('Engine oil dipstick');
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
