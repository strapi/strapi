import { getDisplayedValue } from '../useMainValue';

describe('getDisplayedValue', () => {
  it('returns the mainField value', () => {
    const modifiedData = {
      DeepComplex: [
        {
          Title: 'File',
        },
      ],
    };
    const componentFieldPath = ['DeepComplex', 0];
    const mainField = 'Title';

    const normalizedContent = getDisplayedValue(modifiedData, componentFieldPath, mainField);

    expect(normalizedContent).toEqual('File');
  });
});
