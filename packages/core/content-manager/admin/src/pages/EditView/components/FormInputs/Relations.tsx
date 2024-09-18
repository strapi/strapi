import * as React from 'react';

import {
  type InputProps,
  useField,
  useForm,
  useNotification,
  useFocusInputField,
  useQueryParams,
} from '@strapi/admin/strapi-admin';
import {
  Box,
  Combobox,
  ComboboxOption,
  Flex,
  IconButton,
  TextButton,
  Tooltip,
  Typography,
  VisuallyHidden,
  useComposedRefs,
  Link,
  Field,
  FlexComponent,
  BoxComponent,
} from '@strapi/design-system';
import { Cross, Drag, ArrowClockwise } from '@strapi/icons';
import { generateNKeysBetween } from 'fractional-indexing';
import pipe from 'lodash/fp/pipe';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import { styled } from 'styled-components';

import { RelationDragPreviewProps } from '../../../../components/DragPreviews/RelationDragPreview';
import { COLLECTION_TYPES } from '../../../../constants/collections';
import { ItemTypes } from '../../../../constants/dragAndDrop';
import { useDoc } from '../../../../hooks/useDocument';
import { type EditFieldLayout } from '../../../../hooks/useDocumentLayout';
import {
  DROP_SENSITIVITY,
  UseDragAndDropOptions,
  useDragAndDrop,
} from '../../../../hooks/useDragAndDrop';
import {
  useGetRelationsQuery,
  useLazySearchRelationsQuery,
  RelationResult,
} from '../../../../services/relations';
import { buildValidParams } from '../../../../utils/api';
import { getRelationLabel } from '../../../../utils/relations';
import { getTranslation } from '../../../../utils/translations';
import { DocumentStatus } from '../DocumentStatus';

import { useComponent } from './ComponentContext';

import type { Schema } from '@strapi/types';

/**
 * Remove a relation, whether it's been already saved or not.
 * It's used both in RelationsList, where the "remove relation" button is, and in the input,
 * because we sometimes need to remove a previous relation when selecting a new one.
 */
function useHandleDisconnect(fieldName: string, consumerName: string) {
  const field = useField(fieldName);
  const removeFieldRow = useForm(consumerName, (state) => state.removeFieldRow);
  const addFieldRow = useForm(consumerName, (state) => state.addFieldRow);

  const handleDisconnect: ListItemProps['data']['handleDisconnect'] = (relation) => {
    if (field.value && field.value.connect) {
      /**
       * A relation will exist in the `connect` array _if_ it has
       * been added without saving. In this case, we just remove it
       * from the connect array
       */
      const indexOfRelationInConnectArray = field.value.connect.findIndex(
        (rel: NonNullable<RelationsFormValue['connect']>[number]) => rel.id === relation.id
      );

      if (indexOfRelationInConnectArray >= 0) {
        removeFieldRow(`${fieldName}.connect`, indexOfRelationInConnectArray);
        return;
      }
    }

    addFieldRow(`${fieldName}.disconnect`, { id: relation.id });
  };

  return handleDisconnect;
}

/* -------------------------------------------------------------------------------------------------
 * RelationsField
 * -----------------------------------------------------------------------------------------------*/
const RELATIONS_TO_DISPLAY = 5;
const ONE_WAY_RELATIONS = ['oneWay', 'oneToOne', 'manyToOne', 'oneToManyMorph', 'oneToOneMorph'];

type RelationPosition =
  | (Pick<RelationResult, 'status' | 'locale'> & {
      before: string;
      end?: never;
    })
  | { end: boolean; before?: never; status?: never; locale?: never };

interface Relation extends Pick<RelationResult, 'documentId' | 'id' | 'locale' | 'status'> {
  href: string;
  label: string;
  position?: RelationPosition;
  __temp_key__: string;
}

interface RelationsFieldProps
  extends Omit<Extract<EditFieldLayout, { type: 'relation' }>, 'size' | 'hint'>,
    Pick<InputProps, 'hint'> {}

export interface RelationsFormValue {
  connect?: Relation[];
  disconnect?: Pick<Relation, 'id'>[];
}

