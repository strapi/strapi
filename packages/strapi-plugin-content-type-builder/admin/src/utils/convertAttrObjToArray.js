const convertAttrObjToArray = attributes => {
  return Object.keys(attributes).map((key, index) => {
    return { ...attributes[key], name: key, index };
  });
};

export default convertAttrObjToArray;
