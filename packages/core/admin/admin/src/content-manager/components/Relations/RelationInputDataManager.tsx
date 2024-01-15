import * as React from 'react';

import { NotAllowedInput, useCMEditViewDataManager } from '@strapi/helper-plugin';
import get from 'lodash/get';
import pick from 'lodash/pick';
import { MessageDescriptor, useIntl } from 'react-intl';
import { useRouteMatch } from 'react-router-dom';

import { getInitialDataPathUsingTempKeys } from '../../utils/paths';
import { getTranslation } from '../../utils/translations';

import { RelationInput, RelationInputProps } from './RelationInput';
import { useRelation } from './useRelation';
import { diffRelations } from './utils/diffRelations';
import { NormalizedRelation, normalizeRelation } from './utils/normalizeRelations';
import { normalizeSearchResults } from './utils/normalizeSearchResults';

import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';

const PUBLICATION_STATES = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
} as const;

const RELATIONS_TO_DISPLAY = 5;

const SEARCH_RESULTS_TO_DISPLAY = 10;

interface RelationInputDataManagerProps
  extends Pick<
    RelationInputProps,
    'description' | 'error' | 'labelAction' | 'name' | 'required' | 'size'
  > {
  componentUid?: string;
  editable?: boolean;
  intlLabel: MessageDescriptor;
  isUserAllowedToEditField?: boolean;
  isUserAllowedToReadField?: boolean;
  mainField: {
    name: string;
  };
  placeholder?: MessageDescriptor;
  queryInfos: {
    defaultParams?: object;
    shouldDisplayRelationLink?: boolean;
  };
  relationType: string;
  targetModel: string;
}

