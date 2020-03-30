const getExtension = mime => (mime ? mime.split(/[\s/]+/)[1] : 'undefined');

export default getExtension;
