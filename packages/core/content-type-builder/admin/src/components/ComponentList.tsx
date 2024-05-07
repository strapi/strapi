import get from 'lodash/get';

import { useDataManager } from '../hooks/useDataManager';

import { List } from './List';
import { Tr } from './Tr';

import type { Internal } from '@strapi/types';

interface ComponentListProps {
  component: Internal.UID.Component;
  customRowComponent: any;
  firstLoopComponentUid?: string;
  isFromDynamicZone?: boolean;
  isNestedInDZComponent?: boolean;
}

export const ComponentList = ({
  customRowComponent,
  component,
  isFromDynamicZone = false,
  isNestedInDZComponent = false,
  firstLoopComponentUid,
}: ComponentListProps) => {
  const { modifiedData } = useDataManager();
  const {
    schema: { attributes },
  } = get(modifiedData, ['components', component], {
    schema: { attributes: [] },
  });

  return (
    <Tr $isChildOfDynamicZone={isFromDynamicZone} className="component-row">
      <td colSpan={12}>
        <List
          customRowComponent={customRowComponent}
          items={attributes}
          targetUid={component}
          firstLoopComponentUid={firstLoopComponentUid || component}
          editTarget="components"
          isFromDynamicZone={isFromDynamicZone}
          isNestedInDZComponent={isNestedInDZComponent}
          isSub
          secondLoopComponentUid={firstLoopComponentUid ? component : null}
        />
      </td>
    </Tr>
  );
};
