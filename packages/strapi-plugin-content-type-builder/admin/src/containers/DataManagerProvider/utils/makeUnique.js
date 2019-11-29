const makeUnique = array =>
  array.filter((key, index) => array.indexOf(key) === index && key !== '');

export default makeUnique;
