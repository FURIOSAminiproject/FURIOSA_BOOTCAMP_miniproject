import { randomUUID } from 'node:crypto';
import type { SqlSession } from './tour-db.session';
import type { PlaceMapper, PlaceWriter } from './tour-ingestion.ports';
import type { References, SaveResult, Snapshots, TourItem } from './tour-types';
import { PLACE_FIELDS } from './tour-place.mapper';

// SQL persistence only: mappings and transaction/lock management are injected.
export class TourStore implements PlaceWriter {
  constructor(private readonly session: SqlSession, private readonly mapper: PlaceMapper) {}
  async save(item: TourItem, fresh: Snapshots, refs: References): Promise<SaveResult> {
    const patch = this.mapper.basic(item, fresh, refs);
    return this.session.transaction(async runner => {
      const [old]: TourItem[] = await runner.query('SELECT * FROM places WHERE content_id=$1 FOR UPDATE', [patch.content_id]);
      const { next, raw, changed } = this.mapper.merge(old, patch, fresh);
      const columns = ['place_id', ...PLACE_FIELDS, 'raw_data', 'last_synced_at'];
      const values = [randomUUID(), ...PLACE_FIELDS.map(key => ['images', 'fees'].includes(key) ? JSON.stringify(next[key] ?? []) : next[key] ?? null),
        JSON.stringify(raw), new Date()];
      const changedParameter = values.push(changed);
      const [saved] = await runner.query(`INSERT INTO places (${columns.join(',')})
        VALUES (${columns.map((_, i) => `$${i + 1}`).join(',')})
        ON CONFLICT(content_id) DO UPDATE SET
          ${columns.filter(c => c !== 'place_id' && c !== 'content_id').map(c => `${c}=EXCLUDED.${c}`).join(',')},
          updated_at=CASE WHEN $${changedParameter} THEN CURRENT_TIMESTAMP ELSE places.updated_at END
        RETURNING place_id`, values);
      return { id: saved.place_id, status: !old ? 'inserted' : changed ? 'updated' : 'unchanged' };
    });
  }
}
