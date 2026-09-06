import { AI_METADATA_MAX_FILES } from '../../../../constants';
import { validateGenerateAIMetadataBody } from '../ai-metadata';

const idsOfLength = (length: number) => Array.from({ length }, (_, index) => index + 1);

describe('validateGenerateAIMetadataBody', () => {
  it('accepts a selection within the limit', async () => {
    const fileIds = idsOfLength(AI_METADATA_MAX_FILES);

    await expect(validateGenerateAIMetadataBody({ fileIds })).resolves.toEqual({ fileIds });
  });

  it('rejects an empty selection', async () => {
    await expect(validateGenerateAIMetadataBody({ fileIds: [] })).rejects.toThrow();
  });

  it('rejects a selection above the limit', async () => {
    const fileIds = idsOfLength(AI_METADATA_MAX_FILES + 1);

    await expect(validateGenerateAIMetadataBody({ fileIds })).rejects.toThrow(
      `You can generate metadata for up to ${AI_METADATA_MAX_FILES} assets at a time`
    );
  });

  it('rejects unknown keys', async () => {
    await expect(
      validateGenerateAIMetadataBody({ fileIds: [1], somethingElse: true })
    ).rejects.toThrow();
  });
});
