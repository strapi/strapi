import { getAdminUserAuthor } from '../authors';

describe('getAdminUserAuthor', () => {
  it.each([
    ['the username', { username: 'kai', firstname: 'Kai', lastname: 'Doe' }, 'kai'],
    ['the full name without a username', { firstname: 'Kai', lastname: 'Doe' }, 'Kai Doe'],
    ['the email without a username or a first name', {}, 'kai@test.com'],
  ])('names the admin user with %s', (_, names, name) => {
    expect(getAdminUserAuthor({ id: 1, email: 'kai@test.com', ...names })).toEqual({
      type: 'person',
      name,
      model: 'admin::user',
      id: '1',
    });
  });
});
