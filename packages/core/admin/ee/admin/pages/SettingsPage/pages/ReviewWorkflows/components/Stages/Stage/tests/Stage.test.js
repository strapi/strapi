import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormikProvider, useFormik } from 'formik';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';

import configureStore from '../../../../../../../../../../admin/src/core/store/configureStore';
import { STAGE_COLOR_DEFAULT } from '../../../../constants';
import { reducer } from '../../../../reducer';
import { Stage } from '../Stage';

const STAGES_FIXTURE = {
  id: 1,
  index: 0,
};

const ComponentFixture = ({
  // eslint-disable-next-line react/prop-types
  stages = [
    {
      color: STAGE_COLOR_DEFAULT,
      name: 'something',
    },
  ],
  ...props
}) => {
  const store = configureStore([], [reducer]);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      stages,
    },
    validateOnChange: false,
  });

  return (
    <DndProvider backend={HTML5Backend}>
      <Provider store={store}>
        <FormikProvider value={formik}>
          <IntlProvider locale="en" messages={{}}>
            <ThemeProvider theme={lightTheme}>
              <Stage {...STAGES_FIXTURE} {...props} />
            </ThemeProvider>
          </IntlProvider>
        </FormikProvider>
      </Provider>
    </DndProvider>
  );
};

const setup = (props) => render(<ComponentFixture {...props} />);

const user = userEvent.setup();

describe('Admin | Settings | Review Workflow | Stage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render a stage', async () => {
    const { container, getByRole, queryByRole } = setup();

    expect(queryByRole('textbox')).not.toBeInTheDocument();

    // open accordion; getByRole is not sufficient here, because the accordion
    // does not have better identifiers
    await user.click(container.querySelector('button[aria-expanded]'));

    expect(queryByRole('textbox')).toBeInTheDocument();
    expect(getByRole('textbox').value).toBe('something');
    expect(getByRole('textbox').getAttribute('name')).toBe('stages.0.name');

    expect(getByRole('combobox')).toHaveTextContent('Blue');

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

  it('should not render the delete button if canDelete=false', async () => {
    const { queryByRole } = setup({ isOpen: true, canDelete: false });

    expect(
      queryByRole('button', {
        name: /delete stage/i,
      })
    ).not.toBeInTheDocument();
  });

  it('should not render delete drag button if canUpdate=false', async () => {
    const { queryByRole } = setup({ isOpen: true, canUpdate: false });

    expect(
      queryByRole('button', {
        name: /drag/i,
      })
    ).not.toBeInTheDocument();
  });

  it('should not crash on a custom color code', async () => {
    const { getByRole } = setup({
      isOpen: true,
      canDelete: false,
      stages: [
        {
          color: '#FF4945',
          name: 'something',
        },
      ],
    });

    expect(getByRole('textbox').value).toBe('something');
  });

  it('disables all input fields, if canUpdate = false', async () => {
    const { container, getByRole } = setup({ canUpdate: false });

    await user.click(container.querySelector('button[aria-expanded]'));

    expect(getByRole('textbox')).toHaveAttribute('disabled');
    expect(getByRole('combobox')).toHaveAttribute('data-disabled');
  });
});
