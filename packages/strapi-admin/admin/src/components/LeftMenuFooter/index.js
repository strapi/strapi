/**
 *
 * LeftMenuFooter
 *
 */

import React from 'react';
import { defineMessages, FormattedMessage } from 'react-intl';
import { useLocation } from 'react-router-dom';
import { PropTypes } from 'prop-types';
import LeftMenuLink from '../LeftMenuLink';
import Wrapper from './Wrapper';
import messages from './messages.json';

defineMessages(messages);

const LeftMenuFooter = ({ version }) => {
  const location = useLocation();
  const staticLinks = [
    {
      icon: 'book',
      label: 'documentation',
      destination: 'https://strapi.io/documentation',
    },
    {
      icon: 'question-circle',
      label: 'help',
      destination: 'https://strapi.io/help',
    },
  ];

  return (
    <Wrapper>
      <ul className="list">
        {staticLinks.map(link => (
          <LeftMenuLink
            location={location}
            iconName={link.icon}
            label={messages[link.label].id}
            key={link.label}
            destination={link.destination}
          />
        ))}
      </ul>
      <div className="poweredBy">
        <FormattedMessage
          id={messages.poweredBy.id}
          defaultMessage={messages.poweredBy.defaultMessage}
          key="poweredBy"
        />
        <a
          key="website"
          href="https://strapi.io"
          target="_blank"
          rel="noopener noreferrer"
        >
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
};

LeftMenuFooter.propTypes = {
  version: PropTypes.string.isRequired,
};

export default LeftMenuFooter;
