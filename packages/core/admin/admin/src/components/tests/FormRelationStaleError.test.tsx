/**
 * Reproduction for https://github.com/strapi/strapi/issues/27248 — mechanism level.
 *
 * A required relation's server-side validation error is stored at the field path (`author`),
 * while connecting a relation writes to `author.connect`. The Form reducer's `SET_FIELD_VALUE`
 * only replaces values, so the error at `author` survives the change and `useField('author').error`
 * keeps returning the stale message until the next `validate()`/`resetForm()`.
 */
import { act } from '@testing-library/react';
import { renderHook } from '@tests/utils';

import { Form, useField, useForm } from '../Form';

const REQUIRED_ERROR = 'author must be defined.';

const createFormWrapper = () =>
  function ({ children }: { children: React.ReactNode }) {
    return (
      <Form method="PUT" initialValues={{}} initialErrors={{ author: REQUIRED_ERROR }}>
        {children}
      </Form>
    );
  };

describe('required relation error is not cleared when the relation is connected (issue #27248)', () => {
  it('clears the error at `author` once `author.connect` receives a relation', () => {
    const { result } = renderHook(
      () => ({
        field: useField('author'),
        onChange: useForm('test', (state) => state.onChange),
        values: useForm('test', (state) => state.values),
      }),
      { wrapper: createFormWrapper() }
    );

    // the state left behind by a rejected publish
    expect(result.current.field.error).toBe(REQUIRED_ERROR);

    // the user connects a relation, exactly like RelationsField.handleConnect does
    act(() => {
      result.current.onChange('author.connect', [{ id: 7, documentId: 'david-doe' }]);
    });

    // the value really changed
    expect(result.current.values).toEqual({
      author: { connect: [{ id: 7, documentId: 'david-doe' }] },
    });

    // reported expectation: the error should be gone
    expect(result.current.field.error).toBeUndefined();
  });
});
