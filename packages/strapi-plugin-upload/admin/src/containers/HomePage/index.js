import React, { useEffect, useReducer, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { Header } from '@buffetjs/custom';
import {
  HeaderSearch,
  PageFooter,
  useGlobalContext,
  generateSearchFromFilters,
} from 'strapi-helper-plugin';
import useQuery from '../../hooks/useQuery';
import getTrad from '../../utils/getTrad';
import Container from '../../components/Container';
import ControlsWrapper from '../../components/ControlsWrapper';
import SelectAll from '../../components/SelectAll';
import SortPicker from '../../components/SortPicker';
import FiltersPicker from '../../components/FiltersPicker';
import FiltersList from '../../components/FiltersList';
// import List from '../../components/List';
import ListEmpty from '../../components/ListEmpty';
import ModalStepper from '../ModalStepper';
import getHeaderLabel from './utils/getHeaderLabel';
import init from './init';
import reducer, { initialState } from './reducer';

const HomePage = () => {
  const { formatMessage } = useGlobalContext();
  const [reducerState, dispatch] = useReducer(reducer, initialState, init);
  const [isOpen, setIsOpen] = useState(false);
  const { push } = useHistory();
  const { search } = useLocation();
  const query = useQuery();
  const { data, dataToDelete, _limit, _page, _sort, _q } = reducerState.toJS();
  const pluginName = formatMessage({ id: getTrad('plugin.name') });

  useEffect(() => {
    const searchParams = getSearchParams();

    Object.keys(searchParams).map(key => {
      return dispatch({
        type: 'ON_QUERY_CHANGE',
        key,
        value: searchParams[key],
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const getSearchParams = () => {
    const params = {};
    query.forEach((value, key) => {
      params[key] = value;
    });

    return params;
  };

  const getUpdatedSearchParams = updatedParams => {
    return {
      ...getSearchParams(),
      ...updatedParams,
    };
  };

  const handleChangeListParams = ({ target: { name, value } }) => {
    const key = name.split('.').pop();

    handleChangeQuery({ key, value });
  };

  const handleChangeParams = ({ key, value }) => {
    const updatedSearch = getUpdatedSearchParams({ [key]: value });
    const newSearch = generateSearchFromFilters(updatedSearch);
    push({ search: newSearch });
  };

  const handleChangeSearch = ({ target: { value } }) => {
    handleChangeQuery({ key: '_q', value });
  };

  const handleChangeSort = ({ target: { value } }) => {
    handleChangeQuery({ key: '_sort', value });
  };

  const handleChangeQuery = ({ key, value }) => {
    dispatch({
      type: 'ON_QUERY_CHANGE',
      key,
      value,
    });

    handleChangeParams({
      key,
      value,
    });
  };

  const handleClearSearch = () => {
    handleChangeSearch({ target: { value: '' } });
  };

  const handleClickToggleModal = () => {
    setIsOpen(prev => !prev);
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
        onClick: handleClickToggleModal,
        type: 'button',
      },
    ],
  };

  const params = {
    _limit: parseInt(_limit, 10),
    _page: parseInt(_page, 10),
  };

  return (
    <Container>
      <Header {...headerProps} />
      <HeaderSearch
        label={pluginName}
        onChange={handleChangeSearch}
        onClear={handleClearSearch}
        placeholder={formatMessage({ id: getTrad('search.placeholder') })}
        value={_q}
      />

      <ControlsWrapper>
        <SelectAll />
        <SortPicker onChange={handleChangeSort} value={_sort} />
        <FiltersPicker />
        <FiltersList />
      </ControlsWrapper>
      <ListEmpty onClick={handleClickToggleModal} />
      {/* <List data={data} /> */}

      <PageFooter
        count={50}
        context={{ emitEvent: () => {} }}
        onChangeParams={handleChangeListParams}
        params={params}
      />
      <ModalStepper isOpen={isOpen} onToggle={handleClickToggleModal} />
    </Container>
  );
};

export default HomePage;
