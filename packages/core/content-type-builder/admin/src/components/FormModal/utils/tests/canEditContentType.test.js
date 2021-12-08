import canEditContentType from '../canEditContentType';
import rawData from './rawData';

describe('canEditContentType', () => {
  it('should allow content type edition if one of attributes is a oneWay or manyWay relation', () => {
    const { postContentType } = rawData;

    expect(
      canEditContentType(postContentType, {
        kind: 'singleType',
      })
    ).toBeTruthy();
  });

  it('should not allow content type edition if one of attributes is not oneWay or manyWay relation', () => {
    const { articleContentType } = rawData;

    expect(
      canEditContentType(articleContentType, {
        kind: 'singleType',
      })
    ).toBeFalsy();
  });

  it('should always allow content type edition if content type is a single type', () => {
    const { homeSingleType } = rawData;

    expect(
      canEditContentType(homeSingleType, {
        kind: 'collectionType',
      })
    ).toBeTruthy();
  });

  it('should always allow content type edition if the kind is not modified', () => {
    const { articleContentType } = rawData;

    expect(
      canEditContentType(articleContentType, {
        kind: 'collectionType',
      })
    ).toBeTruthy();
  });
});
