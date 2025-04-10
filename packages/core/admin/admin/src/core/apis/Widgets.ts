/* eslint-disable check-file/filename-naming-convention */

import invariant from 'invariant';
import { To } from 'react-router-dom';

import { Permission } from '../../../../shared/contracts/shared';

import type { MessageDescriptor } from 'react-intl';

type WidgetUID = `plugin::${string}.${string}` | `global::${string}`;

interface WidgetArgs {
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
}

class Widgets {
  widgets: Record<string, WidgetArgs>;

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

      this.widgets[uid] = widget;
    }
  };

  getAll = () => {
    return this.widgets;
  };
}

export { Widgets };
export type { WidgetArgs };
