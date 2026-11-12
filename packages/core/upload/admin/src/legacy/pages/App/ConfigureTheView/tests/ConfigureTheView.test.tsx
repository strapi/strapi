import { useTracking as useStrapiTracking } from '@strapi/admin/strapi-admin';
import { DesignSystemProvider } from '@strapi/design-system';
import { fireEvent, render as renderRTL, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';

import { pageSizes, sortOptions } from '../../../../../constants';
import { useSettings } from '../../../../hooks/useSettings';
import { ConfigureTheView } from '../ConfigureTheView';

import type { Configuration } from '../../../../../../../shared/contracts/configuration';

jest.unmock('../../../../hooks/useTracking');

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useTracking: jest.fn(),
}));

const trackUsage = jest.fn();

const mutateAsync = jest.fn();
jest.mock('../../../../hooks/useConfig', () => ({
  useConfig: jest.fn(() => ({
    mutateConfig: {
      mutateAsync,
    },
  })),
}));

const render = (
  config: Configuration = {
    pageSize: pageSizes[0],
    sort: sortOptions[0].value as Configuration['sort'],
  }
) => ({
  user: userEvent.setup(),
  ...renderRTL(<ConfigureTheView config={config} />, {
    wrapper: ({ children }) => (
      <IntlProvider locale="en" messages={{}}>
        <DesignSystemProvider>
          <MemoryRouter>{children}</MemoryRouter>
        </DesignSystemProvider>
      </IntlProvider>
    ),
  }),
});

describe('Upload - Configure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useStrapiTracking).mockReturnValue({ trackUsage });
    jest.spyOn(window.strapi.featureFlags, 'isEnabled').mockReturnValue(true);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('initial render', () => {
    it('renders and matches the snapshot', () => {
      const { container, getByText } = render();

      expect(getByText('Configure the view - Media Library')).toBeInTheDocument();

      expect(container).toMatchSnapshot();
    });
  });

  describe('save', () => {
    it('save renders and is initially disabled', () => {
      const { getByText, getByRole } = render();

      expect(getByText('Configure the view - Media Library')).toBeInTheDocument();
      expect(
        getByRole('button', {
          name: 'Save',
        })
      ).toBeDisabled();
    });
  });

  describe('user actions', () => {
    const testPageSize = pageSizes[1];

    it.each([true, false])(
      'tracks configuration changes with AI metadata enabled: %s',
      async (aiMetadata) => {
        (useSettings as jest.Mock).mockReturnValue({
          data: { aiMetadata, aiMetadataAvailable: true },
        });
        const { user, getByRole, getByText } = render();

        expect(getByRole('combobox', { name: 'Entries per page' })).toHaveTextContent('10');

        await user.click(getByRole('combobox', { name: 'Entries per page' }));
        await user.click(getByRole('option', { name: testPageSize.toString() }));

        expect(getByRole('combobox', { name: 'Entries per page' })).toHaveTextContent('20');

        expect(
          getByRole('button', {
            name: 'Save',
          })
        ).toBeEnabled();

        /**
         * using `userEvent.click` does not fire the submit event for the form :(
         * see – https://github.com/testing-library/user-event/issues/1075
         * see – https://github.com/testing-library/user-event/issues/1002
         */
        fireEvent.click(
          getByRole('button', {
            name: 'Save',
          })
        );

        await waitFor(() => {
          expect(getByText('This will modify all your settings')).toBeInTheDocument();
        });

        await user.click(getByText('Confirm'));

        expect(trackUsage).toHaveBeenCalledWith('willEditMediaLibraryConfig', {
          mediaLibraryVersion: 'v1',
          isAiMediaLibraryConfigured: aiMetadata,
        });
        expect(mutateAsync).toHaveBeenCalledTimes(1);
        expect(mutateAsync).toHaveBeenCalledWith({
          pageSize: testPageSize,
          sort: 'createdAt:DESC',
        });
      }
    );
  });
});
