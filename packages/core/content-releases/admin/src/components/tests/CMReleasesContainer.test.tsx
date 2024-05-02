import * as React from 'react';

import { screen, within } from '@testing-library/react';
import { render as renderRTL, server, waitFor } from '@tests/utils';
import { rest } from 'msw';
import { Route, Routes } from 'react-router-dom';

import { CMReleasesContainer } from '../CMReleasesContainer';

jest.mock('@strapi/content-manager/strapi-admin', () => ({
  ...jest.requireActual('@strapi/content-manager/strapi-admin'),
  unstable_useDocument: jest.fn().mockReturnValue({
    schema: {
      options: {
        draftAndPublish: true,
      },
    },
  }),
}));

const render = (
  initialEntries: string[] = ['/content-manager/collection-types/api::article.article/12345']
) =>
  renderRTL(<CMReleasesContainer />, {
    renderOptions: {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <Routes>
          <Route path="/content-manager/:collectionType/:slug/:id" element={children} />
        </Routes>
      ),
    },
    initialEntries,
    userEventOptions: {
      skipHover: true,
    },
  });

describe('CMReleasesContainer', () => {
  beforeAll(() => {
    window.strapi.future = {
      isEnabled: () => true,
    };
  });

  afterAll(() => {
    window.strapi.future = {
      isEnabled: () => false,
    };
  });

  it('should not render the container when creating an entry', async () => {
    render(['/content-manager/collection-types/api::article.article/create']);
    await screen.findByRole('alert');
    await waitFor(() =>
      expect(screen.queryByRole('complementary', { name: 'Releases' })).not.toBeInTheDocument()
    );
  });

  it('should render the container', async () => {
    render();

    const informationBox = await screen.findByRole('complementary', { name: 'Releases' });
    expect(informationBox).toBeInTheDocument();

    const addToReleaseButton = await screen.findByRole('button', { name: 'Add to release' });
    expect(addToReleaseButton).toBeInTheDocument();
  });

  it('should open and close the add to release modal', async () => {
    const { user } = render();

    const addToReleaseButton = await screen.findByRole('button', { name: 'Add to release' });
    await user.click(addToReleaseButton);
    const modalDialog = await screen.findByRole('dialog', { name: 'Add to release' });
    expect(modalDialog).toBeVisible();

    const closeButton = await screen.findByRole('button', { name: 'Close the modal' });
    await user.click(closeButton);
    expect(modalDialog).not.toBeVisible();
  });

  it("should enable the modal's submit button", async () => {
    // Mock the response from the server
    server.use(
      rest.get('/content-releases', (req, res, ctx) => {
        return res(
          ctx.json({
            data: [{ name: 'release1', id: '1', actions: [{ type: 'publish' }] }],
          })
        );
      })
    );

    const { user } = render();

    const addToReleaseButton = await screen.findByRole('button', { name: 'Add to release' });
    await user.click(addToReleaseButton);

    // Select a value received from the server
    const select = await screen.findByRole('combobox', { name: 'Select a release' });
    await user.click(select);
    await user.click(await screen.findByRole('option', { name: 'release1' }));

    const submitButtom = await screen.findByRole('button', { name: 'Continue' });
    expect(submitButtom).toBeEnabled();
  });

  it('should list releases', async () => {
    // Mock the response from the server
    server.use(
      rest.get('/content-releases', (req, res, ctx) => {
        return res(
          ctx.json({
            data: [
              { name: 'release1', id: '1', actions: [{ type: 'publish' }] },
              { name: 'release2', id: '2', actions: [{ type: 'unpublish' }] },
            ],
          })
        );
      })
    );

    render();

    const informationBox = await screen.findByRole('complementary', { name: 'Releases' });
    const release1 = await within(informationBox).findByText('release1');
    const release2 = await within(informationBox).findByText('release2');
    expect(release1).toBeInTheDocument();
    expect(release2).toBeInTheDocument();
  });

  /**
   * TODO: this needs re-implementing without the act warning appearing.
   */
  it.skip('should show the scheduled date for a release', async () => {
    // Mock the response from the server
    server.use(
      rest.get('/content-releases', (req, res, ctx) => {
        return res(
          ctx.json({
            data: [
              {
                name: 'release1',
                id: '1',
                actions: [{ type: 'publish' }],
                scheduledAt: '2024-01-01T10:00:00.000Z',
                timezone: 'Europe/Paris',
              },
            ],
          })
        );
      })
    );

    render();

    await screen.findByRole('complementary', { name: 'Releases' });
    expect(screen.getByText('01/01/2024 at 11:00 (UTC+01:00)')).toBeInTheDocument();
  });
});