/**
 * TODO: we get a rather ugly flash when we remove a single relation from the list leaving
 * no other relations when we press save. The initial relation re-renders, probably because
 * of the lag in the Form cleaning it's "disconnect" array, whilst our data has not been invalidated.
 *
 * Could we invalidate relation data on the document actions? Should we?
 */

/**
 * @internal
 * @description The relations field holds a lot of domain logic for handling relations which is rather complicated
 * At present we do not expose this to plugin developers, however, they are able to overwrite it themselves should
 * they wish to do so.
 */
const RelationsField = React.forwardRef<HTMLDivElement, RelationsFieldProps>(
  ({ disabled, label, ...props }, ref) => {
    const [currentPage, setCurrentPage] = React.useState(1);
    const { document, model: documentModel } = useDoc();
    const documentId = document?.documentId;
    const { formatMessage } = useIntl();
    const [{ query }] = useQueryParams();
    const params = buildValidParams(query);

    const isMorph = props.attribute.relation.toLowerCase().includes('morph');
    const isDisabled = isMorph || disabled;

    const { id: componentId, uid } = useComponent('RelationsField', ({ uid, id }) => ({ id, uid }));

    /**
     * We'll always have a documentId in a created entry, so we look for a componentId first.
     * Same with `uid` and `documentModel`.
     */
    const id = componentId ? componentId.toString() : documentId;
    const model = uid ?? documentModel;

    /**
     * The `name` prop is a complete path to the field, e.g. `field1.field2.field3`.
     * Where the above example would a nested field within two components, however
     * we only require the field on the component not the complete path since we query
     * individual components. Therefore we split the string and take the last item.
     */
    const [targetField] = props.name.split('.').slice(-1);

    const { data, isLoading, isFetching } = useGetRelationsQuery(
      {
        model,
        targetField,
        // below we don't run the query if there is no id.
        id: id!,
        params: {
          ...params,
          pageSize: RELATIONS_TO_DISPLAY,
          page: currentPage,
        },
      },
      {
        refetchOnMountOrArgChange: true,
        skip: !id,
        selectFromResult: (result) => {
          return {
            ...result,
            data: {
              ...result.data,
              results: result.data?.results ? result.data.results : [],
            },
          };
        },
      }
    );

    const handleLoadMore = () => {
      setCurrentPage((prev) => prev + 1);
    };

    const field = useField(props.name);

    const isFetchingMoreRelations = isLoading || isFetching;

    const realServerRelationsCount =
      'pagination' in data && data.pagination ? data.pagination.total : 0;
    /**
     * Items that are already connected, but reordered would be in
     * this list, so to get an accurate figure, we remove them.
     */
    const relationsConnected =
      (field.value?.connect ?? []).filter(
        (rel: Relation) => data.results.findIndex((relation) => relation.id === rel.id) === -1
      ).length ?? 0;
    const relationsDisconnected = field.value?.disconnect?.length ?? 0;

    const relationsCount = realServerRelationsCount + relationsConnected - relationsDisconnected;

    /**
     * This is it, the source of truth for reordering in conjunction with partial loading & updating
     * of relations. Relations on load are given __temp_key__ when fetched, because we don't want to
     * create brand new keys everytime the data updates, just keep adding them onto the newly loaded ones.
     */
    const relations = React.useMemo(() => {
      const ctx = {
        field: field.value,
        // @ts-expect-error – targetModel does exist on the attribute. But it's not typed.
        href: `../${COLLECTION_TYPES}/${props.attribute.targetModel}`,
        mainField: props.mainField,
      };

      /**
       * Tidy up our data.
       */
      const transformations = pipe(
        removeConnected(ctx),
        removeDisconnected(ctx),
        addLabelAndHref(ctx)
      );

      const transformedRels = transformations([...data.results]);

      /**
       * THIS IS CRUCIAL. If you don't sort by the __temp_key__ which comes from fractional indexing
       * then the list will be in the wrong order.
       */
      return [...transformedRels, ...(field.value?.connect ?? [])].sort((a, b) => {
        if (a.__temp_key__ < b.__temp_key__) return -1;
        if (a.__temp_key__ > b.__temp_key__) return 1;
        return 0;
      });
    }, [
      data.results,
      field.value,
      // @ts-expect-error – targetModel does exist on the attribute. But it's not typed.
      props.attribute.targetModel,
      props.mainField,
    ]);

    const handleDisconnect = useHandleDisconnect(props.name, 'RelationsField');

    const handleConnect: RelationsInputProps['onChange'] = (relation) => {
      const [lastItemInList] = relations.slice(-1);

      const item = {
        id: relation.id,
        status: relation.status,
        /**
         * If there's a last item, that's the first key we use to generate out next one.
         */
        __temp_key__: generateNKeysBetween(lastItemInList?.__temp_key__ ?? null, null, 1)[0],
        // Fallback to `id` if there is no `mainField` value, which will overwrite the above `id` property with the exact same data.
        [props.mainField?.name ?? 'documentId']: relation[props.mainField?.name ?? 'documentId'],
        label: getRelationLabel(relation, props.mainField),
        // @ts-expect-error – targetModel does exist on the attribute, but it's not typed.
        href: `../${COLLECTION_TYPES}/${props.attribute.targetModel}/${relation.documentId}`,
      };

      if (ONE_WAY_RELATIONS.includes(props.attribute.relation)) {
        // Remove any existing relation so they can be replaced with the new one
        field.value?.connect?.forEach(handleDisconnect);
        relations.forEach(handleDisconnect);

        field.onChange(`${props.name}.connect`, [item]);
      } else {
        field.onChange(`${props.name}.connect`, [...(field.value?.connect ?? []), item]);
      }
    };

    return (
      <Flex
        ref={ref}
        direction="column"
        gap={3}
        justifyContent="space-between"
        alignItems="stretch"
        wrap="wrap"
      >
        <StyledFlex direction="column" alignItems="start" gap={2} width="100%">
          <RelationsInput
            disabled={isDisabled}
            id={id}
            label={`${label} ${relationsCount > 0 ? `(${relationsCount})` : ''}`}
            model={model}
            onChange={handleConnect}
            {...props}
          />
          {'pagination' in data &&
          data.pagination &&
          data.pagination.pageCount > data.pagination.page ? (
            <TextButton
              disabled={isFetchingMoreRelations}
              onClick={handleLoadMore}
              loading={isFetchingMoreRelations}
              startIcon={<ArrowClockwise />}
              // prevent the label from line-wrapping
              shrink={0}
            >
              {formatMessage({
                id: getTranslation('relation.loadMore'),
                defaultMessage: 'Load More',
              })}
            </TextButton>
          ) : null}
        </StyledFlex>
        <RelationsList
          data={relations}
          serverData={data.results}
          disabled={isDisabled}
          name={props.name}
          isLoading={isFetchingMoreRelations}
          relationType={props.attribute.relation}
        />
      </Flex>
    );
  }
);

