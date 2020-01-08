const getAttributeDisplayedType = type => {
  let displayedType;

  switch (type) {
    case 'integer':
    case 'biginteger':
    case 'decimal':
    case 'float':
      displayedType = 'number';
      break;
    case 'string':
    case 'text':
      displayedType = 'text';
      break;
    case '':
      displayedType = 'relation';
      break;
    default:
      displayedType = type;
  }

  return displayedType;
};

export default getAttributeDisplayedType;
