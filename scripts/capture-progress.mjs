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
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(process.env.AUTOATLAS_CAPTURE_URL ?? 'http://127.0.0.1:5173/');
  await page.getByText('Vehicle geometry required', { exact: true }).waitFor();
  await page.locator('.scene-canvas[data-status="ready"]').waitFor();
  await mkdir('docs/screenshots', { recursive: true });
  await page.screenshot({ path: 'docs/screenshots/completion-whole-vehicle.png' });
  await page.getByRole('button', { name: 'Vehicle progress', exact: true }).click();
  await page.screenshot({ path: 'docs/screenshots/completion-milestones.png' });
  await page.getByLabel('Search modeling tasks').fill('oil dipstick');
  await page.getByRole('button', { name: /Engine oil dipstick.*geometry required/ }).click();
  await page.locator('.queue-heading').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'docs/screenshots/completion-modeling-task.png' });
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.setViewportSize({ width: 390, height: 664 });
  await page.screenshot({ path: 'docs/screenshots/completion-phone.png' });
  const sampleButton = page.getByRole('button', {
    name: 'Explore the 21-part hatch sample',
    exact: true,
  });
  await sampleButton.click();
  await page.locator('.assembly-controls[data-status="ready"]').waitFor({ timeout: 60000 });
  if (errors.length) throw Error(errors.join('\n'));
  await writeFile(
    'docs/screenshots/completion-metadata.json',
    JSON.stringify(
      {
        captures: ['whole-vehicle', 'milestones', 'modeling-task', 'phone'],
        scope: 'Actual missing-geometry and progress UI; not photorealistic vehicle acceptance.',
        pageErrors: errors,
        phoneSampleButton: 'Opened 21-part sample successfully at 390x664',
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    'Captured actual Whole Vehicle gap, milestone coverage, modeling task and short phone entry; sample button works.',
  );
} finally {
  await browser.close();
}
