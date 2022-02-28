import checkIfAttributeIsDisplayable from '../checkIfAttributeIsDisplayable';

describe('CONTENT MANAGER | utils | checkIfAttributeIsDisplayable', () => {
  it('should return false if the relation is morph', () => {
    const attribute = {
      type: 'relation',
      relationType: 'manyMorphToMany',
    };

    expect(checkIfAttributeIsDisplayable(attribute)).toBeFalsy();
  });

  it('should return false if the type is json', () => {
    const attribute = {
      type: 'json',
    };

    expect(checkIfAttributeIsDisplayable(attribute)).toBeFalsy();
  });

  it('should return false if the type is not provided', () => {
    const attribute = {
      type: '',
    };

    expect(checkIfAttributeIsDisplayable(attribute)).toBeFalsy();
  });

  it('should return true if the type is a text', () => {
    const attribute = {
      type: 'text',
    };

    expect(checkIfAttributeIsDisplayable(attribute)).toBeTruthy();
  });
});
