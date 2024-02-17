import React from 'react';

import { configureStore } from '@reduxjs/toolkit';
import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';

import { Stage } from '../../../../../../../../../shared/contracts/review-workflows';
import * as actions from '../../actions';
import { STAGE_COLOR_DEFAULT } from '../../constants';
import { reducer } from '../../reducer';
import { Stages, StagesProps } from '../Stages';

// without mocking actions as ESM it is impossible to spy on named exports
jest.mock('../../actions', () => ({
  __esModule: true,
  ...jest.requireActual('../../actions'),
}));

// A single stage needs a formik provider, which is a bit complicated to setup.
// Since we don't want to test the single stages, but the overall composition
// it is the easiest for the test setup to just render an id instead of the
// whole component.
jest.mock('../Stage', () => ({
  __esModule: true,
  Stage: ({ id }: { id: string }) => id,
}));

const STAGES_FIXTURE: Stage[] = [
  {
    id: 1,
    color: STAGE_COLOR_DEFAULT,
    name: 'stage-1',
    permissions: [],
    createdAt: new Date().toDateString(),
    updatedAt: new Date().toDateString(),
  },
  {
    id: 2,
    color: STAGE_COLOR_DEFAULT,
    name: 'stage-2',
    permissions: [],
    createdAt: new Date().toDateString(),
    updatedAt: new Date().toDateString(),
  },
];

const setup = (props?: StagesProps) => ({
  ...render(<Stages stages={STAGES_FIXTURE} {...props} />, {
    wrapper({ children }) {
      const store = configureStore({
        reducer,
        middleware: (getDefaultMiddleware: any) =>
          getDefaultMiddleware({
            // Disable timing checks for test env
            immutableCheck: false,
            serializableCheck: false,
          }),
      });

      return (
        <DndProvider backend={HTML5Backend}>
          <Provider store={store}>
            <IntlProvider locale="en" messages={{}}>
              <ThemeProvider theme={lightTheme}>{children}</ThemeProvider>
            </IntlProvider>
          </Provider>
        </DndProvider>
      );
    },
  }),

  user: userEvent.setup(),
});

describe('Admin | Settings | Review Workflow | Stages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render a list of stages', () => {
    const { getByText } = setup();

    expect(getByText(STAGES_FIXTURE[0].id)).toBeInTheDocument();
    expect(getByText(STAGES_FIXTURE[1].id)).toBeInTheDocument();
  });

  it('should render a "add new stage" button', () => {
    const { getByText } = setup();

    expect(getByText('Add new stage')).toBeInTheDocument();
  });

  it('should append a new stage when clicking "add new stage"', async () => {
    const { getByRole, user } = setup();
    const spy = jest.spyOn(actions, 'addStage');

    await user.click(
      getByRole('button', {
        name: /add new stage/i,
      })
    );

    expect(spy).toBeCalledTimes(1);
    expect(spy).toBeCalledWith({ name: '' });
  });

  it('should not render the "add stage" button if canUpdate = false', () => {
    const { queryByText } = setup({ canUpdate: false });

    expect(queryByText('Add new stage')).not.toBeInTheDocument();
  });
});
