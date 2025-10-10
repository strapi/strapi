import { yup } from '@strapi/utils';
import { isValidName } from '../common';
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
