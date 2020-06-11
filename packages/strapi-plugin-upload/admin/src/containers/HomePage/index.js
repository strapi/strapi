import React, { useReducer, useRef, useState, useEffect } from 'react';
import { includes, toString, isEqual, intersectionWith } from 'lodash';
import { useHistory, useLocation } from 'react-router-dom';
import { Header } from '@buffetjs/custom';
import { Button } from '@buffetjs/core';
import {
  CheckPermissions,
  PopUpWarning,
  LoadingIndicator,
  useGlobalContext,
  generateFiltersFromSearch,
  generateSearchFromFilters,
  request,
  useQuery,
} from 'strapi-helper-plugin';
import { formatFileForEditing, getRequestUrl, getTrad, getFileModelTimestamps } from '../../utils';
import pluginPermissions from '../../permissions';
import Container from '../../components/Container';
import HomePageContent from './HomePageContent';
import Padded from '../../components/Padded';
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
  const { push } = useHistory();
  const { search } = useLocation();
  const isMounted = useRef(true);
  const { data, dataCount, dataToDelete, isLoading } = reducerState.toJS();
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
    } catch (err) {
      if (isMounted.current) {
        strapi.notification.error('notification.error');
      }
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
        strapi.notification.error('notification.error');
      }
    }

    return null;
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
    const file = formatFileForEditing(data.find(file => toString(file.id) === toString(id)));

    setFileToEdit(file);
    setModalInitialStep('edit');
    handleClickToggleModal();
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
        id: getTrad(getHeaderLabel(dataCount)),
      },
      { number: dataCount }
    ),
    actions: [
      {
        disabled: dataToDelete.length === 0,
        color: 'delete',
        // TradId from the strapi-admin package
        label: formatMessage({ id: 'app.utils.delete' }),
        onClick: () => setIsPopupOpen(true),
        type: 'button',
        Component: buttonProps => (
          <CheckPermissions permissions={pluginPermissions.update}>
            <Button {...buttonProps} />
          </CheckPermissions>
        ),
      },
      {
        disabled: false,
        color: 'primary',
        label: formatMessage({ id: getTrad('header.actions.upload-assets') }),
        onClick: () => handleClickToggleModal(),
        type: 'button',
        Component: buttonProps => (
          <CheckPermissions permissions={pluginPermissions.create}>
            <Button {...buttonProps} />
          </CheckPermissions>
        ),
      },
    ],
  };

  return (
    <Container>
      <Header {...headerProps} isLoading={isLoading} />
      {isLoading ? (
        <>
          <Padded top bottom size="lg" />
          <LoadingIndicator />
        </>
      ) : (
        <HomePageContent
          data={data}
          dataCount={dataCount}
          dataToDelete={dataToDelete}
          onCardCheck={handleChangeCheck}
          onCardClick={handleClickEditFile}
          onClick={handleClickToggleModal}
          onFilterDelete={handleDeleteFilter}
          onParamsChange={handleChangeParams}
          onSelectAll={handleSelectAll}
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
