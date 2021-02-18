import React from 'react';
import { Button } from '@buffetjs/core';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';

import { getTrad } from '../../utils';
import generateRows from './utils/generateRows';

import CardEmpty from '../CardEmpty';
import Wrapper from './Wrapper';
import IntlText from '../IntlText';

const ListEmpty = ({ canCreate, hasSearchApplied, onClick, numberOfRows }) => {
  const rows = generateRows(numberOfRows);
  const titleId = hasSearchApplied
    ? 'list.assets-empty.title-withSearch'
    : 'list.assets-empty.title';
  const subtitleId = 'list.assets-empty.subtitle';
  const prefixedTitleId = getTrad(titleId);
  const prefixedSubtitleId = getTrad(subtitleId);

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
      {canCreate && (
        <div className="btn-wrapper">
          <IntlText id={prefixedTitleId} fontSize="lg" fontWeight="semiBold" />

          {!hasSearchApplied && (
            <>
              <IntlText id={prefixedSubtitleId} fontSize="md" lineHeight="19px" />
              <div style={{ paddingBottom: '1.1rem' }} />
              <Button color="primary" onClick={onClick} type="button">
                <FormattedMessage id={getTrad('header.actions.upload-assets')} />
              </Button>
            </>
          )}
        </div>
      )}
    </Wrapper>
  );
};

ListEmpty.defaultProps = {
  canCreate: true,
  hasSearchApplied: false,
  onClick: () => {},
  numberOfRows: 3,
};

ListEmpty.propTypes = {
  canCreate: PropTypes.bool,
  hasSearchApplied: PropTypes.bool,
  onClick: PropTypes.func,
  numberOfRows: PropTypes.number,
};

export default ListEmpty;
