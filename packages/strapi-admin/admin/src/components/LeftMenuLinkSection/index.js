import React, { useState } from 'react';
import PropTypes from 'prop-types';
import matchSorter from 'match-sorter';
import styled from 'styled-components';
import { sortBy } from 'lodash';
import { FormattedMessage } from 'react-intl';

import LeftMenuLink from '../LeftMenuLink';
import LeftMenuLinkHeader from '../LeftMenuLinkHeader';

const LeftMenuListLink = styled.div`
  max-height: 180px;
  overflow: auto;
`;
const EmptyLinksList = styled.div`
  color: ${props => props.theme.main.colors.white};
  padding-left: 1.6rem;
  padding-right: 1.6rem;
  font-weight: 300;
  min-height: 3.6rem;
  padding-top: 0.2rem;
`;

const LeftMenuLinksSection = ({
  section,
  searchable,
  location,
  links,
  emptyLinksListMessage,
}) => {
  const [search, setSearch] = useState('');

  const filteredList = sortBy(
    matchSorter(links, search, {
      keys: ['label'],
    }),
    'label'
  );

  const getLinkDestination = link => {
    return ['plugins', 'general'].includes(section)
      ? link.destination
      : `/plugins/${link.plugin}/${link.destination || link.uid}`;
  };

  return (
    <>
      <LeftMenuLinkHeader
        section={section}
        searchable={searchable}
        setSearch={setSearch}
        search={search}
      />
      <LeftMenuListLink>
        {filteredList.length > 0 ? (
          filteredList.map((link, index) => (
            <LeftMenuLink
              location={location}
              // There is no id or unique value in the link object for the moment.
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              iconName={link.icon}
              label={link.label}
              destination={getLinkDestination(link)}
            />
          ))
        ) : (
          <EmptyLinksList>
            <FormattedMessage
              id={emptyLinksListMessage}
              defaultMessage="No plugins installed yet"
            />
          </EmptyLinksList>
        )}
      </LeftMenuListLink>
    </>
  );
};

LeftMenuLinksSection.propTypes = {
  section: PropTypes.string.isRequired,
  searchable: PropTypes.bool.isRequired,
  location: PropTypes.shape({
    pathname: PropTypes.string,
  }).isRequired,
  links: PropTypes.arrayOf(PropTypes.object).isRequired,
  emptyLinksListMessage: PropTypes.string,
};

LeftMenuLinksSection.defaultProps = {
  emptyLinksListMessage: 'components.ListRow.empty',
};

export default LeftMenuLinksSection;
