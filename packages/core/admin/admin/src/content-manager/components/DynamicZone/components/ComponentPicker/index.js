import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import groupBy from 'lodash/groupBy';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { KeyboardNavigable } from '@strapi/parts/KeyboardNavigable';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
import { Text } from '@strapi/parts/Text';
import { getTrad } from '../../../../utils';
import { useContentTypeLayout } from '../../../../hooks';
import Category from './Category';

const ComponentPicker = ({ components, isOpen, onClickAddComponent }) => {
  const { formatMessage } = useIntl();
  const { getComponentLayout } = useContentTypeLayout();
  const [categoryToOpen, setCategoryToOpen] = useState('');

  const dynamicComponentCategories = useMemo(() => {
    const componentsWithInfo = components.map(componentUid => {
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
    if (isOpen && dynamicComponentCategories.length) {
      setCategoryToOpen(dynamicComponentCategories[0].category);
    }
  }, [isOpen, dynamicComponentCategories]);

  const handleAddComponentToDz = useCallback(
    componentUid => {
      onClickAddComponent(componentUid);
      setCategoryToOpen('');
    },
    [onClickAddComponent]
  );

  const handleClickToggle = useCallback(
    categoryName => {
      const nextCategoryToOpen = categoryToOpen === categoryName ? '' : categoryName;

      setCategoryToOpen(nextCategoryToOpen);
    },
    [categoryToOpen]
  );

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
        <Row justifyContent="center">
          <Text bold textColor="neutral600">
            {formatMessage({
              id: getTrad('components.DynamicZone.ComponentPicker-label'),
              defaultMessage: 'Pick one component',
            })}
          </Text>
        </Row>
        <Box paddingTop={2}>
          <KeyboardNavigable attributeName="data-strapi-accordion-toggle">
            {dynamicComponentCategories.map(({ category, components }, index) => {
              return (
                <Category
                  key={category}
                  category={category}
                  components={components}
                  isOdd={index % 2 === 1}
                  isOpen={category === categoryToOpen}
                  // TODO?
                  // isFirst={index === 0}
                  onAddComponent={handleAddComponentToDz}
                  onToggle={handleClickToggle}
                />
              );
            })}
          </KeyboardNavigable>
        </Box>
      </Box>
    </Box>
  );
};

ComponentPicker.propTypes = {
  components: PropTypes.array.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClickAddComponent: PropTypes.func.isRequired,
};

export default memo(ComponentPicker);
