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
  ];

  return (
    <ul className="list">
      {staticLinks.map(link => {
        const { icon, label, destination } = link;

        return (
          <li key={label}>
            <StyledLink href={destination} target="_blank" rel="noopener noreferrer">
              <FontAwesomeIcon icon={icon} />
              <FormattedMessage id={`app.components.LeftMenuFooter.${label}`} />
            </StyledLink>
          </li>
        );
      })}
    </ul>
  );
}

export default StaticLinks;
