import React from 'react';
import PropTypes from 'prop-types';
import { Accordion, AccordionToggle, AccordionContent } from '@strapi/parts/Accordion';
import { Box } from '@strapi/parts/Box';
import styled from 'styled-components';
import ComponentCard from './ComponentCard';

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(${140 / 16}rem, 1fr));
  grid-gap: ${({ theme }) => theme.spaces[1]};
`;

const Category = ({ category, components, isOdd, isOpen, onAddComponent, onToggle }) => {
  const handleToggle = () => {
    onToggle(category);
  };

  return (
    <Accordion expanded={isOpen} toggle={handleToggle}>
      <AccordionToggle
        variant={isOdd ? 'primary' : 'secondary'}
        title={category}
        togglePosition="left"
      />
      <AccordionContent>
        <Box paddingTop={4} paddingBottom={4} paddingLeft={3} paddingRight={3}>
          <Grid>
            {components.map(({ componentUid, info: { label, icon, name } }) => {
              return (
                <ComponentCard
                  key={componentUid}
                  componentUid={componentUid}
                  intlLabel={{ id: label || name, defaultMessage: label || name }}
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
