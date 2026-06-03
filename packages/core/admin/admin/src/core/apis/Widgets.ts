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
  roles?: string[];
};

type WidgetWithUID = Omit<WidgetArgs, 'id' | 'pluginId'> & { uid: WidgetUID };

type DescriptionReducer = (prev: WidgetArgs[]) => WidgetArgs[];

class Widgets {
  widgets: WidgetArgs[];

  constructor() {
    this.widgets = [];
  }

  private generateUid = (widget: WidgetArgs): WidgetUID => {
    return widget.pluginId ? `plugin::${widget.pluginId}.${widget.id}` : `global::${widget.id}`;
  };

  private checkWidgets = (widgets: WidgetArgs[]): void => {
    widgets.forEach((widget) => {
      invariant(widget.id, 'An id must be provided');
      invariant(widget.component, 'A component must be provided');
      invariant(widget.title, 'A title must be provided');
      invariant(widget.icon, 'An icon must be provided');
    });
  };

  register(widgets: WidgetArgs | WidgetArgs[] | DescriptionReducer) {
    if (Array.isArray(widgets)) {
      this.checkWidgets(widgets);
      this.widgets = [...this.widgets, ...widgets];
    } else if (typeof widgets === 'function') {
      const newWidgets = widgets(this.widgets);
      this.checkWidgets(newWidgets);
      this.widgets = newWidgets;
    } else if (typeof widgets === 'object') {
      this.checkWidgets([widgets]);
      this.widgets.push(widgets);
    } else {
      throw new Error('Expected widgets to be an array or a reducer function');
    }
  }

  getAll = (): WidgetWithUID[] => {
    return this.widgets.map((widget) => {
      const { id, pluginId, ...widgetBase } = widget;
      return {
        ...widgetBase,
        uid: this.generateUid(widget),
      };
    });
  };
}

export { Widgets };
export type { WidgetArgs, WidgetWithUID };
