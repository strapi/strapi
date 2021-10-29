import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import get from 'lodash/get';
import { MenuItem, SimpleMenu } from '@strapi/design-system/SimpleMenu';
import useDataManager from '../../../../hooks/useDataManager';
import { ON_CHANGE_RELATION_TARGET } from '../../../FormModal/constants';

const RelationTargetPicker = ({ oneThatIsCreatingARelationWithAnother, target }) => {
  const { contentTypes, sortedContentTypesList } = useDataManager();
  const dispatch = useDispatch();
  // TODO: replace with an obj { relation: 'x', bidirctional: true|false }
  const allowedContentTypesForRelation = useMemo(
    () =>
      sortedContentTypesList
        .filter(obj => obj.kind === 'collectionType')
        .filter(
          obj =>
            obj.restrictRelationsTo === null ||
            (Array.isArray(obj.restrictRelationsTo) && obj.restrictRelationsTo.length > 0)
        ),
    [sortedContentTypesList]
  );

  const plugin = get(contentTypes, [target, 'plugin'], null);

  const targetFriendlyName = useMemo(() => {
    const name = get(contentTypes, [target, 'schema', 'displayName'], 'error');

    return name;
  }, [contentTypes, target]);

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
