import type { CategoryWriter, ReferenceContext, ReferenceLoader, ReferenceReader } from './tour-ingestion.ports';
import { categoriesFrom, codeNames, text } from './tour-mapping';
import { MappingError } from './tour-errors';
import type { References } from './tour-types';

export class TourReferenceService implements ReferenceLoader {
  constructor(private readonly api: ReferenceReader, private readonly categories: CategoryWriter) {}

  async load(): Promise<ReferenceContext> {
    const entries = categoriesFrom(await this.api.all('lclsSystmCode2', { lclsSystmListYn: 'Y' }));
    const regions = codeNames(await this.api.all('ldongCode2', { lDongListYn: 'N' }));
    if (!regions.size) throw new MappingError('Empty region reference');
    const refs: References = { categories: await this.categories.categories(entries), regions, districts: new Map() };
    // A fresh cache for every run: failures or later executions must not reuse incomplete references.
    const loadedRegions = new Set<string>();
    return { refs, categoryCount: entries.length, ensureDistrict: async item => {
      const region = text(item.lDongRegnCd);
      if (!region || !/^\d{2}$/.test(region) || loadedRegions.has(region)) return;
      const names = codeNames(await this.api.all('ldongCode2', { lDongListYn: 'N', lDongRegnCd: region }));
      for (const [code, name] of names) refs.districts.set(`${region}:${code}`, name);
      loadedRegions.add(region);
    } };
  }
}
