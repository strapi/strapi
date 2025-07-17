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
  permissions?: Array<Pick<Permission, 'action'> & Partial<Omit<Permission, 'action'>>>;
};

type Widget = Omit<WidgetArgs, 'id' | 'pluginId'> & { uid: WidgetUID };

type DescriptionReducer<T extends object> = (prev: Widget[]) => (T | Widget)[];

class Widgets {
  widgets: Widget[];

  constructor() {
    this.widgets = [];
  }

  private generateUid = (widget: WidgetArgs | Widget): WidgetUID => {
    if ('uid' in widget && widget.uid) {
      return widget.uid;
    }

    // At this point, widget must be WidgetArgs (has id and pluginId)
    const widgetArgs = widget as WidgetArgs;
    return (
      widgetArgs.pluginId
        ? `plugin::${widgetArgs.pluginId}.${widgetArgs.id}`
        : `global::${widgetArgs.id}`
    ) as WidgetUID;
  };

  private addUidToWidgets = (widgets: (WidgetArgs | Widget)[]): Widget[] =>
    widgets.map((widget) => {
      // If widget already has uid, it's already a Widget
      if ('uid' in widget && widget.uid) {
        return widget as Widget;
      }

      // Otherwise, it's a WidgetArgs
      const widgetArgs = widget as WidgetArgs;
      invariant(widgetArgs.id, 'An id must be provided');
      invariant(widgetArgs.component, 'A component must be provided');
      invariant(widgetArgs.title, 'A title must be provided');
      invariant(widgetArgs.icon, 'An icon must be provided');

      const { id, pluginId, ...widgetWithoutId } = widgetArgs;
      return {
        ...widgetWithoutId,
        uid: this.generateUid(widgetArgs),
      };
    });

  register(widgets: WidgetArgs): void;
  register(widgets: WidgetArgs[]): void;
  register(widgets: DescriptionReducer<WidgetArgs>): void;
  register(widgets: WidgetArgs | WidgetArgs[] | DescriptionReducer<WidgetArgs>) {
    if (Array.isArray(widgets)) {
      this.widgets.push(...this.addUidToWidgets(widgets));
    } else if (typeof widgets === 'function') {
      const result = widgets(this.widgets);
      this.widgets = this.addUidToWidgets(result);
    } else if (typeof widgets === 'object') {
      this.widgets.push(this.addUidToWidgets([widgets])[0]);
    } else {
      throw new Error('Expected widgets to be an array or a reducer function');
    }
  }

  getAll = () => {
    return this.widgets;
  };
}

export { Widgets };
export type { WidgetArgs, Widget };
