import { GraphQLEnumType } from 'graphql';
import { makeSchema, objectType } from 'nexus';

import createEnumBuilders from '../enums';

const { buildEnumTypeDefinition } = createEnumBuilders();

const membersOf = (definition: ReturnType<typeof buildEnumTypeDefinition>) =>
  (definition as unknown as { config: { members: Record<string, string> } }).config.members;

const graphqlEnumFrom = (name: string, members: string[]) => {
  const definition = buildEnumTypeDefinition({ enum: members }, name);

  return new GraphQLEnumType({
    name,
    values: Object.fromEntries(
      Object.entries(membersOf(definition)).map(([graphqlName, value]) => [graphqlName, { value }])
    ),
  });
};

describe('buildEnumTypeDefinition', () => {
  it.each(['true', 'false', 'null'])(
    'maps GraphQL reserved enum name %s to a valid identifier while keeping the string value',
    (value) => {
      const graphqlEnum = graphqlEnumFrom('StatusEnum', [value]);

      expect(graphqlEnum.getValue(`_${value}`)?.value).toBe(value);
      expect(graphqlEnum.serialize(value)).toBe(`_${value}`);
      expect(graphqlEnum.parseValue(`_${value}`)).toBe(value);
    }
  );

  it('builds a GraphQL schema when an enumeration includes reserved names', () => {
    const definition = buildEnumTypeDefinition(
      { enum: ['true', 'false', 'null', 'draft'] },
      'StatusEnum'
    );

    expect(() =>
      makeSchema({
        types: [
          definition,
          objectType({
            name: 'Query',
            definition(t) {
              t.field('status', { type: 'StatusEnum' });
            },
          }),
        ],
        outputs: false,
      })
    ).not.toThrow();
  });

  it('does not rewrite names that are already valid GraphQL enum identifiers', () => {
    const graphqlEnum = graphqlEnumFrom('StatusEnum', [
      'draft',
      'True',
      'FALSE',
      'Null',
      'yes',
      'no',
      'on',
      'off',
    ]);

    expect(graphqlEnum.serialize('draft')).toBe('draft');
    expect(graphqlEnum.serialize('True')).toBe('True');
    expect(graphqlEnum.serialize('FALSE')).toBe('FALSE');
    expect(graphqlEnum.serialize('Null')).toBe('Null');
    expect(graphqlEnum.serialize('yes')).toBe('yes');
    expect(graphqlEnum.serialize('no')).toBe('no');
    expect(graphqlEnum.serialize('on')).toBe('on');
    expect(graphqlEnum.serialize('off')).toBe('off');
  });

  it('coerces boolean and null JSON values to the same string members as their literals', () => {
    const graphqlEnum = graphqlEnumFrom('FlagEnum', [true, false, null] as unknown as string[]);

    expect(graphqlEnum.serialize('true')).toBe('_true');
    expect(graphqlEnum.serialize('false')).toBe('_false');
    expect(graphqlEnum.serialize('null')).toBe('_null');
  });
});
