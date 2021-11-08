import React from 'react';
import { map } from 'lodash';
import PropTypes from 'prop-types';

import Ico from '../Ico';
import Div from './Div';

function IcoContainer({ icons }) {
  return (
    <Div>
      {map(icons, (value, key) => (
        <Ico key={key} {...value} />
      ))}
    </Div>
  );
}

IcoContainer.propTypes = {
  icons: PropTypes.array,
};

IcoContainer.defaultProps = {
  icons: [{ icoType: 'pencil', onClick: () => {} }, { icoType: 'trash', onClick: () => {} }],
};

export default IcoContainer;
