import React, { useState } from 'react';
import PropTypes from 'prop-types';
import matchSorter from 'match-sorter';
import { sortBy } from 'lodash';
import { FormattedMessage } from 'react-intl';

import LeftMenuLink from '../LeftMenuLink';
import LeftMenuLinkHeader from '../LeftMenuLinkHeader';
import LeftMenuListLink from './LeftMenuListLink';
import EmptyLinksList from './EmptyLinksList';
import EmptyLinksListWrapper from './EmptyLinksListWrapper';

const LeftMenuLinksSection = ({
  section,
  searchable,
  location,
  links,
  emptyLinksListMessage,
  shrink,
}) => {
  const [search, setSearch] = useState('');

  const filteredList = sortBy(
    matchSorter(links, search, {
      keys: ['label'],
    }),
    'label'
  );

  return (
    <>
      <LeftMenuLinkHeader
        section={section}
        searchable={searchable}
        setSearch={setSearch}
        search={search}
      />
      <LeftMenuListLink shrink={shrink}>
        {filteredList.length > 0 ? (
          filteredList.map((link, index) => (
            <LeftMenuLink
              location={location}
              // There is no id or unique value in the link object for the moment.
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              iconName={link.icon}
              label={link.label}
              destination={link.destination}
              notificationsCount={link.notificationsCount || 0}
              search={link.search}
            />
          ))
        ) : (
          <EmptyLinksListWrapper>
            <FormattedMessage id={emptyLinksListMessage} defaultMessage="No plugins installed yet">
              {msg => <EmptyLinksList>{msg}</EmptyLinksList>}
            </FormattedMessage>
          </EmptyLinksListWrapper>
        )}
      </LeftMenuListLink>
    </>
  );
};

LeftMenuLinksSection.defaultProps = {
  shrink: false,
};

LeftMenuLinksSection.propTypes = {
  section: PropTypes.string.isRequired,
  searchable: PropTypes.bool.isRequired,
  shrink: PropTypes.bool,
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
