import React from 'react';
import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { FormikProvider, useFormik } from 'formik';
import { Provider } from 'react-redux';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { ThemeProvider, lightTheme } from '@strapi/design-system';

import configureStore from '../../../../../../../../../admin/src/core/store/configureStore';
import { WorkflowAttributes } from '../WorkflowAttributes';
import { reducer } from '../../../reducer';

const CONTENT_TYPES_FIXTURE = {
  collectionTypes: [
    {
      uid: 'uid1',
      info: {
        displayName: 'Content Type 1',
      },
    },
  ],

  singleTypes: [
    {
      uid: 'uid2',
      info: {
        displayName: 'Content Type 2',
      },
    },
  ],
};

const ComponentFixture = (props) => {
  const store = configureStore([], [reducer]);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: 'workflow name',
      contentTypes: ['uid1', 'uid1'],
    },
    validateOnChange: false,
  });

  return (
    <DndProvider backend={HTML5Backend}>
      <Provider store={store}>
        <FormikProvider value={formik}>
          <IntlProvider locale="en" messages={{}}>
            <ThemeProvider theme={lightTheme}>
              <WorkflowAttributes contentTypes={CONTENT_TYPES_FIXTURE} {...props} />
            </ThemeProvider>
          </IntlProvider>
        </FormikProvider>
      </Provider>
    </DndProvider>
  );
};

const setup = (props) => ({
  ...render(<ComponentFixture {...props} />),
  user: userEvent.setup(),
});

describe('Admin | Settings | Review Workflow | WorkflowAttributes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render values', async () => {
    const { getByRole, getByText, user } = setup();

    const contentTypesSelect = getByRole('combobox', { name: /associated to/i });

    expect(getByRole('textbox')).toHaveValue('workflow name');
    expect(getByText(/2 content types selected/i)).toBeInTheDocument();

    await act(async () => {
      await user.click(contentTypesSelect);
    });

    expect(getByRole('option', { name: /content type 1/i })).toBeInTheDocument();
    expect(getByRole('option', { name: /content type 2/i })).toBeInTheDocument();
  });
});
