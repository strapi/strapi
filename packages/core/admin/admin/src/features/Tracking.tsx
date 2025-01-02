import * as React from 'react';

import axios, { AxiosResponse } from 'axios';

import { useInitQuery, useTelemetryPropertiesQuery } from '../services/admin';

import { useAppInfo } from './AppInfo';
import { useAuth } from './Auth';

export interface TelemetryProperties {
  useTypescriptOnServer?: boolean;
  useTypescriptOnAdmin?: boolean;
  isHostedOnStrapiCloud?: boolean;
  numberOfAllContentTypes?: number;
  numberOfComponents?: number;
  numberOfDynamicZones?: number;
}

export interface TrackingContextValue {
  uuid?: string | boolean;
  telemetryProperties?: TelemetryProperties;
}

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

const TrackingContext = React.createContext<TrackingContextValue>({
  uuid: false,
});

/* -------------------------------------------------------------------------------------------------
 * Provider
 * -----------------------------------------------------------------------------------------------*/

export interface TrackingProviderProps {
  children: React.ReactNode;
}

// TODO WIP implementation of an inactivity timeout

// Throttle function to limit the rate at which a function can fire
const throttle = <T extends (...args: any[]) => void>(func: T, limit: number) => {
  let inThrottle: boolean;
  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// TODO make this configurable
const DEFAULT_INACTIVITY_TIMEOUT_MS = 2 * 1000;

const TrackingProvider = ({ children }: TrackingProviderProps) => {
  const token = useAuth('App', (state) => state.token);
  const { data: initData } = useInitQuery();
  const { uuid } = initData ?? {};

  const { data } = useTelemetryPropertiesQuery(undefined, {
    skip: !initData?.uuid || !token,
  });

  const inactivityTimer = React.useRef<NodeJS.Timeout | null>(null);

  const logout = useAuth('TrackingProvider', (state) => state.logout);
  const user = useAuth('TrackingProvider', (state) => state.user);

  React.useEffect(() => {
    const resetInactivityTimer = throttle(() => {
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }

      inactivityTimer.current = setTimeout(() => {
        if (user) {
          if (
            window.confirm('You have been inactive for a while. Do you want to stay logged in?')
          ) {
            resetInactivityTimer(); // Reset the timer if the user wants to stay logged in
          } else {
            // User chose to log out, redirect to login page or another URL
            // TODO add redirect URL query params when logging out
            logout();
          }
        }
      }, DEFAULT_INACTIVITY_TIMEOUT_MS);
    }, 1000);

    const handleActivity = () => resetInactivityTimer();

    document.addEventListener('mousemove', handleActivity, false);
    document.addEventListener('keypress', handleActivity, false);
    document.addEventListener('click', handleActivity, false);
    document.addEventListener('scroll', handleActivity, false);

    resetInactivityTimer();

    return () => {
      document.removeEventListener('mousemove', handleActivity, false);
      document.removeEventListener('keypress', handleActivity, false);
      document.removeEventListener('click', handleActivity, false);
      document.removeEventListener('scroll', handleActivity, false);
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
    };
  }, [logout, user]);

  React.useEffect(() => {
    if (uuid && data) {
      const event = 'didInitializeAdministration';
      try {
        fetch('https://analytics.strapi.io/api/v2/track', {
          method: 'POST',
          body: JSON.stringify({
            // This event is anonymous
            event,
            userId: '',
            eventPropeties: {},
            groupProperties: { ...data, projectId: uuid },
          }),
          headers: {
            'Content-Type': 'application/json',
            'X-Strapi-Event': event,
          },
        });
      } catch {
        // silence is golden
      }
    }
  }, [data, uuid]);

  const value = React.useMemo(
    () => ({
      uuid,
      telemetryProperties: data,
    }),
    [uuid, data]
  );

  return <TrackingContext.Provider value={value}>{children}</TrackingContext.Provider>;
};

/* -------------------------------------------------------------------------------------------------
 * Hook
 * -----------------------------------------------------------------------------------------------*/

/**
 * We can group these events together because none have properties so there's no benefit
 * to having them as separate types.
 *
 * Meanwhile those with properties have different property shapes corresponding to the specific
 * event so understanding which properties go with which event is very helpful.
 */
