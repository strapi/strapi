import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import { screen, within } from '@testing-library/react';
import { render, server } from '@tests/utils';
import { rest } from 'msw';

import { CMReleasesContainer } from '../CMReleasesContainer';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  // eslint-disable-next-line
  CheckPermissions: ({ children }: { children: JSX.Element }) => <div>{children}</div>,
  useCMEditViewDataManager: jest.fn().mockReturnValue({
    isCreatingEntry: false,
    allLayoutData: {
      contentType: {
        uid: 'api::article.article',
        options: {
          draftAndPublish: true,
        },
      },
    },
  }),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn().mockReturnValue({ id: '1' }),
}));

describe('CMReleasesContainer', () => {
  it('should not render the container when creating an entry', () => {
    // @ts-expect-error - Ignore error
    useCMEditViewDataManager.mockReturnValueOnce({
      isCreatingEntry: true,
      allLayoutData: {
        contentType: {
          options: {
            draftAndPublish: true,
          },
        },
      },
    });

    render(<CMReleasesContainer />);

    const informationBox = screen.queryByRole('complementary', { name: 'Releases' });
    expect(informationBox).not.toBeInTheDocument();
  });

  it('should not render the container without draft and publish enabled', async () => {
    // @ts-expect-error - Ignore error
    useCMEditViewDataManager.mockReturnValueOnce({
      isCreatingEntry: false,
      allLayoutData: {
        contentType: {
          options: {
            draftAndPublish: false,
          },
        },
      },
    });

    render(<CMReleasesContainer />);

    const informationBox = screen.queryByRole('complementary', { name: 'Releases' });
    expect(informationBox).not.toBeInTheDocument();
  });

  it('should render the container', async () => {
    render(<CMReleasesContainer />);

    const informationBox = screen.getByRole('complementary', { name: 'Releases' });
    const addToReleaseButton = await screen.findByRole('button', { name: 'Add to release' });
    expect(informationBox).toBeInTheDocument();
    expect(addToReleaseButton).toBeInTheDocument();
  });

  it('should open and close the add to release modal', async () => {
    const { user } = render(<CMReleasesContainer />);

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

    const { user } = render(<CMReleasesContainer />);

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

    render(<CMReleasesContainer />);

    const informationBox = await screen.findByRole('complementary', { name: 'Releases' });
    const release1 = await within(informationBox).findByText('release1');
    const release2 = await within(informationBox).findByText('release2');
    expect(release1).toBeInTheDocument();
    expect(release2).toBeInTheDocument();
  });
});
