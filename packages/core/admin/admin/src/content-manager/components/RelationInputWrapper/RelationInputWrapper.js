import PropTypes from 'prop-types';
import React, { memo, useMemo } from 'react';
import { useIntl } from 'react-intl';

import { RelationInput, useCMEditViewDataManager, NotAllowedInput } from '@strapi/helper-plugin';

import { useRelation } from '../../hooks/useRelation';
import { connect, select, normalizeRelations } from './utils';
import { PUBLICATION_STATES } from './constants';

export const RelationInputWrapper = ({
  editable,
  description,
  intlLabel,
  isCreatingEntry,
  isFieldAllowed,
  isFieldReadable,
  labelAction,
  mainField,
  name,
  queryInfos: { endpoints, defaultParams, shouldDisplayRelationLink },
  relationType,
  targetModel,
}) => {
  const { formatMessage } = useIntl();
  const { addRelation, removeRelation, loadRelation, modifiedData } = useCMEditViewDataManager();

  const { relations, search, searchFor } = useRelation(name, {
    relation: {
      endpoint: endpoints.relation,
      onload(data) {
        loadRelation({ target: { name, value: data } });
      },
      pageParams: {
        pageSize: 10,
      },
    },

    search: {
      endpoint: endpoints.search,
      pageParams: {
        ...defaultParams,
        entityId: isCreatingEntry ? undefined : 'id',
        omitIds: isCreatingEntry ? [] : undefined,
        pageSize: 10,
      },
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
      publicationStateTranslations={{
        [PUBLICATION_STATES.DRAFT]: formatMessage({
          id: 'tbd',
          defaultMessage: 'Draft',
        }),

        [PUBLICATION_STATES.PUBLISHED]: formatMessage({
          id: 'tbd',
          defaultMessage: 'Published',
        }),
      }}
      relations={normalizeRelations(relations, {
        deletions: modifiedData?.[name],
        mainFieldName: mainField.name,
        shouldAddLink: shouldDisplayRelationLink,
        targetModel,
      })}
      searchResults={normalizeRelations(search, {
        mainFieldName: mainField.name,
      })}
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
    defaultParams: PropTypes.shape({
      _component: PropTypes.string,
    }),
    endpoints: PropTypes.shape({
      relation: PropTypes.string,
      search: PropTypes.string.isRequired,
    }).isRequired,
    shouldDisplayRelationLink: PropTypes.bool.isRequired,
  }).isRequired,
};

const Memoized = memo(RelationInputWrapper);

export default connect(Memoized, select);
