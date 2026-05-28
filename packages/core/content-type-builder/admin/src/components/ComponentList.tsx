import get from 'lodash/get';

import { ComponentRow } from './ComponentRow';
import { useDataManager } from './DataManager/useDataManager';
import { List } from './List';

import type { UID } from '@strapi/types';

interface ComponentListProps {
  component: UID.Component;
  firstLoopComponentUid?: UID.Component | null;
  isFromDynamicZone?: boolean;
}

export const ComponentList = ({
  component,
  isFromDynamicZone = false,
  firstLoopComponentUid,
}: ComponentListProps) => {
  const { components } = useDataManager();
  const type = get(components, component);

  if (!type) return;

  return (
    <ComponentRow $isChildOfDynamicZone={isFromDynamicZone} className="component-row">
      <List
        type={type}
        firstLoopComponentUid={firstLoopComponentUid || component}
        isFromDynamicZone={isFromDynamicZone}
        isSub
        secondLoopComponentUid={firstLoopComponentUid ? component : null}
      />
    </ComponentRow>
  );
};
