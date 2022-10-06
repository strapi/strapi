import PropTypes from 'prop-types';
import React, { memo, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import get from 'lodash/get';

import { useCMEditViewDataManager, NotAllowedInput, useQueryParams } from '@strapi/helper-plugin';

import { RelationInput } from '../RelationInput';
import { useRelation } from '../../hooks/useRelation';
import { connect, select, normalizeRelations } from './utils';
import { PUBLICATION_STATES, RELATIONS_TO_DISPLAY, SEARCH_RESULTS_TO_DISPLAY } from './constants';
import { getTrad } from '../../utils';

export const RelationInputDataManager = ({
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
  const [{ query }] = useQueryParams();

  const { relations, search, searchFor } = useRelation(`${slug}-${name}-${initialData?.id ?? ''}`, {
    relation: {
      enabled: get(initialData, name)?.count !== 0 && !!endpoints.relation,
      endpoint: endpoints.relation,
      pageParams: {
        ...defaultParams,
        locale: query?.plugins?.i18n?.locale,
        pageSize: RELATIONS_TO_DISPLAY,
      },
    },

    search: {
      endpoint: endpoints.search,
      pageParams: {
        ...defaultParams,
        entityId: isCreatingEntry ? undefined : initialData.id,
        locale: query?.plugins?.i18n?.locale,
        pageSize: SEARCH_RESULTS_TO_DISPLAY,
      },
    },
  });

  const relationsFromModifiedData = get(modifiedData, name);
  const stringifiedRelations = JSON.stringify(relations);
  const normalizedRelations = useMemo(
    () =>
      normalizeRelations(relations, {
        modifiedData: relationsFromModifiedData,
        mainFieldName: mainField.name,
        shouldAddLink: shouldDisplayRelationLink,
        targetModel,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      stringifiedRelations,
      modifiedData,
      name,
      mainField.name,
      shouldDisplayRelationLink,
      targetModel,
    ]
  );

  useEffect(() => {
    if (relations.status === 'success') {
      loadRelation({
        target: { name, value: normalizedRelations.data.pages.flat() },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadRelation, relations.status, stringifiedRelations, name]);

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
    connectRelation({ target: { name, value: relation, replace: isSingleRelation } });
  };

  const handleRelationRemove = (relation) => {
    disconnectRelation({ target: { name, value: relation } });
  };

  const handleRelationLoadMore = () => {
    relations.fetchNextPage();
  };

  const handleSearch = (term) => {
    searchFor(term, {
      idsToOmit: relationsFromModifiedData?.connect?.map((relation) => relation.id),
    });
  };

  const handleOpenSearch = () => {
    searchFor('', {
      idsToInclude: relationsFromModifiedData?.disconnect?.map((relation) => relation.id),
      idsToOmit: relationsFromModifiedData?.connect?.map((relation) => relation.id),
    });
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
      label={`${formatMessage({
        id: intlLabel.id,
        defaultMessage: intlLabel.defaultMessage,
      })} ${initialData[name]?.count !== undefined ? `(${initialData[name].count})` : ''}`}
      labelAction={labelAction}
      labelLoadMore={
        // TODO: only display if there are more; derive from count
        !isCreatingEntry &&
        formatMessage({
          id: getTrad('relation.loadMore'),
          defaultMessage: 'Load More',
        })
      }
      listHeight={320}
      loadingMessage={() =>
        formatMessage({
          id: getTrad('relation.isLoading'),
          defaultMessage: 'Relations are loading',
        })
      }
      name={name}
      numberOfRelationsToDisplay={RELATIONS_TO_DISPLAY}
      onRelationAdd={(relation) => handleRelationAdd(relation)}
      onRelationRemove={(relation) => handleRelationRemove(relation)}
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
      relations={normalizedRelations}
      required={required}
      searchResults={normalizeRelations(search, {
        mainFieldName: mainField.name,
        search: 'search',
      })}
      size={size}
    />
  );
};

RelationInputDataManager.defaultProps = {
  editable: true,
  description: '',
  labelAction: null,
  isFieldAllowed: true,
  placeholder: null,
  required: false,
};

RelationInputDataManager.propTypes = {
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
