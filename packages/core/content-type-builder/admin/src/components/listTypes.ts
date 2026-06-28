import type { Component, ContentType } from '../types';
import type { UID } from '@strapi/types';

type ListProps = {
  addComponentToDZ?: () => void;
  firstLoopComponentUid?: UID.Component | null;
  isFromDynamicZone?: boolean;
  isMain?: boolean;
  secondLoopComponentUid?: UID.Component | null;
  isSub?: boolean;
  type: ContentType | Component;
};

export type { ListProps };
