import React from 'react';

import { MenuItem, SimpleMenu } from '@strapi/design-system';
import get from 'lodash/get';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';

import useDataManager from '../../../../hooks/useDataManager';
import { isAllowedContentTypesForRelations } from '../../../../utils';
import { ON_CHANGE_RELATION_TARGET } from '../../../FormModal/constants';

const RelationTargetPicker = ({ oneThatIsCreatingARelationWithAnother, target }) => {
  const { contentTypes, sortedContentTypesList } = useDataManager();
  const dispatch = useDispatch();
  // TODO: replace with an obj { relation: 'x', bidirctional: true|false }
  const allowedContentTypesForRelation = sortedContentTypesList.filter(
    isAllowedContentTypesForRelations
  );

  const plugin = get(contentTypes, [target, 'plugin'], null);

  const targetFriendlyName = get(contentTypes, [target, 'schema', 'displayName'], 'error');

  return (
    <SimpleMenu
      id="label"
      label={`${targetFriendlyName}
    ${plugin ? `(from: ${plugin})` : ''}`}
    >
      {allowedContentTypesForRelation.map(({ uid, title, restrictRelationsTo, plugin }) => {
        const handleChange = () => {
          const selectedContentTypeFriendlyName = plugin ? `${plugin}_${title}` : title;

          dispatch({
            type: ON_CHANGE_RELATION_TARGET,
            target: {
              value: uid,
              oneThatIsCreatingARelationWithAnother,
              selectedContentTypeFriendlyName,
              targetContentTypeAllowedRelations: restrictRelationsTo,
            },
          });
        };

        return (
          <MenuItem key={uid} onClick={handleChange}>
            {title}&nbsp;
            {plugin && <>(from: {plugin})</>}
          </MenuItem>
        );
      })}
    </SimpleMenu>
  );
};

RelationTargetPicker.defaultProps = {
  target: null,
};

RelationTargetPicker.propTypes = {
  oneThatIsCreatingARelationWithAnother: PropTypes.string.isRequired,
  target: PropTypes.string,
};

export default RelationTargetPicker;
