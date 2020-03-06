import React, { useReducer, useState, useEffect } from 'react';
import { includes } from 'lodash';
import { useHistory, useLocation } from 'react-router-dom';
import { Header } from '@buffetjs/custom';
import { useDebounce } from '@buffetjs/hooks';
import {
  HeaderSearch,
  PageFooter,
  useGlobalContext,
  generateFiltersFromSearch,
  generateSearchFromFilters,
  request,
  useQuery,
} from 'strapi-helper-plugin';

import getTrad from '../../utils/getTrad';
import getRequestUrl from '../../utils/getRequestUrl';
import Container from '../../components/Container';
import ControlsWrapper from '../../components/ControlsWrapper';
import SelectAll from '../../components/SelectAll';
import SortPicker from '../../components/SortPicker';
import Filters from '../../components/Filters';
import List from '../../components/List';
import ListEmpty from '../../components/ListEmpty';
import ModalStepper from '../ModalStepper';
import { generatePageFromStart, generateStartFromPage, getHeaderLabel } from './utils';
import init from './init';
import reducer, { initialState } from './reducer';

const HomePage = () => {
  const { formatMessage } = useGlobalContext();
  const [reducerState, dispatch] = useReducer(reducer, initialState, init);
  const query = useQuery();
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(query.get('_q') || '');
  const { push } = useHistory();
  const { search } = useLocation();

  const { data, dataToDelete } = reducerState.toJS();
  const pluginName = formatMessage({ id: getTrad('plugin.name') });
  const paramsKeys = ['_limit', '_start', '_q', '_sort'];
  const debouncedSearch = useDebounce(searchValue, 300);

  useEffect(() => {
    handleChangeParams({ target: { name: '_q', value: searchValue } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const fetchData = async () => {
    const requestURL = getRequestUrl('files');

    try {
      const data = await request(`${requestURL}${search}`, {
        method: 'GET',
      });

      dispatch({
        type: 'GET_DATA_SUCCEEDED',
        data,
      });
    } catch (err) {
      strapi.notification.error('notification.error');
    }
  };

  const getSearchParams = () => {
    const params = {};

    query.forEach((value, key) => {
      if (includes(paramsKeys, key)) {
        params[key] = value;
      }
    });

    return params;
  };

  const generateNewSearch = updatedParams => {
    return {
      ...getSearchParams(),
      filters: generateFiltersFromSearch(search),
      ...updatedParams,
    };
  };

  const handleChangeCheck = ({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE_DATA_TO_DELETE',
      id: name,
      value,
    });
  };
  
  const handleChangeListParams = ({ target: { name, value } }) => {
    if (name.includes('_page')) {
      handleChangeParams({
        target: { name: '_start', value: generateStartFromPage(value, limit) },
      });
    } else {
      handleChangeParams({ target: { name: '_limit', value } });
    }
  };

  const handleChangeParams = ({ target: { name, value } }) => {
    const updatedQueryParams = generateNewSearch({ [name]: value });
    const newSearch = generateSearchFromFilters(updatedQueryParams);

    push({ search: encodeURI(newSearch) });
  };

  const handleChangeSearchValue = ({ target: { value } }) => {
    setSearchValue(value);
  };

  const handleClearSearch = () => {
    setSearchValue('');
  };

  const handleClickToggleModal = (refetch = false) => {
    setIsOpen(prev => !prev);

    if (refetch) {
      fetchData();
    }
  };

  const handleDeleteFilter = index => {
    // Remove filter
    const updatedFilters = generateFiltersFromSearch(search);
    updatedFilters.splice(index, 1);

    handleChangeParams({
      target: { name: 'filters', value: updatedFilters },
    });
  };

  const headerProps = {
    title: {
      label: pluginName,
    },
    content: formatMessage(
      {
        id: getTrad(getHeaderLabel(data)),
      },
      // Values
      { number: 1 }
    ),
    actions: [
      {
        disabled: dataToDelete.length === 0,
        color: 'cancel',
        // TradId from the strapi-admin package
        label: formatMessage({ id: 'app.utils.delete' }),
        onClick: () => {},
        type: 'button',
      },
      {
        disabled: false,
        color: 'primary',
        label: formatMessage({ id: getTrad('header.actions.upload-assets') }),
        onClick: () => handleClickToggleModal(),
        type: 'button',
      },
    ],
  };

  const limit = parseInt(query.get('_limit'), 10) || 10;
  const start = parseInt(query.get('_start'), 10) || 0;

  const params = {
    _limit: parseInt(query.get('_limit'), 10) || 10,
    _page: generatePageFromStart(start, limit),
  };

  return (
    <Container>
      <Header {...headerProps} />
      <HeaderSearch
        label={pluginName}
        onChange={handleChangeSearchValue}
        onClear={handleClearSearch}
        placeholder={formatMessage({ id: getTrad('search.placeholder') })}
        name="_q"
        value={searchValue}
      />
      <ControlsWrapper>
        <SelectAll />
        <SortPicker onChange={handleChangeParams} value={query.get('_sort') || null} />
        <Filters
          onChange={handleChangeParams}
          filters={generateFiltersFromSearch(search)}
          onClick={handleDeleteFilter}
        />
      </ControlsWrapper>
      <List onChange={handleChangeCheck} selectedItems={dataToDelete} />
      <ListEmpty onClick={() => handleClickToggleModal()} />
      <PageFooter
        context={{ emitEvent: () => {} }}
        count={50}
        onChangeParams={handleChangeListParams}
        params={params}
      />
      <ModalStepper isOpen={isOpen} onToggle={handleClickToggleModal} />
    </Container>
  );
};

export default HomePage;
