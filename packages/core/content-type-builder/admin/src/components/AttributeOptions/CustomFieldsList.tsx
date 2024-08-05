import { useStrapiApp } from '@strapi/admin/strapi-admin';
import { Flex, Grid, KeyboardNavigable, Link } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTrad } from '../../utils';

import { CustomFieldOption } from './CustomFieldOption';
import { EmptyAttributes } from './EmptyAttributes';

export const CustomFieldsList = () => {
  const { formatMessage } = useIntl();
  const getAllCustomFields = useStrapiApp('CustomFieldsList', (state) => state.customFields.getAll);
  // TODO change this once useCustomFields is typed (helper-plugin types are solved)
  const registeredCustomFields = Object.entries(getAllCustomFields());

  if (!registeredCustomFields.length) {
    return <EmptyAttributes />;
  }

  // Sort the array alphabetically by customField name
  const sortedCustomFields = registeredCustomFields.sort((a, b) =>
    a[1].name > b[1].name ? 1 : -1
  );

  return (
    <KeyboardNavigable tagName="button">
      <Flex direction="column" alignItems="stretch" gap={3}>
        <Grid.Root gap={3}>
          {sortedCustomFields.map(([uid, customField]) => (
            <Grid.Item key={uid} col={6} direction="column" alignItems="stretch">
              <CustomFieldOption key={uid} customFieldUid={uid} customField={customField} />
            </Grid.Item>
          ))}
        </Grid.Root>
        <Link
          href="https://docs.strapi.io/developer-docs/latest/development/custom-fields.html"
          isExternal
        >
          {formatMessage({
            id: getTrad('modalForm.tabs.custom.howToLink'),
            defaultMessage: 'How to add custom fields',
          })}
        </Link>
      </Flex>
    </KeyboardNavigable>
  );
};
