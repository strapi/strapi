import adminPermissions from '../../../../../admin/src/permissions';

const items = [];

if (window.strapi.features.isEnabled(window.strapi.features.SSO)) {
  items.push({
    intlLabel: { id: 'Settings.sso.title', defaultMessage: 'Single Sign-On' },
    to: '/settings/single-sign-on',
    id: 'sso',
    isDisplayed: false,
    permissions: adminPermissions.settings.sso.main,
  });
}

if (window.strapi.features.isEnabled(window.strapi.features.REVIEW_WORKFLOWS)) {
  items.push({
    intlLabel: { id: 'Settings.review-workflows.page.title', defaultMessage: 'Review Workflows' },
    to: '/settings/review-workflows',
    id: 'review-workflows',
    isDisplayed: false,
    permissions: adminPermissions.settings['review-workflows'].main,
  });
}

export default items;
