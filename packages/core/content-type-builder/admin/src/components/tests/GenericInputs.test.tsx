import { render, screen } from '@strapi/admin/strapi-admin/test';

import { GenericInput } from '../GenericInputs';

jest.mock('@strapi/design-system', () => {
  const actual = jest.requireActual('@strapi/design-system');

  return {
    ...actual,
    JSONInput: ({ value }: { value?: string }) => (
      <textarea aria-label="json-value" value={value ?? ''} readOnly />
    ),
    NumberInput: ({ value }: { value?: string | number }) => (
      <input aria-label="number-value" value={value ?? ''} readOnly />
    ),
    Toggle: ({ checked }: { checked?: boolean | null }) => (
      <input aria-label="boolean-value" type="checkbox" checked={Boolean(checked)} readOnly />
    ),
  };
});

const setup = (props: Partial<React.ComponentProps<typeof GenericInput>>) =>
  render(
    <GenericInput
      intlLabel={{ id: 'field', defaultMessage: 'Field' }}
      name="field"
      onChange={jest.fn()}
      type="string"
      {...props}
    />
  );

describe('CTB | GenericInput', () => {
  it('passes numeric strings through to number inputs', () => {
    setup({ type: 'number', value: '5' });

    expect(screen.getByRole('textbox', { name: 'number-value' })).toHaveValue('5');
  });

  it('formats object values for JSON inputs', () => {
    setup({ type: 'json', value: { enabled: true } });

    expect(screen.getByRole('textbox', { name: 'json-value' })).toHaveValue(
      JSON.stringify({ enabled: true }, null, 2)
    );
  });

  it('keeps truthy boolean defaults checked', () => {
    setup({ type: 'bool', value: 'true' });

    expect(screen.getByRole('checkbox', { name: 'boolean-value' })).toBeChecked();
  });
});
