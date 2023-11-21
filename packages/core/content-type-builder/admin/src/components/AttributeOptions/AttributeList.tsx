import { Flex, Grid, GridItem, KeyboardNavigable } from '@strapi/design-system';

import { IconByType } from '../AttributeIcon';

import { AttributeOption } from './AttributeOption';

type AttributeListProps = {
  attributes: IconByType[][];
};

export const AttributeList = ({ attributes }: AttributeListProps) => (
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
