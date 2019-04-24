/**
 *
 * CreateContent
 *
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';

function CreateContent() {
  return (
    <FormattedMessage id="app.components.HomePage.createBlock.content.first">
      {message => (
        <p>
          {message}
          <span style={{ fontStyle: 'italic', fontWeight: '500' }}>Content Type Builder</span>
          <FormattedMessage id="app.components.HomePage.createBlock.content.second" />
          <span style={{ fontStyle: 'italic', fontWeight: '500' }}>"Quick Start"</span>
          <FormattedMessage id="app.components.HomePage.createBlock.content.tutorial" />
        </p>
      )}
    </FormattedMessage>
  );
}

export default CreateContent;
