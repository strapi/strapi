import React, { useReducer } from 'react';
import { Header } from '@buffetjs/custom';
import { useGlobalContext } from 'strapi-helper-plugin';
import getTrad from '../../utils/getTrad';
import Container from '../../components/Container';
// import List from '../List';
import getHeaderLabel from './utils/getHeaderLabel';
import init from './init';
import reducer, { initialState } from './reducer';

const HomePage = () => {
  const { formatMessage } = useGlobalContext();
  const [reducerState] = useReducer(reducer, initialState, init);
  const { data, dataToDelete } = reducerState.toJS();

  const headerProps = {
    title: {
      label: 'Media Library',
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
        onClick: () => {},
        type: 'button',
      },
    ],
  };

  return (
    <Container>
      <Header {...headerProps} />
      {/* <List data={data} /> */}
    </Container>
  );
};

export default HomePage;
