import React, { useRef, useState, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { FixedSizeList as List } from 'react-window';
/**
 * TODO: this will come in another PR.
 */
// eslint-disable-next-line no-restricted-imports
import { ReactSelect } from '@strapi/helper-plugin';
import {
  Status,
  Box,
  Link,
  Icon,
  FieldLabel,
  FieldError,
  FieldHint,
  Field,
  TextButton,
  Typography,
  Tooltip,
  VisuallyHidden,
} from '@strapi/design-system';

import { Cross, Refresh } from '@strapi/icons';

import { Relation } from './components/Relation';
import { RelationItem } from './components/RelationItem';
import { RelationList } from './components/RelationList';
import { Option } from './components/Option';
import { RELATION_GUTTER, RELATION_ITEM_HEIGHT } from './constants';

import { usePrev } from '../../hooks';

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
  const [value, setValue] = useState(null);
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

  /**
   * --- ReactSelect Workaround START ---
   */
  /**
   * This code is being isolated because it's a hack to fix a placement bug in
   * `react-select` where when the options prop is updated the position of the
   * menu is not recalculated.
   */
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const timeoutRef = useRef();
  const previousOptions = useRef([]);

  useEffect(() => {
    /**
     * We only really want this effect to fire once when the options
     * change from an empty array to an array with values.
     * Otherwise, it'll fire when the infinite scrolling happens causing
     * the menu to jump to the top all the time when loading more.
     */
    if (options.length > 0 && previousOptions.current.length === 0) {
      setIsMenuOpen((isCurrentlyOpened) => {
        /**
         * If we're currently open and the options changed
         * we want to close and open to ensure the menu's
         * position is correctly calculated
         */
        if (isCurrentlyOpened) {
          timeoutRef.current = setTimeout(() => {
            setIsMenuOpen(true);
          }, 10);

          return false;
        }

        return false;
      });
    }

    return () => {
      previousOptions.current = options || [];
    };
  }, [options]);

  useEffect(() => {
    return () => {
      /**
       * If the component unmounts and a timer is set we should clear that timer
       */
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMenuClose = () => {
    setIsMenuOpen(false);
  };
  /**
   * --- ReactSelect Workaround END ---
   */

  const handleMenuOpen = () => {
    setIsMenuOpen(true);
    onSearch();
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
    if (
      updatedRelationsWith.current === 'onChange' &&
      relations.length !== previewRelationsLength
    ) {
      listRef.current.scrollToItem(relations.length, 'end');
    } else if (
      updatedRelationsWith.current === 'loadMore' &&
      relations.length !== previewRelationsLength
    ) {
      listRef.current.scrollToItem(0, 'start');
    }

    updatedRelationsWith.current = undefined;
  }, [previewRelationsLength, relations]);

  const ariaDescriptionId = `${name}-item-instructions`;

  return (
    <Field error={error} name={name} hint={description} id={id} required={required}>
      <Relation
        totalNumberOfRelations={totalNumberOfRelations}
        size={size}
        search={
          <>
            <FieldLabel action={labelAction}>{label}</FieldLabel>
            <ReactSelect
              // position fixed doesn't update position on scroll
              // react select doesn't update menu position on options change
              menuPosition="absolute"
              menuPlacement="auto"
              components={{ Option }}
              options={options}
              isDisabled={disabled}
              isLoading={searchResults.isLoading}
              error={error}
              inputId={id}
              isSearchable
              isClear
              loadingMessage={() => loadingMessage}
              onChange={(relation) => {
                setValue(null);
                onRelationConnect(relation);
                updatedRelationsWith.current = 'onChange';
              }}
              onInputChange={(value) => {
                setValue(value);
                onSearch(value);
              }}
              onMenuClose={handleMenuClose}
              onMenuOpen={handleMenuOpen}
              menuIsOpen={isMenuOpen}
              noOptionsMessage={() => noRelationsMessage}
              onMenuScrollToBottom={() => {
                if (searchResults.hasNextPage) {
                  onSearchNextPage();
                }
              }}
              placeholder={placeholder}
              name={name}
              value={value}
            />
          </>
        }
        loadMore={
          shouldDisplayLoadMoreButton && (
            <TextButton
              disabled={paginatedRelations.isLoading || paginatedRelations.isFetchingNextPage}
              onClick={handleLoadMore}
              loading={paginatedRelations.isLoading || paginatedRelations.isFetchingNextPage}
              startIcon={<Refresh />}
            >
              {labelLoadMore}
            </TextButton>
          )
        }
      >
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
        {(description || error) && (
          <Box paddingTop={2}>
            <FieldHint />
            <FieldError />
          </Box>
        )}
      </Relation>
    </Field>
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
