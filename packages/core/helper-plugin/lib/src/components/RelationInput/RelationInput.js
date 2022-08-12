import PropTypes from 'prop-types';
import React from 'react';

import { Badge } from '@strapi/design-system/Badge';
import { Box } from '@strapi/design-system/Box';
import { BaseLink } from '@strapi/design-system/BaseLink';

import { RelationItem } from './components/RelationItem';
import { RelationList } from './components/RelationList';

export const RelationInput = ({ name, relations }) => {
  return (
    <Box>
      <RelationList>
        {relations.isSuccess &&
          relations.data.pages.flatMap(({ isDraft, href, title, id }) => {
            const badgeColor = isDraft ? 'secondary' : 'success';

            return (
              <RelationItem key={`relation-${name}-${id}`}>
                {href ? <BaseLink href="/">{title}</BaseLink> : title}

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
    </Box>
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

RelationInput.defaultProps = {
  relations: [],
  searchResults: [],
  relationsToDisplay: 5,
};

RelationInput.propTypes = {
  description: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  onRelationAdd: PropTypes.func.isRequired,
  onRelationRemove: PropTypes.func.isRequired,
  onRelationLoadMore: PropTypes.func.isRequired,
  onSearchNextPage: PropTypes.func.isRequired,
  searchResults: PropTypes.arrayOf(RelationTypeDef),
  relations: ReactQueryRelationResult,
  relationsToDisplay: PropTypes.number,
};
