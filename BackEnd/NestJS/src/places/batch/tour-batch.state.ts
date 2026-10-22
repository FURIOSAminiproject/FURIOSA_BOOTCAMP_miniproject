import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { dateValue } from '../tour-mapping';

export interface TourBatchState { version: 1; scope: string; lastSuccessfulDate: string }
export interface TourBatchStateStore {
  read(): Promise<TourBatchState | null>;
  write(state: TourBatchState): Promise<void>;
}
export class TourBatchStateError extends Error {
  constructor(readonly code: string) { super(code); }
}
export class FileTourBatchState implements TourBatchStateStore {
  constructor(private readonly path: string) {}
  async read(): Promise<TourBatchState | null> {
    let content: string;
    try { content = await readFile(this.path,'utf8'); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw new TourBatchStateError('CHECKPOINT_READ_FAILED');
    }
    try {
      const value = JSON.parse(content) as TourBatchState;
      if (!value || value.version !== 1 || typeof value.scope !== 'string' || typeof value.lastSuccessfulDate !== 'string'
        || !dateValue(value.lastSuccessfulDate)) throw new Error();
      return value;
    } catch { throw new TourBatchStateError('CHECKPOINT_INVALID'); }
  }
  async write(state: TourBatchState): Promise<void> {
    const temporary = `${this.path}.${randomUUID()}.tmp`;
    try {
      await mkdir(dirname(this.path), { recursive: true });
      await writeFile(temporary, JSON.stringify(state), { flag: 'wx', mode: 0o600 });
      await rename(temporary,this.path);
    } catch {
      await unlink(temporary).catch(() => undefined);
      throw new TourBatchStateError('CHECKPOINT_WRITE_FAILED');
    }
  }
}
