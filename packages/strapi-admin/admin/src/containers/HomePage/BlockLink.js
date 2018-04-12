/**
 *
 * BlockLink
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import cn from 'classnames';
import PropTypes from 'prop-types';

import styles from './styles.scss';

function BlockLink({ content, isDocumentation, link, title }) {
  return (
    <a
      className={cn(
        styles.blockLink,
        isDocumentation ? styles.blockLinkDocumentation : styles.blockLinkCode,
      )}
      href={link}
      target="_blank"
    >
      <FormattedMessage {...title} />
      <FormattedMessage {...content}>{message => <p>{message}</p>}</FormattedMessage>
    </a>
  );
}

BlockLink.propTypes = {
  content: PropTypes.object.isRequired,
  isDocumentation: PropTypes.bool.isRequired,
  link: PropTypes.string.isRequired,
  title: PropTypes.object.isRequired,
};

export default BlockLink;
