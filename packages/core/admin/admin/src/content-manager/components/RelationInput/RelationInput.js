import React, { useRef, useState, useMemo, useEffect } from 'react';

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
} from '@strapi/design-system';
import { Cross, Refresh } from '@strapi/icons';
import PropTypes from 'prop-types';
import { FixedSizeList as List } from 'react-window';
import styled from 'styled-components';

import { usePrev } from '../../hooks';

import { Option } from './components/Option';
import { RelationItem } from './components/RelationItem';
import { RelationList } from './components/RelationList';
import { RELATION_GUTTER, RELATION_ITEM_HEIGHT } from './constants';

export const LinkEllipsis = styled(Link)`
  display: block;

  > span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
  }
`;

export const DisconnectButton = styled.button`
  svg path {
    fill: ${({ theme, disabled }) =>
      disabled ? theme.colors.neutral600 : theme.colors.neutral500};
  }

  &:hover svg path,
  &:focus svg path {
    fill: ${({ theme, disabled }) => !disabled && theme.colors.neutral600};
  }
`;

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
}) => {
  const [textValue, setTextValue] = useState('');
  const [overflow, setOverflow] = useState('');

  const listRef = useRef();
  const outerListRef = useRef();

  const { data } = searchResults;

  const relations = paginatedRelations.data;
  const totalNumberOfRelations = relations.length ?? 0;

  const dynamicListHeight = useMemo(
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

  const options = useMemo(
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

  useEffect(() => {
    if (totalNumberOfRelations <= numberOfRelationsToDisplay) {
      return setOverflow('');
    }

    const handleNativeScroll = (e) => {
      const parentScrollContainerHeight = e.target.parentNode.scrollHeight;
      const maxScrollBottom = e.target.scrollHeight - e.target.scrollTop;

      if (e.target.scrollTop === 0) {
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

  const handleMenuOpen = (isOpen) => {
    if (isOpen) {
      onSearch();
    }
  };

  /**
   *
   * @param {number} newIndex
   * @param {number} currentIndex
   *
   * @returns {void}
   */
  const handleUpdatePositionOfRelation = (newIndex, currentIndex) => {
    if (onRelationReorder && newIndex >= 0 && newIndex < relations.length) {
      onRelationReorder(currentIndex, newIndex);
    }
  };

  const previewRelationsLength = usePrev(relations.length);
  /**
   * @type {React.MutableRefObject<'onChange' | 'loadMore'>}
   */
  const updatedRelationsWith = useRef();

  const handleLoadMore = () => {
    updatedRelationsWith.current = 'loadMore';
    onRelationLoadMore();
  };

  useEffect(() => {
    if (updatedRelationsWith.current === 'onChange') {
      setTextValue('');
    }

    if (
      updatedRelationsWith.current === 'onChange' &&
      relations.length !== previewRelationsLength
    ) {
      listRef.current.scrollToItem(relations.length, 'end');
      updatedRelationsWith.current = undefined;
    } else if (
      updatedRelationsWith.current === 'loadMore' &&
      relations.length !== previewRelationsLength
    ) {
      listRef.current.scrollToItem(0, 'start');
      updatedRelationsWith.current = undefined;
    }
  }, [previewRelationsLength, relations]);

  const ariaDescriptionId = `${name}-item-instructions`;

  return (
    <Flex gap={3} justifyContent="space-between" alignItems="end" wrap="wrap">
      <Flex direction="column" alignItems="stretch" basis={size <= 6 ? '100%' : '70%'} gap={2}>
        <Combobox
          autocomplete="list"
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
            onRelationConnect(options.find((opt) => opt.id === relationId));
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
        {shouldDisplayLoadMoreButton && (
          <TextButton
            disabled={paginatedRelations.isLoading || paginatedRelations.isFetchingNextPage}
            onClick={handleLoadMore}
            loading={paginatedRelations.isLoading || paginatedRelations.isFetchingNextPage}
            startIcon={<Refresh />}
          >
            {labelLoadMore}
          </TextButton>
        )}
      </Flex>
      {relations.length > 0 && (
        <RelationList overflow={overflow}>
          <VisuallyHidden id={ariaDescriptionId}>{listAriaDescription}</VisuallyHidden>
          <VisuallyHidden aria-live="assertive">{liveText}</VisuallyHidden>
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
        </RelationList>
      )}
    </Flex>
  );
};

const RelationsResult = PropTypes.shape({
  data: PropTypes.arrayOf(
    PropTypes.shape({
      href: PropTypes.string,
      id: PropTypes.number.isRequired,
      publicationState: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
      mainField: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })
  ),
  hasNextPage: PropTypes.bool,
  isFetchingNextPage: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  isSuccess: PropTypes.bool.isRequired,
});

const SearchResults = PropTypes.shape({
  data: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      href: PropTypes.string,
      mainField: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      publicationState: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    })
  ),
  hasNextPage: PropTypes.bool,
  isLoading: PropTypes.bool.isRequired,
  isSuccess: PropTypes.bool.isRequired,
});

RelationInput.defaultProps = {
  canReorder: false,
  description: undefined,
  disabled: false,
  error: undefined,
  labelAction: null,
  labelLoadMore: null,
  liveText: undefined,
  onCancel: undefined,
  onDropItem: undefined,
  onGrabItem: undefined,
  required: false,
  relations: { data: [] },
  searchResults: { data: [] },
};

RelationInput.propTypes = {
  error: PropTypes.string,
  canReorder: PropTypes.bool,
  description: PropTypes.string,
  disabled: PropTypes.bool,
  iconButtonAriaLabel: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  labelAction: PropTypes.element,
  labelLoadMore: PropTypes.string,
  labelDisconnectRelation: PropTypes.string.isRequired,
  listAriaDescription: PropTypes.string.isRequired,
  liveText: PropTypes.string,
  loadingMessage: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  noRelationsMessage: PropTypes.string.isRequired,
  numberOfRelationsToDisplay: PropTypes.number.isRequired,
  onCancel: PropTypes.func,
  onDropItem: PropTypes.func,
  onGrabItem: PropTypes.func,
  onRelationConnect: PropTypes.func.isRequired,
  onRelationDisconnect: PropTypes.func.isRequired,
  onRelationLoadMore: PropTypes.func.isRequired,
  onRelationReorder: PropTypes.func.isRequired,
  onSearch: PropTypes.func.isRequired,
  onSearchNextPage: PropTypes.func.isRequired,
  placeholder: PropTypes.string.isRequired,
  publicationStateTranslations: PropTypes.shape({
    draft: PropTypes.string.isRequired,
    published: PropTypes.string.isRequired,
  }).isRequired,
  required: PropTypes.bool,
  searchResults: SearchResults,
  size: PropTypes.number.isRequired,
  relations: RelationsResult,
};

/**
 * This is in a seperate component to enforce passing all the props the component requires to react-window
 * to ensure drag & drop correctly works.
 */
const ListItem = ({ data, index, style }) => {
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

ListItem.defaultProps = {
  data: {},
};

ListItem.propTypes = {
  data: PropTypes.shape({
    ariaDescribedBy: PropTypes.string.isRequired,
    canDrag: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,
    handleCancel: PropTypes.func,
    handleDropItem: PropTypes.func,
    handleGrabItem: PropTypes.func,
    iconButtonAriaLabel: PropTypes.string.isRequired,
    labelDisconnectRelation: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    onRelationDisconnect: PropTypes.func.isRequired,
    publicationStateTranslations: PropTypes.shape({
      draft: PropTypes.string.isRequired,
      published: PropTypes.string.isRequired,
    }).isRequired,
    relations: PropTypes.arrayOf(
      PropTypes.shape({
        href: PropTypes.string,
        id: PropTypes.number.isRequired,
        publicationState: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
        mainField: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      })
    ),
    updatePositionOfRelation: PropTypes.func.isRequired,
  }),
  index: PropTypes.number.isRequired,
  style: PropTypes.object.isRequired,
};

export default RelationInput;
