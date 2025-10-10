import { Menu } from '@strapi/design-system';
import { useDispatch } from 'react-redux';
import { styled } from 'styled-components';

import { isAllowedContentTypesForRelations } from '../../../../utils';
import { useDataManager } from '../../../DataManager/useDataManager';
import { actions } from '../../../FormModal/reducer';

import type { Internal, Schema } from '@strapi/types';
interface RelationTargetPickerProps {
  oneThatIsCreatingARelationWithAnother: string;
  target: Internal.UID.ContentType;
}

type SelectOpts = {
  uid: string;
  plugin?: string;
  title: string;
  restrictRelationsTo: Schema.Attribute.RelationKind.Any[] | null;
};

export const RelationTargetPicker = ({
  oneThatIsCreatingARelationWithAnother,
  target,
}: RelationTargetPickerProps) => {
  const { contentTypes, sortedContentTypesList } = useDataManager();
  const dispatch = useDispatch();
  // TODO: replace with an obj { relation: 'x', bidirctional: true|false }
  const allowedContentTypesForRelation = sortedContentTypesList.filter(
    isAllowedContentTypesForRelations
  );

  const type = contentTypes[target];

  if (!type) {
    return null;
  }

  const handleSelect =
    ({ uid, plugin, title, restrictRelationsTo }: SelectOpts) =>
    () => {
      const selectedContentTypeFriendlyName = plugin ? `${plugin}_${title}` : title;

      dispatch(
        actions.onChangeRelationTarget({
          target: {
            value: uid,
            oneThatIsCreatingARelationWithAnother,
            selectedContentTypeFriendlyName,
            targetContentTypeAllowedRelations: restrictRelationsTo,
          },
        })
      );
    };

  /**
   * TODO: This should be a Select but the design doesn't match the
   * styles of the select component and there isn't the ability to
   * change it correctly.
   */
  return (
    <Menu.Root>
      <MenuTrigger>{`${type.info.displayName} ${type.plugin ? `(from: ${type.plugin})` : ''}`}</MenuTrigger>
      <Menu.Content zIndex="popover">
        {allowedContentTypesForRelation.map(({ uid, title, restrictRelationsTo, plugin }) => (
          <Menu.Item key={uid} onSelect={handleSelect({ uid, plugin, title, restrictRelationsTo })}>
            {title}&nbsp;
            {plugin && <>(from: {plugin})</>}
          </Menu.Item>
        ))}
      </Menu.Content>
    </Menu.Root>
  );
};

const MenuTrigger = styled(Menu.Trigger)`
  max-width: 16.8rem;
  span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;
