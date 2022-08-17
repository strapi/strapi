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

import ReactSelect from '../ReactSelect';

export const RelationInput = ({
  description,
  disabled,
  error,
  id,
  name,
  label,
  labelLoadMore,
  relations,
  onRelationClose,
  onRelationAdd,
  onRelationLoadMore,
  onRelationOpen,
  onRelationRemove,
  onSearchNextPage,
  onSearch,
  placeholder,
}) => {
  return (
    <Field error={error} name={name} hint={description} id={id}>
      <Relation
        search={
          <>
            <FieldLabel>{label}</FieldLabel>
            <ReactSelect
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
        <RelationList>
          {relations.isSuccess &&
            relations.data.pages.flatMap((relation) => {
              const { isDraft, href, title, id } = relation;
              const badgeColor = isDraft ? 'secondary' : 'success';

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
                  {href ? (
                    <BaseLink disabled={disabled} href={href}>
                      {title}
                    </BaseLink>
                  ) : (
                    title
                  )}

                  <Badge
                    borderSize={1}
                    borderColor={`${badgeColor}200`}
                    backgroundColor={`${badgeColor}100`}
                    textColor={`${badgeColor}700`}
                  >
                    {isDraft ? 'Draft' : 'Published'}
                  </Badge>
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

const RelationTypeDef = PropTypes.shape({
  id: PropTypes.number.isRequired,
  isDraft: PropTypes.bool,
  href: PropTypes.string,
  title: PropTypes.string.isRequired,
});

const ReactQueryRelationResult = PropTypes.shape({
  data: PropTypes.shape({
    pages: PropTypes.arrayOf(RelationTypeDef),
  }),
  isLoading: PropTypes.bool.isRequired,
  isSuccess: PropTypes.bool.isRequired,
});

const ReactQuerySearchResult = PropTypes.shape({
  data: PropTypes.shape({
    pages: PropTypes.arrayOf(RelationTypeDef),
  }),
  isLoading: PropTypes.bool.isRequired,
  isSuccess: PropTypes.bool.isRequired,
});

RelationInput.defaultProps = {
  description: undefined,
  disabled: false,
  error: undefined,
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
  name: PropTypes.string.isRequired,
  onRelationAdd: PropTypes.func.isRequired,
  onRelationOpen: PropTypes.func.isRequired,
  onRelationClose: PropTypes.func.isRequired,
  onRelationRemove: PropTypes.func.isRequired,
  onRelationLoadMore: PropTypes.func.isRequired,
  onSearch: PropTypes.func.isRequired,
  onSearchNextPage: PropTypes.func.isRequired,
  placeholder: PropTypes.string.isRequired,
  // eslint-disable-next-line react/no-unused-prop-types
  searchResults: ReactQuerySearchResult,
  relations: ReactQueryRelationResult,
};
