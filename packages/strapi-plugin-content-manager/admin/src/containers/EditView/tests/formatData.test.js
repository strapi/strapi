import {
  cleanData,
  getMediaAttributes,
  helperCleanData,
} from '../utils/formatData';
import { ctLayout, groupLayouts, simpleCtLayout } from './data';

describe('Content Manager | EditView | utils | cleanData', () => {
  let simpleContentTypeLayout;
  let contentTypeLayout;
  let grpLayouts;

  beforeEach(() => {
    simpleContentTypeLayout = simpleCtLayout;
    contentTypeLayout = ctLayout;
    grpLayouts = groupLayouts;
  });

  it('should format de data correctly if the content type has no group and no file has been added', () => {
    const data = {
      title: 'test',
      article: {
        id: 1,
        name: 'test',
      },
      articles: [
        {
          id: 1,
          name: 'test',
        },
        {
          id: 2,
          name: 'test1',
        },
      ],
      picture: {
        id: 4,
        url: '/something-test',
        ext: 'unknown',
      },

      pictures: [
        {
          id: 1,
          url: '/something',
          ext: 'jpg',
        },
        {
          id: 2,
          url: '/something-else',
          ext: 'png',
        },
      ],
    };
    const expected = {
      title: 'test',
      article: 1,
      articles: [1, 2],
      picture: 4,
      pictures: [1, 2],
    };

    expect(cleanData(data, simpleContentTypeLayout, grpLayouts)).toEqual(
      expected
    );
  });

  it('should format the datac correctly when there is a repeatable and a non repeatable field', () => {
    const data = {
      bool: 'test',
      content: 'test',
      date: null,
      enum: 'un',
      fb_cta: {
        description: 'something cool',
        title: 'test',
      },
      ingredients: [
        {
          testMultiple: [
            {
              id: 3,
              url: '/test-test',
            },
            new File([''], 'test', { type: 'text/html' }),
          ],
          test: null,
          name: 'Super name',
        },
      ],
      linkedTags: [
        {
          name: 'test',
          id: 1,
        },
      ],
      mainIngredient: {
        name: 'another name',
      },
      mainTag: {
        name: 'test1',
        id: 2,
      },
      manyTags: [
        {
          name: 'test4',
          id: 4,
        },
      ],
      number: 1,
      pic: new File([''], 'test1', { type: 'text/html' }),
      pictures: [
        {
          id: 1,
          url: '/test',
        },
        new File([''], 'test2', { type: 'text/html' }),
      ],
      published: true,
      title: 'test',
    };
    const expected = {
      bool: 'test',
      content: 'test',
      date: null,
      enum: 'un',
      fb_cta: {
        description: 'something cool',
        title: 'test',
      },
      ingredients: [
        {
          testMultiple: [3],
          test: null,
          name: 'Super name',
        },
      ],
      linkedTags: [1],
      mainIngredient: {
        name: 'another name',
      },
      mainTag: 2,
      manyTags: [4],
      number: 1,
      pic: null,
      pictures: [1],
      published: true,
      title: 'test',
    };

    expect(cleanData(data, contentTypeLayout, groupLayouts)).toEqual(expected);
  });
});

describe('Content Manager | EditView | utils | helperCleanData', () => {
  let data;

  beforeEach(() => {
    data = {
      test: 'something',
      object: {
        id: 1,
        test: 'test',
        other: 'test',
      },
      array: [
        {
          id: 2,
          test: 'test',
          other: 'test',
        },
        {
          id: 3,
          test: 'test1',
          other: 'test1',
        },
        {
          id: 4,
          test: 'test2',
          other: 'test2',
        },
      ],
      other: 'super cool',
    };
  });
  it('should return the value if it is not an object', () => {
    expect(helperCleanData(data.test, 'id')).toEqual('something');
  });

  it('should return the id of an object', () => {
    expect(helperCleanData(data.object, 'id')).toEqual(1);
  });

  it('should return an array with the ids of each elements if an array of objects is given', () => {
    expect(helperCleanData(data.array, 'id')).toEqual([2, 3, 4]);
  });

  it('should return an array with the objects if the key does not exist', () => {
    expect(helperCleanData(data.array, 'something')).toEqual(data.array);
  });
});

describe('Content Manager | EditView | utils | getMediasAttributes', () => {
  let contentTypeLayout;
  let grpLayouts;

  beforeEach(() => {
    contentTypeLayout = ctLayout;
    grpLayouts = groupLayouts;
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

    expect(getMediaAttributes(contentTypeLayout, grpLayouts)).toMatchObject(
      expected
    );
  });
});
