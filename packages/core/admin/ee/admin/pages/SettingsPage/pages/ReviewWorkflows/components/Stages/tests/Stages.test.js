import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { FormikProvider, useFormik } from 'formik';
import userEvent from '@testing-library/user-event';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { ThemeProvider, lightTheme } from '@strapi/design-system';

import configureStore from '../../../../../../../../../admin/src/core/store/configureStore';
import { Stages } from '../Stages';
import { reducer } from '../../../reducer';
import { ACTION_SET_WORKFLOWS, STAGE_COLOR_DEFAULT } from '../../../constants';
import * as actions from '../../../actions';

// without mocking actions as ESM it is impossible to spy on named exports
jest.mock('../../../actions', () => ({
  __esModule: true,
  ...jest.requireActual('../../../actions'),
}));

const STAGES_FIXTURE = [
  {
    id: 1,
    color: STAGE_COLOR_DEFAULT,
    name: 'stage-1',
  },

  {
    id: 2,
    color: STAGE_COLOR_DEFAULT,
    name: 'stage-2',
  },
];

const WORKFLOWS_FIXTURE = [
  {
    id: 1,
    stages: STAGES_FIXTURE,
  },
];

const ComponentFixture = (props) => {
  const store = configureStore([], [reducer]);

  store.dispatch({ type: ACTION_SET_WORKFLOWS, payload: { workflows: WORKFLOWS_FIXTURE } });

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      stages: STAGES_FIXTURE,
    },
    validateOnChange: false,
  });

  return (
    <DndProvider backend={HTML5Backend}>
      <Provider store={store}>
        <FormikProvider value={formik}>
          <IntlProvider locale="en" messages={{}}>
            <ThemeProvider theme={lightTheme}>
              <Stages stages={STAGES_FIXTURE} {...props} />
            </ThemeProvider>
          </IntlProvider>
        </FormikProvider>
      </Provider>
    </DndProvider>
  );
};

const setup = (props) => render(<ComponentFixture {...props} />);

const user = userEvent.setup();

describe('Admin | Settings | Review Workflow | Stages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render a list of stages', () => {
    const { getByText } = setup();

    expect(getByText(STAGES_FIXTURE[0].name)).toBeInTheDocument();
    expect(getByText(STAGES_FIXTURE[1].name)).toBeInTheDocument();
  });

  it('should render a "add new stage" button', () => {
    const { getByText } = setup();

    expect(getByText('Add new stage')).toBeInTheDocument();
  });

  it('should append a new stage when clicking "add new stage"', async () => {
    const { getByRole } = setup();
    const spy = jest.spyOn(actions, 'addStage');

    await user.click(
      getByRole('button', {
        name: /add new stage/i,
      })
    );

    expect(spy).toBeCalledTimes(1);
    expect(spy).toBeCalledWith({ name: '' });
  });

  it('should update the name of a stage by changing the input value', async () => {
    const { queryByRole, getByRole } = setup();
    const spy = jest.spyOn(actions, 'updateStage');

    await user.click(getByRole('button', { name: /stage-2/i }));

    const input = queryByRole('textbox', {
      name: /stage name/i,
    });

    fireEvent.change(input, { target: { value: 'New name' } });

    expect(spy).toBeCalledWith(2, {
      name: 'New name',
    });
  });
});
