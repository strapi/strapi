import { hideDeployNowWidgetInProduction, DEPLOY_NOW_WIDGET_UID } from '../widgetVisibility';

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
