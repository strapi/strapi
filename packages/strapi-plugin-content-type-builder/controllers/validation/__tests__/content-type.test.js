const { validateKind } = require('../content-type');

describe('Content type validator', () => {
  describe('validateKind', () => {
    it('Only allows for single and collection types', async () => {
      await expect(validateKind('wrong')).rejects.toBeDefined();
    });

    it('allows singleType and collectionType', async () => {
      await expect(validateKind('singleType')).resolves.toBe('singleType');
      await expect(validateKind('collectionType')).resolves.toBe(
        'collectionType'
      );
    });

    it('allows undefined', async () => {
      await expect(validateKind()).resolves.toBeUndefined();
    });
  });
});
