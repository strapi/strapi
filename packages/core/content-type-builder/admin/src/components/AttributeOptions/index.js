/**
 *
 * AttributeOptions
 *
 */

import React from 'react';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { Box } from '@strapi/design-system/Box';
import { Divider } from '@strapi/design-system/Divider';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { KeyboardNavigable } from '@strapi/design-system/KeyboardNavigable';
import { ModalBody } from '@strapi/design-system/ModalLayout';
import { Flex } from '@strapi/design-system/Flex';
import { Stack } from '@strapi/design-system/Stack';
import { Typography } from '@strapi/design-system/Typography';
import { getTrad } from '../../utils';
import AttributeOption from './AttributeOption';

const AttributeOptions = ({ attributes, forTarget, kind }) => {
  const { formatMessage } = useIntl();

  const titleIdSuffix = forTarget.includes('component') ? 'component' : kind;
  const titleId = getTrad(`modalForm.sub-header.chooseAttribute.${titleIdSuffix}`);

  return (
    <ModalBody>
      <Flex paddingBottom={4}>
        <Typography variant="beta" as="h2">
          {formatMessage({ id: titleId, defaultMessage: 'Select a field' })}
        </Typography>
      </Flex>
      <Divider />
      <Box paddingTop={6} paddingBottom={4}>
        <KeyboardNavigable tagName="button">
          <Stack spacing={8}>
            {attributes.map((attributeRow, index) => {
              const key = index;

              return (
                <Grid key={key} gap={0}>
                  {attributeRow.map((attribute, index) => {
                    const isOdd = index % 2 === 1;
                    const paddingLeft = isOdd ? 2 : 0;
                    const paddingRight = isOdd ? 0 : 2;

                    return (
                      <GridItem key={attribute} col={6} style={{ height: '100%' }}>
                        <Box
                          paddingLeft={paddingLeft}
                          paddingRight={paddingRight}
                          paddingBottom={1}
                          style={{ height: '100%' }}
                        >
                          <AttributeOption type={attribute} />
                        </Box>
                      </GridItem>
                    );
                  })}
                </Grid>
              );
            })}
          </Stack>
        </KeyboardNavigable>
      </Box>
    </ModalBody>
  );
};

AttributeOptions.propTypes = {
  attributes: PropTypes.array.isRequired,
  forTarget: PropTypes.string.isRequired,
  kind: PropTypes.string.isRequired,
};

export default AttributeOptions;
