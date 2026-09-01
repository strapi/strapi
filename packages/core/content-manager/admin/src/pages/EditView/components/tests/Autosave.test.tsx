import * as React from 'react';

import { Form, useForm } from '@strapi/admin/strapi-admin';
import { render, screen, waitFor } from '@tests/utils';

import { deleteAutosave, getAutosave, setAutosave } from '../../utils/autosave';
import { Autosave } from '../Autosave';

jest.mock('../../utils/autosave', () => ({
  ...jest.requireActual('../../utils/autosave'),
  deleteAutosave: jest.fn(),
  getAutosave: jest.fn(),
  setAutosave: jest.fn(),
}));

const mockedGetAutosave = jest.mocked(getAutosave);
const mockedDeleteAutosave = jest.mocked(deleteAutosave);
const mockedSetAutosave = jest.mocked(setAutosave);

const CurrentTitle = () => {
  const title = useForm('CurrentTitle', (state) => (state.values as Record<string, unknown>).title);

  return <span>{title as string}</span>;
};

const ChangeTitle = () => {
  const setValues = useForm('ChangeTitle', (state) => state.setValues);

  return (
    <button type="button" onClick={() => setValues({ title: 'Edited title' })}>
      Edit title
    </button>
  );
};

describe('Autosave', () => {
  beforeEach(() => {
    mockedDeleteAutosave.mockResolvedValue(undefined);
    mockedSetAutosave.mockResolvedValue('autosave-key');
  });

  it('offers to restore a newer local backup', async () => {
    mockedGetAutosave.mockResolvedValue({
      key: 'autosave:instance-1:1:api::article.article:doc-1:en',
      data: { title: 'Recovered title' },
      baseVersion: '2026-01-01T00:00:00.000Z',
      savedAt: '2026-01-01T00:01:00.000Z',
    });

    const { user } = render(
      <Form initialValues={{ title: 'Server title' }} method="PUT">
        <Autosave
          enabled
          instanceId="instance-1"
          userId={1}
          model="api::article.article"
          documentId="doc-1"
          locale="en"
          baseVersion="2026-01-01T00:00:30.000Z"
        >
          <CurrentTitle />
        </Autosave>
      </Form>
    );

    expect(await screen.findByText('We recovered unsaved changes')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Restore' }));

    expect(screen.getByText('Recovered title')).toBeInTheDocument();
    expect(mockedDeleteAutosave).not.toHaveBeenCalled();
  });

  it('debounces local backups for modified documents', async () => {
    mockedGetAutosave.mockResolvedValue(undefined);

    const { user } = render(
      <Form initialValues={{ title: 'Server title' }} method="PUT">
        <Autosave
          enabled
          instanceId="instance-1"
          userId={1}
          model="api::article.article"
          documentId="doc-1"
          locale="en"
          baseVersion="2026-01-01T00:00:30.000Z"
        >
          <ChangeTitle />
        </Autosave>
      </Form>
    );

    await waitFor(() => expect(mockedGetAutosave).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: 'Edit title' }));

    expect(screen.getByText('Saving local backup…')).toBeInTheDocument();
    await waitFor(() => expect(mockedSetAutosave).toHaveBeenCalled(), { timeout: 1500 });
    expect(mockedSetAutosave).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'autosave:instance-1:1:api::article.article:doc-1:en',
        data: { title: 'Edited title' },
      })
    );
  });
});
