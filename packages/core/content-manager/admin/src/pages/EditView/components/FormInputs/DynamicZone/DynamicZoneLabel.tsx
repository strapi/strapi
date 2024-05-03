import * as React from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';

interface DynamicZoneLabelProps {
  label?: React.ReactNode;
  labelAction?: React.ReactNode;
  name: string;
  numberOfComponents?: number;
  required?: boolean;
  hint?: React.ReactNode;
}

const DynamicZoneLabel = ({
  hint,
  label,
  labelAction,
  name,
  numberOfComponents = 0,
  required,
}: DynamicZoneLabelProps) => {
  return (
    <Flex justifyContent="center">
      <Box
        paddingTop={3}
        paddingBottom={3}
        paddingRight={4}
        paddingLeft={4}
        borderRadius="26px"
        background="neutral0"
        shadow="filterShadow"
        color="neutral500"
      >
        <Flex direction="column" justifyContent="center">
          <Flex maxWidth="35.6rem">
            <Typography variant="pi" textColor="neutral600" fontWeight="bold" ellipsis>
              {label || name}&nbsp;
            </Typography>
            <Typography variant="pi" textColor="neutral600" fontWeight="bold">
              ({numberOfComponents})
            </Typography>
            {required && <Typography textColor="danger600">*</Typography>}
            {labelAction && <Box paddingLeft={1}>{labelAction}</Box>}
          </Flex>
          {hint && (
            <Box paddingTop={1} maxWidth="35.6rem">
              <Typography variant="pi" textColor="neutral600" ellipsis>
                {hint}
              </Typography>
            </Box>
          )}
        </Flex>
      </Box>
    </Flex>
  );
};

export { DynamicZoneLabel };
export type { DynamicZoneLabelProps };
