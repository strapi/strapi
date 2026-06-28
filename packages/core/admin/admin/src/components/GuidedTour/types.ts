import * as React from 'react';

import { GUIDED_TOUR_REQUIRED_ACTIONS } from './utils/constants';

/* -------------------------------------------------------------------------------------------------
 * Shared types (no React component imports)
 * -----------------------------------------------------------------------------------------------*/

type ValueOf<T> = T[keyof T];
type NonEmptyValueOf<T> = T extends Record<string, never> ? never : ValueOf<T>;

export type CompletedActions = NonEmptyValueOf<ValueOf<typeof GUIDED_TOUR_REQUIRED_ACTIONS>>[];

export type ValidTourName = 'contentTypeBuilder' | 'contentManager' | 'apiTokens' | 'strapiCloud';

export type Action =
  | {
      type: 'next_step';
      payload: ValidTourName;
    }
  | {
      type: 'previous_step';
      payload: ValidTourName;
    }
  | {
      type: 'go_to_step';
      payload: {
        tourName: ValidTourName;
        step: number;
      };
    }
  | {
      type: 'skip_tour';
      payload: ValidTourName;
    }
  | {
      type: 'skip_all_tours';
    }
  | {
      type: 'reset_all_tours';
    }
  | {
      type: 'set_completed_actions';
      payload: CompletedActions;
    }
  | {
      type: 'remove_completed_action';
      payload: ValueOf<CompletedActions>;
    }
  | {
      type: 'set_tour_type';
      payload: {
        tourName: ValidTourName;
        tourType: 'ContentTypeBuilderAI' | 'ContentTypeBuilderNoAI';
      };
    }
  | {
      type: 'set_hidden';
      payload: boolean;
    };

type TourState = Record<
  ValidTourName,
  { currentStep: number; isCompleted: boolean; tourType?: string }
>;

export type State = {
  tours: TourState;
  enabled: boolean;
  hidden?: boolean;
  completedActions: CompletedActions;
};
