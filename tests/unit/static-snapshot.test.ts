import { it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import snapshot from '../../src/data/catalog.snapshot.json';
import {
  catalog,
  vehicle,
  fitments,
  oemParts,
  sources,
  systems,
} from '../../src/data/catalog.source';
it('keeps the bundled/static catalog identical to reviewed authoring data', async () => {
  expect(snapshot.components).toEqual(catalog);
  expect(snapshot.vehicle).toEqual(vehicle);
  expect(snapshot.fitments).toEqual(fitments);
  expect(snapshot.oemParts).toEqual(oemParts);
  expect(snapshot.sources).toEqual(sources);
  expect(snapshot.systems).toEqual(systems);
  expect(JSON.parse(await readFile('public/data/catalog.json', 'utf8'))).toEqual(snapshot);
  const manifest = JSON.parse(await readFile('public/models/smart-451/manifest.json', 'utf8'));
  expect(snapshot.modelAsset.contentHash).toBe(manifest.asset.contentHash);
});
