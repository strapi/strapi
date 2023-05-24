import React from 'react';
import PropTypes from 'prop-types';
import {
  Accordion,
  AccordionToggle,
  AccordionContent,
  Box,
  Flex,
  Typography,
} from '@strapi/design-system';
import { pxToRem } from '@strapi/helper-plugin';
import styled from 'styled-components';
import { useIntl } from 'react-intl';

import { ComponentIcon } from '../../ComponentIcon';

export const ComponentCategory = ({
  category,
  components,
  variant,
  isOpen,
  onAddComponent,
  onToggle,
}) => {
  const { formatMessage } = useIntl();

  const handleToggle = () => {
    onToggle(category);
  };

  return (
    <Accordion expanded={isOpen} onToggle={handleToggle} size="S">
      <AccordionToggle
        variant={variant}
        title={formatMessage({ id: category, defaultMessage: category })}
        togglePosition="left"
      />
      <AccordionContent>
        <Box paddingTop={4} paddingBottom={4} paddingLeft={3} paddingRight={3}>
          <Grid>
            {components.map(({ componentUid, info: { displayName } }) => (
              <ComponentBox
                key={componentUid}
                as="button"
                type="button"
                background="neutral100"
                justifyContent="center"
                onClick={onAddComponent(componentUid)}
                hasRadius
              >
                <Flex direction="column" gap={1} alignItems="center" justifyContent="center">
                  <ComponentIcon />

                  <Typography variant="pi" fontWeight="bold" textColor="neutral600">
                    {formatMessage({ id: displayName, defaultMessage: displayName })}
                  </Typography>
                </Flex>
              </ComponentBox>
            ))}
          </Grid>
        </Box>
      </AccordionContent>
    </Accordion>
  );
};

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, ${140 / 16}rem);
  grid-gap: ${({ theme }) => theme.spaces[1]};
`;

const ComponentBox = styled(Flex)`
  flex-shrink: 0;
  height: ${pxToRem(84)};
  border: 1px solid ${({ theme }) => theme.colors.neutral200};

  &:focus,
  &:hover {
    border: 1px solid ${({ theme }) => theme.colors.primary200};
    background: ${({ theme }) => theme.colors.primary100};

    ${Typography} {
      color: ${({ theme }) => theme.colors.primary600};
    }

    /* > Flex > ComponentIcon */
    > div > div:first-child {
      background: ${({ theme }) => theme.colors.primary200};
      color: ${({ theme }) => theme.colors.primary600};
    }
  }
`;

ComponentCategory.defaultProps = {
  components: [],
  isOpen: false,
  variant: 'primary',
};

ComponentCategory.propTypes = {
  category: PropTypes.string.isRequired,
  components: PropTypes.array,
  isOpen: PropTypes.bool,
  onAddComponent: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary']),
};
