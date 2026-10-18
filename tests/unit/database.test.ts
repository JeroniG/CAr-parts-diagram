import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, it, expect } from 'vitest';
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(await readFile('db/migrations/001_catalog.sql', 'utf8'));
  await db.exec(await readFile('db/seed.sql', 'utf8'));
}, 30000);
afterAll(async () => {
  await db?.close();
});
describe('PostgreSQL migration and seed', () => {
  it('imports the complete normalized static catalog', async () => {
    const r = await db.query<{ n: number }>('select count(*)::int n from component');
    expect(r.rows[0].n).toBe(139);
    const f = await db.query<{ n: number }>(
      "select count(*)::int n from part_fitment where verification_status<>'unknown'",
    );
    expect(f.rows[0].n).toBe(0);
  });
  it('requires a source for every OEM part', async () => {
    await expect(
      db.exec(
        "insert into oem_part(id,manufacturer,part_number,description,source_id) values('fake','smart','test','invalid','missing')",
      ),
    ).rejects.toThrow(/foreign key/i);
  });
  it('rejects a confirmed claim with no verification date', async () => {
    await expect(
      db.exec(
        "update part_fitment set verification_status='catalog-confirmed' where id='fitment-oem-actuator'",
      ),
    ).rejects.toThrow(/check constraint/i);
  });
  it('prevents component hierarchy cycles', async () => {
    await expect(
      db.exec("update component set parent_component_id='clutch-actuator' where id='transmission'"),
    ).rejects.toThrow(/cycle/i);
  });
  it('prevents configuration-mismatched mappings', async () => {
    await expect(
      db.exec(
        "update mesh_binding set vehicle_config_id='smart-453' where component_id='clutch-actuator'",
      ),
    ).rejects.toThrow(/foreign key/i);
  });
  it('enables RLS on every catalog table with no public write policy', async () => {
    const r = await db.query<{ n: number }>(
      "select count(*)::int n from pg_tables where schemaname='public' and rowsecurity",
    );
    expect(r.rows[0].n).toBe(12);
    const w = await db.query<{ n: number }>(
      "select count(*)::int n from pg_policies where cmd<>'SELECT'",
    );
    expect(w.rows[0].n).toBe(0);
  });
});
