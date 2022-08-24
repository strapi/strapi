import PropTypes from 'prop-types';
import React from 'react';

import { Badge } from '@strapi/design-system/Badge';
import { Box } from '@strapi/design-system/Box';
import { BaseLink } from '@strapi/design-system/BaseLink';
import { Icon } from '@strapi/design-system/Icon';
import { FieldLabel, FieldError, FieldHint, Field } from '@strapi/design-system/Field';
import { TextButton } from '@strapi/design-system/TextButton';

import Cross from '@strapi/icons/Cross';
import Refresh from '@strapi/icons/Refresh';

import { Relation } from './components/Relation';
import { RelationItem } from './components/RelationItem';
import { RelationList } from './components/RelationList';
import { Option } from './components/Option';

import ReactSelect from '../ReactSelect';

export const RelationInput = ({
  description,
  disabled,
  error,
  id,
  name,
  label,
  labelLoadMore,
  listHeight,
  relations,
  onRelationClose,
  onRelationAdd,
  onRelationLoadMore,
  onRelationOpen,
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
              options={searchResults.data.pages.flat()}
              isDisabled={disabled}
              error={error}
              inputId={id}
              isSearchable
              isClear
              onChange={onRelationAdd}
              onInputChange={onSearch}
              onMenuClose={onRelationOpen}
              onMenuOpen={onRelationClose}
              onMenuScrollToBottom={onSearchNextPage}
              placeholder={placeholder}
            />
          </>
        }
        loadMore={
          !disabled && (
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
                  <Box paddingTop={1} paddingBottom={1}>
                    {href ? (
                      <BaseLink disabled={disabled} href={href}>
                        {mainField}
                      </BaseLink>
                    ) : (
                      mainField
                    )}
                  </Box>

                  {publicationState && (
                    <Badge
                      borderSize={1}
                      borderColor={`${badgeColor}200`}
                      backgroundColor={`${badgeColor}100`}
                      textColor={`${badgeColor}700`}
                    >
                      {publicationStateTranslations[publicationState]}
                    </Badge>
                  )}
                </RelationItem>
              );
            })}
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
          isDraft: PropTypes.bool,
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
  labelLoadMore: PropTypes.string.isRequired,
  listHeight: PropTypes.string,
  name: PropTypes.string.isRequired,
  onRelationAdd: PropTypes.func.isRequired,
  onRelationOpen: PropTypes.func.isRequired,
  onRelationClose: PropTypes.func.isRequired,
  onRelationRemove: PropTypes.func.isRequired,
  onRelationLoadMore: PropTypes.func.isRequired,
  onSearch: PropTypes.func.isRequired,
  onSearchNextPage: PropTypes.func.isRequired,
  placeholder: PropTypes.string.isRequired,
  publicationStateTranslations: PropTypes.shape({
    draft: PropTypes.string.isRequired,
    published: PropTypes.string.isRequired,
  }).isRequired,
  searchResults: ReactQuerySearchResult,
  relations: ReactQueryRelationResult,
};
