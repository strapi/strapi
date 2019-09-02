import React from 'react';
import { map } from 'lodash';
import PropTypes from 'prop-types';

import Ico from '../Ico';
import styles from './styles.scss';

function IcoContainer({ icons }) {
  return (
    <div className={styles.icoContainer}>
      {map(icons, (value, key) => <Ico key={key} {...value} />)}
    </div>
  );
}

IcoContainer.propTypes = {
  icons: PropTypes.array,
};

IcoContainer.defaultProps = {
  icons: [{ icoType: 'pencil', onClick: () => {} }, { icoType: 'trash', onClick: () => {} }],
};

export default IcoContainer;
