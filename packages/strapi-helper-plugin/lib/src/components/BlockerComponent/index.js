/**
 *
 * BlockerComponent
 *
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import cn from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';
import ButtonWrapper from './ButtonWrapper';
import Ide from './Ide';
import Wrapper from './Wrapper';

/* eslint-disable react/require-default-props */
function BlockerComponent({
  blockerComponentTitle,
  blockerComponentDescription,
  blockerComponentIcon,
  blockerComponentContent = '',
}) {
  let content;
  switch (blockerComponentContent) {
    case 'renderIde':
      content = renderIde();
      break;
    case 'renderButton':
      content = renderButton();
      break;
    default:
      content = '';
  }

  return (
    <Wrapper>
      <div className="header">
        <div className="icoContainer">
          <FontAwesomeIcon icon={blockerComponentIcon} />
        </div>
        <div>
          <h4>
            <FormattedMessage id={blockerComponentTitle} />
          </h4>
          <p>
            <FormattedMessage id={blockerComponentDescription} />
          </p>
          {content}
        </div>
      </div>
    </Wrapper>
  );
}

const renderIde = () => (
  <Ide>
    <div>
      <pre style={{ whiteSpace: 'pre-wrap' }}>
        <code>strapi develop</code>
      </pre>
      <pre style={{ whiteSpace: 'pre-wrap' }}>
        <code>npm run develop</code>
      </pre>
    </div>
  </Ide>
);

const renderButton = () => (
  <ButtonWrapper>
    <a
      className={cn('primary', 'btn')}
      href="http://strapi.io"
      target="_blank"
      rel="noopener noreferrer"
    >
      Read the documentation
    </a>
  </ButtonWrapper>
);

BlockerComponent.defaultProps = {
  blockerComponentContent: '',
  blockerComponentDescription: 'app.utils.defaultMessage',
  blockerComponentIcon: 'lock',
  blockerComponentTitle: 'app.utils.defaultMessage',
};

BlockerComponent.propTypes = {
  blockerComponentContent: PropTypes.string,
  blockerComponentDescription: PropTypes.string.isRequired,
  blockerComponentIcon: PropTypes.string,
  blockerComponentTitle: PropTypes.string.isRequired,
};

export default BlockerComponent;
