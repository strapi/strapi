import React, { useEffect, useMemo, useState } from 'react';
import groupBy from 'lodash/groupBy';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { KeyboardNavigable, Box, Flex, Typography } from '@strapi/design-system';
import { getTrad } from '../../../utils';
import { useContentTypeLayout } from '../../../hooks';

import ComponentCategory from './ComponentCategory';

const ComponentPicker = ({ components, isOpen, onClickAddComponent }) => {
  const { formatMessage } = useIntl();
  const { getComponentLayout } = useContentTypeLayout();
  const [categoryToOpen, setCategoryToOpen] = useState('');

  const dynamicComponentCategories = useMemo(() => {
    const componentsWithInfo = components.map((componentUid) => {
      const { category, info } = getComponentLayout(componentUid);

      return { componentUid, category, info };
    });

    const categories = groupBy(componentsWithInfo, 'category');

    return Object.keys(categories).reduce((acc, current) => {
      acc.push({ category: current, components: categories[current] });

      return acc;
    }, []);
  }, [components, getComponentLayout]);

  useEffect(() => {
    if (isOpen && dynamicComponentCategories.length > 0) {
      setCategoryToOpen(dynamicComponentCategories[0].category);
    }
  }, [isOpen, dynamicComponentCategories]);

  const handleAddComponentToDz = (componentUid) => () => {
    onClickAddComponent(componentUid);
    setCategoryToOpen('');
  };

  /**
   * @type {(categoryName: string) => void}
   */
  const handleClickToggle = (categoryName) => {
    setCategoryToOpen((currentCat) => (currentCat === categoryName ? '' : categoryName));
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Box paddingBottom={6}>
      <Box
        paddingTop={6}
        paddingBottom={6}
        paddingLeft={5}
        paddingRight={5}
        background="neutral0"
        shadow="tableShadow"
        borderColor="neutral150"
        hasRadius
      >
        <Flex justifyContent="center">
          <Typography fontWeight="bold" textColor="neutral600">
            {formatMessage({
              id: getTrad('components.DynamicZone.ComponentPicker-label'),
              defaultMessage: 'Pick one component',
            })}
          </Typography>
        </Flex>
        <Box paddingTop={2}>
          <KeyboardNavigable attributeName="data-strapi-accordion-toggle">
            {dynamicComponentCategories.map(({ category, components }, index) => (
              <ComponentCategory
                key={category}
                category={category}
                components={components}
                onAddComponent={handleAddComponentToDz}
                isOpen={category === categoryToOpen}
                onToggle={handleClickToggle}
                variant={index % 2 === 1 ? 'primary' : 'secondary'}
              />
            ))}
          </KeyboardNavigable>
        </Box>
      </Box>
    </Box>
  );
};

ComponentPicker.defaultProps = {
  components: [],
  isOpen: false,
};

ComponentPicker.propTypes = {
  components: PropTypes.array,
  isOpen: PropTypes.bool,
  onClickAddComponent: PropTypes.func.isRequired,
};

export default ComponentPicker;
