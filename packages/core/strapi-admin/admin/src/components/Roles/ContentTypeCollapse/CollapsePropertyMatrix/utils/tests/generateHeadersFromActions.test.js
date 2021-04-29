import generateHeadersFromActions from '../generateHeadersFromActions';

describe('ADMIN | COMPONENTS | Permissions | CollapsePropertyMatrix | utils', () => {
  it('should set isActionRelatedToCurrentProperty key to false when the applyToProperties is not an array', () => {
    const data = [{ label: 'test' }, { label: 'test1' }];
    const expected = [
      { label: 'test', isActionRelatedToCurrentProperty: false, actionId: undefined },
      { label: 'test1', isActionRelatedToCurrentProperty: false, actionId: undefined },
    ];

    expect(generateHeadersFromActions(data, 'test')).toEqual(expected);
  });

  it('should set isActionRelatedToCurrentProperty key to false when the propertyName is not in the applyToProperties array', () => {
    const data = [
      { label: 'test', applyToProperties: ['foo'], actionId: 'test' },
      { label: 'test1', applyToProperties: ['foo'], actionId: 'test' },
    ];
    const expected = [
      { label: 'test', isActionRelatedToCurrentProperty: false, actionId: 'test' },
      { label: 'test1', isActionRelatedToCurrentProperty: false, actionId: 'test' },
    ];

    expect(generateHeadersFromActions(data, 'test')).toEqual(expected);
  });

  it('should set isActionRelatedToCurrentProperty key to false when the isDisplayed key is falsy', () => {
    const data = [
      { label: 'test', isDisplayed: false, actionId: 'test' },
      { label: 'test1', isDisplayed: false, actionId: 'test' },
    ];
    const expected = [
      { label: 'test', isActionRelatedToCurrentProperty: false, actionId: 'test' },
      { label: 'test1', isActionRelatedToCurrentProperty: false, actionId: 'test' },
    ];

    expect(generateHeadersFromActions(data, 'test')).toEqual(expected);
  });

  it('should set the isActionRelatedToCurrentProperty key to true when isDisplayed is truthy and the propertyName is in the applyToProperties array', () => {
    const data = [
      { label: 'test', isDisplayed: true, applyToProperties: ['test'], actionId: 'test' },
      { label: 'test1', isDisplayed: false, applyToProperties: ['test'], actionId: 'test' },
    ];
    const expected = [
      { label: 'test', isActionRelatedToCurrentProperty: true, actionId: 'test' },
      { label: 'test1', isActionRelatedToCurrentProperty: false, actionId: 'test' },
    ];

    expect(generateHeadersFromActions(data, 'test')).toEqual(expected);
  });
});
