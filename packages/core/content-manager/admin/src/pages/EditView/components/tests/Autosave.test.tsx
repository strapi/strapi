import * as React from 'react';

import { Form, useForm } from '@strapi/admin/strapi-admin';
import { render, screen, waitFor } from '@tests/utils';

import {
  deleteAutosave,
  evictAutosavesOverQuota,
  getAutosave,
  setAutosave,
} from '../../utils/autosave';
import { Autosave, useAutosave } from '../Autosave';

jest.mock('../../utils/autosave', () => ({
  ...jest.requireActual('../../utils/autosave'),
  deleteAutosave: jest.fn(),
  evictAutosavesOverQuota: jest.fn(),
  getAutosave: jest.fn(),
  registerAutosaveOwner: jest.fn(),
  setAutosave: jest.fn(),
}));

const mockedGetAutosave = jest.mocked(getAutosave);
const mockedDeleteAutosave = jest.mocked(deleteAutosave);
const mockedEvictAutosavesOverQuota = jest.mocked(evictAutosavesOverQuota);
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

const PendingVersion = () => {
  const { pendingBaseVersion } = useAutosave();

  return <span>{pendingBaseVersion ?? 'none'}</span>;
};

const ClearBackup = () => {
  const { clear } = useAutosave();

  return (
    <button type="button" onClick={() => clear()}>
      Clear backup
    </button>
  );
};

describe('Autosave', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDeleteAutosave.mockResolvedValue(undefined);
    mockedEvictAutosavesOverQuota.mockResolvedValue(undefined);
    mockedSetAutosave.mockResolvedValue('autosave-key');
  });

  it('does not access storage when disabled', async () => {
    render(
      <Form initialValues={{ title: 'Server title' }} method="PUT">
        <Autosave
          enabled={false}
          instanceId="instance-1"
          userId={1}
          model="api::article.article"
          documentId="doc-1"
        >
          <CurrentTitle />
        </Autosave>
      </Form>
    );

    expect(mockedGetAutosave).not.toHaveBeenCalled();
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
          <PendingVersion />
        </Autosave>
      </Form>
    );

    expect(await screen.findByText('We recovered unsaved changes')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Restore' }));

    expect(screen.getByText('Recovered title')).toBeInTheDocument();
    expect(screen.getByText('2026-01-01T00:00:00.000Z')).toBeInTheDocument();
    expect(mockedDeleteAutosave).not.toHaveBeenCalled();
  });

  it('offers to restore differing local changes even when the server is newer', async () => {
    mockedGetAutosave.mockResolvedValue({
      key: 'autosave:instance-1:1:api::article.article:doc-1:en',
      data: { title: 'Recovered title' },
      baseVersion: '2026-01-01T00:00:00.000Z',
      savedAt: '2026-01-01T00:00:10.000Z',
    });

    render(
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
    expect(
      screen.getByText(
        'This browser has unsaved changes that differ from the saved document. Restore them?'
      )
    ).toBeInTheDocument();
  });

  it('deletes a discarded recovery', async () => {
    mockedGetAutosave.mockResolvedValue({
      key: 'autosave:instance-1:1:api::article.article:doc-1:en',
      data: { title: 'Recovered title' },
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
        >
          <CurrentTitle />
        </Autosave>
      </Form>
    );

    await user.click(await screen.findByRole('button', { name: 'Discard' }));

    expect(mockedDeleteAutosave).toHaveBeenCalledWith(
      'autosave:instance-1:1:api::article.article:doc-1:en'
    );
    expect(screen.queryByText('We recovered unsaved changes')).not.toBeInTheDocument();
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
    await waitFor(() =>
      expect(mockedEvictAutosavesOverQuota).toHaveBeenCalledWith({
        protectedKey: 'autosave:instance-1:1:api::article.article:doc-1:en',
      })
    );
  });

  it('keeps the backup when trimming the store fails', async () => {
    mockedGetAutosave.mockResolvedValue(undefined);
    mockedEvictAutosavesOverQuota.mockRejectedValue(new Error('quota failure'));

    const { user } = render(
      <Form initialValues={{ title: 'Server title' }} method="PUT">
        <Autosave
          enabled
          instanceId="instance-1"
          userId={1}
          model="api::article.article"
          documentId="doc-1"
          locale="en"
        >
          <ChangeTitle />
        </Autosave>
      </Form>
    );

    await waitFor(() => expect(mockedGetAutosave).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: 'Edit title' }));

    await screen.findByText(/Local backup saved/, {
      timeout: 1500,
    });
    expect(screen.queryByText("Couldn't save a local backup")).not.toBeInTheDocument();
  });

  it('waits for an in-flight backup before deleting it', async () => {
    mockedGetAutosave.mockResolvedValue(undefined);
    let finishWrite: (value: IDBValidKey) => void = () => undefined;
    mockedSetAutosave.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishWrite = resolve;
        })
    );

    const { user } = render(
      <Form initialValues={{ title: 'Server title' }} method="PUT">
        <Autosave
          enabled
          instanceId="instance-1"
          userId={1}
          model="api::article.article"
          documentId="doc-1"
          locale="en"
        >
          <ChangeTitle />
          <ClearBackup />
        </Autosave>
      </Form>
    );

    await waitFor(() => expect(mockedGetAutosave).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: 'Edit title' }));
    await waitFor(() => expect(mockedSetAutosave).toHaveBeenCalled(), { timeout: 1500 });
    await user.click(screen.getByRole('button', { name: 'Clear backup' }));

    expect(mockedDeleteAutosave).not.toHaveBeenCalled();
    finishWrite('autosave-key');
    await waitFor(() => expect(mockedDeleteAutosave).toHaveBeenCalled());
  });

  it('cancels a queued backup before deleting it', async () => {
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
        >
          <ChangeTitle />
          <ClearBackup />
        </Autosave>
      </Form>
    );

    await waitFor(() => expect(mockedGetAutosave).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: 'Edit title' }));
    await user.click(screen.getByRole('button', { name: 'Clear backup' }));

    await new Promise((resolve) => {
      setTimeout(resolve, 1100);
    });

    expect(mockedSetAutosave).not.toHaveBeenCalled();
    expect(mockedDeleteAutosave).toHaveBeenCalled();
  });

  it('shows an error when IndexedDB cannot be read', async () => {
    mockedGetAutosave.mockRejectedValue(new Error('IndexedDB unavailable'));

    render(
      <Form initialValues={{ title: 'Server title' }} method="PUT">
        <Autosave
          enabled
          instanceId="instance-1"
          userId={1}
          model="api::article.article"
          documentId="doc-1"
          locale="en"
        >
          <CurrentTitle />
        </Autosave>
      </Form>
    );

    expect(await screen.findByText("Couldn't save a local backup")).toBeInTheDocument();
  });

  it('shows an error when a backup write fails', async () => {
    mockedGetAutosave.mockResolvedValue(undefined);
    mockedSetAutosave.mockRejectedValue(new Error('IndexedDB unavailable'));

    const { user } = render(
      <Form initialValues={{ title: 'Server title' }} method="PUT">
        <Autosave
          enabled
          instanceId="instance-1"
          userId={1}
          model="api::article.article"
          documentId="doc-1"
          locale="en"
        >
          <ChangeTitle />
        </Autosave>
      </Form>
    );

    await waitFor(() => expect(mockedGetAutosave).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: 'Edit title' }));

    expect(
      await screen.findByText("Couldn't save a local backup", {}, { timeout: 1500 })
    ).toBeInTheDocument();
  });
});
