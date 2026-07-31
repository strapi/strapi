/**
 * Helpers that decide which widgets should be displayed (when/where), as opposed to
 * `widgetLayout.ts`, which handles how widgets are sized and positioned.
 */

import type { WidgetWithUID } from '../core/apis/Widgets';

/**
 * UID of the deploy-now widget, a Strapi Cloud upsell promoting a first deployment.
 */
export const DEPLOY_NOW_WIDGET_UID = 'plugin::admin.deploy-now';

/**
 * Sidebar route for the Strapi Cloud deploy upsell page.
 */
export const CLOUD_DEPLOY_MENU_LINK = 'plugins/cloud';

export const isProductionEnvironment = (currentEnvironment?: string): boolean =>
  currentEnvironment === 'production';

/**
 * Hides the deploy-now upsell widget when the project runs in production.
 *
 * The widget promotes deploying the project for the first time, which is no longer
 * relevant once the project is live. This relies on the server-reported environment
 * (`currentEnvironment` from `/admin/information`) rather than any frontend
 * production heuristic, and keeps the widget visible when the environment is unknown.
 */
export const hideDeployNowWidgetInProduction = (
  widgets: WidgetWithUID[],
  currentEnvironment?: string
): WidgetWithUID[] => {
  if (!isProductionEnvironment(currentEnvironment)) {
    return widgets;
  }

  return widgets.filter((widget) => widget.uid !== DEPLOY_NOW_WIDGET_UID);
};

/**
 * Hides the Strapi Cloud deploy sidebar link when the project runs in production.
 */
export const hideCloudDeployMenuLinkInProduction = <T extends { to: string }>(
  menuLinks: T[],
  currentEnvironment?: string
): T[] => {
  if (!isProductionEnvironment(currentEnvironment)) {
    return menuLinks;
  }

  return menuLinks.filter((link) => link.to !== CLOUD_DEPLOY_MENU_LINK);
};
