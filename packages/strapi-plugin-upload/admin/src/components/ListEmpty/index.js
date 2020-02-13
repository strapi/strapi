import React from 'react';
import { Button } from '@buffetjs/core';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import getTrad from '../../utils/getTrad';
import generateRows from './utils/generateRows';
import CardEmpty from '../CardEmpty';
import Wrapper from './Wrapper';

const ListEmpty = ({ onClick }) => {
  const rows = generateRows(3);

  return (
    <Wrapper className="container-fluid">
      {rows.map(row => {
        return (
          <div className="row" key={row.key}>
            {row.rows.map(key => {
              return (
                <div className="col-md-3" key={key}>
                  <CardEmpty />
                </div>
              );
            })}
          </div>
        );
      })}
      <div className="btn-wrapper">
        <FormattedMessage id={getTrad('list.assets-empty.title')}>
          {content => <p className="title">{content}</p>}
        </FormattedMessage>
        <FormattedMessage id={getTrad('list.assets-empty.subtitle')}>
          {content => <p className="subtitle">{content}</p>}
        </FormattedMessage>

        <FormattedMessage id={getTrad('header.actions.upload-assets')}>
          {label => (
            <Button
              color="primary"
              label={label}
              onClick={onClick}
              type="button"
            />
          )}
        </FormattedMessage>
      </div>
    </Wrapper>
  );
};

ListEmpty.defaultProps = {
  onClick: () => {},
};

ListEmpty.propTypes = {
  onClick: PropTypes.func,
};

export default ListEmpty;
