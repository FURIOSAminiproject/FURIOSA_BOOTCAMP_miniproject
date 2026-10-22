import { randomUUID } from 'node:crypto';
import type { SqlSession } from './tour-db.session';
import type { CategoryWriter } from './tour-ingestion.ports';
import type { CategoryInput, References } from './tour-types';

export class TourCategoryRepository implements CategoryWriter {
  constructor(private readonly session: SqlSession) {}
  async categories(entries: CategoryInput[]): Promise<References['categories']> {
    return this.session.transaction(async runner => {
      for (const level of [1, 2, 3]) {
        const batch = entries.filter(entry => entry.level === level);
        if (!batch.length) continue;
        await runner.query(`INSERT INTO place_categories(category_id,category_code,category_name,category_level,parent_category_id)
          SELECT r.id::uuid,r.code,r.name,$2,p.category_id
          FROM jsonb_to_recordset($1::jsonb) AS r(id text,code text,name text,parent_code text)
          LEFT JOIN place_categories p ON p.category_code=r.parent_code
          ON CONFLICT(category_code) DO UPDATE SET category_name=EXCLUDED.category_name,
            category_level=EXCLUDED.category_level,parent_category_id=EXCLUDED.parent_category_id`,
        [JSON.stringify(batch.map(e => ({ id: randomUUID(), code: e.code, name: e.name, parent_code: e.parentCode }))), level]);
      }
      const rows: { category_id: string; category_code: string; category_level: number }[] =
        await runner.query('SELECT category_id,category_code,category_level FROM place_categories');
      return new Map(rows.map(r => [r.category_code, { id: r.category_id, level: r.category_level }]));
    });
  }
}
