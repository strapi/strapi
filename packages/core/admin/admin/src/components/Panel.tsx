import { Box, Flex, FlexProps } from '@strapi/design-system';

/* -------------------------------------------------------------------------------------------------
 * Panel
 * -----------------------------------------------------------------------------------------------*/

const Panel = ({ children, ...flexProps }: FlexProps) => {
  return (
    <Box
      background="neutral0"
      hasRadius
      shadow="filterShadow"
      paddingTop={6}
      paddingBottom={6}
      paddingLeft={7}
      paddingRight={7}
    >
      <Flex direction="column" alignItems="stretch" gap={4} {...flexProps}>
        {children}
      </Flex>
    </Box>
  );
};

export { Panel };