interface EventWithoutProperties {
  name:
    | 'changeComponentsOrder'
    | 'didAccessAuthenticatedAdministration'
    | 'didAddComponentToDynamicZone'
    | 'didBulkDeleteEntries'
    | 'didNotBulkDeleteEntries'
    | 'didChangeDisplayedFields'
    | 'didCheckDraftRelations'
    | 'didClickGuidedTourHomepageApiTokens'
    | 'didClickGuidedTourHomepageContentManager'
    | 'didClickGuidedTourHomepageContentTypeBuilder'
    | 'didClickGuidedTourStep1CollectionType'
    | 'didClickGuidedTourStep2ContentManager'
    | 'didClickGuidedTourStep3ApiTokens'
    | 'didClickonBlogSection'
    | 'didClickonCodeExampleSection'
    | 'didClickonReadTheDocumentationSection'
    | 'didClickOnTryStrapiCloudSection'
    | 'didClickonTutorialSection'
    | 'didCreateGuidedTourCollectionType'
    | 'didCreateGuidedTourEntry'
    | 'didCreateNewRole'
    | 'didCreateRole'
    | 'didDeleteToken'
    | 'didDuplicateRole'
    | 'didEditEditSettings'
    | 'didEditEmailTemplates'
    | 'didEditFieldNameOnContentType'
    | 'didEditListSettings'
    | 'didEditMediaLibraryConfig'
    | 'didEditNameOfContentType'
    | 'didGenerateGuidedTourApiTokens'
    | 'didGoToMarketplace'
    | 'didLaunchGuidedtour'
    | 'didMissMarketplacePlugin'
    | 'didNotCreateFirstAdmin'
    | 'didNotSaveComponent'
    | 'didPluginLearnMore'
    | 'didPublishEntry'
    | 'didBulkPublishEntries'
    | 'didNotBulkPublishEntries'
    | 'didUnpublishEntry'
    | 'didBulkUnpublishEntries'
    | 'didNotBulkUnpublishEntries'
    | 'didSaveComponent'
    | 'didSaveContentType'
    | 'didSearch'
    | 'didSkipGuidedtour'
    | 'didSubmitPlugin'
    | 'didSubmitProvider'
    | 'didUpdateConditions'
    | 'didSelectAllMediaLibraryElements'
    | 'didSelectContentTypeFieldSettings'
    | 'didSelectContentTypeSettings'
    | 'didEditAuthenticationProvider'
    | 'didRestoreHistoryVersion'
    | 'hasClickedCTBAddFieldBanner'
    | 'removeComponentFromDynamicZone'
    | 'willAddMoreFieldToContentType'
    | 'willBulkDeleteEntries'
    | 'willBulkPublishEntries'
    | 'willBulkUnpublishEntries'
    | 'willChangeNumberOfEntriesPerPage'
    | 'willCheckDraftRelations'
    | 'willCreateComponent'
    | 'willCreateComponentFromAttributesModal'
    | 'willCreateContentType'
    | 'willCreateFirstAdmin'
    | 'willCreateNewRole'
    | 'willCreateRole'
    | 'willCreateSingleType'
    | 'willCreateStage'
    | 'willCreateWorkflow'
    | 'willDeleteEntryFromList'
    | 'willDeleteFieldOfContentType'
    | 'willDuplicateRole'
    | 'willEditEditLayout'
    | 'willEditEmailTemplates'
    | 'willEditEntryFromButton'
    | 'willEditEntryFromList'
    | 'willEditFieldOfContentType'
    | 'willEditMediaLibraryConfig'
    | 'willEditNameOfContentType'
    | 'willEditNameOfSingleType'
    | 'willEditAuthenticationProvider'
    | 'willEditFieldNameOnContentType'
    | 'willEditStage'
    | 'willFilterEntries'
    | 'willInstallPlugin'
    | 'willPublishEntry'
    | 'willUnpublishEntry'
    | 'willSaveComponent'
    | 'willSaveContentType'
    | 'willSaveContentTypeLayout'
    | 'didEditFieldNameOnContentType'
    | 'didCreateRelease';
  properties?: never;
}

interface DidFilterMediaLibraryElementsEvent {
  name: 'didFilterMediaLibraryElements';
  properties: MediaEvents['properties'] & {
    filter: string;
  };
}

interface DidSortMediaLibraryElementsEvent {
  name: 'didSortMediaLibraryElements';
  properties: MediaEvents['properties'] & {
    sort: string;
  };
}

interface DidCropFileEvent {
  name: 'didCropFile';
  properties: MediaEvents['properties'] & {
    duplicatedFile: null | boolean;
  };
}

interface DidSelectFile {
  name: 'didSelectFile';
  properties: MediaEvents['properties'] & {
    source: 'url' | 'computer';
  };
}

interface DidEditMediaLibraryElementsEvent {
  name: 'didEditMediaLibraryElements';
  properties: MediaEvents['properties'] & {
    type: string;
    changeLocation: string | boolean;
  };
}

interface MediaEvents {
  name:
    | 'didSearchMediaLibraryElements'
    | 'didReplaceMedia'
    | 'didAddMediaLibraryFolders'
    | 'willAddMediaLibraryAssets';
  properties: {
    location: string;
  };
}

interface DidSelectContentTypeFieldTypeEvent {
  name: 'didSelectContentTypeFieldType';
  properties: {
    type?: string;
  };
}

interface DidChangeModeEvent {
  name: 'didChangeMode';
  properties: {
    newMode: string;
  };
}
interface DidSubmitWithErrorsFirstAdminEvent {
  name: 'didSubmitWithErrorsFirstAdmin';
  properties: {
    count: string;
  };
}

interface WillNavigateEvent {
  name: 'willNavigate';
  properties: {
    from: string;
    to: string;
  };
}

