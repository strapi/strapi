const getType = mime => {
  if (!mime) {
    return 'file';
  }

  const type = mime.split(/[\s/]+/)[0];

  if (type === 'image' || type === 'video') {
    return type;
  }

  return 'file';
};

export default getType;
