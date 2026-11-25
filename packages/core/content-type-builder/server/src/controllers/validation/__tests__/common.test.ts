import { yup } from '@strapi/utils';
import { isValidCategoryName, isValidName } from '../common';
import type { CommonTestConfig } from '../common';

function runTest(test: CommonTestConfig, value: string) {
  return () => yup.string().test(test).validateSync(value);
}

describe('isValidName', () => {
  test('Validates names', () => {
    expect(runTest(isValidName, '89121')).toThrow();
    expect(runTest(isValidName, '_zada')).toThrow();
    expect(runTest(isValidName, 'AZopd azd a*$')).toThrow();
    expect(runTest(isValidName, 'azda-azdazd')).toThrow();
    expect(runTest(isValidName, '')).not.toThrow();

    expect(runTest(isValidName, 'SomeValidName')).not.toThrow();
    expect(runTest(isValidName, 'Some_azdazd_azdazd')).not.toThrow();
    expect(runTest(isValidName, 'Som122e_azdazd_azdazd')).not.toThrow();
  });
});

describe('isValidCategoryName', () => {
  test('validates category names', () => {
    expect(runTest(isValidCategoryName, '123test')).toThrow();
    expect(runTest(isValidCategoryName, 'my category')).toThrow();
    expect(runTest(isValidCategoryName, '_category')).toThrow();
    expect(runTest(isValidCategoryName, 'category!')).toThrow();
    expect(runTest(isValidCategoryName, '')).not.toThrow();

    expect(runTest(isValidCategoryName, 'default')).not.toThrow();
    expect(runTest(isValidCategoryName, 'question-items')).not.toThrow();
    expect(runTest(isValidCategoryName, 'my_category')).not.toThrow();
    expect(runTest(isValidCategoryName, 'myCategory123')).not.toThrow();
  });

  test('returns a human-readable error message', () => {
    expect(() => yup.string().test(isValidCategoryName).validateSync('123test')).toThrow(
      'must start with a letter and only contain letters, numbers, dashes and underscores'
    );
  });
});
