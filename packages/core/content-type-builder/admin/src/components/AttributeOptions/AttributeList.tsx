import { Flex, Grid, KeyboardNavigable } from '@strapi/design-system';

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
          <Grid.Root key={index} gap={3}>
            {attributeRow.map((attribute) => (
              <Grid.Item key={attribute} col={6} direction="column" alignItems="stretch">
                <AttributeOption type={attribute} />
              </Grid.Item>
            ))}
          </Grid.Root>
        );
      })}
    </Flex>
  </KeyboardNavigable>
);
