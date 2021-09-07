/**
 *
 * StaticLinks
 *
 */

import React from 'react';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Text } from '@strapi/parts/Text';
import { InjectionZone } from '../../../../shared/components';

const StyledLink = styled.a`
  display: flex;
  width: 100%;
  height: 27px;
  padding: 0 20px;
  color: ${({ theme }) => theme.colors.neutral400};
  text-decoration: none;
  span,
  svg {
    margin: auto 0;
  }
  svg {
    margin-right: 10px;
  }

  ${[Text]} {
    color: ${({ theme }) => theme.colors.neutral400};
    margin: auto 0;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.neutral100};
    color: ${({ theme }) => theme.colors.neutral500};

    ${[Text]} {
      color: ${({ theme }) => theme.colors.neutral700};
    }
  }

  ${[Text]} {
    color: ${({ theme }) => theme.colors.neutral600};
  }
`;

const StaticLinks = () => {
  const { formatMessage } = useIntl();
  const staticLinks = [
    {
      icon: 'book',
      label: formatMessage({ id: 'app.components.LeftMenuFooter.documentation' }),
      destination: 'https://strapi.io/documentation',
    },
    {
      icon: 'file',
      label: formatMessage({ id: 'app.static.links.cheatsheet' }),
      destination: 'https://strapi-showcase.s3-us-west-2.amazonaws.com/CheatSheet.pdf',
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
              <Text>{label}</Text>
            </StyledLink>
          </li>
        );
      })}
      <InjectionZone area="admin.tutorials.links" />
    </ul>
  );
};

export default StaticLinks;
