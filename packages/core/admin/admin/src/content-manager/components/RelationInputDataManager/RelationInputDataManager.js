/* eslint-disable no-nested-ternary */
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
import { connect, select, normalizeSearchResults, diffRelations, normalizeRelation } from './utils';

export const RelationInputDataManager = ({
  error,
  componentId,
  isComponentRelation,
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

  const relationsFromModifiedData = get(modifiedData, name) ?? [];

  const currentLastPage = Math.ceil(relationsFromModifiedData.length / RELATIONS_TO_DISPLAY);

  const { relations, search, searchFor } = useRelation(`${slug}-${name}-${initialData?.id ?? ''}`, {
    name,
    relation: {
      enabled: !!endpoints.relation,
      endpoint: endpoints.relation,
      pageGoal: currentLastPage,
      pageParams: {
        ...defaultParams,
        pageSize: RELATIONS_TO_DISPLAY,
      },
      onLoad: loadRelation,
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
        // eslint-disable-next-line no-nested-ternary
        entityId: isCreatingEntry ? undefined : isComponentRelation ? componentId : initialData.id,
        pageSize: SEARCH_RESULTS_TO_DISPLAY,
      },
    },
  });

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
    /**
     * Any relation being added to the store should be normalized so it has it's link.
     */
    const normalizedRelation = normalizeRelation(relation, {
      mainFieldName: mainField.name,
      shouldAddLink: shouldDisplayRelationLink,
      targetModel,
    });

    connectRelation({ name, value: normalizedRelation, toOneRelation });
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

  const handleSearchMore = () => {
    search.fetchNextPage();
  };

  if (
    (!isFieldAllowed && isCreatingEntry) ||
    (!isCreatingEntry && !isFieldAllowed && !isFieldReadable)
  ) {
    return <NotAllowedInput name={name} intlLabel={intlLabel} labelAction={labelAction} />;
  }

  /**
   * How to calculate the total number of relations even if you don't
   * have them all loaded in the browser.
   *
   * 1. The `infiniteQuery` gives you the total number of relations in the pagination result.
   * 2. You can diff the length of the browserState vs the fetchedServerState to determine if you've
   * either added or removed relations.
   * 3. Add them together, if you've removed relations you'll get a negative number and it'll
   * actually subtract from the total number on the server (regardless of how many you fetched).
   */
  const browserRelationsCount = relationsFromModifiedData.length;
  const serverRelationsCount = (get(initialData, name) ?? []).length;
  const realServerRelationsCount = relations.data?.pages[0]?.pagination?.total ?? 0;
  /**
   * _IF_ theres no relations data and the browserCount is the same as serverCount you can therefore assume
   * that the browser count is correct because we've just _made_ this entry and the in-component hook is now fetching.
   */
  const totalRelations =
    !relations.data && browserRelationsCount === serverRelationsCount
      ? browserRelationsCount
      : browserRelationsCount - serverRelationsCount + realServerRelationsCount;

  return (
    <RelationInput
      error={error}
      description={description}
      disabled={isDisabled}
      id={name}
      label={`${formatMessage({
        id: intlLabel.id,
        defaultMessage: intlLabel.defaultMessage,
      })} ${totalRelations > 0 ? `(${totalRelations})` : ''}`}
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
      loadingMessage={formatMessage({
        id: getTrad('relation.isLoading'),
        defaultMessage: 'Relations are loading',
      })}
      name={name}
      noRelationsMessage={formatMessage({
        id: getTrad('relation.notAvailable'),
        defaultMessage: 'No relations available',
      })}
      numberOfRelationsToDisplay={RELATIONS_TO_DISPLAY}
      onRelationConnect={(relation) => handleRelationConnect(relation)}
      onRelationDisconnect={(relation) => handleRelationDisconnect(relation)}
      onRelationLoadMore={() => handleRelationLoadMore()}
      onSearch={(term) => handleSearch(term)}
      onSearchNextPage={() => handleSearchMore()}
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
        'isSuccess'
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
  isComponentRelation: false,
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
  isComponentRelation: PropTypes.bool,
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
      locale: PropTypes.string,
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