/**
 * TODO: this can be removed once we stop shipping Inputs with
 * labels wrapped round in DS@2.
 */
const StyledFlex = styled<FlexComponent>(Flex)`
  & > div {
    width: 100%;
  }
`;

/* -------------------------------------------------------------------------------------------------
 * Relation Transformations
 * -----------------------------------------------------------------------------------------------*/

interface TransformationContext extends Pick<RelationsFieldProps, 'mainField'> {
  field?: RelationsFormValue;
  href: string;
}

/**
 * If it's in the connected array, it can get out of our data array,
 * we'll be putting it back in later and sorting it anyway.
 */
const removeConnected =
  ({ field }: TransformationContext) =>
  (relations: RelationResult[]) => {
    return relations.filter((relation) => {
      const connectedRelations = field?.connect ?? [];

      return connectedRelations.findIndex((rel) => rel.id === relation.id) === -1;
    });
  };

/**
 * @description Removes relations that are in the `disconnect` array of the field
 */
const removeDisconnected =
  ({ field }: TransformationContext) =>
  (relations: RelationResult[]): RelationResult[] =>
    relations.filter((relation) => {
      const disconnectedRelations = field?.disconnect ?? [];

      return disconnectedRelations.findIndex((rel) => rel.id === relation.id) === -1;
    });

