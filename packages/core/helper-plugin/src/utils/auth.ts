import isEmpty from 'lodash/isEmpty';
import isNil from 'lodash/isNil';

const TOKEN_KEY = 'jwtToken';
const USER_INFO = 'userInfo';
const CURRENT_STEP = 'GUIDED_TOUR_CURRENT_STEP';
const COMPLETED_STEPS = 'GUIDED_TOUR_COMPLETED_STEPS';
const SKIPPED = 'GUIDED_TOUR_SKIPPED';
const THEME_KEY = 'STRAPI_THEME'; // Also used in packages/core/admin/admin/src/components/ThemeToggleProvider/index.js
const UPLOAD_MODAL_VIEW = 'STRAPI_UPLOAD_MODAL_VIEW';
const UPLOAD_VIEW = 'STRAPI_UPLOAD_LIBRARY_VIEW';

interface UserInfo {
  email: string;
  firstname?: string;
  lastname?: string;
  username?: string;
  preferedLanguage?: string;
  id: number;
  isActive?: boolean;
  blocked: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StorageItems {
  userInfo: UserInfo;
  jwtToken: string;
  STRAPI_THEME: 'light' | 'dark';
  GUIDED_TOUR_CURRENT_STEP: string | null;
  GUIDED_TOUR_COMPLETED_STEPS: string[] | null;
  GUIDED_TOUR_SKIPPED: boolean | null;
  STRAPI_UPDATE_NOTIF: boolean | null;
  STRAPI_UPLOAD_MODAL_VIEW: 0 | 1 | null; // grid or list view
  STRAPI_UPLOAD_LIBRARY_VIEW: 0 | 1 | null; // grid or list view
  videos: unknown;
  onboarding: unknown;
}

type StorageItemValues = StorageItems[keyof StorageItems];

/**
 * @deprecated if you're trying to interact with the token or current user you use should use the `useAuth` hook instead.
 * If you're generally interacting with localStorage, then access this directly e.g. `localStorage.getItem('myKey')`.
 *
 * This will be removed in V5.
 */
const auth = {
  clear(key: keyof StorageItems) {
    if (localStorage.getItem(key)) {
      return localStorage.removeItem(key);
    }

    if (sessionStorage.getItem(key)) {
      return sessionStorage.removeItem(key);
    }

    return null;
  },

  clearAppStorage() {
    if (localStorage) {
      const videos = auth.get('videos');
      const onboarding = auth.get('onboarding');
      const strapiUpdateNotification = auth.get('STRAPI_UPDATE_NOTIF');

      const localeLang = localStorage.getItem('strapi-admin-language');
      const guidedTourCurrentStep = auth.get(CURRENT_STEP);
      const guidedTourState = auth.get(COMPLETED_STEPS);
      const guidedTourSkipped = auth.get(SKIPPED);
      const applicationTheme = auth.get(THEME_KEY);
      const uploadMediaLibraryView = auth.get(UPLOAD_VIEW);
      const uploadMediaLibraryModalView = auth.get(UPLOAD_MODAL_VIEW);

      localStorage.clear();

      localStorage.setItem('videos', JSON.stringify(videos));
      localStorage.setItem(CURRENT_STEP, JSON.stringify(guidedTourCurrentStep));
      localStorage.setItem(COMPLETED_STEPS, JSON.stringify(guidedTourState));
      localStorage.setItem(SKIPPED, JSON.stringify(guidedTourSkipped));
      localStorage.setItem('STRAPI_UPDATE_NOTIF', JSON.stringify(strapiUpdateNotification));

      if (onboarding) {
        localStorage.setItem('onboarding', JSON.stringify(onboarding));
      }

      if (localeLang) {
        localStorage.setItem('strapi-admin-language', localeLang);
      }

      if (applicationTheme) {
        localStorage.setItem(THEME_KEY, applicationTheme);
      }

      if (!isNil(uploadMediaLibraryView)) {
        localStorage.setItem(UPLOAD_VIEW, JSON.stringify(uploadMediaLibraryView));
      }

      if (!isNil(uploadMediaLibraryModalView)) {
        localStorage.setItem(UPLOAD_MODAL_VIEW, JSON.stringify(uploadMediaLibraryModalView));
      }
    }

    sessionStorage.clear();
  },

  get<T extends keyof StorageItems>(key: T): StorageItems[T] | null {
    const item = localStorage.getItem(key) ?? sessionStorage.getItem(key);
    if (item) {
      try {
        const parsedItem = JSON.parse(item);
        return parsedItem;
      } catch (error) {
        // Failed to parse return the string value
        // @ts-expect-error - this is fine
        return item;
      }
    }

    return null;
  },

  set(value: StorageItemValues, key: keyof StorageItems, isLocalStorage: boolean) {
    if (isEmpty(value)) {
      return null;
    }

    if (isLocalStorage) {
      return localStorage.setItem(key, JSON.stringify(value));
    }

    return sessionStorage.setItem(key, JSON.stringify(value));
  },

  /**
   * @deprecated use auth.clear("jwtToken") instead
   */
  clearToken(tokenKey: 'jwtToken' = TOKEN_KEY) {
    void auth.clear(tokenKey);
  },

  /**
   * @deprecated use auth.clear("userInfo") instead
   */
  clearUserInfo(userInfoKey: 'userInfo' = USER_INFO) {
    return auth.clear(userInfoKey);
  },

  /**
   * @deprecated use auth.get("jwtToken") instead
   */
  getToken(tokenKey: 'jwtToken' = TOKEN_KEY) {
    return auth.get(tokenKey);
  },

  /**
   * @deprecated use auth.get("userInfo") instead
   */
  getUserInfo(userInfoKey: 'userInfo' = USER_INFO) {
    return auth.get(userInfoKey);
  },

  /**
   * @depreacted use auth.set(value, "jwtToken", true | false) instead
   */
  setToken(
    value: StorageItemValues = '',
    isLocalStorage = false,
    tokenKey: 'jwtToken' = TOKEN_KEY
  ) {
    void auth.set(value, tokenKey, isLocalStorage);
  },

  /**
   * @depreacted use auth.set(value, "userInfo", true | false) instead
   */
  setUserInfo(value: StorageItemValues, isLocalStorage = false, userInfo: 'userInfo' = USER_INFO) {
    void auth.set(value, userInfo, isLocalStorage);
  },

  /**
   * @depreacted use auth.set(value, "userInfo", true | false) instead
   */
  updateToken(value: StorageItemValues = '') {
    const isLocalStorage = Boolean(localStorage.getItem(TOKEN_KEY));

    void auth.setToken(value, isLocalStorage);
  },
};

export { auth };
export type { UserInfo, StorageItems };
