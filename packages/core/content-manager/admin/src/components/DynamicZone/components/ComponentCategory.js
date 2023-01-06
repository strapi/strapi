import React from 'react';
import PropTypes from 'prop-types';
import { Accordion, AccordionToggle, AccordionContent } from '@strapi/design-system/Accordion';
import { Box } from '@strapi/design-system/Box';
import styled from 'styled-components';
import { useIntl } from 'react-intl';

import ComponentCard from './ComponentCard';

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, ${140 / 16}rem);
  grid-gap: ${({ theme }) => theme.spaces[1]};
`;

const ComponentCategory = ({ category, components, variant, isOpen, onAddComponent, onToggle }) => {
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
              <ComponentCard key={componentUid} onClick={onAddComponent(componentUid)}>
                {formatMessage({ id: displayName, defaultMessage: displayName })}
              </ComponentCard>
            ))}
          </Grid>
        </Box>
      </AccordionContent>
    </Accordion>
  );
};

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

export default ComponentCategory;