/**
 * @description Adds a label and href to the relation object we use this to render
 * a better UI where we can link to the relation and display a human-readable label.
 */
const addLabelAndHref =
  ({ mainField, href }: TransformationContext) =>
  (relations: RelationResult[]): Relation[] =>
    relations.map((relation) => {
      return {
        ...relation,
        // Fallback to `id` if there is no `mainField` value, which will overwrite the above `documentId` property with the exact same data.
        [mainField?.name ?? 'documentId']: relation[mainField?.name ?? 'documentId'],
        label: getRelationLabel(relation, mainField),
        href: `${href}/${relation.documentId}`,
      };
    });

/* -------------------------------------------------------------------------------------------------
 * RelationsInput
 * -----------------------------------------------------------------------------------------------*/

interface RelationsInputProps extends Omit<RelationsFieldProps, 'type'> {
  id?: string;
  model: string;
  onChange: (
    relation: Pick<RelationResult, 'documentId' | 'id' | 'locale' | 'status'> & {
      [key: string]: any;
    }
  ) => void;
}

/**
 * @description Contains all the logic for the combobox that can search
 * for relations and then add them to the field's connect array.
 */
const RelationsInput = ({
  hint,
  id,
  model,
  label,
  labelAction,
  name,
  mainField,
  placeholder,
  required,
  unique: _unique,
  'aria-label': _ariaLabel,
  onChange,
  ...props
}: RelationsInputProps) => {
  const [textValue, setTextValue] = React.useState<string | undefined>('');
  const [searchParams, setSearchParams] = React.useState({
    _q: '',
    page: 1,
  });
  const { toggleNotification } = useNotification();
  const [{ query }] = useQueryParams();

  const { formatMessage } = useIntl();
  const fieldRef = useFocusInputField<HTMLInputElement>(name);
  const field = useField<RelationsFormValue>(name);

  const [searchForTrigger, { data, isLoading }] = useLazySearchRelationsQuery();

  /**
   * Because we're using a lazy query, we need to trigger the search
   * when the component mounts and when the search params change.
   * We also need to trigger the search when the field value changes
   * so that we can filter out the relations that are already connected.
   */
  React.useEffect(() => {
    /**
     * The `name` prop is a complete path to the field, e.g. `field1.field2.field3`.
     * Where the above example would a nested field within two components, however
     * we only require the field on the component not the complete path since we query
     * individual components. Therefore we split the string and take the last item.
     */
    const [targetField] = name.split('.').slice(-1);
    searchForTrigger({
      model,
      targetField,
      params: {
        ...buildValidParams(query),
        id: id ?? '',
        pageSize: 10,
        idsToInclude: field.value?.disconnect?.map((rel) => rel.id.toString()) ?? [],
        idsToOmit: field.value?.connect?.map((rel) => rel.id.toString()) ?? [],
        ...searchParams,
      },
    });
  }, [
    field.value?.connect,
    field.value?.disconnect,
    id,
    model,
    name,
    query,
    searchForTrigger,
    searchParams,
  ]);

  const handleSearch = async (search: string) => {
    setSearchParams((s) => ({ ...s, _q: search, page: 1 }));
  };

  const hasNextPage = data?.pagination ? data.pagination.page < data.pagination.pageCount : false;

  const options = data?.results ?? [];

  const handleChange = (relationId?: string) => {
    if (!relationId) {
      return;
    }

    const relation = options.find((opt) => opt.id.toString() === relationId);

    if (!relation) {
      // This is very unlikely to happen, but it ensures we don't have any data for.
      console.error(
        "You've tried to add a relation with an id that does not exist in the options you can see, this is likely a bug with Strapi. Please open an issue."
      );

      toggleNotification({
        message: formatMessage({
          id: getTranslation('relation.error-adding-relation'),
          defaultMessage: 'An error occurred while trying to add the relation.',
        }),
        type: 'danger',
      });

      return;
    }

    /**
     * You need to give this relation a correct _temp_key_ but
     * this component doesn't know about those ones, you can't rely
     * on the connect array because that doesn't hold items that haven't
     * moved. So use a callback to fill in the gaps when connecting.
     *
     */
    onChange(relation);
  };

  const handleLoadMore = () => {
    if (!data || !data.pagination) {
      return;
    } else if (data.pagination.page < data.pagination.pageCount) {
      setSearchParams((s) => ({ ...s, page: s.page + 1 }));
    }
  };

  React.useLayoutEffect(() => {
    setTextValue('');
  }, [field.value]);

  return (
    <Field.Root error={field.error} hint={hint} name={name} required={required}>
      <Field.Label action={labelAction}>{label}</Field.Label>
      <Combobox
        ref={fieldRef}
        name={name}
        autocomplete="list"
        placeholder={
          placeholder ||
          formatMessage({
            id: getTranslation('relation.add'),
            defaultMessage: 'Add relation',
          })
        }
        hasMoreItems={hasNextPage}
        loading={isLoading}
        onOpenChange={() => {
          handleSearch(textValue ?? '');
        }}
        noOptionsMessage={() =>
          formatMessage({
            id: getTranslation('relation.notAvailable'),
            defaultMessage: 'No relations available',
          })
        }
        loadingMessage={formatMessage({
          id: getTranslation('relation.isLoading'),
          defaultMessage: 'Relations are loading',
        })}
        onLoadMore={handleLoadMore}
        textValue={textValue}
        onChange={handleChange}
        onTextValueChange={(text) => {
          setTextValue(text);
        }}
        onInputChange={(event) => {
          handleSearch(event.currentTarget.value);
        }}
        {...props}
      >
        {options.map((opt) => {
          const textValue = getRelationLabel(opt, mainField);

          return (
            <ComboboxOption key={opt.id} value={opt.id.toString()} textValue={textValue}>
              <Flex gap={2} justifyContent="space-between">
                <Typography ellipsis>{textValue}</Typography>
                {opt.status ? <DocumentStatus status={opt.status} /> : null}
              </Flex>
            </ComboboxOption>
          );
        })}
      </Combobox>
      <Field.Error />
      <Field.Hint />
    </Field.Root>
  );
};

