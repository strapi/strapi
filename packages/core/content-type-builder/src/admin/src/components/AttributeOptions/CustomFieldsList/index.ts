import React from 'react';

import { Box, Flex, Grid, GridItem, KeyboardNavigable, Link } from '@strapi/design-system';
import { useCustomFields } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

import { getTrad } from '../../../utils';
import CustomFieldOption from '../CustomFieldOption';
import EmptyAttributes from '../EmptyAttributes';
import getPadding from '../utils/getPadding';

const CustomFieldsList = () => {
  const { formatMessage } = useIntl();
  const customFields = useCustomFields();
  const registeredCustomFields = Object.entries(customFields.getAll());

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

export default CustomFieldsList;
