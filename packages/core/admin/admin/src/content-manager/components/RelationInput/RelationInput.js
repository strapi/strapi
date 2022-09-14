import React, { useRef, useState, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import styled, { keyframes } from 'styled-components';
import { FixedSizeList as List } from 'react-window';

import { ReactSelect } from '@strapi/helper-plugin';
import { Badge } from '@strapi/design-system/Badge';
import { Box } from '@strapi/design-system/Box';
import { Link } from '@strapi/design-system/Link';
import { Icon } from '@strapi/design-system/Icon';
import { FieldLabel, FieldError, FieldHint, Field } from '@strapi/design-system/Field';
import { TextButton } from '@strapi/design-system/TextButton';
import { Typography } from '@strapi/design-system/Typography';

import Cross from '@strapi/icons/Cross';
import Refresh from '@strapi/icons/Refresh';
import Loader from '@strapi/icons/Loader';

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

const rotation = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(359deg);
  }
`;

// TODO - to replace with loading prop on TextButton after DS release
const LoaderWrapper = styled(Box)`
  animation: ${rotation} 2s infinite linear;
  will-change: transform;
`;

const RelationInput = ({
  description,
  disabled,
  error,
  id,
  name,
  numberOfRelationsToDisplay,
  label,
  labelLoadMore,
  loadingMessage,
  onRelationAdd,
  onRelationLoadMore,
  onRelationRemove,
  onSearchClose,
  onSearchNextPage,
  onSearchOpen,
  onSearch,
  placeholder,
  publicationStateTranslations,
  relations: paginatedRelations,
  searchResults,
  size,
}) => {
  const [value, setValue] = useState(null);
  const listRef = useRef();
  const outerListRef = useRef();
  const [overflow, setOverflow] = useState('');

  const relations = useMemo(() => paginatedRelations.data.pages.flat(), [paginatedRelations]);
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
      searchResults.data.pages.flat().map((result) => ({
        ...result,
        value: result.id,
        label: result.mainField,
      })),
    [searchResults]
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

  return (
    <Field error={error} name={name} hint={description} id={id}>
      <Relation
        totalNumberOfRelations={totalNumberOfRelations}
        size={size}
        search={
          <>
            <FieldLabel>{label}</FieldLabel>
            <ReactSelect
              // position fixed doesn't update position on scroll
              // react select doesn't update menu position on options change
              menuPosition="absolute"
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
                onRelationAdd(relation);

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
              onMenuClose={onSearchClose}
              onMenuOpen={onSearchOpen}
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
              disabled={paginatedRelations.isLoading}
              onClick={() => onRelationLoadMore()}
              startIcon={
                paginatedRelations.isLoading ? (
                  // TODO: To replace with loading prop on TextButton after DS release
                  <LoaderWrapper>
                    <Loader />
                  </LoaderWrapper>
                ) : (
                  <Refresh />
                )
              }
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
                    <button
                      data-testid={`remove-relation-${id}`}
                      disabled={disabled}
                      type="button"
                      onClick={() => onRelationRemove(data[index])}
                    >
                      <Icon width="12px" as={Cross} />
                    </button>
                  }
                  style={style}
                >
                  <Box minWidth={0} paddingTop={1} paddingBottom={1} paddingRight={4}>
                    {href ? (
                      <LinkEllipsis to={href} disabled={disabled}>
                        {mainField ?? id}
                      </LinkEllipsis>
                    ) : (
                      <Typography textColor={disabled ? 'neutral600' : 'primary600'} ellipsis>
                        {mainField ?? id}
                      </Typography>
                    )}
                  </Box>

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

const ReactQueryRelationResult = PropTypes.shape({
  data: PropTypes.shape({
    pages: PropTypes.arrayOf(
      PropTypes.arrayOf(
        PropTypes.shape({
          href: PropTypes.string,
          id: PropTypes.number.isRequired,
          publicationState: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
          mainField: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        })
      )
    ),
  }),
  hasNextPage: PropTypes.bool,
  isLoading: PropTypes.bool.isRequired,
  isSuccess: PropTypes.bool.isRequired,
});

const ReactQuerySearchResult = PropTypes.shape({
  data: PropTypes.shape({
    pages: PropTypes.arrayOf(
      PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.number.isRequired,
          mainField: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
          publicationState: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
        })
      )
    ),
  }),
  hasNextPage: PropTypes.bool,
  isLoading: PropTypes.bool.isRequired,
  isSuccess: PropTypes.bool.isRequired,
});

RelationInput.defaultProps = {
  description: undefined,
  disabled: false,
  error: undefined,
  labelLoadMore: null,
  relations: [],
  searchResults: [],
};

RelationInput.propTypes = {
  error: PropTypes.string,
  description: PropTypes.string,
  disabled: PropTypes.bool,
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  labelLoadMore: PropTypes.string,
  loadingMessage: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  numberOfRelationsToDisplay: PropTypes.number.isRequired,
  onRelationAdd: PropTypes.func.isRequired,
  onRelationRemove: PropTypes.func.isRequired,
  onRelationLoadMore: PropTypes.func.isRequired,
  onSearch: PropTypes.func.isRequired,
  onSearchNextPage: PropTypes.func.isRequired,
  onSearchClose: PropTypes.func.isRequired,
  onSearchOpen: PropTypes.func.isRequired,
  placeholder: PropTypes.string.isRequired,
  publicationStateTranslations: PropTypes.shape({
    draft: PropTypes.string.isRequired,
    published: PropTypes.string.isRequired,
  }).isRequired,
  searchResults: ReactQuerySearchResult,
  size: PropTypes.number.isRequired,
  relations: ReactQueryRelationResult,
};

export default RelationInput;
