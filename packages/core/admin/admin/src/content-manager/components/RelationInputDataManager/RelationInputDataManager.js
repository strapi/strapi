import PropTypes from 'prop-types';
import React, { memo, useMemo } from 'react';
import { useIntl } from 'react-intl';
import get from 'lodash/get';
import pick from 'lodash/pick';

import { useCMEditViewDataManager, NotAllowedInput } from '@strapi/helper-plugin';

import { RelationInput } from '../RelationInput';

import { useRelation } from '../../hooks/useRelation';

import { getTrad } from '../../utils';

import { PUBLICATION_STATES, RELATIONS_TO_DISPLAY, SEARCH_RESULTS_TO_DISPLAY } from './constants';
import { connect, select, normalizeSearchResults, diffRelations } from './utils';

export const RelationInputDataManager = ({
  error,
  componentId,
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
  placeholder,
  required,
  relationType,
  size,
  targetModel,
}) => {
  const { formatMessage } = useIntl();
  const { connectRelation, disconnectRelation, loadRelation, modifiedData, slug, initialData } =
    useCMEditViewDataManager();

  const { relations, search, searchFor } = useRelation(`${slug}-${name}-${initialData?.id ?? ''}`, {
    name,
    relation: {
      enabled: get(initialData, name)?.count !== 0 && !!endpoints.relation,
      endpoint: endpoints.relation,
      pageParams: {
        ...defaultParams,
        pageSize: RELATIONS_TO_DISPLAY,
      },
      onLoadRelationsCallback: loadRelation,
      normalizeArguments: {
        mainFieldName: mainField.name,
        shouldAddLink: shouldDisplayRelationLink,
        targetModel,
      },
    },

    search: {
      endpoint: endpoints.search,
      pageParams: {
        ...defaultParams,
        entityId: isCreatingEntry ? undefined : componentId ?? initialData.id,
        pageSize: SEARCH_RESULTS_TO_DISPLAY,
      },
    },
  });

  const relationsFromModifiedData = get(modifiedData, name) ?? [];

  const isMorph = useMemo(() => relationType.toLowerCase().includes('morph'), [relationType]);
  const toOneRelation = [
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

  const handleRelationConnect = (relation) => {
    connectRelation({ name, value: relation, toOneRelation });
  };

  const handleRelationDisconnect = (relation) => {
    disconnectRelation({ name, id: relation.id });
  };

  const handleRelationLoadMore = () => {
    relations.fetchNextPage();
  };

  const handleSearch = (term = '') => {
    const [connected, disconnected] = diffRelations(
      relationsFromModifiedData,
      get(initialData, name)
    );

    searchFor(term, {
      idsToInclude: disconnected,
      idsToOmit: connected,
    });
  };

  const handleOpenSearch = () => handleSearch();

  const handleSearchMore = () => {
    search.fetchNextPage();
  };

  if (
    (!isFieldAllowed && isCreatingEntry) ||
    (!isCreatingEntry && !isFieldAllowed && !isFieldReadable)
  ) {
    return <NotAllowedInput name={name} intlLabel={intlLabel} labelAction={labelAction} />;
  }

  return (
    <RelationInput
      error={error}
      description={description}
      disabled={isDisabled}
      id={name}
      label={`${formatMessage({
        id: intlLabel.id,
        defaultMessage: intlLabel.defaultMessage,
      })} ${initialData[name]?.count !== undefined ? `(${initialData[name].count})` : ''}`}
      labelAction={labelAction}
      labelLoadMore={
        !isCreatingEntry
          ? formatMessage({
              id: getTrad('relation.loadMore'),
              defaultMessage: 'Load More',
            })
          : null
      }
      labelDisconnectRelation={formatMessage({
        id: getTrad('relation.disconnect'),
        defaultMessage: 'Remove',
      })}
      listHeight={320}
      loadingMessage={() =>
        formatMessage({
          id: getTrad('relation.isLoading'),
          defaultMessage: 'Relations are loading',
        })
      }
      name={name}
      numberOfRelationsToDisplay={RELATIONS_TO_DISPLAY}
      onRelationConnect={(relation) => handleRelationConnect(relation)}
      onRelationDisconnect={(relation) => handleRelationDisconnect(relation)}
      onRelationLoadMore={() => handleRelationLoadMore()}
      onSearch={(term) => handleSearch(term)}
      onSearchNextPage={() => handleSearchMore()}
      onSearchOpen={handleOpenSearch}
      placeholder={formatMessage(
        placeholder || {
          id: getTrad('relation.add'),
          defaultMessage: 'Add relation',
        }
      )}
      publicationStateTranslations={{
        [PUBLICATION_STATES.DRAFT]: formatMessage({
          id: getTrad('relation.publicationState.draft'),
          defaultMessage: 'Draft',
        }),

        [PUBLICATION_STATES.PUBLISHED]: formatMessage({
          id: getTrad('relation.publicationState.published'),
          defaultMessage: 'Published',
        }),
      }}
      relations={pick(
        { ...relations, data: relationsFromModifiedData },
        'data',
        'hasNextPage',
        'isFetchingNextPage',
        'isLoading',
        'isSucess'
      )}
      required={required}
      searchResults={normalizeSearchResults(search, {
        mainFieldName: mainField.name,
      })}
      size={size}
    />
  );
};

RelationInputDataManager.defaultProps = {
  componentId: undefined,
  editable: true,
  error: undefined,
  description: '',
  labelAction: null,
  isFieldAllowed: true,
  placeholder: null,
  required: false,
};

RelationInputDataManager.propTypes = {
  componentId: PropTypes.number,
  editable: PropTypes.bool,
  error: PropTypes.string,
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
  required: PropTypes.bool,
  relationType: PropTypes.string.isRequired,
  size: PropTypes.number.isRequired,
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

const Memoized = memo(RelationInputDataManager);

export default connect(Memoized, select);
