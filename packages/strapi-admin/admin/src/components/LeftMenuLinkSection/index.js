import React, { useState } from 'react';
import PropTypes from 'prop-types';
import matchSorter from 'match-sorter';
import { sortBy } from 'lodash';
import { FormattedMessage } from 'react-intl';

import LeftMenuLink from '../LeftMenuLink';
import LeftMenuLinkHeader from '../LeftMenuLinkHeader';
import EmptyLinksList from './EmptyLinksList';
import LeftMenuListLink from './LeftMenuListLink';

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
    if (['plugins', 'general'].includes(section)) {
      return link.destination;
    }
    if (link.schema && link.schema.kind) {
      return `/plugins/${link.plugin}/${link.schema.kind}/${link.destination ||
        link.uid}`;
    }

    return `/plugins/${link.plugin}/${link.destination || link.uid}`;
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