const RelationInputDataManager = ({
  componentUid,
  name,
  error,
  editable,
  description,
  intlLabel,
  isUserAllowedToEditField,
  isUserAllowedToReadField,
  labelAction,
  mainField,
  placeholder,
  queryInfos: { defaultParams, shouldDisplayRelationLink = false },
  required,
  relationType,
  size,
  targetModel,
}: RelationInputDataManagerProps) => {
  const {
    isCreatingEntry,
    createActionAllowedFields,
    readActionAllowedFields,
    updateActionAllowedFields,
    slug,
    modifiedData,
    initialData,
    relationConnect,
    relationDisconnect,
    relationLoad,
    relationReorder,
  } = useCMEditViewDataManager();

  /**
   * This is our cloning route because the EditView & CloneView share the same UI component
   * We need the origin ID to pre-load the relations into the modifiedData of the new
   * to-be-cloned entity.
   */
  const { params } =
    useRouteMatch<{ origin?: string }>(
      '/content-manager/collection-types/:collectionType/create/clone/:origin'
    ) ?? {};

  const { origin } = params ?? {};
  const isCloningEntry = Boolean(origin);
  const isComponentRelation = Boolean(componentUid);

  const isFieldAllowed = React.useMemo(() => {
    if (isUserAllowedToEditField === true) {
      return true;
    }

    const allowedFields = isCreatingEntry ? createActionAllowedFields : updateActionAllowedFields;

    return allowedFields.includes(name);
  }, [
    isCreatingEntry,
    createActionAllowedFields,
    name,
    isUserAllowedToEditField,
    updateActionAllowedFields,
  ]);

  const isFieldReadable = React.useMemo(() => {
    if (isUserAllowedToReadField) {
      return true;
    }

    const allowedFields = isCreatingEntry ? [] : readActionAllowedFields;

    return allowedFields.includes(name);
  }, [isCreatingEntry, isUserAllowedToReadField, name, readActionAllowedFields]);

  const fieldNameKeys = name.split('.');
  const componentId = componentUid ? get(modifiedData, fieldNameKeys.slice(0, -1))?.id : undefined;

  const entityId = origin || modifiedData.id;

  // /content-manager/relations/[model]/[id]/[field-name]
  const relationFetchEndpoint = React.useMemo(() => {
    if (isCreatingEntry && !origin) {
      return null;
    }

    if (componentUid) {
      // repeatable components and dz are dynamically created
      // if no componentId exists in modifiedData it means that the user just created it
      // there then are no relations to request
      return componentId
        ? `/content-manager/relations/${componentUid}/${componentId}/${fieldNameKeys.at(-1)}`
        : null;
    }

    return `/content-manager/relations/${slug}/${entityId}/${name.split('.').at(-1)}`;
  }, [isCreatingEntry, origin, componentUid, slug, entityId, name, componentId, fieldNameKeys]);

  // /content-manager/relations/[model]/[field-name]
  const relationSearchEndpoint = React.useMemo(() => {
    if (componentUid) {
      return `/content-manager/relations/${componentUid}/${name.split('.').at(-1)}`;
    }

    return `/content-manager/relations/${slug}/${name.split('.').at(-1)}`;
  }, [componentUid, slug, name]);

  const [liveText, setLiveText] = React.useState('');
  const { formatMessage } = useIntl();

  const nameSplit = name.split('.');

  const initialDataPath = getInitialDataPathUsingTempKeys(initialData, modifiedData)(name);

  const relationsFromModifiedData = get(modifiedData, name, []);

  const currentLastPage = Math.ceil(get(initialData, name, []).length / RELATIONS_TO_DISPLAY);

  const { relations, search, searchFor } = useRelation(
    [slug, initialDataPath.join('.'), modifiedData.id, defaultParams],
    {
      relation: {
        enabled: !!relationFetchEndpoint,
        endpoint: relationFetchEndpoint!,
        pageGoal: currentLastPage,
        pageParams: {
          ...defaultParams,
          pageSize: RELATIONS_TO_DISPLAY,
        },
        onLoad(value) {
          relationLoad?.({
            target: {
              initialDataPath: ['initialData', ...initialDataPath],
              modifiedDataPath: ['modifiedData', ...nameSplit],
              value,
            },
          });
        },
        normalizeArguments: {
          mainFieldName: mainField.name,
          shouldAddLink: shouldDisplayRelationLink,
          targetModel,
        },
      },
      search: {
        endpoint: relationSearchEndpoint,
        pageParams: {
          ...defaultParams,
          // eslint-disable-next-line no-nested-ternary
          entityId:
            isCreatingEntry || isCloningEntry
              ? undefined
              : isComponentRelation
              ? componentId
              : entityId,
          pageSize: SEARCH_RESULTS_TO_DISPLAY,
        },
      },
    }
  );

  const isMorph = relationType.toLowerCase().includes('morph');
  const toOneRelation = [
    'oneWay',
    'oneToOne',
    'manyToOne',
    'oneToManyMorph',
    'oneToOneMorph',
  ].includes(relationType);

  const isDisabled = React.useMemo(() => {
    if (isMorph) {
      return true;
    }

    if (!isCreatingEntry) {
      return (!isFieldAllowed && isFieldReadable) || !editable;
    }

    return !editable;
  }, [isMorph, isCreatingEntry, editable, isFieldAllowed, isFieldReadable]);

  const handleRelationConnect = (relation: Contracts.Relations.RelationResult) => {
    /**
     * Any relation being added to the store should be normalized so it has it's link.
     */
    const normalizedRelation = normalizeRelation(relation, {
      mainFieldName: mainField.name,
      shouldAddLink: shouldDisplayRelationLink,
      targetModel,
    });

    relationConnect?.({ name, value: normalizedRelation, toOneRelation });
  };

  const handleRelationDisconnect = (relation: NormalizedRelation) => {
    relationDisconnect?.({ name, id: relation.id });
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

  const getItemPos = (index: number) => `${index + 1} of ${relationsFromModifiedData.length}`;

  const handleRelationReorder = (oldIndex: number, newIndex: number) => {
    const item = relationsFromModifiedData[oldIndex];

    setLiveText(
      formatMessage(
        {
          id: getTranslation('dnd.reorder'),
          defaultMessage: '{item}, moved. New position in list: {position}.',
        },
        {
          item: item.mainField ?? item.id,
          position: getItemPos(newIndex),
        }
      )
    );

    relationReorder?.({
      name,
      newIndex,
      oldIndex,
    });
  };

  const handleGrabItem = (index: number) => {
    const item = relationsFromModifiedData[index];

    setLiveText(
      formatMessage(
        {
          id: getTranslation('dnd.grab-item'),
          defaultMessage: `{item}, grabbed. Current position in list: {position}. Press up and down arrow to change position, Spacebar to drop, Escape to cancel.`,
        },
        {
          item: item.mainField ?? item.id,
          position: getItemPos(index),
        }
      )
    );
  };

  const handleDropItem = (index: number) => {
    const item = relationsFromModifiedData[index];

    setLiveText(
      formatMessage(
        {
          id: getTranslation('dnd.drop-item'),
          defaultMessage: `{item}, dropped. Final position in list: {position}.`,
        },
        {
          item: item.mainField ?? item.id,
          position: getItemPos(index),
        }
      )
    );
  };

  const handleCancel = (index: number) => {
    const item = relationsFromModifiedData[index];

    setLiveText(
      formatMessage(
        {
          id: getTranslation('dnd.cancel-item'),
          defaultMessage: '{item}, dropped. Re-order cancelled.',
        },
        {
          item: item.mainField ?? item.id,
        }
      )
    );
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
  const serverRelationsCount = (get(initialData, initialDataPath) ?? []).length;
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
      canReorder={!toOneRelation}
      description={description}
      disabled={isDisabled}
      iconButtonAriaLabel={formatMessage({
        id: getTranslation('components.RelationInput.icon-button-aria-label'),
        defaultMessage: 'Drag',
      })}
      id={name}
      label={`${formatMessage({
        id: intlLabel.id,
        defaultMessage: intlLabel.defaultMessage,
      })} ${totalRelations > 0 ? `(${totalRelations})` : ''}`}
      labelAction={labelAction}
      labelLoadMore={
        !isCreatingEntry || isCloningEntry
          ? formatMessage({
              id: getTranslation('relation.loadMore'),
              defaultMessage: 'Load More',
            })
          : undefined
      }
      labelDisconnectRelation={formatMessage({
        id: getTranslation('relation.disconnect'),
        defaultMessage: 'Remove',
      })}
      listAriaDescription={formatMessage({
        id: getTranslation('dnd.instructions'),
        defaultMessage: `Press spacebar to grab and re-order`,
      })}
      liveText={liveText}
      loadingMessage={formatMessage({
        id: getTranslation('relation.isLoading'),
        defaultMessage: 'Relations are loading',
      })}
      name={name}
      noRelationsMessage={formatMessage({
        id: getTranslation('relation.notAvailable'),
        defaultMessage: 'No relations available',
      })}
      numberOfRelationsToDisplay={RELATIONS_TO_DISPLAY}
      onDropItem={handleDropItem}
      onGrabItem={handleGrabItem}
      onCancel={handleCancel}
      onRelationConnect={handleRelationConnect}
      onRelationDisconnect={handleRelationDisconnect}
      onRelationLoadMore={handleRelationLoadMore}
      onRelationReorder={handleRelationReorder}
      onSearch={(term) => handleSearch(term)}
      onSearchNextPage={() => handleSearchMore()}
      placeholder={formatMessage(
        placeholder || {
          id: getTranslation('relation.add'),
          defaultMessage: 'Add relation',
        }
      )}
      publicationStateTranslations={{
        [PUBLICATION_STATES.DRAFT]: formatMessage({
          id: getTranslation('relation.publicationState.draft'),
          defaultMessage: 'Draft',
        }),

        [PUBLICATION_STATES.PUBLISHED]: formatMessage({
          id: getTranslation('relation.publicationState.published'),
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

export { RelationInputDataManager, PUBLICATION_STATES };
export type { RelationInputDataManagerProps };
