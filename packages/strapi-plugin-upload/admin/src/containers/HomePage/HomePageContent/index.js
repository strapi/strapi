import React from 'react';
import PropTypes from 'prop-types';
import { isEmpty } from 'lodash';
import { useLocation } from 'react-router-dom';
import { generateFiltersFromSearch, useQuery } from 'strapi-helper-plugin';

import HomePageSettings from './HomePageSettings';
import HomePageList from './HomePageList';

const HomePageContent = ({
  data,
  dataCount,
  dataToDelete,
  onCardCheck,
  onCardClick,
  onClick,
  onFilterDelete,
  onParamsChange,
  onSelectAll,
}) => {
  const query = useQuery();
  const { search } = useLocation();
  const filters = generateFiltersFromSearch(search);

  const hasSomeCheckboxSelected = data.some(item =>
    dataToDelete.find(itemToDelete => item.id.toString() === itemToDelete.id.toString())
  );

  const areAllCheckboxesSelected =
    data.every(item =>
      dataToDelete.find(itemToDelete => item.id.toString() === itemToDelete.id.toString())
    ) && hasSomeCheckboxSelected;

  const hasFilters = !isEmpty(filters);
  const hasSearch = !isEmpty(query.get('_q'));
  const areResultsEmptyWithSearchOrFilters = isEmpty(data) && (hasSearch || hasFilters);

  return (
    <>
      <HomePageSettings
        areAllCheckboxesSelected={areAllCheckboxesSelected}
        filters={filters}
        hasSomeCheckboxSelected={hasSomeCheckboxSelected}
        onChange={onParamsChange}
        onFilterDelete={onFilterDelete}
        onSelectAll={onSelectAll}
      />
      <HomePageList
        areResultsEmptyWithSettings={areResultsEmptyWithSearchOrFilters}
        data={data}
        dataCount={dataCount}
        dataToDelete={dataToDelete}
        onCardCheck={onCardCheck}
        onCardClick={onCardClick}
        onClick={onClick}
        onChange={onParamsChange}
      />
    </>
  );
};

HomePageContent.defaultProps = {
  data: [],
  dataCount: 0,
  dataToDelete: [],
  onCardCheck: () => {},
  onCardClick: () => {},
  onClick: () => {},
  onFilterDelete: () => {},
  onParamsChange: () => {},
  onSelectAll: () => {},
};

HomePageContent.propTypes = {
  data: PropTypes.array,
  dataCount: PropTypes.number,
  dataToDelete: PropTypes.array,
  onCardCheck: PropTypes.func,
  onCardClick: PropTypes.func,
  onClick: PropTypes.func,
  onFilterDelete: PropTypes.func,
  onParamsChange: PropTypes.func,
  onSelectAll: PropTypes.func,
};

export default HomePageContent;
