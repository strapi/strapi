/**
 *
 * PageFooter
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { FormattedMessage } from 'react-intl';
import GlobalPagination from '../GlobalPagination';
import Wrapper from './Wrapper';

function PageFooter(props) {
  return (
    <Wrapper className="row" style={props.style}>
      <div className="col-md-6 col-lg-6">
        <form className="form-inline">
          <div className="pageFooterSelectWrapper">
            <select
              className={`form-control`}
              id="params._limit"
              name="params._limit"
              onChange={e => {
                const target = {
                  name: 'params._limit',
                  value: parseInt(e.target.value, 10),
                };
                props.context.emitEvent('willChangeNumberOfEntriesPerPage');
                props.onChangeParams({ target });
              }}
              value={get(props, ['params', '_limit'], 10)}
            >
              {[10, 20, 50, 100].map(value => (
                <option value={value} key={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <label className="pageFooterLabel" htmlFor="params._limit">
            <FormattedMessage id="components.PageFooter.select" />
          </label>
        </form>
      </div>
      <div className="col-md-6 col-lg-6">
        <GlobalPagination
          count={props.count}
          onChangeParams={props.onChangeParams}
          params={props.params}
        />
      </div>
    </Wrapper>
  );
}

PageFooter.defaultProps = {
  context: {},
  count: 1,
  onChangeParams: () => {},
  params: {
    currentPage: 1,
    _limit: 10,
  },
  style: {},
};

PageFooter.propTypes = {
  context: PropTypes.object,
  count: PropTypes.number,
  onChangeParams: PropTypes.func,
  params: PropTypes.object,
  style: PropTypes.object,
};

export default PageFooter;
