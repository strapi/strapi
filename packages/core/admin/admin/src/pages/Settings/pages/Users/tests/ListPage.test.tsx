import { communityLicenseLimits } from '@tests/mockData';
import { server } from '@tests/server';
import { render, screen } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { ListPage, ListPageCE } from '../ListPage';

describe('Users | ListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show a list of users', async () => {
    const { findByText } = render(<ListPageCE />);

    await findByText('John');
    await findByText('Kai');
  });

  describe('seat limit', () => {
    const originalIsEE = window.strapi.isEE;
    const originalHasSeatLimit = window.strapi.hasSeatLimit;
    let requestedPaths: string[];

    beforeEach(() => {
      window.strapi.isEE = true;
      requestedPaths = [];
      server.events.on('request:start', ({ request }) =>
        requestedPaths.push(new URL(request.url).pathname)
      );
    });

    afterEach(() => {
      server.events.removeAllListeners();
      window.strapi.isEE = originalIsEE;
      window.strapi.hasSeatLimit = originalHasSeatLimit;
    });

    it('renders the Community seat UI for a license without a seat limit', async () => {
      window.strapi.hasSeatLimit = false;

      render(<ListPage />);

      const createButton = await screen.findByRole('button', { name: 'Invite new user' });
      await screen.findByText('John');

      expect(createButton).not.toHaveAttribute('data-testid', 'create-user-button');
      expect(requestedPaths).not.toContain('/admin/license-limit-information');
    });

    it('renders the seat UI of the license under a seat limit', async () => {
      window.strapi.hasSeatLimit = true;
      server.use(
        http.get('/admin/license-limit-information', () =>
          HttpResponse.json({
            data: {
              ...communityLicenseLimits,
              currentActiveUserCount: 6,
              enforcementUserCount: 6,
              permittedSeats: 5,
              shouldNotify: true,
              shouldStopCreate: true,
              licenseLimitStatus: 'OVER_LIMIT',
              type: 'gold',
            },
          })
        )
      );

      render(<ListPage />);

      expect(await screen.findByTestId('create-user-button')).toBeDisabled();
      expect(await screen.findByText('Over seat limit (6/5)')).toBeInTheDocument();
    });
  });
});
