import PropTypes from 'prop-types';
import React, { memo, useMemo } from 'react';
import { useIntl } from 'react-intl';

import { RelationInput, useCMEditViewDataManager, NotAllowedInput } from '@strapi/helper-plugin';

import { useRelation } from '../../hooks/useRelation';
import { connect, select, filterRemovedRelations } from './utils';
import { getRequestUrl } from '../../utils';

export const RelationInputWrapper = ({
  editable,
  description,
  intlLabel,
  isFieldAllowed,
  isFieldReadable,
  labelAction,
  name,
  queryInfos: { endpoints },
  relationType,
}) => {
  const { formatMessage } = useIntl();
  const { addRelation, removeRelation, modifiedData, isCreatingEntry, slug, initialData } = useCMEditViewDataManager();

  const { relations, search, searchFor } = useRelation({
    name,
    endpoints: {
      ...endpoints,
      ...(!isCreatingEntry && { fetch: getRequestUrl(`${slug}/${initialData.id}/${name}`) })
    },
  });

  const isMorph = useMemo(() => relationType.toLowerCase().includes('morph'), [relationType]);
  const isSingleRelation = [
    'oneWay',
    'oneToOne',
    'manyToOne',
    'oneToManyMorph',
    'oneToOneMorph',
  ].includes(relationType);

  const isDisabled = useMemo(() => {
    if (isMorph) {
      return true;
    }

    if (!isCreatingEntry) {
      return (!isFieldAllowed && isFieldReadable) || !editable;
    }

    return !editable;
  }, [isMorph, isCreatingEntry, editable, isFieldAllowed, isFieldReadable]);

  const handleRelationAdd = (relation) => {
    if (isSingleRelation) {
      // TODO remove all relations from relations before
    }

    addRelation({ target: { name, value: relation } });
  };

  const handleRelationRemove = (relation) => {
    removeRelation({ target: { name, value: relation } });
  };

  const handleRelationLoadMore = () => {
    relations.fetchNextPage();
  };

  const handleSearch = (term) => {
    searchFor(term);
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
      disabled={isDisabled}
      id={name}
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
      relations={filterRemovedRelations(relations, modifiedData)}
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
  // eslint-disable-next-line react/no-unused-prop-types
  targetModel: PropTypes.string.isRequired,
  queryInfos: PropTypes.shape({
    containsKey: PropTypes.string.isRequired,
    defaultParams: PropTypes.object,
    endpoints: PropTypes.shape({
      search: PropTypes.string.isRequired,
    }).isRequired,
    shouldDisplayRelationLink: PropTypes.bool.isRequired,
    paramsToKeep: PropTypes.array,
  }).isRequired,
};

const Memoized = memo(RelationInputWrapper);

export default connect(Memoized, select);
