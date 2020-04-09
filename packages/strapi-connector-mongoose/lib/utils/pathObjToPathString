export const pathObjToPathString = (pathObj, pathStr = '') => {
	if(!pathObj.path) return pathObj;
	
	pathStr += (pathStr === '')
		? pathObj.path
		: '.' + pathObj.path
	
	if(pathObj.populate) {
		pathStr = pathObjToPathString(pathObj.populate, pathStr);
	}

	return pathStr;
};
