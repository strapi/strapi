import tar from 'tar-stream';
import { createFilePathFactory, createTarEntryStream } from '../utils';

describe('Local File Destination Provider - Utils', () => {
  describe('Create File Path Factory', () => {
    it('returns a function', () => {
      const filePathFactory = createFilePathFactory('entities');
      expect(typeof filePathFactory).toBe('function');
    });
    it('returns a file path when calling a function', () => {
      const type = 'entities';
      const fileIndex = 0;
      const filePathFactory = createFilePathFactory(type);

      const path = filePathFactory(fileIndex);

      expect(path).toBe(`${type}/${type}_0000${fileIndex}.jsonl`);
    });

    describe('returns file paths when calling the factory', () => {
      const cases = [
        ['schemas', 0, 'schemas/schemas_00000.jsonl'],
        ['entities', 5, 'entities/entities_00005.jsonl'],
        ['links', 11, 'links/links_00011.jsonl'],
        ['schemas', 543, 'schemas/schemas_00543.jsonl'],
        ['entities', 5213, 'entities/entities_05213.jsonl'],
        ['links', 33231, 'links/links_33231.jsonl'],
      ];

      test.each(cases)(
        'Given type: %s and fileIndex: %d, returns the right file path: %s',
        (type: any, fileIndex: any, filePath: any) => {
          const filePathFactory = createFilePathFactory(type);

          const path = filePathFactory(fileIndex);

          expect(path).toBe(filePath);
        }
      );
    });
  });
  describe('Create Tar Entry Stream', () => {
    it('Throws an error when the payload is too large', async () => {
      const maxSize = 3;
      const chunk = 'test';
      const archive = tar.pack();
      const pathFactory = createFilePathFactory('entries');
      const tarEntryStream = createTarEntryStream(archive, pathFactory, maxSize);

      const write = async () =>
        await new Promise((resolve, reject) => {
          tarEntryStream.on('finish', resolve);
          tarEntryStream.on('error', reject);
          tarEntryStream.write(chunk);
        });

      await expect(write).rejects.toThrow(`payload too large: ${chunk.length}>${maxSize}`);
    });
    it('Resolves when the payload is smaller than the max size', async () => {
      const maxSize = 30;
      const chunk = 'test';
      const archive = tar.pack();
      const pathFactory = createFilePathFactory('entries');
      const tarEntryStream = createTarEntryStream(archive, pathFactory, maxSize);

      const write = async () =>
        await new Promise((resolve, reject) => {
          tarEntryStream.on('finish', resolve);
          tarEntryStream.on('error', reject);
          tarEntryStream.write(chunk);
        });

      expect(write).resolves;
    });
  });
});
