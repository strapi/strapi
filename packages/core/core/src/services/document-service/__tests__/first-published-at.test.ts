import { contentTypes } from '@strapi/utils';

import { addFirstPublishedAtToDraft } from '../first-published-at';

jest.mock('@strapi/utils', () => ({
  contentTypes: {
    hasFirstPublishedAtField: jest.fn(),
  },
}));

const hasFirstPublishedAtField = contentTypes.hasFirstPublishedAtField as jest.MockedFunction<
  typeof contentTypes.hasFirstPublishedAtField
>;

describe('addFirstPublishedAtToDraft', () => {
  const contentType = { uid: 'api::article.article' } as any;
  const update = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    hasFirstPublishedAtField.mockReturnValue(true);
  });

  it('returns draft unchanged when experimental firstPublishedAt is disabled', async () => {
    hasFirstPublishedAtField.mockReturnValue(false);
    const draft = { id: 1, firstPublishedAt: null, media: { id: 9 } };

    const result = await addFirstPublishedAtToDraft(draft, update, contentType);

    expect(result).toBe(draft);
    expect(update).not.toHaveBeenCalled();
  });

  it('returns draft unchanged when firstPublishedAt is already set', async () => {
    const draft = { id: 1, firstPublishedAt: new Date(), blocks: [] };

    const result = await addFirstPublishedAtToDraft(draft, update, contentType);

    expect(result).toBe(draft);
    expect(update).not.toHaveBeenCalled();
  });

  it('should not alter firstPublishedAt on a second publish', async () => {
    const originalDate = new Date('2024-06-15T12:00:00.000Z');
    const draft = { id: 1, firstPublishedAt: originalDate, blocks: [] };

    const result = await addFirstPublishedAtToDraft(draft, update, contentType);

    expect(result).toBe(draft);
    expect(result.firstPublishedAt).toBe(originalDate);
    expect(result.firstPublishedAt.toISOString()).toBe('2024-06-15T12:00:00.000Z');
    expect(update).not.toHaveBeenCalled();
  });

  it('persists firstPublishedAt via entries.update and returns a new object preserving all populated fields', async () => {
    const dzArray = [{ __component: 'c.c', id: 1 }];
    const mediaObj = { id: 5 };
    const draft = {
      id: 42,
      firstPublishedAt: null as Date | null,
      title: 'x',
      dz: dzArray,
      media: mediaObj,
    };
    update.mockResolvedValue({ id: 42 });

    const result = await addFirstPublishedAtToDraft(draft, update, contentType);

    expect(update).toHaveBeenCalledWith(draft, {
      data: { firstPublishedAt: expect.any(Date) },
    });
    // Returns a new object, not the original draft
    expect(result).not.toBe(draft);
    expect(result.firstPublishedAt).toBeInstanceOf(Date);
    // Original draft is not mutated
    expect(draft.firstPublishedAt).toBeNull();
    // Populated fields are preserved by reference
    expect(result.dz).toBe(dzArray);
    expect(result.media).toBe(mediaObj);
    expect(result.title).toBe('x');
  });
});
