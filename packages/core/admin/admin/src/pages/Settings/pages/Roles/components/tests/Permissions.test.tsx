import { render, screen } from '@tests/utils';

import { capitalise } from '../../../../../../utils/strings';
import { Permissions } from '../Permissions';

import layout from './test-data.json';

const COLUMN_HEADERS = ['Create', 'Read', 'Update', 'Delete', 'Publish'];

const COLLECTION_TYPES = layout.sections.collectionTypes.subjects.map(
  (subject) => subject.uid.split('.')[1]
);

const ADDRESS_FIELDS: string[] =
  layout.sections.collectionTypes.subjects[0].properties[0].children.map((child) => child.label);

describe('Permissions', () => {
  it('should render correctly with no user interaction', async () => {
    render(<Permissions layout={layout} />);

    expect(screen.getByRole('tablist', { name: 'Tabs Permissions' })).toBeInTheDocument();

    expect(screen.getByRole('tab', { name: 'Collection Types' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Single Types' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Plugins' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Settings' })).toBeInTheDocument();

    expect(screen.getByRole('tabpanel', { name: 'Collection Types' })).toBeInTheDocument();

    COLUMN_HEADERS.forEach((head) =>
      expect(
        screen.getByRole('checkbox', { name: `Select all ${head} permissions` })
      ).toBeInTheDocument()
    );

    COLLECTION_TYPES.forEach((type) =>
      expect(
        screen.getByRole('checkbox', { name: `Select all ${capitalise(type)} permissions` })
      ).toBeInTheDocument()
    );

    COLLECTION_TYPES.forEach((type) =>
      COLUMN_HEADERS.forEach((head) => {
        if (type === 'address' && head === 'Publish') {
          return;
        }

        expect(
          screen.getByRole('checkbox', { name: `Select ${head} ${type} permission` })
        ).toBeInTheDocument();
      })
    );

    COLLECTION_TYPES.forEach((type) =>
      expect(screen.getByRole('button', { name: capitalise(type) })).toBeInTheDocument()
    );
  });

  it("should render the a content-type's subject accordion panel when selected", async () => {
    const { user } = render(<Permissions layout={layout} />);

    await user.click(screen.getByRole('button', { name: capitalise(COLLECTION_TYPES[0]) }));

    ADDRESS_FIELDS.forEach((field) => {
      expect(
        screen.getByRole('checkbox', { name: `Select all ${field} permissions` })
      ).toBeInTheDocument();

      COLUMN_HEADERS.filter((head) => head !== 'Publish' && head !== 'Delete').forEach((head) => {
        expect(
          screen.getByRole('checkbox', { name: `Select ${field} ${head} permission` })
        ).toBeInTheDocument();
      });
    });

    await user.click(screen.getByRole('button', { name: 'repeat_req_min' }));

    COLUMN_HEADERS.filter((head) => head !== 'Publish' && head !== 'Delete').forEach((head) => {
      expect(
        screen.getByRole('checkbox', { name: `Select repeat_req_min name ${head} permission` })
      ).toBeInTheDocument();
    });
  });

  it("should not render anything in the plugins tab because it's empty", async () => {
    const { user } = render(<Permissions layout={layout} />);

    await user.click(screen.getByRole('tab', { name: 'Plugins' }));

    expect(screen.getByRole('tabpanel', { name: 'Plugins' })).toBeInTheDocument();

    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('should render the settings tab as expected', async () => {
    const { user } = render(<Permissions layout={layout} />);

    await user.click(screen.getByRole('tab', { name: 'Settings' }));

    expect(screen.getByRole('tabpanel', { name: 'Settings' })).toBeInTheDocument();

    [
      'Email email settings',
      'Media library media library settings',
      'Internationalization Internationalization settings',
    ].forEach((setting) => {
      expect(screen.getByRole('button', { name: setting })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Email email settings' }));

    expect(screen.getByRole('checkbox', { name: 'Select all' })).toBeInTheDocument();

    expect(
      screen.getByRole('checkbox', { name: 'Access the Email Settings page' })
    ).toBeInTheDocument();
  });
});
