import React, { useReducer, useState, useRef, useEffect } from 'react';
import { includes, isEmpty, toString } from 'lodash';
import { useHistory, useLocation } from 'react-router-dom';
import { Header } from '@buffetjs/custom';
import { useDebounce } from '@buffetjs/hooks';
import {
  HeaderSearch,
  PageFooter,
  PopUpWarning,
  LoadingIndicatorPage,
  useGlobalContext,
  generateFiltersFromSearch,
  generateSearchFromFilters,
  request,
  useQuery,
} from 'strapi-helper-plugin';
import {
  formatFileForEditing,
  getRequestUrl,
  getTrad,
  generatePageFromStart,
  generateStartFromPage,
  getFileModelTimestamps,
} from '../../utils';
import Container from '../../components/Container';
import ControlsWrapper from '../../components/ControlsWrapper';
import Padded from '../../components/Padded';
import SelectAll from '../../components/SelectAll';
import SortPicker from '../../components/SortPicker';
import Filters from '../../components/Filters';
import List from '../../components/List';
import ListEmpty from '../../components/ListEmpty';
import ModalStepper from '../ModalStepper';
import { generateStringFromParams, getHeaderLabel } from './utils';
import init from './init';
import reducer, { initialState } from './reducer';

const HomePage = () => {
  const { formatMessage, plugins } = useGlobalContext();
  const [, updated_at] = getFileModelTimestamps(plugins);
  const [reducerState, dispatch] = useReducer(reducer, initialState, init);
  const query = useQuery();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [fileToEdit, setFileToEdit] = useState(null);
  const [shouldRefetch, setShouldRefetch] = useState(false);
  const [modalInitialStep, setModalInitialStep] = useState('browse');
  const [searchValue, setSearchValue] = useState(query.get('_q') || '');
  const { push } = useHistory();
  const { search } = useLocation();
  const isMounted = useRef(true);
  const { data, dataCount, dataToDelete, isLoading } = reducerState.toJS();
  const pluginName = formatMessage({ id: getTrad('plugin.name') });
  const paramsKeys = ['_limit', '_start', '_q', '_sort'];
  const debouncedSearch = useDebounce(searchValue, 300);

  useEffect(() => {
    return () => (isMounted.current = false);
  }, []);

  useEffect(() => {
    handleChangeParams({ target: { name: '_q', value: debouncedSearch } });

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
      if (isMounted.current) {
        strapi.notification.error('notification.error');
      }
    }
  };

  const fetchListData = async () => {
    dispatch({ type: 'GET_DATA' });

    const [data, count] = await Promise.all([fetchData(), fetchDataCount()]);

    if (isMounted.current) {
      dispatch({
        type: 'GET_DATA_SUCCEEDED',
        data,
        count,
      });
    }
  };

  const fetchData = async () => {
    const dataRequestURL = getRequestUrl('files');
    const params = generateStringFromParams(query);

    const paramsToSend = params.includes('_sort')
      ? params
      : params.concat(`&_sort=${updated_at}:DESC`);

    try {
      const data = await request(`${dataRequestURL}?${paramsToSend}`, {
        method: 'GET',
      });

      return Promise.resolve(data);
    } catch (err) {
      if (isMounted.current) {
        dispatch({ type: 'GET_DATA_ERROR' });
        strapi.notification.error('notification.error');
      }
    }

    return [];
  };

  const fetchDataCount = async () => {
    const requestURL = getRequestUrl('files/count');

    try {
      const { count } = await request(requestURL, {
        method: 'GET',
      });

      return Promise.resolve(count);
    } catch (err) {
      if (isMounted.current) {
        dispatch({ type: 'GET_DATA_ERROR' });
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

  const generateNewSearch = (updatedParams = {}) => {
    return {
      ...getSearchParams(),
      filters: generateFiltersFromSearch(search),
      ...updatedParams,
    };
  };

  const handleChangeCheck = ({ target: { name } }) => {
    dispatch({
      type: 'ON_CHANGE_DATA_TO_DELETE',
      id: name,
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
    let updatedQueryParams = generateNewSearch({ [name]: value });

    if (name === 'filters') {
      const filters = [...generateFiltersFromSearch(search), value];

      updatedQueryParams = generateNewSearch({ [name]: filters });
    }

    if (name === '_limit') {
      updatedQueryParams = generateNewSearch({ [name]: value, _start: 0 });
    }

    const newSearch = generateSearchFromFilters(updatedQueryParams);

    push({ search: encodeURI(newSearch) });
  };

  const handleChangeSearchValue = ({ target: { value } }) => {
    setSearchValue(value);
  };

  const handleClickEditFile = id => {
    const file = formatFileForEditing(data.find(file => toString(file.id) === toString(id)));

    setFileToEdit(file);
    setModalInitialStep('edit');
    handleClickToggleModal();
  };

  const handleClearSearch = () => {
    setSearchValue('');
  };

  const handleClickToggleModal = (refetch = false) => {
    setIsModalOpen(prev => !prev);
    setShouldRefetch(refetch);
  };

  const handleClickTogglePopup = () => {
    setIsPopupOpen(prev => !prev);
  };

  const handleDeleteFilter = index => {
    const filters = generateFiltersFromSearch(search).filter(
      (filter, filterIndex) => filterIndex !== index
    );

    const updatedQueryParams = generateNewSearch({ filters });

    const newSearch = generateSearchFromFilters(updatedQueryParams);

    push({ search: encodeURI(newSearch) });
  };

  const handleDeleteMediaFromModal = async id => {
    handleClickToggleModal();

    lockAppWithOverlay();

    try {
      await deleteMedia(id);

      strapi.notification.success('notification.success.delete');

      dispatch({
        type: 'ON_DELETE_MEDIA_SUCCEEDED',
        mediaId: id,
      });
    } catch (err) {
      // Silent
    } finally {
      strapi.unlockApp();
    }
  };

  const handleDeleteMedias = async () => {
    setIsPopupOpen(false);

    lockAppWithOverlay();

    try {
      await Promise.all(dataToDelete.map(item => deleteMedia(item.id)));

      dispatch({
        type: 'CLEAR_DATA_TO_DELETE',
      });

      fetchListData();
    } catch (error) {
      // Silent
    } finally {
      strapi.unlockApp();
    }
  };

  const handleModalClose = () => {
    resetModalState();

    if (shouldRefetch) {
      fetchListData();
      setShouldRefetch(false);
    }
  };

  const handleSelectAll = () => {
    dispatch({
      type: 'TOGGLE_SELECT_ALL',
    });
  };

  const lockAppWithOverlay = () => {
    const overlayblockerParams = {
      children: <div />,
      noGradient: true,
    };

    strapi.lockApp(overlayblockerParams);
  };

  const resetModalState = () => {
    setModalInitialStep('browse');
    setFileToEdit(null);
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
    _limit: limit,
    _page: generatePageFromStart(start, limit),
  };

  const paginationCount = data.length < limit ? data.length : dataCount;

  const hasSomeCheckboxSelected = data.some(item =>
    dataToDelete.find(itemToDelete => item.id.toString() === itemToDelete.id.toString())
  );

  const areAllCheckboxesSelected =
    data.every(item =>
      dataToDelete.find(itemToDelete => item.id.toString() === itemToDelete.id.toString())
    ) && hasSomeCheckboxSelected;

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  const filters = generateFiltersFromSearch(search);
  const hasFilters = !isEmpty(filters);
  const hasSearch = !isEmpty(searchValue);
  const areResultsEmptyWithSearchOrFilters = isEmpty(data) && (hasSearch || hasFilters);

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
        <Padded right />
        <SortPicker
          onChange={handleChangeParams}
          value={query.get('_sort') || `${updated_at}:DESC`}
        />
        <Padded right />
        <Filters onChange={handleChangeParams} filters={filters} onClick={handleDeleteFilter} />
      </ControlsWrapper>
      {dataCount > 0 && !areResultsEmptyWithSearchOrFilters ? (
        <>
          <List
            clickable
            data={data}
            onChange={handleChangeCheck}
            onCardClick={handleClickEditFile}
            selectedItems={dataToDelete}
          />
          <PageFooter
            context={{ emitEvent: () => {} }}
            count={paginationCount}
            onChangeParams={handleChangeListParams}
            params={params}
          />
        </>
      ) : (
        <ListEmpty
          onClick={handleClickToggleModal}
          hasSearchApplied={areResultsEmptyWithSearchOrFilters}
        />
      )}
      <ModalStepper
        initialFileToEdit={fileToEdit}
        initialStep={modalInitialStep}
        isOpen={isModalOpen}
        onClosed={handleModalClose}
        onDeleteMedia={handleDeleteMediaFromModal}
        onToggle={handleClickToggleModal}
        refetchData={fetchListData}
      />
      <PopUpWarning
        isOpen={isPopupOpen}
        toggleModal={handleClickTogglePopup}
        popUpWarningType="danger"
        onConfirm={handleDeleteMedias}
      />
      <Padded bottom size="md" />
      <Padded bottom size="md" />
    </Container>
  );
};

export default HomePage;
