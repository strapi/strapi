import PropTypes from 'prop-types';
import React, { memo } from 'react';
import { useIntl } from 'react-intl';

import { RelationInput, useCMEditViewDataManager, NotAllowedInput } from '@strapi/helper-plugin';

import { useRelation } from '../../hooks/useRelation';
import { connect, select } from './utils';

export const RelationInputWrapper = ({
  description,
  intlLabel,
  isFieldAllowed,
  isCreatingEntry,
  isFieldReadable,
  labelAction,
  name,
}) => {
  const { formatMessage } = useIntl();
  const { addRelation, removeRelation } = useCMEditViewDataManager();
  const { relations, search, searchFor } = useRelation({
    name,
    relationsToShow: 2,
    relationsToSearch: 2,
  });

  const handleRelationAdd = () => {
    addRelation({ target: { name, value: null } });
  };

  const handleRelationRemove = () => {
    removeRelation({ target: { name, value: null } });
  };

  const handleRelationLoadMore = () => {
    relations.fetchNextPage();
  };

  const handleSearch = () => {
    searchFor('');
  };

  const handleSearchMore = () => {
    search.fetchNextPage();
  };

  if (
    (!isFieldAllowed && isCreatingEntry) ||
    (!isCreatingEntry && !isFieldAllowed && !isFieldReadable)
  ) {
    return <NotAllowedInput intlLabel={intlLabel} labelAction={labelAction} />;
  }

  return (
    <RelationInput
      description={description}
      label={formatMessage(intlLabel)}
      labelLoadMore={formatMessage({
        id: 'tbd',
        defaultMessage: 'Load More',
      })}
      name={name}
      onRelationAdd={() => handleRelationAdd()}
      onRelationRemove={() => handleRelationRemove()}
      onRelationLoadMore={() => handleRelationLoadMore()}
      onSearch={() => handleSearch()}
      onSearchNextPage={() => handleSearchMore()}
      relations={relations}
      searchResults={search}
    />
  );
};

RelationInputWrapper.defaultProps = {
  editable: true,
  description: '',
  labelAction: null,
  isFieldAllowed: true,
  placeholder: null,
};

RelationInputWrapper.propTypes = {
  editable: PropTypes.bool,
  description: PropTypes.string,
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }).isRequired,
  labelAction: PropTypes.element,
  isCreatingEntry: PropTypes.bool.isRequired,
  isFieldAllowed: PropTypes.bool,
  isFieldReadable: PropTypes.bool.isRequired,
  mainField: PropTypes.shape({
    name: PropTypes.string.isRequired,
    schema: PropTypes.shape({
      type: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
  name: PropTypes.string.isRequired,
  placeholder: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }),
  relationType: PropTypes.string.isRequired,
  targetModel: PropTypes.string.isRequired,
  queryInfos: PropTypes.shape({
    containsKey: PropTypes.string.isRequired,
    defaultParams: PropTypes.object,
    endPoint: PropTypes.string.isRequired,
    shouldDisplayRelationLink: PropTypes.bool.isRequired,
    paramsToKeep: PropTypes.array,
  }).isRequired,
};

const Memoized = memo(RelationInputWrapper);

export default connect(Memoized, select);
