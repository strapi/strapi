import React, { useEffect, useState } from 'react';

import { Box, Flex, KeyboardNavigable, Typography } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { getTrad } from '../../../utils';

import { ComponentCategory } from './ComponentCategory';

export const ComponentPicker = ({ dynamicComponentsByCategory, isOpen, onClickAddComponent }) => {
  const { formatMessage } = useIntl();

  const [categoryToOpen, setCategoryToOpen] = useState('');

  useEffect(() => {
    const categoryKeys = Object.keys(dynamicComponentsByCategory);

    if (isOpen && categoryKeys.length > 0) {
      setCategoryToOpen(categoryKeys[0]);
    }
  }, [isOpen, dynamicComponentsByCategory]);

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
          {Object.entries(dynamicComponentsByCategory).map(([category, components], index) => (
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
  );
};

ComponentPicker.defaultProps = {
  dynamicComponentsByCategory: {},
  isOpen: false,
};

ComponentPicker.propTypes = {
  dynamicComponentsByCategory: PropTypes.shape({
    components: PropTypes.arrayOf(
      PropTypes.shape({
        componentUid: PropTypes.string.isRequired,
        info: PropTypes.object,
      })
    ),
  }),
  isOpen: PropTypes.bool,
  onClickAddComponent: PropTypes.func.isRequired,
};
