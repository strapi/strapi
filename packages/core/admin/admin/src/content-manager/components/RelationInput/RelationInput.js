import PropTypes from 'prop-types';
import React from 'react';
import styled from 'styled-components';

import { ReactSelect } from '@strapi/helper-plugin';
import { Badge } from '@strapi/design-system/Badge';
import { Box } from '@strapi/design-system/Box';
import { BaseLink } from '@strapi/design-system/BaseLink';
import { Icon } from '@strapi/design-system/Icon';
import { FieldLabel, FieldError, FieldHint, Field } from '@strapi/design-system/Field';
import { TextButton } from '@strapi/design-system/TextButton';
import { Typography } from '@strapi/design-system/Typography';
import { Loader } from '@strapi/design-system/Loader';

import Cross from '@strapi/icons/Cross';
import Refresh from '@strapi/icons/Refresh';

import { Relation } from './components/Relation';
import { RelationItem } from './components/RelationItem';
import { RelationList } from './components/RelationList';
import { Option } from './components/Option';

const RelationItemCenterChildren = styled(RelationItem)`
  div {
    justify-content: center;
  }
`;

const RelationInput = ({
  description,
  disabled,
  error,
  id,
  name,
  label,
  labelLoadMore,
  listHeight,
  loadingMessage,
  relations,
  onRelationAdd,
  onRelationLoadMore,
  onSearchClose,
  onSearchOpen,
  onRelationRemove,
  onSearchNextPage,
  onSearch,
  placeholder,
  publicationStateTranslations,
  searchResults,
}) => {
  return (
    <Field error={error} name={name} hint={description} id={id}>
      <Relation
        search={
          <>
            <FieldLabel>{label}</FieldLabel>
            <ReactSelect
              components={{ Option }}
              options={searchResults?.data?.pages?.flat().map((result) => ({
                ...result,
                value: result.id,
                label: result.mainField,
              }))}
              isDisabled={disabled}
              isLoading={searchResults.isLoading}
              error={error}
              inputId={id}
              isSearchable
              isClear
              loadingMessage={() => loadingMessage}
              onChange={onRelationAdd}
              onInputChange={onSearch}
              onMenuClose={onSearchClose}
              onMenuOpen={onSearchOpen}
              onMenuScrollToBottom={onSearchNextPage}
              placeholder={placeholder}
            />
          </>
        }
        loadMore={
          !disabled &&
          labelLoadMore && (
            <TextButton onClick={() => onRelationLoadMore()} startIcon={<Refresh />}>
              {labelLoadMore}
            </TextButton>
          )
        }
      >
        <RelationList height={listHeight}>
          {relations.isSuccess &&
            relations.data.pages.flat().map((relation) => {
              const { publicationState, href, mainField, id } = relation;
              const badgeColor = publicationState === 'draft' ? 'secondary' : 'success';

              return (
                <RelationItem
                  disabled={disabled}
                  key={`relation-${name}-${id}`}
                  endAction={
                    <button
                      disabled={disabled}
                      type="button"
                      onClick={() => onRelationRemove(relation)}
                    >
                      <Icon width="12px" as={Cross} />
                    </button>
                  }
                >
                  <Box minWidth={0} paddingTop={1} paddingBottom={1} paddingRight={4}>
                    {href ? (
                      <BaseLink disabled={disabled} href={href}>
                        <Typography textColor={disabled ? 'neutral600' : 'primary600'} ellipsis>
                          {mainField}
                        </Typography>
                      </BaseLink>
                    ) : (
                      <Typography textColor={disabled ? 'neutral600' : 'primary600'} ellipsis>
                        {mainField}
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
            })}
          {relations.isLoading && (
            <RelationItemCenterChildren>
              <Loader small>{loadingMessage}</Loader>
            </RelationItemCenterChildren>
          )}
        </RelationList>
        <Box paddingTop={2}>
          <FieldHint />
          <FieldError />
        </Box>
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
  isLoading: PropTypes.bool.isRequired,
  isSuccess: PropTypes.bool.isRequired,
});

RelationInput.defaultProps = {
  description: undefined,
  disabled: false,
  error: undefined,
  labelLoadMore: null,
  listHeight: undefined,
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
  listHeight: PropTypes.string,
  loadingMessage: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
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
  relations: ReactQueryRelationResult,
};

export default RelationInput;
