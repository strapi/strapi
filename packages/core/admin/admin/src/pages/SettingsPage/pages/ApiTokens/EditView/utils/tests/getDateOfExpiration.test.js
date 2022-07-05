import getDateOfExpiration from '../getDateOfExpiration';

const createdAt = '2022-07-05T12:16:56.821Z';
const duration = '7';

describe('ADMIN | Pages | API TOKENS | EditView', () => {
  it('should return a formated date of expiration', () => {
    expect(getDateOfExpiration(createdAt, duration)).toBe('July 12th, 2022');
  });

  it('should return a formated date in french', () => {
    expect(getDateOfExpiration(createdAt, duration, 'fr')).toBe('12 juillet 2022');
  });
});
