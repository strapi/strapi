import React, { useReducer, useState } from 'react';
import { Header } from '@buffetjs/custom';
import { HeaderSearch, useGlobalContext } from 'strapi-helper-plugin';
import getTrad from '../../utils/getTrad';
import Container from '../../components/Container';
import ControlsWrapper from '../../components/ControlsWrapper';
import SelectAll from '../../components/SelectAll';
import SortPicker from '../../components/SortPicker';
// import List from '../../components/List';
import ListEmpty from '../../components/ListEmpty';
import ModalStepper from '../ModalStepper';
import getHeaderLabel from './utils/getHeaderLabel';
import init from './init';
import reducer, { initialState } from './reducer';
import AddFilterCTA from '../../components/AddFilterCTA';

const HomePage = () => {
  const { formatMessage } = useGlobalContext();
  const [reducerState, dispatch] = useReducer(reducer, initialState, init);
  const [isOpen, setIsOpen] = useState(true);
  const { data, dataToDelete, _q } = reducerState.toJS();
  const pluginName = formatMessage({ id: getTrad('plugin.name') });

  const handleClickToggleModal = () => {
    setIsOpen(prev => !prev);
  };
  const handleClearSearch = () => {
    dispatch({
      type: 'ON_CLEAR_SEARCH',
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
        onClick: handleClickToggleModal,
        type: 'button',
      },
    ],
  };

  return (
    <Container>
      <Header {...headerProps} />
      <HeaderSearch
        label={pluginName}
        // TODO: search
        onChange={() => {}}
        onClear={handleClearSearch}
        placeholder={formatMessage({ id: getTrad('search.placeholder') })}
        value={_q}
      />

      <ControlsWrapper>
        <SelectAll />
        <SortPicker>
          <span> Sort By</span>
        </SortPicker>
        <AddFilterCTA />
      </ControlsWrapper>
      <ListEmpty onClick={handleClickToggleModal} />
      {/* <List data={data} /> */}
      <ModalStepper isOpen={isOpen} onToggle={handleClickToggleModal} />
    </Container>
  );
};

export default HomePage;
