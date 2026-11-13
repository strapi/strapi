import { Form, useField } from '@strapi/admin/strapi-admin';
import { render, screen } from '@tests/utils';

import {
  CharacterCount,
  CharacterCountField,
  isCountedAttribute,
  isNonEmptyString,
} from '../CharacterCount';

import type { Schema } from '@strapi/types';

const TitleInput = () => {
  const field = useField<string>('title');

  return (
    <input
      aria-label="title"
      value={field.value ?? ''}
      onChange={(event) => field.onChange('title', event.target.value)}
    />
  );
};

const setup = (attribute: Schema.Attribute.String, initialValues: object = { title: '' }) =>
  render(
    <Form method="POST" onSubmit={jest.fn()} initialValues={initialValues}>
      <TitleInput />
      <CharacterCount name="title" attribute={attribute} />
    </Form>
  );

describe('<CharacterCount />', () => {
  it('counts the characters as the user types', async () => {
    const { user } = setup({ type: 'string' });

    expect(screen.getByText('0 characters')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'title' }), 'a');
    expect(screen.getByText('1 character')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'title' }), 'bc');
    expect(screen.getByText('3 characters')).toBeInTheDocument();
  });

  it('shows the count against the max length', () => {
    setup({ type: 'string', maxLength: 60 }, { title: 'Hello' });

    expect(screen.getByText('5 / 60')).toBeInTheDocument();
  });

  it('flags a value outside the min / max length', async () => {
    const { user } = setup({ type: 'string', minLength: 3, maxLength: 5 }, { title: 'ab' });
    const count = screen.getByTestId('character-count-title');
    const input = screen.getByRole('textbox', { name: 'title' });

    // Too short
    expect(count).toHaveTextContent('2 / 5');
    const errorColor = getComputedStyle(count).color;

    // In range
    await user.type(input, 'c');
    expect(count).toHaveTextContent('3 / 5');
    expect(getComputedStyle(count).color).not.toBe(errorColor);

    // Too long
    await user.type(input, 'def');
    expect(count).toHaveTextContent('6 / 5');
    expect(getComputedStyle(count).color).toBe(errorColor);
  });

  it('lays the count over the error line only while the field shows an error', () => {
    const renderField = (hasError: boolean) =>
      render(
        <Form method="POST" onSubmit={jest.fn()} initialValues={{ title: 'Hello' }}>
          <CharacterCountField name="title" attribute={{ type: 'string' }} hasError={hasError}>
            <TitleInput />
          </CharacterCountField>
        </Form>
      );

    const { unmount } = renderField(false);
    expect(screen.queryByText('5 characters')).not.toBeInTheDocument();
    unmount();

    renderField(true);
    expect(screen.getByText('5 characters')).toBeInTheDocument();
  });

  it('only treats a non-empty string as having characters', () => {
    expect(isNonEmptyString('a')).toBe(true);
    expect(isNonEmptyString('')).toBe(false);
    expect(isNonEmptyString(null)).toBe(false);
    expect(isNonEmptyString(undefined)).toBe(false);
  });

  it('only counts text-like fields', () => {
    expect(isCountedAttribute({ type: 'string' })).toBe(true);
    expect(isCountedAttribute({ type: 'text' })).toBe(true);
    expect(isCountedAttribute({ type: 'richtext' })).toBe(true);
    expect(isCountedAttribute({ type: 'email' })).toBe(true);
    expect(isCountedAttribute({ type: 'uid' })).toBe(true);
    expect(isCountedAttribute({ type: 'password' })).toBe(false);
    expect(isCountedAttribute({ type: 'blocks' })).toBe(false);
    expect(isCountedAttribute({ type: 'integer' })).toBe(false);
    expect(
      isCountedAttribute({
        type: 'string',
        customField: 'plugin::color-picker.color',
      } as Schema.Attribute.AnyAttribute)
    ).toBe(false);
  });
});
