import * as React from 'react';

import { Form, useForm } from '@strapi/admin/strapi-admin';
import { act, render as renderRTL, renderHook, screen } from '@tests/utils';

import { getIn } from '../../../../../../utils/objects';
import {
  CopiedComponentsProvider,
  getFieldKeyPath,
  hasComponentAt,
  useCopiedComponents,
} from '../CopiedComponents';

interface Row {
  __temp_key__: string;
  title?: string;
  heading?: string;
}

const values = {
  title: 'Home',
  blocks: [
    { __temp_key__: 'a0', __component: 'blocks.hero', heading: 'Hero' },
    {
      __temp_key__: 'a1',
      __component: 'blocks.cards',
      cards: [
        { __temp_key__: 'a0', title: 'First' },
        { __temp_key__: 'a1', title: 'Second' },
      ],
    },
  ],
};

describe('CopiedComponents', () => {
  describe('getFieldKeyPath', () => {
    it('should replace the indexes of the path with the keys of the rows', () => {
      expect(getFieldKeyPath(values, 'blocks')).toBe('blocks');
      expect(getFieldKeyPath(values, 'blocks.1.cards')).toBe('blocks.[a1].cards');
      // a row without a key keeps its index
      expect(getFieldKeyPath(values, 'blocks.5.cards')).toBe('blocks.[5].cards');
    });
  });

  describe('hasComponentAt', () => {
    it('should find the rows by their key', () => {
      expect(hasComponentAt(values, 'blocks.[a0]')).toBe(true);
      expect(hasComponentAt(values, 'blocks.[a1].cards.[a1]')).toBe(true);
      expect(hasComponentAt(values, 'blocks.[a2]')).toBe(false);
      expect(hasComponentAt(values, 'blocks.[a0].cards.[a0]')).toBe(false);
      expect(hasComponentAt(values, 'title.[a0]')).toBe(false);
    });
  });

  describe('useCopiedComponents', () => {
    /**
     * Exposes the form alongside the hook, to act on the rows the way the form inputs do.
     */
    const useHarness = (name: string) => {
      const copied = useCopiedComponents(name);
      const form = useForm('test', (state) => state);
      const rows = (getIn<Row[]>(form.values, name) ?? []) as Row[];

      return { ...copied, form, rows };
    };

    const render = (name: string, initialValues: Record<string, unknown>) => {
      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <Form method="POST" onSubmit={jest.fn()} initialValues={initialValues}>
          <CopiedComponentsProvider>{children}</CopiedComponentsProvider>
        </Form>
      );

      return renderHook(() => useHarness(name), { wrapper: Wrapper });
    };

    /**
     * Renders the rows of a field like a repeatable component does, with the hook.
     */
    const Rows = ({ name }: { name: string }) => {
      const { isCopied, insertCopies } = useCopiedComponents(name);
      const rows: Row[] = useForm('Rows', (state) => getIn<Row[]>(state.values, name)) ?? [];

      return (
        <>
          <button type="button" onClick={() => insertCopies([{ title: 'Copy' }])}>
            copy
          </button>
          <ul>
            {rows.map((row) => (
              <li key={row.__temp_key__}>
                {row.title}
                {isCopied(row.__temp_key__) ? ' (copied)' : ''}
              </li>
            ))}
          </ul>
        </>
      );
    };

    const SaveButton = ({ onSave }: { onSave: (values: object) => void }) => {
      const values = useForm('SaveButton', (state) => state.values);

      // The saved entry comes back from the API as a new object.
      return (
        <button type="button" onClick={() => onSave({ ...values })}>
          save
        </button>
      );
    };

    it('should insert the copies after the existing rows, with their own keys, and flag them', () => {
      const { result } = render('blocks', {
        blocks: [{ __temp_key__: 'a0', __component: 'blocks.hero', heading: 'Hero' }],
      });

      act(() => {
        result.current.insertCopies([
          { __component: 'blocks.hero', heading: 'Copy 1' },
          { __component: 'blocks.hero', heading: 'Copy 2' },
        ]);
      });

      const { rows } = result.current;

      expect(rows.map((row) => row.heading)).toEqual(['Hero', 'Copy 1', 'Copy 2']);
      expect(rows[1].__temp_key__ > rows[0].__temp_key__).toBe(true);
      expect(rows[2].__temp_key__ > rows[1].__temp_key__).toBe(true);
      expect(result.current.isCopied(rows[0].__temp_key__)).toBe(false);
      expect(result.current.isCopied(rows[1].__temp_key__)).toBe(true);
      expect(result.current.isCopied(rows[2].__temp_key__)).toBe(true);
    });

    it('should keep the flags of a previous copy', () => {
      const { result } = render('blocks', { blocks: [] });

      act(() => {
        result.current.insertCopies([{ heading: 'Copy 1' }]);
      });
      act(() => {
        result.current.insertCopies([{ heading: 'Copy 2' }]);
      });

      const { rows } = result.current;

      expect(rows).toHaveLength(2);
      expect(rows.every((row) => result.current.isCopied(row.__temp_key__))).toBe(true);
    });

    it('should drop the flag of a deleted copy so that the next row does not inherit it', () => {
      const { result } = render('blocks', { blocks: [] });

      act(() => {
        result.current.insertCopies([{ heading: 'Copy' }]);
      });
      act(() => {
        result.current.form.removeFieldRow('blocks', 0);
      });
      // the form hands the next row the key the copy had
      act(() => {
        result.current.form.addFieldRow('blocks', { heading: '' });
      });

      const [row] = result.current.rows;

      expect(result.current.isCopied(row.__temp_key__)).toBe(false);
    });

    it('should clear the flags once the form is saved', async () => {
      /**
       * Saving reloads the entry: the form gets what it holds as its initial values.
       */
      const Harness = () => {
        const [initialValues, setInitialValues] = React.useState<object>({ blocks: [] });

        return (
          <Form method="POST" onSubmit={jest.fn()} initialValues={initialValues}>
            <CopiedComponentsProvider>
              <Rows name="blocks" />
              <SaveButton onSave={setInitialValues} />
            </CopiedComponentsProvider>
          </Form>
        );
      };

      const { user } = renderRTL(<Harness />);

      await user.click(screen.getByRole('button', { name: 'copy' }));

      expect(screen.getByText('Copy (copied)')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'save' }));

      expect(screen.getByText('Copy')).toBeInTheDocument();
      expect(screen.queryByText('Copy (copied)')).not.toBeInTheDocument();
    });

    it('should keep the flag of a nested row through its remount and the reordering of its parent', async () => {
      /**
       * The accordion of a parent block unmounts the field when it collapses, and the field's name
       * changes when the block is reordered.
       */
      const Harness = () => {
        const [name, setName] = React.useState('blocks.1.cards');
        const [isMounted, setIsMounted] = React.useState(true);
        const moveFieldRow = useForm('Harness', (state) => state.moveFieldRow);

        return (
          <>
            <button type="button" onClick={() => setIsMounted((mounted) => !mounted)}>
              toggle
            </button>
            <button
              type="button"
              onClick={() => {
                moveFieldRow('blocks', 1, 0);
                setName('blocks.0.cards');
              }}
            >
              move
            </button>
            {isMounted && <Rows name={name} />}
          </>
        );
      };

      const { user } = renderRTL(<Harness />, {
        renderOptions: {
          wrapper: ({ children }) => (
            <Form method="POST" onSubmit={jest.fn()} initialValues={values}>
              <CopiedComponentsProvider>{children}</CopiedComponentsProvider>
            </Form>
          ),
        },
      });

      await user.click(screen.getByRole('button', { name: 'copy' }));

      expect(screen.getByText('Copy (copied)')).toBeInTheDocument();
      expect(screen.getByText('First')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'toggle' }));
      await user.click(screen.getByRole('button', { name: 'toggle' }));

      expect(screen.getByText('Copy (copied)')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'move' }));

      expect(screen.getByText('Copy (copied)')).toBeInTheDocument();
      expect(screen.getByText('First')).toBeInTheDocument();
    });
  });
});
