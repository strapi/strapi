import * as React from 'react';

import type { EditSettingsViewState } from './SettingsForm/reducer';
import type { Schema } from '@strapi/types';

export interface LayoutDndProviderProps {
  isContentTypeView: boolean;
  attributes: Schema.Attributes;
  modifiedData: EditSettingsViewState['modifiedData'];
  slug: string;
  componentLayouts: EditSettingsViewState['componentLayouts'];
  selectedField: string;
  fieldForm: any;
  moveRow: (fromIndex: number, toIndex: number) => void;
  moveItem: (
    dragIndex: number,
    hoverIndex: number,
    dragRowIndex: number,
    hoverRowIndex: number
  ) => void;
  setEditFieldToSelect: (name: string) => void;
  isDraggingSibling: boolean;
  setIsDraggingSibling: (isDragging: boolean) => void;
  children?: React.ReactNode;
}

// TODO: refactor this to be actually typesafe instead of casting
const LayoutDndContext = React.createContext<Omit<LayoutDndProviderProps, 'children'>>(
  null as unknown as LayoutDndProviderProps
);

const LayoutDndProvider = ({ children, ...props }: LayoutDndProviderProps) => {
  return <LayoutDndContext.Provider value={{ ...props }}>{children}</LayoutDndContext.Provider>;
};

export { LayoutDndContext, LayoutDndProvider };
