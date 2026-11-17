import { subject } from '@casl/ability';
import { describe, expect, it } from 'vitest';

import { caslAbilityBuilder } from '..';

describe('caslAbilityBuilder', () => {
  it("keeps CASL's wildcards: manage is every action and all is every subject", () => {
    const builder = caslAbilityBuilder();

    builder.can({ action: 'manage', subject: 'note' });
    builder.can({ action: 'find', subject: null });

    const ability = builder.build();

    expect(ability.can('delete', 'note')).toBe(true);
    expect(ability.can('find', 'article')).toBe(true);
    expect(ability.can('delete', 'article')).toBe(false);
  });

  it('takes other wildcards, so manage and all are ordinary names', () => {
    const builder = caslAbilityBuilder({ anyAction: '\0action', anySubjectType: '\0subject' });

    builder.can({ action: 'manage', subject: 'note' });
    builder.can({ action: 'find', subject: 'all' });

    const ability = builder.build();

    expect(ability.can('manage', 'note')).toBe(true);
    expect(ability.can('delete', 'note')).toBe(false);
    expect(ability.can('find', 'all')).toBe(true);
    expect(ability.can('find', 'note')).toBe(false);
    expect(ability.can('find', 'article')).toBe(false);
  });

  it('reads a rule without a subject as the subject the wildcard names', () => {
    const builder = caslAbilityBuilder({ anySubjectType: '\0subject' });

    builder.can({ action: 'find', subject: null });

    const ability = builder.build();

    expect(ability.can('find', 'note')).toBe(true);
    expect(ability.can('find', 'article')).toBe(true);
    expect(ability.can('delete', 'note')).toBe(false);
  });

  it('keeps its own conditions matcher and its parametrized actions', () => {
    const builder = caslAbilityBuilder({ anyAction: '\0action', anySubjectType: '\0subject' });

    builder.can({
      action: { name: 'find', params: { locale: 'en' } },
      subject: 'note',
      condition: { owner: { $eq: 'u1' } },
    });
    builder.can({ action: 'update', subject: 'note', condition: { tags: { $size: 1 } } });

    const ability = builder.build();

    expect(ability.can({ name: 'find', params: { locale: 'en' } } as never, 'note')).toBe(true);
    expect(ability.can('find?locale=en', subject('note', { owner: 'u1' }))).toBe(true);
    expect(ability.can('find?locale=en', subject('note', { owner: 'u2' }))).toBe(false);
    // `$size` is CASL's own operator; this matcher does not support it and says so
    expect(() => ability.can('update', subject('note', { tags: [1] }))).toThrow(
      /unsupported operator "\$size"/
    );
  });
});
