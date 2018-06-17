/**
 *
 * PageFooter
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { get } from 'lodash';
import { FormattedMessage } from 'react-intl';

import GlobalPagination from 'components/GlobalPagination';

import styles from './styles.scss';

function PageFooter(props) {
  return (
    <div className={cn('row', styles.pageFooter)} style={props.style}>
      <div className="col-md-6 col-lg-6">
        <form className="form-inline">
          <div className={styles.pageFooterSelectWrapper}>
            <select
              className={`form-control ${styles.select}`}
              id="params._limit"
              name="params._limit"
              onChange={(e) => {
                const target = {
                  name: 'params._limit',
                  value: parseInt(e.target.value, 10),
                };
                props.onChangeParams({ target });
              }}
              value={get(props, ['params', '_limit'], 10)}
            >
              {[10, 20, 50, 100].map((value) => <option value={value} key={value}>{value}</option>)}
            </select>
          </div>
          <label className={styles.pageFooterLabel} htmlFor="params._limit">
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
    </div>
  );
}

PageFooter.defaultProps = {
  count: 1,
  onChangeParams: () => {},
  params: {
    currentPage: 1,
    _limit: 10,
  },
  style: {},
};

PageFooter.propTypes = {
  count: PropTypes.number,
  onChangeParams: PropTypes.func,
  params: PropTypes.object,
  style: PropTypes.object,
};

export default PageFooter;