interface DidAccessTokenListEvent {
  name: 'didAccessTokenList';
  properties: {
    tokenType: TokenEvents['properties']['tokenType'];
    number: number;
  };
}
interface LogoEvent {
  name: 'didChangeLogo' | 'didClickResetLogo';
  properties: {
    logo: 'menu' | 'auth';
  };
}

interface TokenEvents {
  name:
    | 'didCopyTokenKey'
    | 'didAddTokenFromList'
    | 'didEditTokenFromList'
    | 'willAccessTokenList'
    | 'willAddTokenFromList'
    | 'willCreateToken'
    | 'willDeleteToken'
    | 'willEditToken'
    | 'willEditTokenFromList';
  properties: {
    tokenType: 'api-token' | 'transfer-token';
  };
}

interface WillModifyTokenEvent {
  name: 'didCreateToken' | 'didEditToken';
  properties: {
    tokenType: TokenEvents['properties']['tokenType'];
    type: 'custom' | 'full-access' | 'read-only' | Array<'push' | 'pull' | 'push-pull'>;
  };
}

interface DeleteEntryEvents {
  name: 'willDeleteEntry' | 'didDeleteEntry' | 'didNotDeleteEntry';
  properties: {
    status?: string;
    error?: unknown;
  };
}

interface CreateEntryEvents {
  name: 'willCreateEntry' | 'didCreateEntry' | 'didNotCreateEntry';
  properties: {
    status?: string;
    error?: unknown;
  };
}

interface UpdateEntryEvents {
  name: 'willEditEntry' | 'didEditEntry' | 'didNotEditEntry';
  properties: {
    status?: string;
    error?: unknown;
  };
}

interface DidFilterEntriesEvent {
  name: 'didFilterEntries';
  properties: {
    useRelation: boolean;
  };
}

interface DidPublishRelease {
  name: 'didPublishRelease';
  properties: {
    totalEntries: number;
    totalPublishedEntries: number;
    totalUnpublishedEntries: number;
  };
}

type EventsWithProperties =
  | CreateEntryEvents
  | DidAccessTokenListEvent
  | DidChangeModeEvent
  | DidCropFileEvent
  | DeleteEntryEvents
  | DidEditMediaLibraryElementsEvent
  | DidFilterMediaLibraryElementsEvent
  | DidFilterEntriesEvent
  | DidSelectContentTypeFieldTypeEvent
  | DidSelectFile
  | DidSortMediaLibraryElementsEvent
  | DidSubmitWithErrorsFirstAdminEvent
  | LogoEvent
  | TokenEvents
  | UpdateEntryEvents
  | WillModifyTokenEvent
  | WillNavigateEvent
  | DidPublishRelease
  | MediaEvents;

export type TrackingEvent = EventWithoutProperties | EventsWithProperties;
export interface UseTrackingReturn {
  /**
   * This type helps show all the available event names before you start typing,
   * however autocomplete isn't great.
   */
  trackUsage<TEvent extends TrackingEvent>(
    event: TEvent['name'],
    properties: TEvent['properties']
  ): Promise<null | AxiosResponse<string>>;
  trackUsage<TEvent extends Extract<TrackingEvent, { properties?: never }>>(
    event: TEvent['name'],
    properties?: never
  ): Promise<null | AxiosResponse<string>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trackUsage<TEvent extends Extract<TrackingEvent, { properties: object }>>(
    event: TEvent['name'],
    properties: TEvent['properties']
  ): Promise<null | AxiosResponse<string>>;
}

/**
 * @description Used to send amplitude events to the Strapi Tracking hub.
 *
 * @example
 * ```tsx
 * import { useTracking } from '@strapi/strapi/admin';
 *
 * const MyComponent = () => {
 *  const { trackUsage } = useTracking();
 *
 *  const handleClick = () => {
 *   trackUsage('my-event', { myProperty: 'myValue' });
 *  }
 *
 *  return <button onClick={handleClick}>Send Event</button>
 * }
 * ```
 */
const useTracking = (): UseTrackingReturn => {
  const { uuid, telemetryProperties } = React.useContext(TrackingContext);
  const userId = useAppInfo('useTracking', (state) => state.userId);
  const trackUsage = React.useCallback(
    async <TEvent extends TrackingEvent>(
      event: TEvent['name'],
      properties?: TEvent['properties']
    ) => {
      try {
        if (uuid && !window.strapi.telemetryDisabled) {
          const res = await axios.post<string>(
            'https://analytics.strapi.io/api/v2/track',
            {
              event,
              userId,
              eventProperties: { ...properties },
              userProperties: {},
              groupProperties: {
                ...telemetryProperties,
                projectId: uuid,
                projectType: window.strapi.projectType,
              },
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'X-Strapi-Event': event,
              },
            }
          );

          return res;
        }
      } catch (err) {
        // Silence is golden
      }

      return null;
    },
    [telemetryProperties, userId, uuid]
  );

  return { trackUsage };
};

export { TrackingProvider, useTracking };
