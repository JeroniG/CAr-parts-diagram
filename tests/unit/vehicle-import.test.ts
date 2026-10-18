import { expect, it } from 'vitest';
import { mkdtemp, writeFile, readFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { makeTestPackage, testRaster } from '../fixtures/vehiclePackage';
const exec = promisify(execFile);
it('stages, resumes and atomically publishes without duplicate parts or mutable revisions', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'autoatlas-import-')),
    source = resolve(root, 'package'),
    output = resolve(root, 'test-public');
  await mkdir(source);
  const fixture = makeTestPackage();
  await writeFile(resolve(source, 'manifest.json'), fixture.manifestText);
  await writeFile(resolve(source, 'catalog.json'), fixture.catalogText);
  await writeFile(resolve(source, 'diagram.png'), testRaster);
  const run = (publish = false) =>
    exec(
      process.execPath,
      [
        '--import',
        import.meta.resolve('tsx'),
        resolve('scripts/import-vehicle.ts'),
        '--package',
        source,
        '--public-root',
        output,
        ...(publish ? ['--publish'] : []),
      ],
      { cwd: root, env: { PATH: process.env.PATH, TMPDIR: tmpdir() } },
    ).catch(async (error) => {
      throw Error(
        String(error) +
          ' ' +
          (await readFile(resolve(root, '.imports/atlas-test-vehicle/1.0/report.json'), 'utf8')),
      );
    });
  try {
    await run();
    expect(
      JSON.parse(
        await readFile(resolve(root, '.imports/atlas-test-vehicle/1.0/report.json'), 'utf8'),
      ).status,
    ).toBe('validated');
    await run(true);
    await run(true);
    const registry = JSON.parse(await readFile(resolve(output, 'vehicles/registry.json'), 'utf8'));
    expect(registry.vehicles).toHaveLength(1);
    expect(registry.vehicles[0].manifestHash).toBe(fixture.entry.manifestHash);
    fixture.pkg.manifest.publishedAt = '2026-10-19';
    await writeFile(resolve(source, 'manifest.json'), JSON.stringify(fixture.pkg.manifest));
    await expect(run(true)).rejects.toThrow(/revision already exists/);
    expect(
      JSON.parse(await readFile(resolve(output, 'vehicles/registry.json'), 'utf8')).vehicles[0]
        .manifestHash,
    ).toBe(fixture.entry.manifestHash);
    await writeFile(resolve(source, 'manifest.json'), fixture.manifestText);
    await writeFile(resolve(source, 'diagram.png'), 'corrupt');
    await expect(run(true)).rejects.toThrow(/hash mismatch/);
    expect(
      JSON.parse(
        await readFile(resolve(root, '.imports/atlas-test-vehicle/1.0/report.json'), 'utf8'),
      ).status,
    ).toBe('failed');
  } catch (error) {
    throw Error(
      String(error) +
        ' ' +
        (await readFile(resolve(root, '.imports/atlas-test-vehicle/1.0/report.json'), 'utf8')),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 30000);
