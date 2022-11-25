import { isSelectable } from '../isSelectable';

const ALLOWED_TYPES_FIXTURE = ['image', 'file', 'video', 'audio'];
const ELEMENT_TYPE_FIXTURE = 'asset';
const FILE_TYPE_FIXTURE = 'image';
const IS_FOLDER_SELECTION_ALLOWED_FIXTURE = true;

describe('TableList | isSelectable', () => {
  it('should return true if asset is an allowed file type', () => {
    expect(
      isSelectable(
        ALLOWED_TYPES_FIXTURE,
        ELEMENT_TYPE_FIXTURE,
        FILE_TYPE_FIXTURE,
        IS_FOLDER_SELECTION_ALLOWED_FIXTURE
      )
    ).toEqual(true);
  });

  it('should return true if asset type is not contained in allowed types array but file type is contained', () => {
    expect(
      isSelectable(
        ['video', 'audio', 'file'],
        ELEMENT_TYPE_FIXTURE,
        'pdf',
        IS_FOLDER_SELECTION_ALLOWED_FIXTURE
      )
    ).toEqual(true);
  });

  it('should return false if asset type is not contained in allowed types array and file type is image, video or audio', () => {
    expect(
      isSelectable(
        ['video', 'audio', 'file'],
        ELEMENT_TYPE_FIXTURE,
        'image',
        IS_FOLDER_SELECTION_ALLOWED_FIXTURE
      )
    ).toEqual(false);

    expect(
      isSelectable(
        ['image', 'audio', 'file'],
        ELEMENT_TYPE_FIXTURE,
        'video',
        IS_FOLDER_SELECTION_ALLOWED_FIXTURE
      )
    ).toEqual(false);

    expect(
      isSelectable(
        ['image', 'video', 'file'],
        ELEMENT_TYPE_FIXTURE,
        'audio',
        IS_FOLDER_SELECTION_ALLOWED_FIXTURE
      )
    ).toEqual(false);
  });

  it('should return true if folder is allowed', () => {
    expect(
      isSelectable(
        ALLOWED_TYPES_FIXTURE,
        'folder',
        FILE_TYPE_FIXTURE,
        IS_FOLDER_SELECTION_ALLOWED_FIXTURE
      )
    ).toEqual(true);
  });

  it('should return false if folder is not allowed', () => {
    expect(isSelectable(ALLOWED_TYPES_FIXTURE, 'folder', FILE_TYPE_FIXTURE, false)).toEqual(false);
  });
});
