import {
  hideCloudDeployMenuLinkInProduction,
  hideDeployNowWidgetInProduction,
  CLOUD_DEPLOY_MENU_LINK,
  DEPLOY_NOW_WIDGET_UID,
} from '../widgetVisibility';

import type { WidgetWithUID } from '../../core/apis/Widgets';

const createMockWidget = (uid: string, title: string): WidgetWithUID => ({
  uid: uid as `plugin::${string}.${string}` | `global::${string}`,
  title: { id: `widget.${uid}`, defaultMessage: title },
  icon: undefined,
  component: jest.fn(),
});

const mockWidgets: WidgetWithUID[] = [
  createMockWidget('widget-1', 'Widget 1'),
  createMockWidget('widget-2', 'Widget 2'),
];

describe('hideDeployNowWidgetInProduction', () => {
  const deployNowWidget = createMockWidget(DEPLOY_NOW_WIDGET_UID, 'Deploy');
  const widgetsWithDeploy = [...mockWidgets, deployNowWidget];

  it('removes the deploy-now widget in production', () => {
    const result = hideDeployNowWidgetInProduction(widgetsWithDeploy, 'production');

    expect(result).toEqual(mockWidgets);
    expect(result.map((widget) => widget.uid)).not.toContain(DEPLOY_NOW_WIDGET_UID);
  });

  it('keeps the deploy-now widget outside production', () => {
    expect(hideDeployNowWidgetInProduction(widgetsWithDeploy, 'development')).toEqual(
      widgetsWithDeploy
    );
  });

  it('keeps the deploy-now widget when the environment is unknown', () => {
    expect(hideDeployNowWidgetInProduction(widgetsWithDeploy, undefined)).toEqual(
      widgetsWithDeploy
    );
  });
});

describe('hideCloudDeployMenuLinkInProduction', () => {
  const menuLinks = [
    { to: 'plugins/upload', intlLabel: { id: 'upload', defaultMessage: 'Media Library' } },
    { to: CLOUD_DEPLOY_MENU_LINK, intlLabel: { id: 'cloud', defaultMessage: 'Deploy' } },
  ];

  it('removes the cloud deploy menu link in production', () => {
    expect(hideCloudDeployMenuLinkInProduction(menuLinks, 'production')).toEqual([menuLinks[0]]);
  });

  it('keeps the cloud deploy menu link outside production', () => {
    expect(hideCloudDeployMenuLinkInProduction(menuLinks, 'development')).toEqual(menuLinks);
  });

  it('keeps the cloud deploy menu link when the environment is unknown', () => {
    expect(hideCloudDeployMenuLinkInProduction(menuLinks, undefined)).toEqual(menuLinks);
  });
});
