const convertAttrObjToArray = attributes => {
  return Object.keys(attributes).map((key, index) => {
    const type = attributes[key].inputType || attributes[key].type;

    return Object.assign({}, attributes[key], { name: key, index, type });
  });
};

export default convertAttrObjToArray;
