import hasContent from '../hasContent';

describe('hasContent', () => {
  it('returns true for text content', () => {
    const normalizedContent = hasContent('text', 'content');
    expect(normalizedContent).toEqual(true);
  });

  it('returns false for empty text content', () => {
    const normalizedContent = hasContent('text', '');
    expect(normalizedContent).toEqual(false);
  });

  it('returns false for undefined text content', () => {
    const normalizedContent = hasContent('text', undefined);
    expect(normalizedContent).toEqual(false);
  });

  it('extracts content from single components with content', () => {
    const normalizedContent = hasContent(
      'component',
      { name: 'content', id: 1 },
      { mainField: { name: 'name' } }
    );
    expect(normalizedContent).toEqual(true);
  });

  it('extracts content from single components without content', () => {
    const normalizedContent = hasContent(
      'component',
      { name: '', id: 1 },
      { mainField: { name: 'name' } }
    );
    expect(normalizedContent).toEqual(false);
  });

  it('extracts content from repeatable components with content', () => {
    const normalizedContent = hasContent(
      'component',
      [{ name: 'content_2', value: 'truthy', id: 1 }],
      { mainField: { name: 'content_2' } },
      { repeatable: true }
    );
    expect(normalizedContent).toEqual(true);
  });

  it('extracts content from repeatable components without content', () => {
    const normalizedContent = hasContent(
      'component',
      [{ name: 'content_2', value: '', id: 1 }],
      { mainField: { name: 'content_2' } },
      { repeatable: true }
    );
    expect(normalizedContent).toEqual(true);
  });

  it('extracts content from repeatable components without content', () => {
    const normalizedContent = hasContent(
      'component',
      [{ id: 1 }, { id: 2 }],
      { mainField: { name: 'content_2' } },
      { repeatable: true }
    );
    expect(normalizedContent).toEqual(true);
  });

  it('extracts content from repeatable components without content', () => {
    const normalizedContent = hasContent(
      'component',
      [],
      { mainField: { name: 'content_2' } },
      { repeatable: true }
    );
    expect(normalizedContent).toEqual(false);
  });

  it('extracts content from multiple relations with content', () => {
    const normalizedContent = hasContent('relation', { count: 1 }, undefined, {
      relation: 'manyToMany',
    });
    expect(normalizedContent).toEqual(true);
  });

  it('extracts content from multiple relations without content', () => {
    const normalizedContent = hasContent('relation', { count: 0 }, undefined, {
      relation: 'manyToMany',
    });
    expect(normalizedContent).toEqual(false);
  });

  it('extracts content from single relations with content', () => {
    const normalizedContent = hasContent('relation', { id: 1 }, undefined, {
      relation: 'oneToOne',
    });
    expect(normalizedContent).toEqual(true);
  });

  it('extracts content from single relations without content', () => {
    const normalizedContent = hasContent('relation', null, undefined, {
      relation: 'oneToOne',
    });
    expect(normalizedContent).toEqual(false);
  });

  it('returns oneToManyMorph relations as false with content', () => {
    const normalizedContent = hasContent('relation', { id: 1 }, undefined, {
      relation: 'oneToManyMorph',
    });
    expect(normalizedContent).toEqual(false);
  });

  it('extracts content from oneToManyMorph relations with content', () => {
    const normalizedContent = hasContent('relation', { id: 1 }, undefined, {
      relation: 'oneToOneMorph',
    });
    expect(normalizedContent).toEqual(true);
  });

  it('extracts content from oneToManyMorph relations with content', () => {
    const normalizedContent = hasContent('relation', null, undefined, {
      relation: 'oneToOneMorph',
    });
    expect(normalizedContent).toEqual(false);
  });
});
