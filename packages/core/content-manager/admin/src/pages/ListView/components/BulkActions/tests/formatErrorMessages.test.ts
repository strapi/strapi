import { formatErrorMessages } from '../PublishAction';

/**
 * A minimal formatMessage stub: returns the defaultMessage as-is.
 * For cases where we want to assert the field is forwarded we inspect the
 * second argument via a spy instead.
 */
const fmt = (msg: { defaultMessage: string }) => msg.defaultMessage;

describe('formatErrorMessages', () => {
  // -------------------------------------------------------------------------
  // Leaf value: MessageDescriptor  { id, defaultMessage }
  // -------------------------------------------------------------------------
  it('formats a single MessageDescriptor leaf at the root', () => {
    const errors = {
      title: { id: 'error.required', defaultMessage: 'This value is required.' },
    };

    expect(formatErrorMessages(errors, '', fmt)).toEqual(['This value is required.']);
  });

  it('formats a single MessageDescriptor leaf with a parent key', () => {
    const errors = {
      name: { id: 'error.required', defaultMessage: 'This value is required.' },
    };

    const calls: Array<[{ id: string; defaultMessage: string }, { field: string }]> = [];
    const spy = (msg: any, values: any) => {
      calls.push([msg, values]);
      return msg.defaultMessage;
    };

    formatErrorMessages(errors, 'component', spy as any);

    expect(calls[0][1]).toEqual({ field: 'component.name' });
  });

  // -------------------------------------------------------------------------
  // Leaf value: plain string
  // -------------------------------------------------------------------------
  it('formats a plain-string error value', () => {
    const errors = { slug: 'This field must be unique.' };

    expect(formatErrorMessages(errors, '', fmt)).toEqual(['This field must be unique.']);
  });

  // -------------------------------------------------------------------------
  // Falsy / nullish values are skipped
  // -------------------------------------------------------------------------
  it('skips null values', () => {
    const errors = { title: null };
    expect(formatErrorMessages(errors as any, '', fmt)).toEqual([]);
  });

  it('skips undefined values', () => {
    const errors = { title: undefined };
    expect(formatErrorMessages(errors as any, '', fmt)).toEqual([]);
  });

  it('returns empty array for null errors argument', () => {
    expect(formatErrorMessages(null as any, '', fmt)).toEqual([]);
  });

  it('returns empty array for undefined errors argument', () => {
    expect(formatErrorMessages(undefined as any, '', fmt)).toEqual([]);
  });

  it('returns empty array for empty errors object', () => {
    expect(formatErrorMessages({}, '', fmt)).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Nested objects (components, dynamic zones)
  // -------------------------------------------------------------------------
  it('recurses into a nested plain object', () => {
    const errors = {
      address: {
        street: { id: 'error.required', defaultMessage: 'Street is required.' },
      },
    };

    expect(formatErrorMessages(errors, '', fmt)).toEqual(['Street is required.']);
  });

  it('builds a dotted path when recursing through nested objects', () => {
    const errors = {
      address: {
        city: { id: 'error.required', defaultMessage: 'City is required.' },
      },
    };

    const calls: Array<{ field: string }> = [];
    const spy = (msg: any, values: any) => {
      calls.push(values);
      return msg.defaultMessage;
    };

    formatErrorMessages(errors, '', spy as any);

    expect(calls[0].field).toBe('address.city');
  });

  it('builds a dotted path from a non-empty parentKey', () => {
    const errors = {
      street: { id: 'error.required', defaultMessage: 'Street is required.' },
    };

    const calls: Array<{ field: string }> = [];
    const spy = (msg: any, values: any) => {
      calls.push(values);
      return msg.defaultMessage;
    };

    formatErrorMessages(errors, 'address', spy as any);

    expect(calls[0].field).toBe('address.street');
  });

  it('recurses deeply through multiple levels', () => {
    const errors = {
      section: {
        block: {
          title: { id: 'error.required', defaultMessage: 'Title is required.' },
        },
      },
    };

    const calls: Array<{ field: string }> = [];
    const spy = (msg: any, values: any) => {
      calls.push(values);
      return msg.defaultMessage;
    };

    formatErrorMessages(errors, '', spy as any);

    expect(calls[0].field).toBe('section.block.title');
  });

  // -------------------------------------------------------------------------
  // Arrays (repeatable components, dynamic zones)
  // -------------------------------------------------------------------------
  it('recurses into array-like indexed objects (repeatable components)', () => {
    const errors = {
      cards: {
        0: { id: 'error.required', defaultMessage: 'Card title is required.' },
        1: { id: 'error.required', defaultMessage: 'Card title is required.' },
      },
    };

    expect(formatErrorMessages(errors, '', fmt)).toEqual([
      'Card title is required.',
      'Card title is required.',
    ]);
  });

  it('builds correct dotted paths for array-indexed entries', () => {
    const errors = {
      'Content.0.cards': {
        id: 'components.Input.error.validation.required',
        defaultMessage: 'This value is required.',
      },
    };

    const calls: Array<{ field: string }> = [];
    const spy = (msg: any, values: any) => {
      calls.push(values);
      return msg.defaultMessage;
    };

    formatErrorMessages(errors, '', spy as any);

    expect(calls[0].field).toBe('Content.0.cards');
  });

  // -------------------------------------------------------------------------
  // Multiple errors at the same level
  // -------------------------------------------------------------------------
  it('collects multiple errors at the same level', () => {
    const errors = {
      title: { id: 'error.required', defaultMessage: 'Title is required.' },
      slug: { id: 'error.unique', defaultMessage: 'Slug must be unique.' },
    };

    expect(formatErrorMessages(errors, '', fmt)).toEqual([
      'Title is required.',
      'Slug must be unique.',
    ]);
  });

  it('collects errors from both leaf and nested keys at the same level', () => {
    const errors = {
      title: { id: 'error.required', defaultMessage: 'Title is required.' },
      meta: {
        description: { id: 'error.required', defaultMessage: 'Description is required.' },
      },
    };

    expect(formatErrorMessages(errors, '', fmt)).toEqual([
      'Title is required.',
      'Description is required.',
    ]);
  });

  // -------------------------------------------------------------------------
  // formatMessage receives the correct id suffix (.withField)
  // -------------------------------------------------------------------------
  it('appends .withField to the id when calling formatMessage', () => {
    const calls: Array<{ id: string }> = [];
    const spy = (msg: any) => {
      calls.push(msg);
      return msg.defaultMessage;
    };

    formatErrorMessages(
      { name: { id: 'error.required', defaultMessage: 'Required.' } },
      '',
      spy as any
    );

    expect(calls[0].id).toBe('error.required.withField');
  });
});
