import { DesignSystemProvider } from '@strapi/design-system';
import { fireEvent, render as renderTL, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';

import { FromUrlForm } from '../FromUrlForm';

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  getFetchClient: jest.fn().mockReturnValue({
    get: jest.fn(),
  }),
}));

const messages = {
  'components.Input.error.validation.max': 'The value is too high (max: {max}).',
  'upload.form.upload-url.error.url.invalids': '{number} URLs are invalids',
};

const render = () =>
  renderTL(
    <IntlProvider locale="en" messages={messages}>
      <DesignSystemProvider>
        <FromUrlForm onClose={jest.fn()} onAddAsset={jest.fn()} />
      </DesignSystemProvider>
    </IntlProvider>
  );

const submitUrls = async (user: ReturnType<typeof userEvent.setup>, urls: string) => {
  await user.click(screen.getByRole('textbox'));
  await user.paste(urls);
  // jsdom does not submit the form when the `Modal.Footer` button is clicked, so submit it directly.
  // eslint-disable-next-line testing-library/no-node-access
  fireEvent.submit(screen.getByRole('textbox').closest('form')!);
};

describe('FromUrlForm', () => {
  /**
   * Regression tests for strapi/strapi#19030: the validation messages interpolate values,
   * so a missing `values` payload makes react-intl render the raw ICU placeholder.
   */
  it('interpolates the maximum number of urls in the error message', async () => {
    const user = userEvent.setup();
    render();

    await submitUrls(
      user,
      Array.from({ length: 21 }, (_, i) => `https://strapi.io/${i}.png`).join('\n')
    );

    expect(await screen.findByText('The value is too high (max: 20).')).toBeInTheDocument();
    expect(screen.queryByText(/\{max\}/)).not.toBeInTheDocument();
  });

  it('interpolates the number of invalid urls in the error message', async () => {
    const user = userEvent.setup();
    render();

    await submitUrls(user, ['not-a-url', 'me-neither'].join('\n'));

    expect(await screen.findByText('2 URLs are invalids')).toBeInTheDocument();
    expect(screen.queryByText(/\{number\}/)).not.toBeInTheDocument();
  });
});
