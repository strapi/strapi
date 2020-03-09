import React from 'react';
import { Button } from '@buffetjs/core';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';

import { getTrad } from '../../utils';
import generateRows from './utils/generateRows';

import CardEmpty from '../CardEmpty';
import Wrapper from './Wrapper';
import IntlText from '../IntlText';

const ListEmpty = ({ onClick, numberOfRows }) => {
  const rows = generateRows(numberOfRows);

  return (
    <Wrapper className="container-fluid">
      {rows.map(row => {
        return (
          <div className="row" key={row.key}>
            {row.rows.map(key => {
              return (
                <div className="col-xs-12 col-md-6 col-xl-3" key={key}>
                  <CardEmpty />
                </div>
              );
            })}
          </div>
        );
      })}
      <div className="btn-wrapper">
        <IntlText id={getTrad('list.assets-empty.title')} fontSize="lg" fontWeight="semiBold" />
        <IntlText id={getTrad('list.assets-empty.subtitle')} fontSize="md" lineHeight="19px" />
        <div style={{ paddingBottom: '1.1rem' }} />
        <Button color="primary" onClick={onClick} type="button">
          <FormattedMessage id={getTrad('header.actions.upload-assets')} />
        </Button>
      </div>
    </Wrapper>
  );
};

ListEmpty.defaultProps = {
  onClick: () => {},
  numberOfRows: 3,
};

ListEmpty.propTypes = {
  onClick: PropTypes.func,
  numberOfRows: PropTypes.number,
};

export default ListEmpty;
