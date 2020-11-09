import React, { useCallback, useReducer, useRef, useState, useEffect } from 'react';
import { get, includes, toString, isEqual, intersectionWith } from 'lodash';
import { useHistory, useLocation } from 'react-router-dom';
import { Header } from '@buffetjs/custom';
import { Button } from '@buffetjs/core';
import {
  PopUpWarning,
  useGlobalContext,
  generateFiltersFromSearch,
  generateSearchFromFilters,
  request,
  useQuery,
} from 'strapi-helper-plugin';
import { formatFileForEditing, getRequestUrl, getTrad, getFileModelTimestamps } from '../../utils';
import Container from '../../components/Container';
import HomePageContent from './HomePageContent';
import Padded from '../../components/Padded';
import { useAppContext } from '../../hooks';
import ModalStepper from '../ModalStepper';
import { generateStringFromParams, getHeaderLabel } from './utils';
import init from './init';
import reducer, { initialState } from './reducer';

const HomePage = () => {
  const { allowedActions } = useAppContext();
  const { canRead } = allowedActions;
  const { formatMessage, plugins } = useGlobalContext();
  const [, updated_at] = getFileModelTimestamps(plugins);
  const [reducerState, dispatch] = useReducer(reducer, initialState, () =>
    init(initialState, allowedActions)
  );
  const query = useQuery();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [fileToEdit, setFileToEdit] = useState(null);
  const [shouldRefetch, setShouldRefetch] = useState(false);
  const [modalInitialStep, setModalInitialStep] = useState('browse');
  const { push } = useHistory();
  const { search } = useLocation();
  const isMounted = useRef(true);
  const {
    data,
    dataCount,
    dataToDelete,
    isLoading,
    shouldRefetchData,
    showModalConfirmButtonLoading,
  } = reducerState.toJS();
  const pluginName = formatMessage({ id: getTrad('plugin.name') });
  const paramsKeys = ['_limit', '_start', '_q', '_sort'];

  useEffect(() => {
    return () => (isMounted.current = false);
  }, []);

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

      return Promise.resolve();
    } catch (err) {
      const errorMessage = get(err, 'response.payload.message', 'An error occured');

      return Promise.reject(errorMessage);
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
        strapi.notification.toggle({
          type: 'warning',
          message: { id: 'notification.error' },
        });
      }
    }

    return [];
  };

  const fetchDataCount = async () => {
    const params = generateStringFromParams(query, ['_limit', '_sort', '_start']);
    const requestURL = getRequestUrl('files/count');

    try {
      const { count } = await request(`${requestURL}?${params}`, {
        method: 'GET',
      });

      return Promise.resolve(count);
    } catch (err) {
      if (isMounted.current) {
        dispatch({ type: 'GET_DATA_ERROR' });
        strapi.notification.toggle({
          type: 'warning',
          message: { id: 'notification.error' },
        });
      }
    }

    return null;
  };

  const fetchListData = async () => {
    if (canRead) {
      dispatch({ type: 'GET_DATA' });

      const [data, count] = await Promise.all([fetchData(), fetchDataCount()]);

      if (isMounted.current) {
        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data,
          count,
        });
      }
    }
  };

  const generateNewSearch = (updatedParams = {}) => {
    return {
      ...getSearchParams(),
      filters: generateFiltersFromSearch(search),
      ...updatedParams,
    };
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

  const handleChangeCheck = ({ target: { name } }) => {
    dispatch({
      type: 'ON_CHANGE_DATA_TO_DELETE',
      id: name,
    });
  };

  const handleChangeParams = ({ target: { name, value } }) => {
    let updatedQueryParams = generateNewSearch({ [name]: value });

    if (name === 'filters') {
      const existingFilters = generateFiltersFromSearch(search);
      const canAddFilter = intersectionWith(existingFilters, [value], isEqual).length === 0;
      updatedQueryParams = generateNewSearch({ [name]: existingFilters });

      if (canAddFilter) {
        const filters = [...existingFilters, value];

        updatedQueryParams = generateNewSearch({ [name]: filters });
      }
    }

    if (name === '_limit') {
      updatedQueryParams = generateNewSearch({ [name]: value, _start: 0 });
    }

    const newSearch = generateSearchFromFilters(updatedQueryParams);

    push({ search: newSearch });
  };

  const handleClickEditFile = id => {
    if (allowedActions.canUpdate) {
      const file = formatFileForEditing(data.find(file => toString(file.id) === toString(id)));

      setFileToEdit(file);
      setModalInitialStep('edit');
      handleClickToggleModal();
    }
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

    push({ search: newSearch });
  };

  const handleConfirmDeleteMedias = useCallback(async () => {
    dispatch({ type: 'ON_DELETE_MEDIAS' });

    try {
      await Promise.all(dataToDelete.map(item => deleteMedia(item.id)));

      dispatch({
        type: 'ON_DELETE_MEDIAS_SUCCEEDED',
      });
    } catch (err) {
      strapi.notification.toggle({
        type: 'warning',
        message: err,
      });

      dispatch({
        type: 'ON_DELETE_MEDIAS_ERROR',
      });
    } finally {
      setIsPopupOpen(false);
    }
  }, [dataToDelete]);

  const handleClosedModalDeleteAll = useCallback(() => {
    if (shouldRefetchData) {
      fetchListData();
    } else {
      dispatch({ type: 'RESET_DATA_TO_DELETE' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRefetchData]);

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

  const resetModalState = () => {
    setModalInitialStep('browse');
    setFileToEdit(null);
  };

  const headerProps = {
    title: {
      label: pluginName,
    },
    /* eslint-disable indent */
    content: canRead
      ? formatMessage(
          {
            id: getTrad(getHeaderLabel(dataCount)),
          },
          { number: dataCount }
        )
      : null,
    /* eslint-enable indent */
    actions: [
      {
        disabled: dataToDelete.length === 0,
        color: 'delete',
        // TradId from the strapi-admin package
        label: formatMessage({ id: 'app.utils.delete' }),
        onClick: () => setIsPopupOpen(true),
        type: 'button',
        Component: buttonProps => {
          if (!allowedActions.canUpdate) {
            return null;
          }

          return <Button {...buttonProps} />;
        },
      },
      {
        disabled: false,
        color: 'primary',
        label: formatMessage({ id: getTrad('header.actions.upload-assets') }),
        onClick: () => handleClickToggleModal(),
        type: 'button',
        Component: buttonProps => {
          if (!allowedActions.canCreate) {
            return null;
          }

          return <Button {...buttonProps} />;
        },
      },
    ],
  };

  const handleRemoveFileFromDataToDelete = useCallback(id => {
    dispatch({
      type: 'ON_CHANGE_DATA_TO_DELETE',
      id,
    });
  }, []);

  const content = canRead ? (
    <HomePageContent
      data={data}
      dataCount={dataCount}
      dataToDelete={dataToDelete}
      isLoading={isLoading}
      onCardCheck={handleChangeCheck}
      onCardClick={handleClickEditFile}
      onClick={handleClickToggleModal}
      onFilterDelete={handleDeleteFilter}
      onParamsChange={handleChangeParams}
      onSelectAll={handleSelectAll}
    />
  ) : null;

  return (
    <Container>
      <Header {...headerProps} isLoading={isLoading} />
      {content}
      <ModalStepper
        initialFileToEdit={fileToEdit}
        initialStep={modalInitialStep}
        isOpen={isModalOpen}
        onClosed={handleModalClose}
        onRemoveFileFromDataToDelete={handleRemoveFileFromDataToDelete}
        onToggle={handleClickToggleModal}
        refetchData={fetchListData}
      />
      <PopUpWarning
        isOpen={isPopupOpen}
        isConfirmButtonLoading={showModalConfirmButtonLoading}
        onConfirm={handleConfirmDeleteMedias}
        onClosed={handleClosedModalDeleteAll}
        toggleModal={handleClickTogglePopup}
        popUpWarningType="danger"
      />
      <Padded bottom size="md" />
      <Padded bottom size="md" />
    </Container>
  );
};

export default HomePage;
