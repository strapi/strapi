import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import { screen } from '@testing-library/react';
import { render, server } from '@tests/utils';
import { rest } from 'msw';

import { CMReleasesInectionZone } from '../CMReleasesInjectionZone';

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

describe('CMReleasesInjectionZone', () => {
  it('should not render the injection zone when creating an entry', async () => {
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

    render(<CMReleasesInectionZone />);
    const informationBox = screen.queryByRole('complementary', { name: 'Releases' });

    expect(informationBox).not.toBeInTheDocument();
  });

  it('should not render the injection zone without draft and publish enabled', async () => {
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

    render(<CMReleasesInectionZone />);
    const informationBox = screen.queryByRole('complementary', { name: 'Releases' });

    expect(informationBox).not.toBeInTheDocument();
  });

  it('should render the injection zone', () => {
    render(<CMReleasesInectionZone />);

    const addToReleaseButton = screen.getByRole('button', { name: 'Add to release' });
    const informationBox = screen.getByRole('complementary', { name: 'Releases' });

    expect(informationBox).toBeInTheDocument();
    expect(addToReleaseButton).toBeInTheDocument();
  });

  it('should open and close the add to release modal', async () => {
    const { user } = render(<CMReleasesInectionZone />);

    const addToReleaseButton = screen.getByRole('button', { name: 'Add to release' });
    await user.click(addToReleaseButton);

    const modalDialog = screen.getByRole('dialog', { name: 'Add to release' });
    const closeButton = screen.getByRole('button', { name: 'Close the modal' });

    expect(modalDialog).toBeVisible();
    await user.click(closeButton);
    expect(modalDialog).not.toBeVisible();
  });

  it("should enable the modal's submit button", async () => {
    // Mock the response from the server
    server.use(
      rest.get('/content-releases', (req, res, ctx) => {
        return res(
          ctx.json({
            data: [{ name: 'release1', id: '1' }],
          })
        );
      })
    );

    const { user } = render(<CMReleasesInectionZone />);

    const addToReleaseButton = screen.getByRole('button', { name: 'Add to release' });
    await user.click(addToReleaseButton);

    // Select a value received from the server
    const select = screen.getByRole('combobox', { name: 'Select a release' });
    await user.click(select);
    await user.click(screen.getByRole('option', { name: 'release1' }));

    const submitButtom = screen.getByRole('button', { name: 'Continue' });
    expect(submitButtom).toBeEnabled();
  });
});
