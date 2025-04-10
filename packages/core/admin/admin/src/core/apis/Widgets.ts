/* eslint-disable check-file/filename-naming-convention */

import invariant from 'invariant';
import { To } from 'react-router-dom';

import { Permission } from '../../../../shared/contracts/shared';

import type { Internal, Utils } from '@strapi/types';
import type { MessageDescriptor } from 'react-intl';

type WidgetUID = Utils.String.Suffix<
  | Internal.Namespace.WithSeparator<Internal.Namespace.Plugin>
  | Internal.Namespace.WithSeparator<Internal.Namespace.Global>,
  string
>;

type WidgetArgs = {
  icon: React.ComponentType;
  title: MessageDescriptor;
  link?: {
    label: MessageDescriptor;
    href: To;
  };
  component: () => Promise<{ default: React.ComponentType }>;
  pluginId?: string;
  id: string;
  permissions?: Permission[];
};

type Widget = Omit<WidgetArgs, 'id' | 'pluginId'>;

class Widgets {
  widgets: Record<string, Widget>;

  constructor() {
    this.widgets = {};
  }

  register = (widget: WidgetArgs | WidgetArgs[]) => {
    if (Array.isArray(widget)) {
      widget.forEach((newWidget) => {
        this.register(newWidget);
      });
    } else {
      const { id, pluginId, component, title, icon } = widget;

      invariant(id, 'An id must be provided');
      invariant(component, 'A component must be provided');
      invariant(title, 'A title must be provided');
      invariant(icon, 'An icon must be provided');

      const uid: WidgetUID = pluginId ? `plugin::${pluginId}.${id}` : `global::${id}`;

      // Omit properites we don't want to store
      const { id: _id, pluginId: _pluginId, ...widgetToStore } = widget;
      this.widgets[uid] = widgetToStore;
    }
  };

  getAll = () => {
    return Object.entries(this.widgets).map(([uid, widget]) => {
      return {
        ...widget,
        uid,
      };
    });
  };
}

export { Widgets };
export type { WidgetArgs };