/* -------------------------------------------------------------------------------------------------
 * RelationsList
 * -----------------------------------------------------------------------------------------------*/
const RELATION_ITEM_HEIGHT = 50;
const RELATION_GUTTER = 4;

interface RelationsListProps extends Pick<RelationsFieldProps, 'disabled' | 'name'> {
  data: Relation[];
  isLoading?: boolean;
  relationType: Schema.Attribute.RelationKind.Any;
  /**
   * The existing relations connected on the server. We need these to diff against.
   */
  serverData: RelationResult[];
}

const RelationsList = ({
  data,
  serverData,
  disabled,
  name,
  isLoading,
  relationType,
}: RelationsListProps) => {
  const ariaDescriptionId = React.useId();
  const { formatMessage } = useIntl();
  const listRef = React.useRef<FixedSizeList>(null);
  const outerListRef = React.useRef<HTMLUListElement>(null);
  const [overflow, setOverflow] = React.useState<'top' | 'bottom' | 'top-bottom'>();
  const [liveText, setLiveText] = React.useState('');
  const field = useField(name);

  React.useEffect(() => {
    if (data.length <= RELATIONS_TO_DISPLAY) {
      return setOverflow(undefined);
    }

    const handleNativeScroll = (e: Event) => {
      const el = e.target as HTMLUListElement;
      const parentScrollContainerHeight = (el.parentNode as HTMLDivElement).scrollHeight;
      const maxScrollBottom = el.scrollHeight - el.scrollTop;

      if (el.scrollTop === 0) {
        return setOverflow('bottom');
      }

      if (maxScrollBottom === parentScrollContainerHeight) {
        return setOverflow('top');
      }

      return setOverflow('top-bottom');
    };

    const outerListRefCurrent = outerListRef?.current;

    if (!isLoading && data.length > 0 && outerListRefCurrent) {
      outerListRef.current.addEventListener('scroll', handleNativeScroll);
    }

    return () => {
      if (outerListRefCurrent) {
        outerListRefCurrent.removeEventListener('scroll', handleNativeScroll);
      }
    };
  }, [isLoading, data.length]);

  const getItemPos = (index: number) => `${index + 1} of ${data.length}`;

  const handleMoveItem: UseDragAndDropOptions['onMoveItem'] = (newIndex, oldIndex) => {
    const item = data[oldIndex];

    setLiveText(
      formatMessage(
        {
          id: getTranslation('dnd.reorder'),
          defaultMessage: '{item}, moved. New position in list: {position}.',
        },
        {
          item: item.label ?? item.documentId,
          position: getItemPos(newIndex),
        }
      )
    );

    /**
     * Splicing mutates the array, so we need to create a new array
     */
    const newData = [...data];
    const currentRow = data[oldIndex];

    const startKey =
      oldIndex > newIndex ? newData[newIndex - 1]?.__temp_key__ : newData[newIndex]?.__temp_key__;
    const endKey =
      oldIndex > newIndex ? newData[newIndex]?.__temp_key__ : newData[newIndex + 1]?.__temp_key__;

    /**
     * We're moving the relation between two other relations, so
     * we need to generate a new key that keeps the order
     */
    const [newKey] = generateNKeysBetween(startKey, endKey, 1);

    newData.splice(oldIndex, 1);
    newData.splice(newIndex, 0, { ...currentRow, __temp_key__: newKey });

    /**
     * Now we diff against the server to understand what's different so we
     * can keep the connect array nice and tidy. It also needs reversing because
     * we reverse the relations from the server in the first place.
     */
    const connectedRelations = newData
      .reduce<Relation[]>((acc, relation, currentIndex, array) => {
        const relationOnServer = serverData.find(
          (oldRelation) => oldRelation.documentId === relation.documentId
        );

        const relationInFront = array[currentIndex + 1];

        if (!relationOnServer || relationOnServer.__temp_key__ !== relation.__temp_key__) {
          const position = relationInFront
            ? {
                before: relationInFront.documentId,
                locale: relationInFront.locale,
                status: relationInFront.status,
              }
            : { end: true };

          const relationWithPosition: Relation = { ...relation, position };

          return [...acc, relationWithPosition];
        }

        return acc;
      }, [])
      .toReversed();

    field.onChange(`${name}.connect`, connectedRelations);
  };

  const handleGrabItem: UseDragAndDropOptions['onGrabItem'] = (index) => {
    const item = data[index];

    setLiveText(
      formatMessage(
        {
          id: getTranslation('dnd.grab-item'),
          defaultMessage: `{item}, grabbed. Current position in list: {position}. Press up and down arrow to change position, Spacebar to drop, Escape to cancel.`,
        },
        {
          item: item.label ?? item.documentId,
          position: getItemPos(index),
        }
      )
    );
  };

  const handleDropItem: UseDragAndDropOptions['onDropItem'] = (index) => {
    const { href: _href, label, ...item } = data[index];

    setLiveText(
      formatMessage(
        {
          id: getTranslation('dnd.drop-item'),
          defaultMessage: `{item}, dropped. Final position in list: {position}.`,
        },
        {
          item: label ?? item.documentId,
          position: getItemPos(index),
        }
      )
    );
  };

  const handleCancel: UseDragAndDropOptions['onCancel'] = (index) => {
    const item = data[index];

    setLiveText(
      formatMessage(
        {
          id: getTranslation('dnd.cancel-item'),
          defaultMessage: '{item}, dropped. Re-order cancelled.',
        },
        {
          item: item.label ?? item.documentId,
        }
      )
    );
  };

  const handleDisconnect = useHandleDisconnect(name, 'RelationsList');

  /**
   * These relation types will only ever have one item
   * in their list, so you can't reorder a single item!
   */
  const canReorder = !ONE_WAY_RELATIONS.includes(relationType);

  const dynamicListHeight =
    data.length > RELATIONS_TO_DISPLAY
      ? Math.min(data.length, RELATIONS_TO_DISPLAY) * (RELATION_ITEM_HEIGHT + RELATION_GUTTER) +
        RELATION_ITEM_HEIGHT / 2
      : Math.min(data.length, RELATIONS_TO_DISPLAY) * (RELATION_ITEM_HEIGHT + RELATION_GUTTER);

  return (
    <ShadowBox $overflowDirection={overflow}>
      <VisuallyHidden id={ariaDescriptionId}>
        {formatMessage({
          id: getTranslation('dnd.instructions'),
          defaultMessage: `Press spacebar to grab and re-order`,
        })}
      </VisuallyHidden>
      <VisuallyHidden aria-live="assertive">{liveText}</VisuallyHidden>
      {/* @ts-expect-error – width is expected, but we've not needed to pass it before. */}
      <FixedSizeList
        height={dynamicListHeight}
        ref={listRef}
        outerRef={outerListRef}
        itemCount={data.length}
        itemSize={RELATION_ITEM_HEIGHT + RELATION_GUTTER}
        itemData={{
          ariaDescribedBy: ariaDescriptionId,
          canDrag: canReorder,
          disabled,
          handleCancel,
          handleDropItem,
          handleGrabItem,
          handleMoveItem,
          name,
          handleDisconnect,
          relations: data,
        }}
        itemKey={(index) => data[index].id}
        innerElementType="ol"
      >
        {ListItem}
      </FixedSizeList>
    </ShadowBox>
  );
};

