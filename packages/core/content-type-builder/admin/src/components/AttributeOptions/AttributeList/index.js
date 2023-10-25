import React from 'react';

import { Flex, Grid, GridItem, KeyboardNavigable } from '@strapi/design-system';
import PropTypes from 'prop-types';

import AttributeOption from '../AttributeOption';

const AttributeList = ({ attributes }) => (
  <KeyboardNavigable tagName="button">
    <Flex direction="column" alignItems="stretch" gap={8}>
      {attributes.map((attributeRow, index) => {
        return (
          // eslint-disable-next-line react/no-array-index-key
          <Grid key={index} gap={3}>
            {attributeRow.map((attribute) => (
              <GridItem key={attribute} col={6}>
                <AttributeOption type={attribute} />
              </GridItem>
            ))}
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
