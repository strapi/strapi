function cleanUpSearhQuery(query) {
  return (query || '').replace(/['|"]+/g, '');
}

module.exports = cleanUpSearhQuery;
