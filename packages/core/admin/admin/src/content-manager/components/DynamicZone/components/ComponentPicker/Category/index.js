import React from 'react';
import PropTypes from 'prop-types';
import { Accordion, AccordionToggle, AccordionContent } from '@strapi/parts/Accordion';
import { Box } from '@strapi/parts/Box';
import { Grid, GridItem } from '@strapi/parts/Grid';
import ComponentCard from './ComponentCard';

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
          <Grid gap={2} gridCols={10}>
            {components.map(({ componentUid, info: { label, icon, name } }) => {
              return (
                <GridItem col={2} key={componentUid} s={4} xs={12}>
                  <ComponentCard
                    componentUid={componentUid}
                    intlLabel={{ id: label || name, defaultMessage: label || name }}
                    icon={icon}
                    onClick={onAddComponent}
                  />
                </GridItem>
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
