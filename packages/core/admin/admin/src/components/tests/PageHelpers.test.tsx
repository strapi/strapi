import { fixtures } from '@strapi/admin-test-utils';
import { render, screen, server } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { Page } from '../PageHelpers';

describe('PageHelpers', () => {
  describe('Loading', () => {
    it('should render an accessible text by default to signify the page is loading', () => {
      render(<Page.Loading />);

      expect(screen.getByText('Loading content.')).toBeInTheDocument();
    });

    it("should render a custom text to signify the page is loading when the 'children' prop is passed", () => {
      render(<Page.Loading>Custom loading text.</Page.Loading>);

      expect(screen.getByText('Custom loading text.')).toBeInTheDocument();
    });
  });

  describe('Error', () => {
    it('should render an error message when an error occurs', () => {
      render(<Page.Error />);

      expect(
        screen.getByText('Whoops! Something went wrong. Please, try again.')
      ).toBeInTheDocument();
    });

    it("should render a custom error message when the 'content' prop is passed and a custom icon when the 'icon' prop is passed", () => {
      render(<Page.Error content="Custom error message." icon={<div>Custom icon</div>} />);

      expect(screen.getByText('Custom error message.')).toBeInTheDocument();
      expect(screen.getByText('Custom icon')).toBeInTheDocument();
    });
  });

  describe('NoPermissions', () => {
    it('should render a message to signify the user does not have the permissions to access the content', () => {
      render(<Page.NoPermissions />);

      expect(
        screen.getByText("You don't have the permissions to access that content")
      ).toBeInTheDocument();
    });

    it("should render a custom message when the 'action' prop is passed", async () => {
      const clickSpy = jest.fn();
      const { user } = render(
        <Page.NoPermissions
          action={
            <button type="button" onClick={clickSpy}>
              click me!
            </button>
          }
        />
      );

      expect(screen.getByRole('button', { name: 'click me!' })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'click me!' }));
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Protect', () => {
    it('should render the children when the user has the permissions to access the content', () => {
      const { container } = render(
        <Page.Protect permissions={fixtures.permissions.contentManager}>
          <div>Content</div>
        </Page.Protect>
      );

      expect(container).toHaveTextContent('Content');
    });

    it('should render the NoPermissions component when the user does not have the permissions to access the content', () => {
      render(
        <Page.Protect permissions={[]}>
          <div>Content</div>
        </Page.Protect>
      );

      expect(
        screen.getByText("You don't have the permissions to access that content")
      ).toBeInTheDocument();
    });

    it("should render the children when an unconditioned permission is granted even if another requested permission's condition fails", async () => {
      server.use(
        http.post<Record<string, never>, { permissions: Array<{ action: string }> }>(
          '/admin/permissions/check',
          async ({ request }) => {
            const body = await request.json();

            return HttpResponse.json({
              data: body.permissions.map(({ action }) => action !== 'admin::roles.update'),
            });
          }
        )
      );

      render(
        <Page.Protect
          permissions={[
            { action: 'admin::roles.read', subject: null },
            { action: 'admin::roles.update', subject: null },
          ]}
        >
          <div>Content</div>
        </Page.Protect>,
        {
          providerOptions: {
            permissions: () => [
              {
                id: 1,
                actionParameters: {},
                action: 'admin::roles.read',
                subject: null,
                conditions: [],
                properties: {},
              },
              {
                id: 2,
                actionParameters: {},
                action: 'admin::roles.update',
                subject: null,
                conditions: ['willFail'],
                properties: {},
              },
            ],
          },
        }
      );

      await screen.findByText('Content');

      server.restoreHandlers();
    });

    it('should render the NoPermissions component when every matching permission has a condition that fails', async () => {
      server.use(http.post('/admin/permissions/check', () => HttpResponse.json({ data: [false] })));

      render(
        <Page.Protect permissions={[{ action: 'admin::roles.update', subject: null }]}>
          <div>Content</div>
        </Page.Protect>,
        {
          providerOptions: {
            permissions: () => [
              {
                id: 1,
                actionParameters: {},
                action: 'admin::roles.update',
                subject: null,
                conditions: ['willFail'],
                properties: {},
              },
            ],
          },
        }
      );

      await screen.findByText("You don't have the permissions to access that content");

      server.restoreHandlers();
    });

    it('should render the children when only one of several conditioned permissions passes', async () => {
      server.use(
        http.post('/admin/permissions/check', () => HttpResponse.json({ data: [true, false] }))
      );

      render(
        <Page.Protect
          permissions={[
            { action: 'admin::roles.read', subject: null },
            { action: 'admin::roles.update', subject: null },
          ]}
        >
          <div>Content</div>
        </Page.Protect>,
        {
          providerOptions: {
            permissions: () => [
              {
                id: 1,
                actionParameters: {},
                action: 'admin::roles.read',
                subject: null,
                conditions: ['willPass'],
                properties: {},
              },
              {
                id: 2,
                actionParameters: {},
                action: 'admin::roles.update',
                subject: null,
                conditions: ['willFail'],
                properties: {},
              },
            ],
          },
        }
      );

      await screen.findByText('Content');

      server.restoreHandlers();
    });
  });
});
