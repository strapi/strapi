/**
 *
 *
 * FileIcon
 */

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import Wrapper from './Wrapper';

// TODO : Review this code when API is done
function FileIcon() {
  return (
    <Wrapper type="file">
      <FontAwesomeIcon icon={['far', 'file']} />
    </Wrapper>
  );
}

export default FileIcon;
