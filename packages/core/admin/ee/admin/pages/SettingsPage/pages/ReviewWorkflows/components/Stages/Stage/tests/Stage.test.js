import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { FormikProvider, useFormik } from 'formik';
import { Provider } from 'react-redux';

import { ThemeProvider, lightTheme } from '@strapi/design-system';

import configureStore from '../../../../../../../../../../admin/src/core/store/configureStore';
import { Stage } from '../Stage';
import { reducer } from '../../../../reducer';

const STAGES_FIXTURE = {
  id: 1,
  name: 'stage-1',
  index: 1,
};

const ComponentFixture = (props) => {
  const store = configureStore([], [reducer]);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      stages: [
        {
          name: 'something',
        },
      ],
    },
    validateOnChange: false,
  });

  return (
    <Provider store={store}>
      <FormikProvider value={formik}>
        <IntlProvider locale="en" messages={{}}>
          <ThemeProvider theme={lightTheme}>
            <Stage {...STAGES_FIXTURE} {...props} />
          </ThemeProvider>
        </IntlProvider>
      </FormikProvider>
    </Provider>
  );
};

const setup = (props) => render(<ComponentFixture {...props} />);

const user = userEvent.setup();

describe('Admin | Settings | Review Workflow | Stage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render a stage', async () => {
    const { getByRole, queryByRole } = setup();

    expect(queryByRole('textbox')).not.toBeInTheDocument();

    await user.click(getByRole('button'));

    expect(queryByRole('textbox')).toBeInTheDocument();
    expect(getByRole('textbox').value).toBe(STAGES_FIXTURE.name);
    expect(getByRole('textbox').getAttribute('name')).toBe('stages.1.name');
    expect(
      queryByRole('button', {
        name: /delete stage/i,
      })
    ).not.toBeInTheDocument();
  });

  it('should open the accordion panel if isOpen = true', async () => {
    const { queryByRole } = setup({ isOpen: true });

    expect(queryByRole('textbox')).toBeInTheDocument();
  });

  it('should not render delete button if canDelete=false', async () => {
    const { queryByRole } = setup({ isOpen: true, canDelete: false });

    expect(
      queryByRole('button', {
        name: /delete stage/i,
      })
    ).not.toBeInTheDocument();
  });
});
