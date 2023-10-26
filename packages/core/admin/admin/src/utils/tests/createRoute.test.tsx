/* eslint-disable check-file/filename-naming-convention */

import { createRoute } from '../createRoute';

describe('ADMIN | CONTAINER | SettingsPage | utils | createRoute', () => {
  it('should return a <Route /> with the correctProps', () => {
    const {
      props: { path, exact },
      key,
    } = createRoute(() => Promise.resolve({ default: () => <div>test</div> }), '/test', true);

    expect(key).toEqual('/test');
    expect(exact).toBeTruthy();
    expect(path).toEqual('/test');
  });
});
