import fields from '../forms';

describe('forms', () => {
  it('should contain private field in relation input type', () => {
    const { items } = fields.attribute.form.advanced({}, 'relation', null);

    expect(
      items.find(relationItem => relationItem.find(item => item.name === 'private')).length
    ).toBeTruthy();
  });
});