const ShadowBox = styled<BoxComponent>(Box)<{
  $overflowDirection?: 'top-bottom' | 'top' | 'bottom';
}>`
  position: relative;
  overflow: hidden;
  flex: 1;

  &:before,
  &:after {
    position: absolute;
    width: 100%;
    height: 4px;
    z-index: 1;
  }

  &:before {
    /* TODO: as for DS Table component we would need this to be handled by the DS theme */
    content: '';
    background: linear-gradient(rgba(3, 3, 5, 0.2) 0%, rgba(0, 0, 0, 0) 100%);
    top: 0;
    opacity: ${({ $overflowDirection }) =>
      $overflowDirection === 'top-bottom' || $overflowDirection === 'top' ? 1 : 0};
    transition: opacity 0.2s ease-in-out;
  }

  &:after {
    /* TODO: as for DS Table component we would need this to be handled by the DS theme */
    content: '';
    background: linear-gradient(0deg, rgba(3, 3, 5, 0.2) 0%, rgba(0, 0, 0, 0) 100%);
    bottom: 0;
    opacity: ${({ $overflowDirection }) =>
      $overflowDirection === 'top-bottom' || $overflowDirection === 'bottom' ? 1 : 0};
    transition: opacity 0.2s ease-in-out;
  }
`;

