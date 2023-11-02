import * as React from 'react';

import axios, { AxiosResponse } from 'axios';

import { useAppInfo } from './AppInfo';

export interface TelemetryProperties {
  useTypescriptOnServer?: boolean;
  useTypescriptOnAdmin?: boolean;
  isHostedOnStrapiCloud?: boolean;
  numberOfAllContentTypes?: number;
  numberOfComponents?: number;
  numberOfDynamicZones?: number;
}

export interface TrackingContextValue {
  uuid: string | boolean;
  deviceId?: string;
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
  value?: TrackingContextValue;
}

const TrackingProvider = ({ value = { uuid: false }, children }: TrackingProviderProps) => {
  const memoizedValue = React.useMemo(() => value, [value]);

  return <TrackingContext.Provider value={memoizedValue}>{children}</TrackingContext.Provider>;
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
    | 'didAccessAuthenticatedAdministration'
    | 'didChangeDisplayedFields'
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
    | 'didEditListSettings'
    | 'didEditMediaLibraryConfig'
    | 'didEditNameOfContentType'
    | 'didGenerateGuidedTourApiTokens'
    | 'didGoToMarketplace'
    | 'didLaunchGuidetour'
    | 'didMissMarketplacePlugin'
    | 'didNotCreateFirstAdmin'
    | 'didNotSaveComponent'
    | 'didPluginLearnMore'
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
    | 'hasClickedCTBAddFieldBanner'
    | 'willAddMoreFieldToContentType'
    | 'willBulkDeleteEntries'
    | 'willBulkUnpublishEntries'
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
    | 'willSaveComponent'
    | 'willSaveContentType'
    | 'willSaveContentTypeLayout';
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
    changeLocation: string;
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
    type: string;
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
  properties: TokenEvents['properties'] & {
    number: string;
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
    | 'willAccessTokenList'
    | 'willAddTokenFromList'
    | 'willDeleteToken'
    | 'willEditTokenFromList';
  properties: {
    tokenType: string;
  };
}

type EventsWithProperties =
  | DidAccessTokenListEvent
  | DidChangeModeEvent
  | DidCropFileEvent
  | DidEditMediaLibraryElementsEvent
  | DidFilterMediaLibraryElementsEvent
  | DidSelectContentTypeFieldTypeEvent
  | DidSelectFile
  | DidSortMediaLibraryElementsEvent
  | DidSubmitWithErrorsFirstAdminEvent
  | LogoEvent
  | TokenEvents
  | WillNavigateEvent;

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
 * import { useTracking } from '@strapi/helper-plugin';
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
  const { uuid, telemetryProperties, deviceId } = React.useContext(TrackingContext);
  const appInfo = useAppInfo();
  const userId = appInfo?.userId;
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
              deviceId,
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
    [deviceId, telemetryProperties, userId, uuid]
  );

  return { trackUsage };
};

export { TrackingContext, TrackingProvider, useTracking };
