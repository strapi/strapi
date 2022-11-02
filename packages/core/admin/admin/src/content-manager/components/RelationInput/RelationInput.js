import React, { useRef, useState, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { FixedSizeList as List } from 'react-window';

import { ReactSelect } from '@strapi/helper-plugin';
import { Badge } from '@strapi/design-system/Badge';
import { Box } from '@strapi/design-system/Box';
import { Link } from '@strapi/design-system/Link';
import { Icon } from '@strapi/design-system/Icon';
import { FieldLabel, FieldError, FieldHint, Field } from '@strapi/design-system/Field';
import { TextButton } from '@strapi/design-system/TextButton';
import { Typography } from '@strapi/design-system/Typography';
import { Tooltip } from '@strapi/design-system/Tooltip';

import Cross from '@strapi/icons/Cross';
import Refresh from '@strapi/icons/Refresh';

import { Relation } from './components/Relation';
import { RelationItem } from './components/RelationItem';
import { RelationList } from './components/RelationList';
import { Option } from './components/Option';
import { RELATION_ITEM_HEIGHT } from './constants';

const LinkEllipsis = styled(Link)`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inherit;
`;

const BoxEllipsis = styled(Box)`
  > span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: inherit;
  }
`;

const DisconnectButton = styled.button`
  svg path {
    fill: ${({ theme }) => theme.colors.neutral500};
  }

  &:hover svg path,
  &:focus svg path {
    fill: ${({ theme }) => theme.colors.neutral600};
  }
`;

const RelationInput = ({
  description,
  disabled,
  error,
  id,
  name,
  numberOfRelationsToDisplay,
  label,
  labelAction,
  labelLoadMore,
  labelDisconnectRelation,
  loadingMessage,
  onRelationConnect,
  onRelationLoadMore,
  onRelationDisconnect,
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
  const listRef = useRef();
  const outerListRef = useRef();
  const [overflow, setOverflow] = useState('');

  const { data } = searchResults;

  const relations = paginatedRelations.data;
  const totalNumberOfRelations = relations.length ?? 0;

  const dynamicListHeight = useMemo(
    () =>
      totalNumberOfRelations > numberOfRelationsToDisplay
        ? Math.min(totalNumberOfRelations, numberOfRelationsToDisplay) * RELATION_ITEM_HEIGHT +
          RELATION_ITEM_HEIGHT / 2
        : Math.min(totalNumberOfRelations, numberOfRelationsToDisplay) * RELATION_ITEM_HEIGHT,
    [totalNumberOfRelations, numberOfRelationsToDisplay]
  );

  const shouldDisplayLoadMoreButton =
    (!!labelLoadMore && !disabled && paginatedRelations.hasNextPage) ||
    paginatedRelations.isLoading;

  const options = useMemo(
    () =>
      data.flat().map((result) =>
        result
          ? {
              ...result,
              value: result.id,
              label: result.mainField,
            }
          : result
      ),
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

  const handleMenuOpen = () => {
    setIsMenuOpen(true);
    onSearch();
  };

  return (
    <Field error={error} name={name} hint={description} id={id}>
      <Relation
        totalNumberOfRelations={totalNumberOfRelations}
        size={size}
        search={
          <>
            <FieldLabel action={labelAction} required={required}>
              {label}
            </FieldLabel>
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
              loadingMessage={loadingMessage}
              onChange={(relation) => {
                setValue(null);
                onRelationConnect(relation);

                // scroll to the end of the list
                if (relations.length > 0) {
                  setTimeout(() => {
                    listRef.current.scrollToItem(relations.length, 'end');
                  });
                }
              }}
              onInputChange={(value) => {
                setValue(value);
                onSearch(value);
              }}
              onMenuClose={handleMenuClose}
              onMenuOpen={handleMenuOpen}
              menuIsOpen={isMenuOpen}
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
              onClick={() => onRelationLoadMore()}
              loading={paginatedRelations.isLoading || paginatedRelations.isFetchingNextPage}
              startIcon={<Refresh />}
            >
              {labelLoadMore}
            </TextButton>
          )
        }
      >
        <RelationList overflow={overflow}>
          <List
            height={dynamicListHeight}
            ref={listRef}
            outerRef={outerListRef}
            itemCount={totalNumberOfRelations}
            itemSize={RELATION_ITEM_HEIGHT}
            itemData={relations}
            innerElementType="ol"
          >
            {({ data, index, style }) => {
              const { publicationState, href, mainField, id } = data[index];
              const badgeColor = publicationState === 'draft' ? 'secondary' : 'success';

              return (
                <RelationItem
                  disabled={disabled}
                  key={`relation-${name}-${id}`}
                  endAction={
                    <DisconnectButton
                      data-testid={`remove-relation-${id}`}
                      disabled={disabled}
                      type="button"
                      onClick={() => onRelationDisconnect(data[index])}
                      aria-label={labelDisconnectRelation}
                    >
                      <Icon width="12px" as={Cross} />
                    </DisconnectButton>
                  }
                  style={style}
                >
                  <BoxEllipsis minWidth={0} paddingTop={1} paddingBottom={1} paddingRight={4}>
                    <Tooltip description={mainField ?? `${id}`}>
                      {href ? (
                        <LinkEllipsis to={href} disabled={disabled}>
                          {mainField ?? id}
                        </LinkEllipsis>
                      ) : (
                        <Typography textColor={disabled ? 'neutral600' : 'primary600'} ellipsis>
                          {mainField ?? id}
                        </Typography>
                      )}
                    </Tooltip>
                  </BoxEllipsis>

                  {publicationState && (
                    <Badge
                      borderSize={1}
                      borderColor={`${badgeColor}200`}
                      backgroundColor={`${badgeColor}100`}
                      textColor={`${badgeColor}700`}
                      shrink={0}
                    >
                      {publicationStateTranslations[publicationState]}
                    </Badge>
                  )}
                </RelationItem>
              );
            }}
          </List>
        </RelationList>
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
  description: undefined,
  disabled: false,
  error: undefined,
  labelAction: null,
  labelLoadMore: null,
  required: false,
  relations: { data: [] },
  searchResults: { data: [] },
};

RelationInput.propTypes = {
  error: PropTypes.string,
  description: PropTypes.string,
  disabled: PropTypes.bool,
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  labelAction: PropTypes.element,
  labelLoadMore: PropTypes.string,
  labelDisconnectRelation: PropTypes.string.isRequired,
  loadingMessage: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  numberOfRelationsToDisplay: PropTypes.number.isRequired,
  onRelationConnect: PropTypes.func.isRequired,
  onRelationDisconnect: PropTypes.func.isRequired,
  onRelationLoadMore: PropTypes.func.isRequired,
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

export default RelationInput;
