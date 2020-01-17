/**
 *
 * StaticLinks
 *
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import StyledLink from './StyledLink';

function StaticLinks() {
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
    <ul className="list">
      {staticLinks.map(link => {
        const { icon, label, destination } = link;

        return (
          <StyledLink to={destination} key={label}>
            <FontAwesomeIcon icon={icon} />
            <FormattedMessage id={`app.components.LeftMenuFooter.${label}`} />
          </StyledLink>
        );
      })}
    </ul>
  );
}

export default StaticLinks;
