import * as React from 'react';

import {
  Status,
  Box,
  Link,
  Icon,
  Flex,
  TextButton,
  Typography,
  Tooltip,
  VisuallyHidden,
  Combobox,
  IconButton,
  FlexProps,
  ComboboxOption,
  ComboboxProps,
} from '@strapi/design-system';
import { pxToRem, useFocusInputField } from '@strapi/helper-plugin';
import { Cross, Drag, Refresh } from '@strapi/icons';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { useIntl } from 'react-intl';
import { FixedSizeList, FixedSizeList as List, ListChildComponentProps } from 'react-window';
import styled from 'styled-components';

import {
  UseDragAndDropOptions,
  useDragAndDrop,
  DROP_SENSITIVITY,
} from '../../hooks/useDragAndDrop';
import { usePrev } from '../../hooks/usePrev';
import { ItemTypes } from '../../utils/dragAndDrop';
import { composeRefs } from '../../utils/refs';
import { getTranslation } from '../../utils/translations';

import type { NormalizedRelation } from './utils/normalizeRelations';
import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import type { Entity } from '@strapi/types';

const RELATION_ITEM_HEIGHT = 50;
const RELATION_GUTTER = 4;

/* -------------------------------------------------------------------------------------------------
 * RelationInput
 * -----------------------------------------------------------------------------------------------*/

interface RelationInputProps
  extends Pick<
      ComboboxProps,
      'disabled' | 'error' | 'id' | 'labelAction' | 'placeholder' | 'required'
    >,
    Pick<RelationItemProps, 'onCancel' | 'onDropItem' | 'onGrabItem' | 'iconButtonAriaLabel'> {
  canReorder: boolean;
  description: ComboboxProps['hint'];
  numberOfRelationsToDisplay: number;
  label: string;
  labelLoadMore?: string;
  labelDisconnectRelation: string;
  listAriaDescription: string;
  liveText: string;
  loadingMessage: string;
  name: string;
  noRelationsMessage: string;
  onRelationConnect: (relation: Contracts.Relations.RelationResult) => void;
  onRelationLoadMore: () => void;
  onRelationDisconnect: (relation: NormalizedRelation) => void;
  onRelationReorder?: (currentIndex: number, newIndex: number) => void;
  onSearchNextPage: () => void;
  onSearch: (searchTerm?: string) => void;
  publicationStateTranslations: {
    draft: string;
    published: string;
  };
  relations: {
    data: NormalizedRelation[];
    isLoading: boolean;
    isFetchingNextPage: boolean;
    hasNextPage?: boolean;
  };
  searchResults: {
    data: NormalizedRelation[];
    isLoading: boolean;
    hasNextPage?: boolean;
  };
  size: number;
}

