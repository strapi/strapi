import rbacProviderReducer from './components/RBACProvider/reducer';
import rbacManagerReducer from './content-manager/hooks/useSyncRbac/reducer';
import cmAppReducer from './content-manager/pages/App/reducer';
import editViewLayoutManagerReducer from './content-manager/pages/EditViewLayoutManager/reducer';
import listViewReducer from './content-manager/pages/ListView/reducer';
import editViewCrudReducer from './content-manager/sharedReducers/crudReducer/reducer';
import appReducer from './pages/App/reducer';

export const ADMIN_PERMISSIONS_CE = {
  contentManager: {
    main: [],
    collectionTypesConfigurations: [
      {
        action: 'plugin::content-manager.collection-types.configure-view',
        subject: null,
      },
    ],
    componentsConfigurations: [
      {
        action: 'plugin::content-manager.components.configure-layout',
        subject: null,
      },
    ],
    singleTypesConfigurations: [
      {
        action: 'plugin::content-manager.single-types.configure-view',
        subject: null,
      },
    ],
  },
  marketplace: {
    main: [{ action: 'admin::marketplace.read', subject: null }],
    read: [{ action: 'admin::marketplace.read', subject: null }],
  },
  settings: {
    roles: {
      main: [
        { action: 'admin::roles.create', subject: null },
        { action: 'admin::roles.update', subject: null },
        { action: 'admin::roles.read', subject: null },
        { action: 'admin::roles.delete', subject: null },
      ],
      create: [{ action: 'admin::roles.create', subject: null }],
      delete: [{ action: 'admin::roles.delete', subject: null }],
      read: [{ action: 'admin::roles.read', subject: null }],
      update: [{ action: 'admin::roles.update', subject: null }],
    },
    users: {
      main: [
        { action: 'admin::users.create', subject: null },
        { action: 'admin::users.read', subject: null },
        { action: 'admin::users.update', subject: null },
        { action: 'admin::users.delete', subject: null },
      ],
      create: [{ action: 'admin::users.create', subject: null }],
      delete: [{ action: 'admin::users.delete', subject: null }],
      read: [{ action: 'admin::users.read', subject: null }],
      update: [{ action: 'admin::users.update', subject: null }],
    },
    webhooks: {
      main: [
        { action: 'admin::webhooks.create', subject: null },
        { action: 'admin::webhooks.read', subject: null },
        { action: 'admin::webhooks.update', subject: null },
        { action: 'admin::webhooks.delete', subject: null },
      ],
      create: [{ action: 'admin::webhooks.create', subject: null }],
      delete: [{ action: 'admin::webhooks.delete', subject: null }],
      read: [
        { action: 'admin::webhooks.read', subject: null },
        // NOTE: We need to check with the API
        { action: 'admin::webhooks.update', subject: null },
        { action: 'admin::webhooks.delete', subject: null },
      ],
      update: [{ action: 'admin::webhooks.update', subject: null }],
    },
    'api-tokens': {
      main: [{ action: 'admin::api-tokens.access', subject: null }],
      create: [{ action: 'admin::api-tokens.create', subject: null }],
      delete: [{ action: 'admin::api-tokens.delete', subject: null }],
      read: [{ action: 'admin::api-tokens.read', subject: null }],
      update: [{ action: 'admin::api-tokens.update', subject: null }],
      regenerate: [{ action: 'admin::api-tokens.regenerate', subject: null }],
    },
    'transfer-tokens': {
      main: [{ action: 'admin::transfer.tokens.access', subject: null }],
      create: [{ action: 'admin::transfer.tokens.create', subject: null }],
      delete: [{ action: 'admin::transfer.tokens.delete', subject: null }],
      read: [{ action: 'admin::transfer.tokens.read', subject: null }],
      update: [{ action: 'admin::transfer.tokens.update', subject: null }],
      regenerate: [{ action: 'admin::transfer.tokens.regenerate', subject: null }],
    },
    'project-settings': {
      read: [{ action: 'admin::project-settings.read', subject: null }],
      update: [{ action: 'admin::project-settings.update', subject: null }],
    },
  },
};

export const LANGUAGE_MAP = {
  ar: 'العربية',
  ca: 'Català',
  cs: 'Čeština',
  de: 'Deutsch',
  dk: 'Dansk',
  en: 'English',
  es: 'Español',
  eu: 'Euskara',
  fr: 'Français',
  gu: 'Gujarati',
  he: 'עברית',
  hu: 'Magyar',
  id: 'Indonesian',
  it: 'Italiano',
  ja: '日本語',
  ko: '한국어',
  ml: 'Malayalam',
  ms: 'Melayu',
  nl: 'Nederlands',
  no: 'Norwegian',
  pl: 'Polski',
  'pt-BR': 'Português (Brasil)',
  pt: 'Português (Portugal)',
  ru: 'Русский',
  sk: 'Slovenčina',
  sv: 'Swedish',
  th: 'ไทย',
  tr: 'Türkçe',
  uk: 'Українська',
  vi: 'Tiếng Việt',
  'zh-Hans': '中文 (简体)',
  zh: '中文 (繁體)',
  sa: 'संस्कृत',
  hi: 'हिन्दी',
};

const contentManagerReducers = {
  'content-manager_app': cmAppReducer,
  'content-manager_listView': listViewReducer,
  'content-manager_rbacManager': rbacManagerReducer,
  'content-manager_editViewLayoutManager': editViewLayoutManagerReducer,
  'content-manager_editViewCrudReducer': editViewCrudReducer,
};

export const APP_REDUCERS = {
  admin_app: appReducer,
  rbacProvider: rbacProviderReducer,
  ...contentManagerReducers,
};

/**
 * Admin injection zones:
 * Available zones: Content Manager listView & editView
 * @constant
 * @type {Object}
 */
export const INJECTION_ZONES = {
  admin: {
    // Temporary injection zone, support for the react-tour plugin in foodadvisor
    tutorials: {
      links: [],
    },
  },
  contentManager: {
    editView: { informations: [], 'right-links': [] },
    listView: {
      actions: [],
      deleteModalAdditionalInfos: [],
      publishModalAdditionalInfos: [],
      unpublishModalAdditionalInfos: [],
    },
  },
};

export const LOCALE_LOCALSTORAGE_KEY = 'strapi-admin-language';
