import { screen, within } from '@testing-library/react';
import { render as renderRTL, server, waitFor } from '@tests/utils';
import { rest } from 'msw';
import { Route, Routes } from 'react-router-dom';

import { CMReleasesContainer } from '../CMReleasesContainer';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  // eslint-disable-next-line
  CheckPermissions: ({ children }: { children: JSX.Element }) => <div>{children}</div>,
}));

const render = (
  initialEntries: string[] = ['/content-manager/collection-types/api::article.article/12345']
) =>
  renderRTL(<CMReleasesContainer />, {
    renderOptions: {
      wrapper: ({ children }) => (
        <Routes>
          <Route path="/content-manager/:collectionType/:slug/:id" element={children} />
        </Routes>
      ),
    },
    initialEntries,
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

    await waitFor(() =>
      expect(screen.queryByRole('complementary', { name: 'Releases' })).not.toBeInTheDocument()
    );
  });

  it('should render the container', async () => {
    render();

    const informationBox = screen.getByRole('complementary', { name: 'Releases' });
    const addToReleaseButton = await screen.findByRole('button', { name: 'Add to release' });
    expect(informationBox).toBeInTheDocument();
    expect(addToReleaseButton).toBeInTheDocument();
  });

  it('should open and close the add to release modal', async () => {
    const { user } = render();

    const addToReleaseButton = screen.getByRole('button', { name: 'Add to release' });
    await user.click(addToReleaseButton);
    const modalDialog = screen.getByRole('dialog', { name: 'Add to release' });
    expect(modalDialog).toBeVisible();

    const closeButton = screen.getByRole('button', { name: 'Close the modal' });
    await user.click(closeButton);
    expect(modalDialog).not.toBeVisible();
  });

  it("should enable the modal's submit button", async () => {
    // Mock the response from the server
    server.use(
      rest.get('/content-releases', (req, res, ctx) => {
        return res(
          ctx.json({
            data: [{ name: 'release1', id: '1', action: { type: 'publish' } }],
          })
        );
      })
    );

    const { user } = render();

    const addToReleaseButton = screen.getByRole('button', { name: 'Add to release' });
    await user.click(addToReleaseButton);

    // Select a value received from the server
    const select = screen.getByRole('combobox', { name: 'Select a release' });
    await user.click(select);
    await user.click(screen.getByRole('option', { name: 'release1' }));

    const submitButtom = screen.getByRole('button', { name: 'Continue' });
    expect(submitButtom).toBeEnabled();
  });

  it('should list releases', async () => {
    // Mock the response from the server
    server.use(
      rest.get('/content-releases', (req, res, ctx) => {
        return res(
          ctx.json({
            data: [
              { name: 'release1', id: '1', action: { type: 'publish' } },
              { name: 'release2', id: '2', action: { type: 'unpublish' } },
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

  it('should show the scheduled date for a release', async () => {
    // Mock the response from the server
    server.use(
      rest.get('/content-releases', (req, res, ctx) => {
        return res(
          ctx.json({
            data: [
              {
                name: 'release1',
                id: '1',
                action: { type: 'publish' },
                scheduledAt: '2024-01-01T10:00:00.000Z',
                timezone: 'Europe/Paris',
              },
            ],
          })
        );
      })
    );

    render();

    const informationBox = await screen.findByRole('complementary', { name: 'Releases' });
    const release1 = await within(informationBox).findByText('01/01/2024 at 11:00 (UTC+01:00)');
    expect(release1).toBeInTheDocument();
  });
});
