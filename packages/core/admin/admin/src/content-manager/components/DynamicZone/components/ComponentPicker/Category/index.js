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

const Category = ({ category, components, isOdd, isOpen, onAddComponent, onToggle }) => {
  const { formatMessage } = useIntl();

  const handleToggle = () => {
    onToggle(category);
  };

  return (
    <Accordion expanded={isOpen} onToggle={handleToggle} size="S">
      <AccordionToggle
        variant={isOdd ? 'primary' : 'secondary'}
        title={formatMessage({ id: category, defaultMessage: category })}
        togglePosition="left"
      />
      <AccordionContent>
        <Box paddingTop={4} paddingBottom={4} paddingLeft={3} paddingRight={3}>
          <Grid>
            {components.map(({ componentUid, info: { displayName, icon } }) => {
              return (
                <ComponentCard
                  key={componentUid}
                  componentUid={componentUid}
                  intlLabel={{ id: displayName, defaultMessage: displayName }}
                  icon={icon}
                  onClick={onAddComponent}
                />
              );
            })}
          </Grid>
        </Box>
      </AccordionContent>
    </Accordion>
  );
};

Category.propTypes = {
  category: PropTypes.string.isRequired,
  components: PropTypes.array.isRequired,
  isOdd: PropTypes.bool.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onAddComponent: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default Category;
