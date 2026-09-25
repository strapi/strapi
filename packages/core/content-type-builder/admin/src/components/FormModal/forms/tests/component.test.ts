import { createComponentSchema } from '../../component/createComponentSchema';

describe('component form schema', () => {
  it('allows a component name whose historical collection name is still used', async () => {
    const schema = createComponentSchema(
      ['default.headline'],
      [],
      'default',
      ['components_default_hero_texts'],
      'components_default_hero_texts'
    );

    await expect(
      schema.validate({ displayName: 'Hero Text', category: 'default', icon: 'bold' })
    ).resolves.toMatchObject({ displayName: 'Hero Text', category: 'default' });
  });

  it('still rejects a component UID that is actually in use', async () => {
    const schema = createComponentSchema(
      ['default.hero-text'],
      [],
      'default',
      [],
      'components_default_hero_texts'
    );

    await expect(
      schema.validate({ displayName: 'Hero Text', category: 'default', icon: 'bold' })
    ).rejects.toThrow();
  });
});
