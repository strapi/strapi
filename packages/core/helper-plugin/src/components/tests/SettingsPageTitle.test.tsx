import { render, waitFor } from '@tests/utils';

import { SettingsPageTitle } from '../SettingsPageTitle';

describe('settingsPageTitle', () => {
  it('should setting page title', async () => {
    const testTitle = 'Fake';

    render(<SettingsPageTitle name={testTitle} />);

    await waitFor(() => expect(document.title).toBe(`Settings - ${testTitle}`));
  });
});
