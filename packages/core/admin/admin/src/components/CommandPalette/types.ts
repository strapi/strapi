import type { ComponentType } from 'react';

export type Item =
  | {
      group?: string;
      component: ComponentType;
    }
  | {
      group?: string;
      icon: ComponentType;
      label: string;
      action(): void;
    };

export type Items = Array<Item>;
