/**
 *
 * AddFilterCTA
 *
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';

// Design
import Button from './Button';

function AddFilterCTA() {
  return (
    <Button>
      <FormattedMessage id="content-manager.components.AddFilterCTA.add" />
    </Button>
  );
}

export default AddFilterCTA;
