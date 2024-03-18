import { render } from '@tests/utils';

import { RelationSingle, RelationMultiple } from '../Relations';

/**
 * TODO: re-add theses tests – tracking issue https://strapi-inc.atlassian.net/browse/CONTENT-2184
 */
describe.skip('Relation cell content', () => {
  describe('RelationSingle', () => {
    const DEFAULT_PROPS_FIXTURE = {
      metadatas: {
        label: '',
        mainField: {
          name: 'name',
          type: 'string' as const,
        },
      },
      content: {
        name: 1,
      },
    };

    it('renders and matches the snapshot', async () => {
      const { container } = render(<RelationSingle {...DEFAULT_PROPS_FIXTURE} />);
      expect(container).toMatchSnapshot();
    });
  });
  describe('RelationMultiple', () => {
    const DEFAULT_PROPS_FIXTURE = {
      uid: 'api::address.address' as const,
      entityId: 1,
      metadatas: {
        label: '',
        mainField: {
          name: 'name',
          type: 'string' as const,
        },
      },
      content: {
        count: 1,
      },
      name: 'categories.name',
      rowId: 1,
    };
    it('renders and renders the menu when clicked', async () => {
      const { getByRole, findByRole, user } = render(
        <RelationMultiple {...DEFAULT_PROPS_FIXTURE} />
      );

      expect(getByRole('button', { name: '1 item' })).toBeInTheDocument();

      await user.click(getByRole('button', { name: '1 item' }));

      expect(getByRole('menu')).toBeInTheDocument();

      await findByRole('menuitem', { name: 'Relation entity 1' });

      [1, 2, 3].forEach((number) => {
        expect(getByRole('menuitem', { name: `Relation entity ${number}` })).toBeInTheDocument();
      });
    });

    it('Displays related entities in reversed order', async () => {
      const { user, getByRole, getAllByRole } = render(
        <RelationMultiple {...DEFAULT_PROPS_FIXTURE} />
      );

      await user.click(getByRole('button', { name: '1 item' }));

      getAllByRole('menuitem').forEach((button, i) => {
        expect(button).toHaveTextContent(`Relation entity ${3 - i}`);
      });
    });
  });
});
