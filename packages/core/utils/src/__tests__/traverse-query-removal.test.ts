import { traverseQueryPopulate, traverseQuerySort } from '../traverse';
import { articleModel, getModel } from './test-fixtures';

const options = { schema: articleModel, getModel };

describe('query traversal after removing a string field', () => {
  it.each([
    ['single sort', 'title:asc', undefined],
    ['chained sorts', 'title:asc,id:desc', 'id:desc'],
    ['array of sorts', ['title:asc', 'id:desc'], ['id:desc']],
  ])('removes a forbidden field from %s', async (_label, input, expected) => {
    const result = await traverseQuerySort(
      ({ key }, { remove }) => {
        if (key === 'title') {
          remove(key);
        }
      },
      options,
      input
    );

    expect(result).toEqual(expected);
  });

  it.each([
    ['single populate', 'createdBy', undefined],
    ['nested populate', 'createdBy.email', undefined],
    ['array of populates', ['createdBy.email', 'updatedBy'], ['updatedBy']],
  ])('removes a forbidden relation from %s', async (_label, input, expected) => {
    const result = await traverseQueryPopulate(
      ({ key }, { remove }) => {
        if (key === 'createdBy') {
          remove(key);
        }
      },
      options,
      input
    );

    expect(result).toEqual(expected);
  });
});
