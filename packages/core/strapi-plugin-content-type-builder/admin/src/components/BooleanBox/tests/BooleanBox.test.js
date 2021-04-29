import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import defaultThemes from '../../../../../../strapi-admin/admin/src/themes';
import BooleanBox from '..';

jest.mock('strapi-helper-plugin', () => ({
  useGlobalContext: () => ({ formatMessage: ({ id }) => id }),
}));

describe('BooleanBox', () => {
  it('has single type selected by default and verifies the other states', () => {
    const options = [
      {
        headerId: 'menu.section.models.name.singular',
        descriptionId: 'form.button.collection-type.description',
        value: 'collectionType',
      },
      {
        headerId: 'menu.section.single-types.name.singular',
        descriptionId: 'form.button.single-type.description',
        value: 'singleType',
      },
    ];

    render(
      <ThemeProvider theme={defaultThemes}>
        <BooleanBox
          label="Hello world"
          name="box"
          onChange={() => null}
          onChangeCallback={() => null}
          options={options}
          value="singleType"
        />
      </ThemeProvider>
    );

    expect(screen.getByTestId('st-selected')).toBeVisible();
    expect(screen.getByTestId('ct-unselected')).toBeVisible();

    expect(screen.queryByTestId('ct-selected')).toBeFalsy();
    expect(screen.queryByTestId('st-unselected')).toBeFalsy();
  });

  it('has collection type selected by default and verifies the other states', () => {
    const options = [
      {
        headerId: 'menu.section.models.name.singular',
        descriptionId: 'form.button.collection-type.description',
        value: 'collectionType',
      },
      {
        headerId: 'menu.section.single-types.name.singular',
        descriptionId: 'form.button.single-type.description',
        value: 'singleType',
      },
    ];

    render(
      <ThemeProvider theme={defaultThemes}>
        <BooleanBox
          label="Hello world"
          name="box"
          onChange={() => null}
          onChangeCallback={() => null}
          options={options}
          value="collectionType"
        />
      </ThemeProvider>
    );

    expect(screen.getByTestId('ct-selected')).toBeVisible();
    expect(screen.getByTestId('st-unselected')).toBeVisible();

    expect(screen.queryByTestId('st-selected')).toBeFalsy();
    expect(screen.queryByTestId('ct-unselected')).toBeFalsy();
  });

  it('does not show the ST and CT icons for other types', () => {
    const options = [
      {
        headerId: 'menu.section.models.name.singular',
        descriptionId: 'form.button.collection-type.description',
        value: 'text',
      },
      {
        headerId: 'menu.section.single-types.name.singular',
        descriptionId: 'form.button.single-type.description',
        value: 'string',
      },
    ];

    render(
      <ThemeProvider theme={defaultThemes}>
        <BooleanBox
          label="Hello world"
          name="box"
          onChange={() => null}
          onChangeCallback={() => null}
          options={options}
          value="collectionType"
        />
      </ThemeProvider>
    );

    expect(screen.queryByTestId('ct-selected')).toBeFalsy();
    expect(screen.queryByTestId('st-unselected')).toBeFalsy();
    expect(screen.queryByTestId('st-selected')).toBeFalsy();
    expect(screen.queryByTestId('ct-unselected')).toBeFalsy();
  });
});
