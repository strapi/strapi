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
      'component',
      { name: 'content' },
      { mainField: { name: 'content', value: 'something' } }
    );
    expect(normalizedContent).toEqual(true);
  });

  it('extracts content from single components without content', () => {
    const normalizedContent = hasContent(
      'component',
      { name: 'content' },
      { mainField: { name: 'content', value: '' } }
    );
    expect(normalizedContent).toEqual(false);
  });

  it('extracts content from repeatable components with content', () => {
    const normalizedContent = hasContent(
      'component',
      [{ name: 'content_2', value: 'truthy' }],
      { mainField: { name: 'content_2' } },
      { repeatable: true }
    );
    expect(normalizedContent).toEqual(true);
  });

  it('extracts content from repeatable components without content', () => {
    const normalizedContent = hasContent(
      'component',
      [{ name: 'content_2', value: '' }],
      { mainField: { name: 'content_2' } },
      { repeatable: true }
    );
    expect(normalizedContent).toEqual(false);
  });

  it('extracts content from repeatable components without content in the first component', () => {
    const normalizedContent = hasContent(
      'component',
      [{ name: 'content_2', value: '' }, { name: 'content_2', value: 'something' }],
      { mainField: { name: 'content_2' } },
      { repeatable: true }
    );
    expect(normalizedContent).toEqual(false);
  });
});
