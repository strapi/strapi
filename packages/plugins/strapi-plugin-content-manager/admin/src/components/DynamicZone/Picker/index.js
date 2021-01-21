import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { groupBy } from 'lodash';
import PropTypes from 'prop-types';
import { Collapse } from 'reactstrap';
import { FormattedMessage } from 'react-intl';
import pluginId from '../../../pluginId';
import { useContentTypeLayout } from '../../../hooks';
import Category from './Category';
import Wrapper from './Wrapper';

const Picker = ({ components, isOpen, onClickAddComponent }) => {
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

  return (
    <Collapse isOpen={isOpen}>
      <Wrapper>
        <div>
          <p className="componentPickerTitle">
            <FormattedMessage id={`${pluginId}.components.DynamicZone.pick-compo`} />
          </p>
          <div className="categoriesList">
            {dynamicComponentCategories.map(({ category, components }, index) => {
              return (
                <Category
                  key={category}
                  category={category}
                  components={components}
                  isOpen={category === categoryToOpen}
                  isFirst={index === 0}
                  onAddComponent={handleAddComponentToDz}
                  onToggle={handleClickToggle}
                />
              );
            })}
          </div>
        </div>
      </Wrapper>
    </Collapse>
  );
};

Picker.propTypes = {
  components: PropTypes.array.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClickAddComponent: PropTypes.func.isRequired,
};

export default memo(Picker);
