import { getMediaAttributes } from '../utils/formatData';

describe('getMediasAttributes util', () => {
  let ctLayout;
  let groupLayouts;

  beforeEach(() => {
    ctLayout = {
      schema: {
        attributes: {
          bool: { type: 'boolean' },
          content: { type: 'wysiwyg' },
          created_at: { type: 'timestamp' },
          date: { type: 'date' },
          enum: { type: 'enumeration', enum: Array(2) },
          fb_cta: {
            required: true,
            type: 'group',
            group: 'cta_facebook',
            repeatable: false,
          },
          id: { type: 'integer' },
          ingredients: {
            type: 'group',
            group: 'ingredients',
            repeatable: true,
            min: 1,
            max: 10,
          },
          json: { type: 'json' },
          linkedTags: {
            attribute: 'tag',
            collection: 'tag',
            column: 'id',
            isVirtual: true,
            relationType: 'manyWay',
            targetModel: 'tag',
            type: 'relation',
          },
          mainIngredient: {
            type: 'group',
            group: 'ingredients',
            repeatable: false,
          },
          mainTag: {
            model: 'tag',
            type: 'relation',
            targetModel: 'tag',
            relationType: 'oneWay',
          },
          manyTags: {
            attribute: 'tag',
            collection: 'tag',
            column: 'id',
            dominant: true,
            isVirtual: true,
            relationType: 'manyToMany',
            targetModel: 'tag',
            type: 'relation',
            via: 'linkedArticles',
          },
          number: { type: 'integer' },
          pic: { type: 'media', multiple: false, required: false },
          pictures: { type: 'media', multiple: true, required: false },
          published: { type: 'boolean' },
          title: {
            type: 'string',
            default: 'soupette',
            required: true,
            unique: true,
          },
          updated_at: { type: 'timestampUpdate' },
        },
      },
    };

    groupLayouts = {
      cta_facebook: {
        schema: {
          attributes: {
            description: { type: 'text' },
            id: { type: 'integer' },
            title: { type: 'string' },
          },
        },
      },
      ingredients: {
        schema: {
          attributes: {
            testMultiple: { type: 'media', multiple: true },
            test: { type: 'media', multiple: false },
            id: { type: 'integer' },
            name: { type: 'string' },
          },
        },
      },
    };
  });

  it('should return an array containing the paths of all the medias attributes', () => {
    const expected = {
      'ingredients.testMultiple': {
        multiple: true,
        isGroup: true,
        repeatable: true,
      },
      'ingredients.test': { multiple: false, isGroup: true, repeatable: true },
      'mainIngredient.testMultiple': {
        multiple: true,
        isGroup: true,
        repeatable: false,
      },
      'mainIngredient.test': {
        multiple: false,
        isGroup: true,
        repeatable: false,
      },
      pic: { multiple: false, isGroup: false, repeatable: false },
      pictures: { multiple: true, isGroup: false, repeatable: false },
    };

    expect(getMediaAttributes(ctLayout, groupLayouts)).toMatchObject(expected);
  });
});
