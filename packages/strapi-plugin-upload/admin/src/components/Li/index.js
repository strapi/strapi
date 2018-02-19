/**
 *
 * Li
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

import styles from './styles.scss';

class Li extends React.Component {
  state = { isOpen: false };

  toggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ isOpen: !this.state.isOpen });
  }

  render() {
    const { item } = this.props;

    return (
      <li className={styles.liWrapper}>
        <input value={item.url} style={{ display: 'none' }} ref="inputCopy" />
        <div className={styles.liContainer}>
          <div />
          {Object.keys(item).map((value, key) => {
            if (key === 0) {
              return (
                <div key={key} className={styles.liIconContainer}>
                  <i className={`fa fa-file-${item[value]}-o`} />
                </div>
              );
            }

            if (value !== 'url') {
              return (
                <div key={key}>{item[value]}</div>
              );
            }
          })}
        </div>
      </li>
    );
  }
}

Li.defaultProps = {
  item: {
    type: 'pdf',
    hash: '1234',
    name: 'avatar.pdf',
    updated: '20/11/2017 19:29:54',
    size: '24 B',
    relatedTo: 'John Doe',
  },
};

Li.proptypes = {
  item: PropTypes.object,
};

export default Li;
