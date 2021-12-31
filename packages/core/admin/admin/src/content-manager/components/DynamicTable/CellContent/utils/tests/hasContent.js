import hasContent from '../hasContent';

describe('hasContent', () => {
  it('returns true for text content', () => {
    const normalizedContent = hasContent('text', 'content');
    expect(normalizedContent).toEqual(true);
  });

  it('returns false for empty text content', () => {
    const normalizedContent = hasContent('text', '');
    expect(normalizedContent).toEqual(true);
  });

  it('returns false for undefined text content', () => {
    const normalizedContent = hasContent('text', undefined);
    expect(normalizedContent).toEqual(true);
  });

  it('extracts content from single components with content', () => {
    const normalizedContent = hasContent(
      'text',
      { name: 'content' },
      { mainField: 'name' },
      { repeatable: false }
    );
    expect(normalizedContent).toEqual(true);
  });

  it('extracts content from single components without content', () => {
    const normalizedContent = hasContent('text', {}, { mainField: 'name' }, { repeatable: false });
    expect(normalizedContent).toEqual(false);
  });

  it('extracts content from repeatable components with content', () => {
    const normalizedContent = hasContent(
      'text',
      [{ name: 'content' }, { name: 'content_2' }],
      { mainField: 'name' },
      { repeatable: true }
    );
    expect(normalizedContent).toEqual(true);
  });

  it('extracts content from repeatable components without content', () => {
    const normalizedContent = hasContent('text', [], { mainField: 'name' }, { repeatable: true });
    expect(normalizedContent).toEqual(false);
  });
});
