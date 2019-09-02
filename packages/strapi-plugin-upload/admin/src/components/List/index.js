/**
 *
 * List
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import cn from 'classnames';

import Li from '../Li';
import ListHeader from '../ListHeader';

import styles from './styles.scss';

const EmptyLi = () => (
  <li className={styles.emptyLiWrapper}>
    <div>
      <FormattedMessage id="upload.EmptyLi.message" />
    </div>
  </li>
);

function List(props) {
  return (
    <div className={cn('container-fluid', styles.listWrapper)}>
      <div className="row">
        <ul className={styles.ulList}>
          <ListHeader changeSort={props.changeSort} sort={props.sort} />
          {props.data.map((item, key) => (
            <Li
              key={item.hash || key}
              item={item}
            />
          ))}
          {props.data.length === 0 && <EmptyLi />}
        </ul>
      </div>
    </div>
  );
}

List.defaultProps = {
  sort: 'id',
};

List.propTypes = {
  changeSort: PropTypes.func.isRequired,
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  sort: PropTypes.string,
};

export default List;
