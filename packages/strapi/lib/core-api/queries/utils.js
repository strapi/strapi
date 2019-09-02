function cleanUpSearhQuery(query) {
  return (query || '').replace(/[^\u0400-\u04FFa-zA-Z0-9.-\s]+/g, '');
}

module.exports = cleanUpSearhQuery;
