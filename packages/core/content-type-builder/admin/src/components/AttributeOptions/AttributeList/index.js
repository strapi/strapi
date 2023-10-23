import React from 'react';

import { Box, Flex, Grid, GridItem, KeyboardNavigable } from '@strapi/design-system';
import PropTypes from 'prop-types';

import AttributeOption from '../AttributeOption';
import getPadding from '../utils/getPadding';

const AttributeList = ({ attributes }) => (
  <KeyboardNavigable tagName="button">
    <Flex direction="column" alignItems="stretch" gap={8}>
      {attributes.map((attributeRow, index) => {
        return (
          // eslint-disable-next-line react/no-array-index-key
          <Grid key={index} gap={0}>
            {attributeRow.map((attribute, index) => {
              const { paddingLeft, paddingRight } = getPadding(index);

              return (
                <GridItem key={attribute} col={6}>
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
    </Flex>
  </KeyboardNavigable>
);

AttributeList.propTypes = {
  attributes: PropTypes.array.isRequired,
};

export default AttributeList;
