import * as React from 'react';

import { Link, LinkProps } from '@strapi/design-system';
import { ArrowLeft } from '@strapi/icons';
import { produce } from 'immer';
import { useIntl } from 'react-intl';
import { NavLink, type To, useLocation, useNavigate, useNavigationType } from 'react-router-dom';

import { createContext } from '../components/Context';

/* -------------------------------------------------------------------------------------------------
 * HistoryProvider
 * -----------------------------------------------------------------------------------------------*/
interface HistoryState {
  /**
   * The history of the user's navigation within our application
   * during their current session.
   */
  history: string[];
  /**
   * The index of the current location in the history array.
   */
  currentLocationIndex: number;
  /**
   * The current location of the user within our application.
   */
  currentLocation: string;
  /**
   * Whether the user can go back in the history.
   */
  canGoBack: boolean;
}

interface HistoryContextValue extends HistoryState {
  /**
   * @description Push a new state to the history. You can
   * either pass a string or an object.
   */
  pushState: (
    path:
      | {
          to: string;
          search: string;
        }
      | string
  ) => void;
  /**
   * @description Go back in the history. This calls `navigate(-1)` internally
   * to keep the browser in sync with the application state.
   */
  goBack: () => void;
}

const [Provider, useHistory] = createContext<HistoryContextValue>('History', {
  history: [],
  currentLocationIndex: 0,
  currentLocation: '',
  canGoBack: false,
  pushState: () => {
    throw new Error('You must use the `HistoryProvider` to access the `pushState` function.');
  },
  goBack: () => {
    throw new Error('You must use the `HistoryProvider` to access the `goBack` function.');
  },
});

interface HistoryProviderProps {
  children: React.ReactNode;
}

const HistoryProvider = ({ children }: HistoryProviderProps) => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const navigate = useNavigate();
  const [state, dispatch] = React.useReducer(reducer, {
    history: [],
    currentLocationIndex: 0,
    currentLocation: '',
    canGoBack: false,
  });

  const isGoingBack = React.useRef(false);

  const pushState: HistoryContextValue['pushState'] = React.useCallback((path) => {
    dispatch({
      type: 'PUSH_STATE',
      payload: typeof path === 'string' ? { to: path, search: '' } : path,
    });
  }, []);

  const goBack: HistoryContextValue['goBack'] = React.useCallback(() => {
    /**
     * Perform the browser back action, dispatch the goBack action to keep the state in sync
     * and set the ref to avoid an infinite loop and incorrect state pushing
     */
    navigate(-1);
    dispatch({ type: 'GO_BACK' });
    isGoingBack.current = true;
  }, [navigate]);

  /**
   * This is a semi-listener pattern to keep the `canGoBack` state in sync.
   */
  const prevIndex = React.useRef(state.currentLocationIndex);
  React.useEffect(() => {
    if (state.currentLocationIndex !== prevIndex.current) {
      dispatch({
        type: 'SET_CAN_GO_BACK',
        payload: state.currentLocationIndex > 1 && state.history.length > 1,
      });
      prevIndex.current = state.currentLocationIndex;
    }
  }, [prevIndex, state.currentLocationIndex, state.history.length]);

  /**
   * This effect is responsible for pushing the new state to the history
   * when the user navigates to a new location assuming they're not going back.
   */
  React.useLayoutEffect(() => {
    if (isGoingBack.current) {
      isGoingBack.current = false;
    } else if (navigationType === 'REPLACE') {
      // Prevent appending to the history when the location changes via a replace:true navigation
      dispatch({
        type: 'REPLACE_STATE',
        payload: { to: location.pathname, search: location.search },
      });
    } else {
      // this should only occur on link movements, not back/forward clicks
      dispatch({
        type: 'PUSH_STATE',
        payload: { to: location.pathname, search: location.search },
      });
    }
  }, [dispatch, location.pathname, location.search, navigationType]);

  return (
    <Provider pushState={pushState} goBack={goBack} {...state}>
      {children}
    </Provider>
  );
};

type HistoryActions =
  | {
      type: 'PUSH_STATE';
      payload: {
        to: string;
        search: string;
      };
    }
  | {
      type: 'REPLACE_STATE';
      payload: {
        to: string;
        search: string;
      };
    }
  | {
      type: 'GO_BACK';
    }
  | {
      type: 'SET_CAN_GO_BACK';
      payload: boolean;
    };

const reducer = (state: HistoryState, action: HistoryActions) =>
  produce(state, (draft) => {
    switch (action.type) {
      case 'PUSH_STATE': {
        const path = `${action.payload.to}${action.payload.search}`;
        if (state.currentLocationIndex === state.history.length) {
          // add the new place
          draft.history = [...state.history, path];
        } else {
          // delete all the history after the current place and then add the new place
          draft.history = [...state.history.slice(0, state.currentLocationIndex), path];
        }

        draft.currentLocation = path;
        draft.currentLocationIndex += 1;

        break;
      }
      case 'REPLACE_STATE': {
        const path = `${action.payload.to}${action.payload.search}`;
        draft.history = [...state.history.slice(0, state.currentLocationIndex - 1), path];
        draft.currentLocation = path;
        break;
      }
      case 'GO_BACK': {
        const newIndex = state.currentLocationIndex - 1;

        draft.currentLocation = state.history[newIndex - 1];
        draft.currentLocationIndex = newIndex;
        break;
      }
      case 'SET_CAN_GO_BACK': {
        draft.canGoBack = action.payload;
        break;
      }
      default:
        break;
    }
  });

/* -------------------------------------------------------------------------------------------------
 * BackButton
 * -----------------------------------------------------------------------------------------------*/
interface BackButtonProps extends Pick<LinkProps, 'disabled'> {
  fallback?: To;
}

/**
 * @beta
 * @description The universal back button for the Strapi application. This uses the internal history
 * context to navigate the user back to the previous location. It can be completely disabled in a
 * specific user case. When no history is available, you can provide a fallback destination,
 * otherwise the link will be disabled.
 */
const BackButton = React.forwardRef<HTMLAnchorElement, BackButtonProps>(
  ({ disabled, fallback = '' }, ref) => {
    const { formatMessage } = useIntl();
    const navigate = useNavigate();

    const canGoBack = useHistory('BackButton', (state) => state.canGoBack);
    const goBack = useHistory('BackButton', (state) => state.goBack);
    const history = useHistory('BackButton', (state) => state.history);
    const currentLocationIndex = useHistory('BackButton', (state) => state.currentLocationIndex);
    const hasFallback = fallback !== '';
    const shouldBeDisabled = disabled || (!canGoBack && !hasFallback);

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();

      if (canGoBack) {
        goBack();
      } else if (hasFallback) {
        navigate(fallback);
      }
    };

    // The link destination from the history. Undefined if there is only 1 location in the history.
    const historyTo = canGoBack ? history.at(currentLocationIndex - 2) : undefined;
    // If no link destination from the history, use the fallback.
    const toWithFallback = historyTo ?? fallback;

    return (
      <Link
        ref={ref}
        tag={NavLink}
        to={toWithFallback}
        onClick={handleClick}
        disabled={shouldBeDisabled}
        aria-disabled={shouldBeDisabled}
        startIcon={<ArrowLeft />}
      >
        {formatMessage({
          id: 'global.back',
          defaultMessage: 'Back',
        })}
      </Link>
    );
  }
);

export { BackButton, HistoryProvider, useHistory };
export type { BackButtonProps, HistoryProviderProps, HistoryContextValue, HistoryState };