/* -------------------------------------------------------------------------------------------------
 * ListItem
 * -----------------------------------------------------------------------------------------------*/

interface ListItemProps extends Pick<ListChildComponentProps, 'style' | 'index'> {
  data: {
    ariaDescribedBy: string;
    canDrag?: boolean;
    disabled?: boolean;
    handleCancel: UseDragAndDropOptions['onCancel'];
    handleDropItem: UseDragAndDropOptions['onDropItem'];
    handleGrabItem: UseDragAndDropOptions['onGrabItem'];
    handleMoveItem: UseDragAndDropOptions['onMoveItem'];
    handleDisconnect: (relation: Relation) => void;
    name: string;
    relations: Relation[];
  };
}

const ListItem = ({ data, index, style }: ListItemProps) => {
  const {
    ariaDescribedBy,
    canDrag = false,
    disabled = false,
    handleCancel,
    handleDisconnect,
    handleDropItem,
    handleGrabItem,
    handleMoveItem,
    name,
    relations,
  } = data;
  const { formatMessage } = useIntl();

  const { href, documentId, label, status } = relations[index];

  const [{ handlerId, isDragging, handleKeyDown }, relationRef, dropRef, dragRef, dragPreviewRef] =
    useDragAndDrop<number, Omit<RelationDragPreviewProps, 'width'>, HTMLDivElement>(
      canDrag && !disabled,
      {
        type: `${ItemTypes.RELATION}_${name}`,
        index,
        item: {
          displayedValue: label,
          status,
          id: documentId,
          index,
        },
        onMoveItem: handleMoveItem,
        onDropItem: handleDropItem,
        onGrabItem: handleGrabItem,
        onCancel: handleCancel,
        dropSensitivity: DROP_SENSITIVITY.REGULAR,
      }
    );

  const composedRefs = useComposedRefs<HTMLDivElement>(relationRef, dragRef);

  React.useEffect(() => {
    dragPreviewRef(getEmptyImage());
  }, [dragPreviewRef]);

  return (
    <Box
      style={style}
      tag="li"
      ref={dropRef}
      aria-describedby={ariaDescribedBy}
      cursor={canDrag ? 'all-scroll' : 'default'}
    >
      {isDragging ? (
        <RelationItemPlaceholder />
      ) : (
        <Flex
          paddingTop={2}
          paddingBottom={2}
          paddingLeft={canDrag ? 2 : 4}
          paddingRight={4}
          hasRadius
          borderColor="neutral200"
          background={disabled ? 'neutral150' : 'neutral0'}
          justifyContent="space-between"
          ref={composedRefs}
          data-handler-id={handlerId}
        >
          <FlexWrapper gap={1}>
            {canDrag ? (
              <IconButton
                tag="div"
                role="button"
                tabIndex={0}
                withTooltip={false}
                label={formatMessage({
                  id: getTranslation('components.RelationInput.icon-button-aria-label'),
                  defaultMessage: 'Drag',
                })}
                variant="ghost"
                onKeyDown={handleKeyDown}
                disabled={disabled}
              >
                <Drag />
              </IconButton>
            ) : null}
            <Flex width="100%" minWidth={0} justifyContent="space-between">
              <Box minWidth={0} paddingTop={1} paddingBottom={1} paddingRight={4}>
                <Tooltip description={label}>
                  {href ? (
                    <LinkEllipsis tag={NavLink} to={href} isExternal={false}>
                      {label}
                    </LinkEllipsis>
                  ) : (
                    <Typography textColor={disabled ? 'neutral600' : 'primary600'} ellipsis>
                      {label}
                    </Typography>
                  )}
                </Tooltip>
              </Box>
              {status ? <DocumentStatus status={status} /> : null}
            </Flex>
          </FlexWrapper>
          <Box paddingLeft={4}>
            <IconButton
              onClick={() => handleDisconnect(relations[index])}
              disabled={disabled}
              label={formatMessage({
                id: getTranslation('relation.disconnect'),
                defaultMessage: 'Remove',
              })}
              variant="ghost"
              size="S"
            >
              <Cross />
            </IconButton>
          </Box>
        </Flex>
      )}
    </Box>
  );
};

const FlexWrapper = styled<FlexComponent>(Flex)`
  width: 100%;
  /* Used to prevent endAction to be pushed out of container */
  min-width: 0;

  & > div[role='button'] {
    cursor: all-scroll;
  }
`;

const DisconnectButton = styled.button`
  svg path {
    fill: ${({ theme, disabled }) =>
      disabled ? theme.colors.neutral600 : theme.colors.neutral500};
  }

  &:hover svg path,
  &:focus svg path {
    fill: ${({ theme, disabled }) => !disabled && theme.colors.neutral600};
  }
`;

const LinkEllipsis = styled(Link)`
  display: block;

  & > span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
  }
`;

const RelationItemPlaceholder = () => (
  <Box
    paddingTop={2}
    paddingBottom={2}
    paddingLeft={4}
    paddingRight={4}
    hasRadius
    borderStyle="dashed"
    borderColor="primary600"
    borderWidth="1px"
    background="primary100"
    height={`calc(100% - ${RELATION_GUTTER}px)`}
  />
);

const MemoizedRelationsField = React.memo(RelationsField);

export { MemoizedRelationsField as RelationsInput, FlexWrapper, DisconnectButton, LinkEllipsis };
export type { RelationsFieldProps };
