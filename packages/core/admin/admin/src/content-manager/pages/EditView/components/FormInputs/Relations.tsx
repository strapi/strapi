import * as React from 'react';

import {
  Box,
  Combobox,
  ComboboxOption,
  Flex,
  Icon,
  IconButton,
  Status,
  TextButton,
  Tooltip,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import { useFocusInputField, useNotification, useQueryParams } from '@strapi/helper-plugin';
import { Cross, Drag, Refresh } from '@strapi/icons';
import { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import pipe from 'lodash/fp/pipe';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import styled from 'styled-components';

import { RelationResult } from '../../../../../../../../content-manager/dist/shared/contracts/relations';
import { type InputProps, useField, useForm } from '../../../../../components/Form';
import { useComposedRefs } from '../../../../../utils/refs';
import { capitalise } from '../../../../../utils/strings';
import { COLLECTION_TYPES } from '../../../../constants/collections';
import { ItemTypes } from '../../../../constants/dragAndDrop';
import { useDoc } from '../../../../hooks/useDocument';
import {
  DROP_SENSITIVITY,
  UseDragAndDropOptions,
  useDragAndDrop,
} from '../../../../hooks/useDragAndDrop';
import { useGetRelationsQuery, useLazySearchRelationsQuery } from '../../../../services/relations';
import { buildValidParams } from '../../../../utils/api';
import { getTranslation } from '../../../../utils/translations';

import type { EditFieldLayout } from '../../../../hooks/useDocumentLayout';
import type { Attribute } from '@strapi/types';

/* -------------------------------------------------------------------------------------------------
 * RelationsField
 * -----------------------------------------------------------------------------------------------*/
const RELATIONS_TO_DISPLAY = 5;

interface Relation extends Contracts.Relations.RelationResult {
  href: string;
  label: string;
  [key: string]: any;
}

interface RelationsFieldProps
  extends Omit<Extract<EditFieldLayout, { type: 'relation' }>, 'size' | 'hint'>,
    Pick<InputProps, 'hint'> {
  mainField?: string;
}

interface RelationsFormValue {
  connect?: Relation[];
  disconnect?: Relation[];
}

const RelationsField = React.forwardRef<HTMLDivElement, RelationsFieldProps>(
  ({ disabled, label, ...props }, ref) => {
    const [currentPage, setCurrentPage] = React.useState(1);
    const { id, model } = useDoc();
    const { formatMessage } = useIntl();
    const [{ query }] = useQueryParams();
    const params = buildValidParams(query);

    const isMorph = props.attribute.relation.toLowerCase().includes('morph');
    const isDisabled = isMorph || disabled;

    const { data, isLoading, isFetching } = useGetRelationsQuery(
      {
        model,
        targetField: props.name,
        // below we don't run the query if there is no id.
        id: id!,
        params: {
          ...params,
          pageSize: RELATIONS_TO_DISPLAY,
          page: currentPage,
        },
      },
      {
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

    const field = useField<RelationsFormValue>(props.name);

    const isFetchingMoreRelations = isLoading || isFetching;

    const realServerRelationsCount =
      'pagination' in data && data.pagination ? data.pagination.total : 0;
    const relationsConnected = field.value?.connect?.length ?? 0;
    const relationsDisconnected = field.value?.disconnect?.length ?? 0;

    const relationsCount = realServerRelationsCount + relationsConnected - relationsDisconnected;

    const relations = React.useMemo(() => {
      const ctx = {
        field: field.value,
        // @ts-expect-error – targetModel does exist on the attribute. But it's not typed.
        href: `../${COLLECTION_TYPES}/${props.attribute.targetModel}`,
        mainField: props.mainField,
      };

      const transformations = pipe(removeDisconnected(ctx), addLabelAndHref(ctx));

      return transformations([...data.results, ...(field.value?.connect ?? [])]);
    }, [
      data.results,
      field.value,
      // @ts-expect-error – targetModel does exist on the attribute. But it's not typed.
      props.attribute.targetModel,
      props.mainField,
    ]);

    return (
      <Flex
        ref={ref}
        direction="column"
        gap={3}
        justifyContent="space-between"
        alignItems="stretch"
        wrap="wrap"
      >
        <Flex direction="column" alignItems="start" gap={2} width="100%">
          <RelationsInput
            disabled={isDisabled}
            id={id}
            label={`${label} ${relationsCount > 0 ? `(${relationsCount})` : ''}`}
            model={model}
            {...props}
          />
          {'pagination' in data &&
          data.pagination &&
          data.pagination.pageCount > data.pagination.page ? (
            <TextButton
              disabled={isFetchingMoreRelations}
              onClick={handleLoadMore}
              loading={isFetchingMoreRelations}
              startIcon={<Refresh />}
              // prevent the label from line-wrapping
              shrink={0}
            >
              {formatMessage({
                id: getTranslation('relation.loadMore'),
                defaultMessage: 'Load More',
              })}
            </TextButton>
          ) : null}
        </Flex>
        <RelationsList
          data={relations}
          disabled={isDisabled}
          name={props.name}
          isLoading={isFetchingMoreRelations}
          relationType={props.attribute.relation}
        />
      </Flex>
    );
  }
);

/* -------------------------------------------------------------------------------------------------
 * Relation Transformations
 * -----------------------------------------------------------------------------------------------*/

interface TransformationContext extends Pick<RelationsFieldProps, 'mainField'> {
  field?: RelationsFormValue;
  href: string;
}

const removeDisconnected =
  ({ field }: TransformationContext) =>
  (relations: RelationResult[]): RelationResult[] =>
    relations.filter((relation) => {
      const disconnectedRelations = field?.disconnect ?? [];

      return (
        disconnectedRelations.findIndex((rel) => rel.documentId === relation.documentId) === -1
      );
    });

const addLabelAndHref =
  ({ mainField, href }: TransformationContext) =>
  (relations: RelationResult[]): Relation[] =>
    relations.map((relation) => ({
      ...relation,
      label:
        mainField && relation[mainField] && typeof relation[mainField] === 'string'
          ? (relation[mainField] as string)
          : relation.documentId,
      href: `${href}/${relation.documentId}`,
    }));

/* -------------------------------------------------------------------------------------------------
 * RelationsInput
 * -----------------------------------------------------------------------------------------------*/

interface RelationsInputProps extends Omit<RelationsFieldProps, 'type'> {
  id?: string;
  model: string;
}

const RelationsInput = ({
  disabled,
  hint,
  id,
  label,
  model,
  name,
  mainField,
  placeholder,
  required,
}: RelationsInputProps) => {
  const [textValue, setTextValue] = React.useState<string | undefined>('');
  const [searchParams, setSearchParams] = React.useState({
    _q: '',
    page: 1,
  });
  const toggleNotification = useNotification();
  const [{ query }] = useQueryParams();

  const { formatMessage } = useIntl();
  const fieldRef = useFocusInputField(name);
  const field = useField<RelationsFormValue>(name);
  const addFieldRow = useForm('RelationInput', (state) => state.addFieldRow);

  const [searchForTrigger, { data, isLoading }] = useLazySearchRelationsQuery();

  React.useEffect(() => {
    searchForTrigger({
      model,
      targetField: name,
      params: {
        ...buildValidParams(query),
        id: id ?? '',
        pageSize: 10,
        idsToInclude: field.value?.disconnect?.map((rel) => rel.documentId) ?? [],
        idsToOmit: field.value?.connect?.map((rel) => rel.documentId) ?? [],
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

    const relation = options.find((opt) => opt.documentId === relationId);

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
        type: 'warning',
      });

      return;
    }

    addFieldRow(`${name}.connect`, relation);
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
    <Combobox
      ref={fieldRef}
      autocomplete="none"
      error={field.error}
      name={name}
      hint={hint}
      required={required}
      label={label}
      disabled={disabled}
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
    >
      {options.map((opt) => {
        return (
          <Option
            key={opt.documentId}
            textValue={
              mainField && opt[mainField] && typeof opt[mainField] === 'string'
                ? (opt[mainField] as string)
                : opt.documentId
            }
            {...opt}
          />
        );
      })}
    </Combobox>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Option
 * -----------------------------------------------------------------------------------------------*/

interface OptionProps extends Contracts.Relations.RelationResult {
  textValue: string;
}

const Option = ({ documentId, textValue, status }: OptionProps) => {
  const statusVariant =
    status === 'draft' ? 'primary' : status === 'published' ? 'success' : 'alternative';

  return (
    <ComboboxOption value={documentId} textValue={textValue}>
      <Flex gap={2} justifyContent="space-between">
        <Typography ellipsis>{textValue}</Typography>
        <Status showBullet={false} size={'S'} variant={statusVariant}>
          <Typography as="span" variant="omega" fontWeight="bold">
            {capitalise(status)}
          </Typography>
        </Status>
      </Flex>
    </ComboboxOption>
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
  relationType: Attribute.Relation['relation'];
}

const RelationsList = ({ data, disabled, name, isLoading, relationType }: RelationsListProps) => {
  const ariaDescriptionId = React.useId();
  const { formatMessage } = useIntl();
  const listRef = React.useRef<FixedSizeList>(null);
  const outerListRef = React.useRef<HTMLUListElement>(null);
  const [overflow, setOverflow] = React.useState<'top' | 'bottom' | 'top-bottom'>();
  const [liveText, setLiveText] = React.useState('');
  const field = useField<RelationsFormValue>(name);
  const removeFieldRow = useForm('RelationsList', (state) => state.removeFieldRow);
  const addFieldRow = useForm('RelationsList', (state) => state.addFieldRow);

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

  const handleMoveItem: UseDragAndDropOptions['onMoveItem'] = (oldIndex, newIndex) => {
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
    const item = data[index];

    setLiveText(
      formatMessage(
        {
          id: getTranslation('dnd.drop-item'),
          defaultMessage: `{item}, dropped. Final position in list: {position}.`,
        },
        {
          item: item.label ?? item.documentId,
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

  const handleDisconnect: ListItemProps['data']['handleDisconnect'] = (relation) => {
    if (field.value && field.value.connect) {
      /**
       * A relation will exist in the `connect` array _if_ it has
       * been added without saving. In this case, we just remove it
       * from the connect array
       */
      const indexOfRelationInConnectArray = field.value.connect.findIndex(
        (rel) => rel.documentId === relation.documentId
      );

      if (indexOfRelationInConnectArray >= 0) {
        removeFieldRow(`${name}.connect`, indexOfRelationInConnectArray);
        return;
      }
    }

    addFieldRow(`${name}.disconnect`, { documentId: relation.documentId });
  };

  /**
   * These relation types will only ever have one item
   * in their list, so you can't reorder a single item!
   */
  const canReorder = ![
    'oneWay',
    'oneToOne',
    'manyToOne',
    'oneToManyMorph',
    'oneToOneMorph',
  ].includes(relationType);

  const dynamicListHeight =
    data.length > RELATIONS_TO_DISPLAY
      ? Math.min(data.length, RELATIONS_TO_DISPLAY) * (RELATION_ITEM_HEIGHT + RELATION_GUTTER) +
        RELATION_ITEM_HEIGHT / 2
      : Math.min(data.length, RELATIONS_TO_DISPLAY) * (RELATION_ITEM_HEIGHT + RELATION_GUTTER);

  return (
    <ShadowBox overflowDirection={overflow}>
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

const ShadowBox = styled(Box)<{ overflowDirection?: 'top-bottom' | 'top' | 'bottom' }>`
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
    opacity: ${({ overflowDirection }) =>
      overflowDirection === 'top-bottom' || overflowDirection === 'top' ? 1 : 0};
    transition: opacity 0.2s ease-in-out;
  }

  &:after {
    /* TODO: as for DS Table component we would need this to be handled by the DS theme */
    content: '';
    background: linear-gradient(0deg, rgba(3, 3, 5, 0.2) 0%, rgba(0, 0, 0, 0) 100%);
    bottom: 0;
    opacity: ${({ overflowDirection }) =>
      overflowDirection === 'top-bottom' || overflowDirection === 'bottom' ? 1 : 0};
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
  const statusVariant =
    status === 'draft' ? 'primary' : status === 'published' ? 'success' : 'alternative';

  const [{ handlerId, isDragging, handleKeyDown }, relationRef, dropRef, dragRef, dragPreviewRef] =
    useDragAndDrop<
      number,
      { displayedValue: string; status: string; id: string; index: number },
      HTMLDivElement
    >(canDrag && !disabled, {
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
      dropSensitivity: DROP_SENSITIVITY.IMMEDIATE,
    });

  const composedRefs = useComposedRefs<HTMLDivElement>(relationRef, dragRef);

  React.useEffect(() => {
    dragPreviewRef(getEmptyImage());
  }, [dragPreviewRef]);

  return (
    <Box
      style={style}
      as="li"
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
                forwardedAs="div"
                role="button"
                tabIndex={0}
                aria-label={formatMessage({
                  id: getTranslation('components.RelationInput.icon-button-aria-label'),
                  defaultMessage: 'Drag',
                })}
                borderWidth={0}
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
                    <LinkEllipsis forwardedAs={NavLink} to={href}>
                      {label}
                    </LinkEllipsis>
                  ) : (
                    <Typography textColor={disabled ? 'neutral600' : 'primary600'} ellipsis>
                      {label}
                    </Typography>
                  )}
                </Tooltip>
              </Box>
              <Status showBullet={false} size={'S'} variant={statusVariant}>
                <Typography as="span" variant="omega" fontWeight="bold">
                  {capitalise(status)}
                </Typography>
              </Status>
            </Flex>
          </FlexWrapper>
          <Box paddingLeft={4}>
            <DisconnectButton
              disabled={disabled}
              type="button"
              onClick={() => handleDisconnect(relations[index])}
              aria-label={formatMessage({
                id: getTranslation('relation.disconnect'),
                defaultMessage: 'Remove',
              })}
            >
              <Icon width="12px" as={Cross} />
            </DisconnectButton>
          </Box>
        </Flex>
      )}
    </Box>
  );
};

const FlexWrapper = styled(Flex)`
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

export { RelationsField as RelationsInput };
