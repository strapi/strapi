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

import InputSelect from 'components/InputSelect';

import styles from './styles.scss';

function PageFooter(props) {
  return (
    <div className={cn('row', styles.pageFooter)}>
      <div className="col-md-6 col-lg-6">
        <form className="form-inline">
          <div className={styles.pageFooterSelectWrapper}>
            <select
              className={`form-control ${styles.select}`}
              name="params.limit"
              onChange={props.onChangeParams}
              value={get(props, ['params', 'limit'], 10)}
            >
              {[10, 20, 50, 100].map((value, key) => <option value={value} key={value}>{value}</option>)}
            </select>
          </div>
          <label className={styles.pageFooterLabel} htmlFor="params.name">
            <FormattedMessage id="components.PageFooter.select" />
          </label>
        </form>
      </div>
      <div className="col-md-6 col-lg-6">
      </div>
    </div>
  );
}

PageFooter.defaultProps = {};

PageFooter.propTypes = {};

export default PageFooter;
