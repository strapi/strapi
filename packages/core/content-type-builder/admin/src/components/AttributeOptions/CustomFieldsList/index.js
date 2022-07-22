import React from 'react';
import { useCustomFields } from '@strapi/helper-plugin';
import { Box } from '@strapi/design-system/Box';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { KeyboardNavigable } from '@strapi/design-system/KeyboardNavigable';
import { Stack } from '@strapi/design-system/Stack';
import { Link } from '@strapi/design-system/Link';
import { useIntl } from 'react-intl';
import EmptyAttributes from '../EmptyAttributes';
import CustomFieldOption from '../CustomFieldOption';
import getPadding from '../utils/getPadding';
import { getTrad } from '../../../utils';

const HOW_TO_CUSTOM_FIELDS_DOCS_LINK =
  'https://docs.strapi.io/developer-docs/latest/getting-started/introduction.html';

const CustomFieldsList = () => {
  const { formatMessage } = useIntl();
  const customFields = useCustomFields();
  const registeredCustomFields = Object.entries(customFields.getAll());

  if (!registeredCustomFields.length) return <EmptyAttributes />;

  // Sort the array alphabetically by customField name
  const sortedCustomFields = registeredCustomFields.sort((a, b) =>
    a[1].name > b[1].name ? 1 : -1
  );

  return (
    <KeyboardNavigable tagName="button">
      <Stack spacing={3}>
        <Grid gap={0}>
          {sortedCustomFields.map(([uid, customField], index) => {
            const { paddingLeft, paddingRight } = getPadding(index);

            return (
              <GridItem key={uid} col={6} style={{ height: '100%' }}>
                <Box
                  paddingLeft={paddingLeft}
                  paddingRight={paddingRight}
                  paddingBottom={1}
                  style={{ height: '100%' }}
                >
                  <CustomFieldOption key={uid} customFieldUid={uid} customField={customField} />
                </Box>
              </GridItem>
            );
          })}
        </Grid>
        <Link href={HOW_TO_CUSTOM_FIELDS_DOCS_LINK} isExternal>
          {formatMessage({
            id: getTrad('modalForm.tabs.custom.howToLink'),
            defaultMessage: 'How to add custom fields',
          })}
        </Link>
      </Stack>
    </KeyboardNavigable>
  );
};

export default CustomFieldsList;
