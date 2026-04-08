import { contentTypes } from '@strapi/utils';
import { addFirstPublishedAtToDraft } from '../first-published-at';

jest.mock('@strapi/utils', () => ({
  contentTypes: {
    hasFirstPublishedAtField: jest.fn(),
  },
}));

const hasFirstPublishedAtField = contentTypes.hasFirstPublishedAtField as jest.Mock;

const contentType = {
  uid: 'api::article.article',
  options: { draftAndPublish: true },
  attributes: {},
} as any;

describe('addFirstPublishedAtToDraft', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the draft unchanged when the feature is disabled', async () => {
    hasFirstPublishedAtField.mockReturnValue(false);
    const draft = { id: 1, title: 'Test' };
    const update = jest.fn();

    const result = await addFirstPublishedAtToDraft(draft, update, contentType);

    expect(result).toBe(draft);
    expect(update).not.toHaveBeenCalled();
  });

  it('should return the draft unchanged when firstPublishedAt is already set', async () => {
    hasFirstPublishedAtField.mockReturnValue(true);
    const draft = { id: 1, title: 'Test', firstPublishedAt: '2024-01-01' };
    const update = jest.fn();

    const result = await addFirstPublishedAtToDraft(draft, update, contentType);

    expect(result).toBe(draft);
    expect(update).not.toHaveBeenCalled();
  });

  it('should not alter firstPublishedAt on a second publish', async () => {
    hasFirstPublishedAtField.mockReturnValue(true);
    const originalDate = '2024-06-15T12:00:00.000Z';
    const draft = {
      id: 1,
      title: 'Test',
      firstPublishedAt: originalDate,
      content: [{ __component: 'blocks.hero', id: 10, heading: 'Hello' }],
    };
    const update = jest.fn();

    const result = await addFirstPublishedAtToDraft(draft, update, contentType);

    expect(result).toBe(draft);
    expect(result.firstPublishedAt).toBe(originalDate);
    expect(update).not.toHaveBeenCalled();
  });

  it('should preserve populated dynamic zone data after setting firstPublishedAt', async () => {
    hasFirstPublishedAtField.mockReturnValue(true);
    const draft = {
      id: 1,
      documentId: 'doc1',
      title: 'Test',
      firstPublishedAt: null,
      content: [
        { __component: 'blocks.hero', id: 10, heading: 'Hello' },
        { __component: 'blocks.text', id: 11, body: 'World' },
      ],
    };
    const update = jest.fn().mockResolvedValue({
      id: 1,
      documentId: 'doc1',
      title: 'Test',
      firstPublishedAt: Date.now(),
    });

    const result = await addFirstPublishedAtToDraft(draft, update, contentType);

    expect(result.content).toEqual(draft.content);
    expect(result.title).toBe('Test');
    expect(result.documentId).toBe('doc1');
    expect(result.firstPublishedAt).toEqual(expect.any(Number));
    expect(update).toHaveBeenCalledWith(draft, {
      data: { firstPublishedAt: expect.any(Number) },
    });
  });

  it('should call update to persist firstPublishedAt in the database', async () => {
    hasFirstPublishedAtField.mockReturnValue(true);
    const draft = { id: 1, firstPublishedAt: null };
    const update = jest.fn().mockResolvedValue({ id: 1 });

    await addFirstPublishedAtToDraft(draft, update, contentType);

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(draft, {
      data: { firstPublishedAt: expect.any(Number) },
    });
  });
});
