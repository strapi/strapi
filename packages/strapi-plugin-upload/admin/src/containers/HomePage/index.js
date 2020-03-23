import React, { useReducer, useState, useEffect } from 'react';
import { includes } from 'lodash';
import { useHistory, useLocation } from 'react-router-dom';
import { Header } from '@buffetjs/custom';
import { useDebounce, useIsMounted } from '@buffetjs/hooks';
import {
  HeaderSearch,
  PageFooter,
  PopUpWarning,
  useGlobalContext,
  generateFiltersFromSearch,
  generateSearchFromFilters,
  request,
  useQuery,
} from 'strapi-helper-plugin';

import { getRequestUrl, getTrad } from '../../utils';

import Container from '../../components/Container';
import ControlsWrapper from '../../components/ControlsWrapper';
import SelectAll from '../../components/SelectAll';
import SortPicker from '../../components/SortPicker';
import Filters from '../../components/Filters';
import List from '../../components/List';
import ListEmpty from '../../components/ListEmpty';
import ModalStepper from '../ModalStepper';
import {
  deleteFilters,
  generatePageFromStart,
  generateStartFromPage,
  getHeaderLabel,
} from './utils';
import init from './init';
import reducer, { initialState } from './reducer';

const HomePage = () => {
  const { formatMessage } = useGlobalContext();
  const [reducerState, dispatch] = useReducer(reducer, initialState, init);
  const query = useQuery();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(query.get('_q') || '');
  const { push } = useHistory();
  const { search } = useLocation();
  const isMounted = useIsMounted();

  const { data, dataCount, dataToDelete } = reducerState.toJS();
  const pluginName = formatMessage({ id: getTrad('plugin.name') });
  const paramsKeys = ['_limit', '_start', '_q', '_sort'];
  const debouncedSearch = useDebounce(searchValue, 300);

  useEffect(() => {
    handleChangeParams({ target: { name: '_q', value: searchValue } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    fetchListData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const deleteMedia = async id => {
    const requestURL = getRequestUrl(`files/${id}`);

    try {
      await request(requestURL, {
        method: 'DELETE',
      });
    } catch (err) {
      if (isMounted) {
        strapi.notification.error('notification.error');
      }
    }
  };

  const fetchListData = async () => {
    const [data, count] = await Promise.all([fetchData(), fetchDataCount()]);

    if (isMounted) {
      dispatch({
        type: 'GET_DATA_SUCCEEDED',
        data,
        count,
      });
    }
  };

  const fetchData = async () => {
    const dataRequestURL = getRequestUrl('files');

    try {
      const data = await request(`${dataRequestURL}${search}`, {
        method: 'GET',
      });

      return Promise.resolve(data);
    } catch (err) {
      if (isMounted) {
        strapi.notification.error('notification.error');
      }
    }

    return null;
  };

  const fetchDataCount = async () => {
    const requestURL = getRequestUrl('files/count');

    try {
      const { count } = await request(requestURL, {
        method: 'GET',
      });

      return Promise.resolve(count);
    } catch (err) {
      if (isMounted) {
        strapi.notification.error('notification.error');
      }
    }

    return null;
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
      id: parseInt(name, 10),
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
    setIsModalOpen(prev => !prev);

    if (refetch) {
      fetchListData();
    }
  };

  const handleClickTogglePopup = () => {
    setIsPopupOpen(prev => !prev);
  };

  const handleDeleteFilter = filter => {
    const currentFilters = generateFiltersFromSearch(search);
    const updatedFilters = deleteFilters(currentFilters, filter);

    handleChangeParams({
      target: { name: 'filters', value: updatedFilters },
    });
  };

  const handleDeleteMedias = async () => {
    await Promise.all(dataToDelete.map(item => deleteMedia(item.id)));

    dispatch({
      type: 'CLEAR_DATA_TO_DELETE',
    });

    setIsPopupOpen(false);
    fetchListData();
  };

  const handleSelectAll = () => {
    dispatch({
      type: 'TOGGLE_SELECT_ALL',
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
      { number: dataCount }
    ),
    actions: [
      {
        disabled: dataToDelete.length === 0,
        color: 'cancel',
        // TradId from the strapi-admin package
        label: formatMessage({ id: 'app.utils.delete' }),
        onClick: () => setIsPopupOpen(true),
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

  const paginationCount = data.length < limit ? data.length : dataCount;

  const hasSomeCheckboxSelected = data.some(item =>
    dataToDelete.find(itemToDelete => item.id === itemToDelete.id)
  );

  const areAllCheckboxesSelected =
    data.every(item => dataToDelete.find(itemToDelete => item.id === itemToDelete.id)) &&
    hasSomeCheckboxSelected;

  const selectedItems = dataToDelete.map(item => item.id);

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
        <SelectAll
          onChange={handleSelectAll}
          checked={areAllCheckboxesSelected}
          someChecked={hasSomeCheckboxSelected && !areAllCheckboxesSelected}
        />
        <SortPicker onChange={handleChangeParams} value={query.get('_sort') || null} />
        <Filters
          onChange={handleChangeParams}
          filters={generateFiltersFromSearch(search)}
          onClick={handleDeleteFilter}
        />
      </ControlsWrapper>
      {dataCount > 0 ? (
        <>
          <List data={data} onChange={handleChangeCheck} selectedItems={selectedItems} />
          <PageFooter
            context={{ emitEvent: () => {} }}
            count={paginationCount}
            onChangeParams={handleChangeListParams}
            params={params}
          />
        </>
      ) : (
        <ListEmpty onClick={handleClickToggleModal} />
      )}
      <ModalStepper isOpen={isModalOpen} onToggle={handleClickToggleModal} />
      <PopUpWarning
        isOpen={isPopupOpen}
        toggleModal={handleClickTogglePopup}
        popUpWarningType="danger"
        onConfirm={handleDeleteMedias}
      />
    </Container>
  );
};

export default HomePage;
