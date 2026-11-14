import { act } from '@testing-library/react';

import { fieldsStore } from '../../store/fields';
import { withPendingDeclarations } from '../PublishAction';

import { setFieldsState } from './Fixtures';

import type {
  DocumentActionComponent,
  DocumentActionProps,
} from '@strapi/content-manager/strapi-admin';

const Publish = (() => ({
  label: 'Publish',
  onClick: jest.fn(),
})) as unknown as DocumentActionComponent;
Publish.type = 'publish';

// The wrapper reads the store with a hook: call it inside a component render
const describeWith = (component: DocumentActionComponent) => {
  let description: ReturnType<DocumentActionComponent> = null;
  const { render } = jest.requireActual('@testing-library/react');
  const Probe = () => {
    description = component({} as DocumentActionProps);

    return null;
  };

  render(<Probe />);

  return description as unknown as { label: string; disabled?: boolean } | null;
};

describe('withPendingDeclarations', () => {
  afterEach(() => {
    act(() => fieldsStore.set(null));
  });

  it('keeps the publish action type', () => {
    expect(withPendingDeclarations(Publish).type).toBe('publish');
  });

  it('leaves Publish alone when nothing waits for a save', () => {
    setFieldsState();

    expect(describeWith(withPendingDeclarations(Publish))?.disabled).toBeUndefined();
  });

  it('disables Publish while an AI declaration waits for the next save', () => {
    setFieldsState({ pending: [{ field: 'title', decision: 'ai' }] });

    expect(describeWith(withPendingDeclarations(Publish))).toMatchObject({
      label: 'Publish',
      disabled: true,
    });
  });

  it('does not block Publish for an unanswered paste', () => {
    setFieldsState({ pending: [{ field: 'title', decision: 'undecided' }] });

    expect(describeWith(withPendingDeclarations(Publish))?.disabled).toBeUndefined();
  });
});
