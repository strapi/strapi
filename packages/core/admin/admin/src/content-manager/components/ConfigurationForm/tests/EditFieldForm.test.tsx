const ALL_ATTRIBUTES = [
  'string',
  'text',
  'richtext',
  'email',
  'password',
  'date',
  'time',
  'datetime',
  'timestamp',
  'integer',
  'biginteger',
  'float',
  'decimal',
  'uid',
  'enumeration',
  'boolean',
  'json',
  'media',
  'relation',
  'component',
  'dynamiczone',
  'blocks',
];

/**
 * This list of attribute types impact the form either by hiding specific fields or having more that
 * should be tested separately.
 */
const UNIQUE_ATTRIBUTES = ['richtext', 'blocks', 'dynamiczone', 'component', 'relation', 'json'];
const BASIC_ATTRIBUTES = ALL_ATTRIBUTES.filter((type) => !UNIQUE_ATTRIBUTES.includes(type));

describe('EditFieldForm', () => {
  it.todo(
    'should not allow submission and show an error if a required field is missing from the form'
  );

  it.todo('should call onClose when the user presses cancel or the close button');

  describe('attribute forms', () => {
    BASIC_ATTRIBUTES.forEach((type) => {
      it.todo(
        `should render all the fields excluding the mainField for the attribute type: ${type}`
      );
    });

    ['component', 'dynamiczone'].forEach((type) => {
      it.todo(`should hide all but the label and editable fields for the attribute type: ${type}`);
    });

    ['blocks', 'richtext'].forEach((type) => {
      it.todo(`should hide the size field for the attribute type: ${type}`);
    });

    ['boolean', 'media'].forEach((type) => {
      it.todo(`should hide the placeholder field for the attribute type: ${type}`);
    });

    it.todo(`should hide the placeholder and size fields for the attribute type: json`);

    it.todo(
      "should render the mainField option for relation attributes and have a list of potential mainField attributes from it's targetModel"
    );
  });
});
