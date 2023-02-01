import React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { FormikProvider, useFormik } from 'formik';
import userEvent from '@testing-library/user-event';

import { ThemeProvider, lightTheme } from '@strapi/design-system';

import configureStore from '../../../../../../../../../admin/src/core/store/configureStore';
import { Stages } from '../Stages';
import { reducer } from '../../../reducer';
import { ACTION_SET_WORKFLOWS, ACTION_ADD_STAGE } from '../../../constants';
import { addStage } from '../../../actions';

jest.mock('../../../actions', () => ({
  ...jest.requireActual('../../../actions'),
  addStage: jest.fn(),
}));

const STAGES_FIXTURE = [
  {
    id: 1,
    name: 'stage-1',
  },

  {
    id: 2,
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
    <Provider store={store}>
      <FormikProvider value={formik}>
        <IntlProvider locale="en" messages={{}}>
          <ThemeProvider theme={lightTheme}>
            <Stages stages={STAGES_FIXTURE} {...props} />
          </ThemeProvider>
        </IntlProvider>
      </FormikProvider>
    </Provider>
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

    addStage.mockReturnValue({ type: ACTION_ADD_STAGE });

    await user.click(
      getByRole('button', {
        name: /add new stage/i,
      })
    );

    expect(addStage).toBeCalledTimes(1);
    expect(addStage).toBeCalledWith({ name: '' });
  });
});
