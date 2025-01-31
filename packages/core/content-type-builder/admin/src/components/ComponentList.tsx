import get from 'lodash/get';

import { useDataManager } from './DataManager/useDataManager';
import { List } from './List';
import { Tr } from './Tr';

import type { Internal } from '@strapi/types';

interface ComponentListProps {
  component: Internal.UID.Component;
  customRowComponent: any;
  firstLoopComponentUid?: string;
  isFromDynamicZone?: boolean;
  isNestedInDZComponent?: boolean;
  forTarget?: string;
  targetUid?: string;
}

export const ComponentList = ({
  customRowComponent,
  component,
  isFromDynamicZone = false,
  isNestedInDZComponent = false,
  firstLoopComponentUid,
}: ComponentListProps) => {
  const { components } = useDataManager();
  const type = get(components, component);

  return (
    <Tr $isChildOfDynamicZone={isFromDynamicZone} className="component-row">
      <td colSpan={12}>
        <List
          customRowComponent={customRowComponent}
          type={type}
          firstLoopComponentUid={firstLoopComponentUid || component}
          isFromDynamicZone={isFromDynamicZone}
          isNestedInDZComponent={isNestedInDZComponent}
          isSub
          secondLoopComponentUid={firstLoopComponentUid ? component : null}
        />
      </td>
    </Tr>
  );
};
