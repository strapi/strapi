import { AI_METADATA_CHUNK_SIZE, AI_METADATA_MAX_FILES, Contracts } from '../../../shared';

describe('upload shared entry point', () => {
  it('exposes the shared barrel referenced by the package exports map', () => {
    expect(AI_METADATA_CHUNK_SIZE).toBe(20);
    expect(AI_METADATA_MAX_FILES).toBe(AI_METADATA_CHUNK_SIZE * 2);
    expect(Contracts).toBeDefined();
  });
});
