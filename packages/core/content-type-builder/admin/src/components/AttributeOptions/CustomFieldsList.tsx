import { Flex, Grid, GridItem, KeyboardNavigable } from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import { useCustomFields, CustomFieldUID } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

import { getTrad } from '../../utils';

import { CustomFieldOption } from './CustomFieldOption';
import { EmptyAttributes } from './EmptyAttributes';

export const CustomFieldsList = () => {
  const { formatMessage } = useIntl();
  const customFields = useCustomFields();
  // TODO change this once useCustomFields is typed (helper-plugin types are solved)
  const registeredCustomFields = Object.entries(customFields.getAll()) as [
    CustomFieldUID,
    CustomFieldOption
  ][];

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
        <Grid gap={3}>
          {sortedCustomFields.map(([uid, customField]) => (
            <GridItem key={uid} col={6}>
              <CustomFieldOption key={uid} customFieldUid={uid} customField={customField} />
            </GridItem>
          ))}
        </Grid>
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