const RelationInput = ({
  canReorder,
  description,
  disabled,
  error,
  iconButtonAriaLabel,
  id,
  name,
  numberOfRelationsToDisplay,
  label,
  labelAction,
  labelLoadMore,
  labelDisconnectRelation,
  listAriaDescription,
  liveText,
  loadingMessage,
  onCancel,
  onDropItem,
  onGrabItem,
  noRelationsMessage,
  onRelationConnect,
  onRelationLoadMore,
  onRelationDisconnect,
  onRelationReorder,
  onSearchNextPage,
  onSearch,
  placeholder,
  publicationStateTranslations,
  required,
  relations: paginatedRelations,
  searchResults,
  size,
}: RelationInputProps) => {
  const [textValue, setTextValue] = React.useState<string | undefined>('');
  const [overflow, setOverflow] = React.useState<'top' | 'bottom' | 'top-bottom'>();

  const listRef = React.useRef<FixedSizeList>(null);
  const outerListRef = React.useRef<HTMLUListElement>(null);

  const fieldRef = useFocusInputField(name);

  const { data } = searchResults;

  const relations = paginatedRelations.data;
  const totalNumberOfRelations = relations.length ?? 0;

  const dynamicListHeight = React.useMemo(
    () =>
      totalNumberOfRelations > numberOfRelationsToDisplay
        ? Math.min(totalNumberOfRelations, numberOfRelationsToDisplay) *
            (RELATION_ITEM_HEIGHT + RELATION_GUTTER) +
          RELATION_ITEM_HEIGHT / 2
        : Math.min(totalNumberOfRelations, numberOfRelationsToDisplay) *
          (RELATION_ITEM_HEIGHT + RELATION_GUTTER),
    [totalNumberOfRelations, numberOfRelationsToDisplay]
  );

  const shouldDisplayLoadMoreButton = !!labelLoadMore && paginatedRelations.hasNextPage;

  const options = React.useMemo(
    () =>
      data
        .flat()
        .filter(Boolean)
        .map((result) => ({
          ...result,
          value: result.id,
          label: result.mainField,
        })),
    [data]
  );

  React.useEffect(() => {
    if (totalNumberOfRelations <= numberOfRelationsToDisplay) {
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

    if (!paginatedRelations.isLoading && relations.length > 0 && outerListRefCurrent) {
      outerListRef.current.addEventListener('scroll', handleNativeScroll);
    }

    return () => {
      if (outerListRefCurrent) {
        outerListRefCurrent.removeEventListener('scroll', handleNativeScroll);
      }
    };
  }, [paginatedRelations, relations, numberOfRelationsToDisplay, totalNumberOfRelations]);

  const handleMenuOpen = (isOpen?: boolean) => {
    if (isOpen) {
      onSearch(textValue);
    }
  };

  const handleUpdatePositionOfRelation = (newIndex: number, currentIndex: number) => {
    if (onRelationReorder && newIndex >= 0 && newIndex < relations.length) {
      onRelationReorder(currentIndex, newIndex);
    }
  };

  const previewRelationsLength = usePrev(relations.length);
  const updatedRelationsWith = React.useRef<'onChange' | 'loadMore'>();

  const handleLoadMore = () => {
    updatedRelationsWith.current = 'loadMore';
    onRelationLoadMore();
  };

  React.useEffect(() => {
    if (updatedRelationsWith.current === 'onChange') {
      setTextValue('');
    }

    if (
      updatedRelationsWith.current === 'onChange' &&
      relations.length !== previewRelationsLength
    ) {
      listRef.current?.scrollToItem(relations.length, 'end');
      updatedRelationsWith.current = undefined;
    } else if (
      updatedRelationsWith.current === 'loadMore' &&
      relations.length !== previewRelationsLength
    ) {
      listRef.current?.scrollToItem(0, 'start');
      updatedRelationsWith.current = undefined;
    }
  }, [previewRelationsLength, relations]);

  const ariaDescriptionId = `${name}-item-instructions`;

  return (
    <Flex
      direction="column"
      gap={3}
      justifyContent="space-between"
      alignItems="stretch"
      wrap="wrap"
    >
      <Flex direction="row" alignItems="end" justifyContent="end" gap={2} width="100%">
        <ComboboxWrapper marginRight="auto" maxWidth={size <= 6 ? '100%' : '70%'} width="100%">
          <Combobox
            ref={fieldRef}
            autocomplete="none"
            error={error}
            name={name}
            hint={description}
            id={id}
            required={required}
            label={label}
            labelAction={labelAction}
            disabled={disabled}
            placeholder={placeholder}
            hasMoreItems={searchResults.hasNextPage}
            loading={searchResults.isLoading}
            onOpenChange={handleMenuOpen}
            noOptionsMessage={() => noRelationsMessage}
            loadingMessage={loadingMessage}
            onLoadMore={() => {
              onSearchNextPage();
            }}
            textValue={textValue}
            onChange={(relationId) => {
              if (!relationId) {
                return;
              }
              onRelationConnect(data.flat().find((opt) => opt.id.toString() === relationId)!);
              updatedRelationsWith.current = 'onChange';
            }}
            onTextValueChange={(text) => {
              setTextValue(text);
            }}
            onInputChange={(event) => {
              onSearch(event.currentTarget.value);
            }}
          >
            {options.map((opt) => {
              return <Option key={opt.id} {...opt} />;
            })}
          </Combobox>
        </ComboboxWrapper>

        {shouldDisplayLoadMoreButton && (
          <TextButton
            disabled={paginatedRelations.isLoading || paginatedRelations.isFetchingNextPage}
            onClick={handleLoadMore}
            loading={paginatedRelations.isLoading || paginatedRelations.isFetchingNextPage}
            startIcon={<Refresh />}
            // prevent the label from line-wrapping
            shrink={0}
          >
            {labelLoadMore}
          </TextButton>
        )}
      </Flex>

      {relations.length > 0 && (
        <ShadowBox overflowDirection={overflow}>
          <VisuallyHidden id={ariaDescriptionId}>{listAriaDescription}</VisuallyHidden>
          <VisuallyHidden aria-live="assertive">{liveText}</VisuallyHidden>
          {/* @ts-expect-error – width is expected, but we've not needed to pass it before. */}
          <List
            height={dynamicListHeight}
            ref={listRef}
            outerRef={outerListRef}
            itemCount={totalNumberOfRelations}
            itemSize={RELATION_ITEM_HEIGHT + RELATION_GUTTER}
            itemData={{
              name,
              ariaDescribedBy: ariaDescriptionId,
              canDrag: canReorder,
              disabled,
              handleCancel: onCancel,
              handleDropItem: onDropItem,
              handleGrabItem: onGrabItem,
              iconButtonAriaLabel,
              labelDisconnectRelation,
              onRelationDisconnect,
              publicationStateTranslations,
              relations,
              updatePositionOfRelation: handleUpdatePositionOfRelation,
            }}
            itemKey={(index) => `${relations[index].mainField}_${relations[index].id}`}
            innerElementType="ol"
          >
            {ListItem}
          </List>
        </ShadowBox>
      )}
    </Flex>
  );
};

const ComboboxWrapper = styled(Box)`
  align-self: flex-start;
`;

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
 * Option
 * -----------------------------------------------------------------------------------------------*/

const Option = ({
  publicationState,
  mainField,
  id,
}: Pick<NormalizedRelation, 'id' | 'mainField' | 'publicationState'>) => {
  const { formatMessage } = useIntl();
  const stringifiedDisplayValue = (mainField ?? id).toString();

  if (publicationState) {
    const isDraft = publicationState === 'draft';
    const draftMessage = {
      id: getTranslation('components.Select.draft-info-title'),
      defaultMessage: 'State: Draft',
    };
    const publishedMessage = {
      id: getTranslation('components.Select.publish-info-title'),
      defaultMessage: 'State: Published',
    };
    const title = isDraft ? formatMessage(draftMessage) : formatMessage(publishedMessage);

    return (
      <ComboboxOption value={id.toString()} textValue={stringifiedDisplayValue}>
        <Flex>
          <StyledBullet title={title} isDraft={isDraft} />
          <Typography ellipsis>{stringifiedDisplayValue}</Typography>
        </Flex>
      </ComboboxOption>
    );
  }

  return (
    <ComboboxOption value={id.toString()} textValue={stringifiedDisplayValue}>
      {stringifiedDisplayValue}
    </ComboboxOption>
  );
};

const StyledBullet = styled.div<{ isDraft?: boolean }>`
  flex-shrink: 0;
  width: ${pxToRem(6)};
  height: ${pxToRem(6)};
  margin-right: ${({ theme }) => theme.spaces[2]};
  background-color: ${({ theme, isDraft }) =>
    theme.colors[isDraft ? 'secondary600' : 'success600']};
  border-radius: 50%;
`;

/* -------------------------------------------------------------------------------------------------
 * ListItem
 * -----------------------------------------------------------------------------------------------*/

/**
 * This is in a separate component to enforce passing all the props the component requires to react-window
 * to ensure drag & drop correctly works.
 */

interface ListItemProps extends Pick<RelationItemProps, 'index' | 'style'> {
  data: Pick<
    RelationItemProps,
    | 'ariaDescribedBy'
    | 'canDrag'
    | 'disabled'
    | 'iconButtonAriaLabel'
    | 'name'
    | 'updatePositionOfRelation'
  > & {
    handleCancel: RelationItemProps['onCancel'];
    handleDropItem: RelationItemProps['onDropItem'];
    handleGrabItem: RelationItemProps['onGrabItem'];
    labelDisconnectRelation: string;
    onRelationDisconnect: (relation: NormalizedRelation) => void;
    publicationStateTranslations: {
      draft: string;
      published: string;
    };
    relations: NormalizedRelation[];
  };
}

const ListItem = ({ data, index, style }: ListItemProps) => {
  const {
    ariaDescribedBy,
    canDrag,
    disabled,
    handleCancel,
    handleDropItem,
    handleGrabItem,
    iconButtonAriaLabel,
    name,
    labelDisconnectRelation,
    onRelationDisconnect,
    publicationStateTranslations,
    relations,
    updatePositionOfRelation,
  } = data;
  const { publicationState, href, mainField, id } = relations[index];
  const statusColor = publicationState === 'draft' ? 'secondary' : 'success';

  return (
    <RelationItem
      ariaDescribedBy={ariaDescribedBy}
      canDrag={canDrag}
      disabled={disabled}
      displayValue={String(mainField ?? id)}
      iconButtonAriaLabel={iconButtonAriaLabel}
      id={id}
      index={index}
      name={name}
      endAction={
        <DisconnectButton
          data-testid={`remove-relation-${id}`}
          disabled={disabled}
          type="button"
          onClick={() => onRelationDisconnect(relations[index])}
          aria-label={labelDisconnectRelation}
        >
          <Icon width="12px" as={Cross} />
        </DisconnectButton>
      }
      onCancel={handleCancel}
      onDropItem={handleDropItem}
      onGrabItem={handleGrabItem}
      status={publicationState || undefined}
      style={{
        ...style,
        bottom: style.bottom ?? 0 + RELATION_GUTTER,
        height: style.height ?? 0 - RELATION_GUTTER,
      }}
      updatePositionOfRelation={updatePositionOfRelation}
    >
      <Box minWidth={0} paddingTop={1} paddingBottom={1} paddingRight={4}>
        <Tooltip description={mainField ?? `${id}`}>
          {href ? (
            <LinkEllipsis to={href}>{mainField ?? id}</LinkEllipsis>
          ) : (
            <Typography textColor={disabled ? 'neutral600' : 'primary600'} ellipsis>
              {mainField ?? id}
            </Typography>
          )}
        </Tooltip>
      </Box>

      {publicationState && (
        <Status variant={statusColor} showBullet={false} size="S">
          <Typography fontWeight="bold" textColor={`${statusColor}700`}>
            {publicationStateTranslations[publicationState]}
          </Typography>
        </Status>
      )}
    </RelationItem>
  );
};

/* -------------------------------------------------------------------------------------------------
 * DisconnectButton
 * -----------------------------------------------------------------------------------------------*/

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

/* -------------------------------------------------------------------------------------------------
 * LinkEllipsis
 * -----------------------------------------------------------------------------------------------*/

const LinkEllipsis = styled(Link)`
  display: block;

  > span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
  }
`;

/* -------------------------------------------------------------------------------------------------
 * RelationItem
 * -----------------------------------------------------------------------------------------------*/

interface RelationItemProps
  extends Pick<UseDragAndDropOptions, 'onCancel' | 'onDropItem' | 'onGrabItem'>,
    Omit<FlexProps, 'id' | 'style'>,
    Pick<ListChildComponentProps, 'style' | 'index'> {
  ariaDescribedBy: string;
  canDrag: boolean;
  children: React.ReactNode;
  displayValue: string;
  disabled: boolean;
  endAction: React.ReactNode;
  iconButtonAriaLabel: string;
  id: Entity.ID;
  name: string;
  status?: NormalizedRelation['publicationState'];
  updatePositionOfRelation: UseDragAndDropOptions['onMoveItem'];
}

const RelationItem = ({
  ariaDescribedBy,
  children,
  displayValue,
  canDrag,
  disabled,
  endAction,
  iconButtonAriaLabel,
  style,
  id,
  index,
  name,
  onCancel,
  onDropItem,
  onGrabItem,
  status,
  updatePositionOfRelation,
  ...props
}: RelationItemProps) => {
  const [{ handlerId, isDragging, handleKeyDown }, relationRef, dropRef, dragRef, dragPreviewRef] =
    useDragAndDrop(canDrag && !disabled, {
      type: `${ItemTypes.RELATION}_${name}`,
      index,
      item: {
        displayedValue: displayValue,
        status,
        id,
        index,
      },
      onMoveItem: updatePositionOfRelation,
      onDropItem,
      onGrabItem,
      onCancel,
      dropSensitivity: DROP_SENSITIVITY.IMMEDIATE,
    });

  const composedRefs = composeRefs(relationRef, dragRef);

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
          ref={canDrag ? composedRefs : undefined}
          data-handler-id={handlerId}
          {...props}
        >
          <FlexWrapper gap={1}>
            {canDrag ? (
              <IconButton
                forwardedAs="div"
                role="button"
                tabIndex={0}
                aria-label={iconButtonAriaLabel}
                borderWidth={0}
                onKeyDown={handleKeyDown}
                disabled={disabled}
              >
                <Drag />
              </IconButton>
            ) : null}
            <ChildrenWrapper justifyContent="space-between">{children}</ChildrenWrapper>
          </FlexWrapper>
          {endAction && <Box paddingLeft={4}>{endAction}</Box>}
        </Flex>
      )}
    </Box>
  );
};

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

const FlexWrapper = styled(Flex)`
  width: 100%;
  /* Used to prevent endAction to be pushed out of container */
  min-width: 0;

  & > div[role='button'] {
    cursor: all-scroll;
  }
`;

const ChildrenWrapper = styled(Flex)`
  width: 100%;
  /* Used to prevent endAction to be pushed out of container */
  min-width: 0;
`;

export { RelationInput, FlexWrapper, ChildrenWrapper, LinkEllipsis, DisconnectButton };
export type { RelationInputProps };
