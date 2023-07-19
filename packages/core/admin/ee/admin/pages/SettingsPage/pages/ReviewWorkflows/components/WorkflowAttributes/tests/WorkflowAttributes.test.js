import React from 'react';

import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormikProvider, useFormik } from 'formik';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';

import configureStore from '../../../../../../../../../admin/src/core/store/configureStore';
import { reducer } from '../../../reducer';
import { WorkflowAttributes } from '../WorkflowAttributes';

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
  it('should render values', async () => {
    const { getByRole, getByText, user } = setup();

    const contentTypesSelect = getByRole('combobox', { name: /associated to/i });

    expect(getByRole('textbox')).toHaveValue('workflow name');
    expect(getByText(/2 content types selected/i)).toBeInTheDocument();

    expect(getByRole('textbox')).not.toHaveAttribute('disabled');
    expect(getByRole('combobox', { name: /associated to/i })).not.toHaveAttribute('data-disabled');

    await user.click(contentTypesSelect);

    await waitFor(() => {
      expect(getByRole('option', { name: /content type 1/i })).toBeInTheDocument();
      expect(getByRole('option', { name: /content type 2/i })).toBeInTheDocument();
    });
  });

  it('should disabled fields if canUpdate = false', async () => {
    const { getByRole } = setup({ canUpdate: false });

    await waitFor(() => {
      expect(getByRole('textbox')).toHaveAttribute('disabled');
      expect(getByRole('combobox', { name: /associated to/i })).toHaveAttribute('data-disabled');
    });
  });
});
