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
// import List from '../../components/List';
import ListEmpty from '../../components/ListEmpty';
import ModalStepper from '../ModalStepper';
import { generatePageFromStart, generateStartFromPage, getHeaderLabel } from './utils';
import init from './init';
import reducer, { initialState } from './reducer';

const HomePage = () => {
  const { formatMessage } = useGlobalContext();
  const [reducerState, dispatch] = useReducer(reducer, initialState, init);
  const [isOpen, setIsOpen] = useState(false);
  const { push } = useHistory();
  const { search } = useLocation();
  const query = useQuery();

  const { data, dataToDelete } = reducerState.toJS();
  const pluginName = formatMessage({ id: getTrad('plugin.name') });
  const paramsKeys = ['_limit', '_start', '_q', '_sort'];

  const getSearchParams = () => {
    const params = {};

    query.forEach((value, key) => {
      if (includes(paramsKeys, key)) {
        params[key] = value;
      }
    });

    return params;
  };
  const getQueryValue = key => {
    const queryParams = getSearchParams();

    return queryParams[key];
  };

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    fetchData();

    return () => {};
  }, [debouncedSearch]);

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

  const getQueryParams = () => {
    return {
      ...getSearchParams(),
      filters: generateFiltersFromSearch(search),
    };
  };

  const getUpdatedQueryParams = updatedParams => {
    return {
      ...getQueryParams(),
      ...updatedParams,
    };
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
    const updatedQueryParams = getUpdatedQueryParams({ [name]: value });
    const newSearch = generateSearchFromFilters(updatedQueryParams);

    push({ search: encodeURI(newSearch) });
  };

  const handleClearSearch = () => {
    handleChangeParams({ target: { name: '_q', value: '' } });
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

  const limit = parseInt(getQueryValue('_limit'), 10) || 10;
  const start = parseInt(getQueryValue('_start'), 10) || 0;

  const params = {
    _limit: parseInt(getQueryValue('_limit'), 10) || 10,
    _page: generatePageFromStart(start, limit),
  };

  return (
    <Container>
      <Header {...headerProps} />
      <HeaderSearch
        label={pluginName}
        onChange={handleChangeParams}
        onClear={handleClearSearch}
        placeholder={formatMessage({ id: getTrad('search.placeholder') })}
        name="_q"
        value={getQueryValue('_q') || ''}
      />
      <ControlsWrapper>
        <SelectAll />
        <SortPicker onChange={handleChangeParams} value={getQueryValue('_sort') || null} />
        <Filters
          onChange={handleChangeParams}
          filters={generateFiltersFromSearch(search)}
          onClick={handleDeleteFilter}
        />
      </ControlsWrapper>
      <ListEmpty onClick={() => handleClickToggleModal()} />
      {/* <List data={data} /> */}

      <PageFooter count={50} onChangeParams={handleChangeListParams} params={params} />
      <ModalStepper isOpen={isOpen} onToggle={handleClickToggleModal} />
    </Container>
  );
};

export default HomePage;
