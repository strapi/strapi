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
  icon?: typeof import('@strapi/icons').PuzzlePiece;
  title: MessageDescriptor;
  link?: {
    label: MessageDescriptor;
    href: To;
  };
  component: () => Promise<React.ComponentType>;
  pluginId?: string;
  id: string;
  permissions?: Permission[];
};

type Widget = Omit<WidgetArgs, 'id' | 'pluginId'> & { uid: WidgetUID };

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
      invariant(widget.id, 'An id must be provided');
      invariant(widget.component, 'A component must be provided');
      invariant(widget.title, 'A title must be provided');
      invariant(widget.icon, 'An icon must be provided');

      // Replace id and pluginId with computed uid
      const { id, pluginId, ...widgetToStore } = widget;
      const uid: WidgetUID = pluginId ? `plugin::${pluginId}.${id}` : `global::${id}`;

      this.widgets[uid] = { ...widgetToStore, uid };
    }
  };

  getAll = () => {
    return Object.values(this.widgets);
  };
}

export { Widgets };
export type { WidgetArgs, Widget };
