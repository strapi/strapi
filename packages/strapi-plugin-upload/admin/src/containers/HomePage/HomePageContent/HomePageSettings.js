import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useDebounce } from '@buffetjs/hooks';
import { Padded } from '@buffetjs/core';
import { HeaderSearch, useGlobalContext, useQuery, LoadingIndicator } from 'strapi-helper-plugin';

import { useAppContext } from '../../../hooks';
import { getTrad, getFileModelTimestamps } from '../../../utils';
import ControlsWrapper from '../../../components/ControlsWrapper';
import Filters from '../../../components/Filters';
import SelectAll from '../../../components/SelectAll';
import SortPicker from '../../../components/SortPicker';

const HomePageSettings = ({
  areAllCheckboxesSelected,
  filters,
  hasSomeCheckboxSelected,
  isLoading,
  onChange,
  onFilterDelete,
  onSelectAll,
}) => {
  const {
    allowedActions: { canUpdate },
  } = useAppContext();
  const { formatMessage, plugins } = useGlobalContext();
  const [, updated_at] = getFileModelTimestamps(plugins);
  const query = useQuery();
  const [searchValue, setSearchValue] = useState(query.get('_q') || '');
  const debouncedSearch = useDebounce(searchValue, 300);
  const pluginName = formatMessage({ id: getTrad('plugin.name') });

  useEffect(() => {
    onChange({ target: { name: '_q', value: debouncedSearch } });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const handleChangeSearchValue = ({ target: { value } }) => {
    setSearchValue(value);
  };

  const handleClearSearch = () => {
    setSearchValue('');
  };

  return (
    <>
      <HeaderSearch
        label={pluginName}
        onChange={handleChangeSearchValue}
        onClear={handleClearSearch}
        placeholder={formatMessage({ id: getTrad('search.placeholder') })}
        name="_q"
        value={searchValue}
        autoFocus
      />
      {isLoading ? (
        <>
          <Padded top bottom size="lg" />
          <LoadingIndicator />
        </>
      ) : (
        <ControlsWrapper>
          {canUpdate && (
            <>
              <SelectAll
                onChange={onSelectAll}
                checked={areAllCheckboxesSelected}
                someChecked={hasSomeCheckboxSelected && !areAllCheckboxesSelected}
              />
              <Padded right />
            </>
          )}
          <SortPicker onChange={onChange} value={query.get('_sort') || `${updated_at}:DESC`} />
          <Padded right />
          <Filters onChange={onChange} filters={filters} onClick={onFilterDelete} />
        </ControlsWrapper>
      )}
    </>
  );
};

HomePageSettings.defaultProps = {
  areAllCheckboxesSelected: false,
  filters: [],
  hasSomeCheckboxSelected: false,
  onChange: () => {},
  onFilterDelete: () => {},
  onSelectAll: () => {},
};

HomePageSettings.propTypes = {
  areAllCheckboxesSelected: PropTypes.bool,
  filters: PropTypes.array,
  hasSomeCheckboxSelected: PropTypes.bool,
  isLoading: PropTypes.bool.isRequired,
  onChange: PropTypes.func,
  onFilterDelete: PropTypes.func,
  onSelectAll: PropTypes.func,
};

export default HomePageSettings;
