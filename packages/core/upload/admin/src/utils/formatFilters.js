const formatFilters = params => {
  const indexOfFileFilterContains = params.indexOf('mime_contains=file');
  const indexOfFileFilterNContains = params.indexOf('mime_ncontains=file');
  let paramsToReturn = params;

  if (indexOfFileFilterContains !== -1) {
    paramsToReturn = paramsToReturn.replace(
      'mime_contains=file',
      'mime_ncontains=image&mime_ncontains=video'
    );
  }

  if (indexOfFileFilterNContains !== -1) {
    paramsToReturn = paramsToReturn.replace(
      'mime_ncontains=file',
      'mime_contains=image&mime_contains=video'
    );
  }

  return paramsToReturn;
};

export default formatFilters;
