import ellipsisCardTitle from '../utils/ellipsisCardTitle';

describe('CONTENT MANAGER | ListSettingsView | ellipsisCardTitle', () => {
  it('should return the title without an ellipsis if the title length < 20', () => {
    const title = 'michka';
    const result = ellipsisCardTitle(title);
    const expected = 'michka';

    expect(result).toEqual(expected);
  });

  it('should return the title with an ellipsis if the title length > 20', () => {
    const title = 'michka_des_ronrons_celestes';
    const result = ellipsisCardTitle(title);
    const expected = `${title.substring(0, 20)}...`;

    expect(result).toEqual(expected);
  });
});
