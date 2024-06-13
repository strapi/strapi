import { Form, Layouts, Page } from '@strapi/admin/strapi-admin';
import { Button } from '@strapi/design-system';
import { Check } from '@strapi/icons';
import { useIntl } from 'react-intl';

export const SettingsPage = () => {
  const { formatMessage } = useIntl();
  return (
    <Layouts.Root>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          {
            name: 'Releases',
          }
        )}
      </Page.Title>
      <Page.Main>
        <Form method="PUT">
          <Layouts.Header
            primaryAction={
              <Button disabled={false} loading={false} startIcon={<Check />} type="submit" size="L">
                {formatMessage({
                  id: 'global.save',
                  defaultMessage: 'Save',
                })}
              </Button>
            }
            title={formatMessage({
              id: 'content-releases.pages.Settings.releases.title',
              defaultMessage: 'Releases',
            })}
            subtitle={formatMessage({
              id: 'content-releases.pages.Settings.releases.description',
              defaultMessage: 'Create and manage content updates',
            })}
          />
          <Layouts.Content>
            <div>TODO: define the Settings page content (not part of this US)</div>
          </Layouts.Content>
        </Form>
      </Page.Main>
    </Layouts.Root>
  );
};
