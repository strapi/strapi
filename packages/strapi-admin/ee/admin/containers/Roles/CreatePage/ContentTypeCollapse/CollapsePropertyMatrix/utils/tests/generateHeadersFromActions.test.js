import generateHeadersFromActions from '../generateHeadersFromActions';

describe('ADMIN | COMPONENTS | Permissions | CollapsePropertyMatrix | utils', () => {
  it('should set isActionRelatedToCurrentProperty key to false if the applyToProperties is not an array', () => {
    const data = [{ label: 'test' }, { label: 'test1' }];
    const expected = [
      { label: 'test', isActionRelatedToCurrentProperty: false },
      { label: 'test1', isActionRelatedToCurrentProperty: false },
    ];

    expect(generateHeadersFromActions(data, 'test')).toEqual(expected);
  });

  it('should set isActionRelatedToCurrentProperty key to false if the propertyName is not in the applyToProperties array', () => {
    const data = [
      { label: 'test', applyToProperties: ['foo'] },
      { label: 'test1', applyToProperties: ['foo'] },
    ];
    const expected = [
      { label: 'test', isActionRelatedToCurrentProperty: false },
      { label: 'test1', isActionRelatedToCurrentProperty: false },
    ];

    expect(generateHeadersFromActions(data, 'test')).toEqual(expected);
  });

  it('should set isActionRelatedToCurrentProperty key to false if the isDisplayed key is falsy', () => {
    const data = [
      { label: 'test', isDisplayed: false },
      { label: 'test1', isDisplayed: false },
    ];
    const expected = [
      { label: 'test', isActionRelatedToCurrentProperty: false },
      { label: 'test1', isActionRelatedToCurrentProperty: false },
    ];

    expect(generateHeadersFromActions(data, 'test')).toEqual(expected);
  });

  it('should set the isActionRelatedToCurrentProperty key to true if isDisplayed is truthy and the propertyName is in the applyToProperties array', () => {
    const data = [
      { label: 'test', isDisplayed: true, applyToProperties: ['test'] },
      { label: 'test1', isDisplayed: false, applyToProperties: ['test'] },
    ];
    const expected = [
      { label: 'test', isActionRelatedToCurrentProperty: true },
      { label: 'test1', isActionRelatedToCurrentProperty: false },
    ];

    expect(generateHeadersFromActions(data, 'test')).toEqual(expected);
  });
});
