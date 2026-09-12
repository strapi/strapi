import '@testing-library/jest-dom';
import 'jest-styled-components';
import 'whatwg-fetch';
import { act } from '@testing-library/react';

// Note: We set this here because setting it in the config is broken for projects: https://github.com/jestjs/jest/issues/9696
// Also, there are issues with async tests unless it is set at global scope: https://github.com/jestjs/jest/issues/11543
jest.setTimeout(60 * 1000);

/**
 * React Query schedules async notifications which can surface as flaky
 * "not wrapped in act(...)" warnings in CI. In tests, wrap these notifications
 * in `act()` so React sees updates as part of the test lifecycle.
 *
 * This does not affect production behavior.
 */
try {
  const { notifyManager } =
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('@tanstack/react-query') as typeof import('@tanstack/react-query');

  notifyManager.setNotifyFunction((fn) => act(fn));
  notifyManager.setBatchNotifyFunction((fn) => act(fn));
} catch {
  // `@tanstack/react-query` may not be installed for all consumers of @strapi/admin-test-utils.
}
