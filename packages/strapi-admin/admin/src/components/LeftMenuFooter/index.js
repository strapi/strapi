/**
 *
 * LeftMenuFooter
 *
 */

import React from 'react';
import { defineMessages, FormattedMessage } from 'react-intl';
import { PropTypes } from 'prop-types';

import Wrapper from './Wrapper';
import messages from './messages.json';

defineMessages(messages);

function LeftMenuFooter({ version }) {
  return (
    <Wrapper>
      <div className="poweredBy">
        <FormattedMessage
          id={messages.poweredBy.id}
          defaultMessage={messages.poweredBy.defaultMessage}
          key="poweredBy"
        />
        <a key="website" href="https://strapi.io" target="_blank" rel="noopener noreferrer">
          Strapi
        </a>
        &nbsp;
        <a
          href={`https://github.com/strapi/strapi/releases/tag/v${version}`}
          key="github"
          target="_blank"
          rel="noopener noreferrer"
        >
          v{version}
        </a>
      </div>
    </Wrapper>
  );
}

LeftMenuFooter.propTypes = {
  version: PropTypes.string.isRequired,
};

export default LeftMenuFooter;
