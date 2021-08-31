'use strict';

/**
 * Returns a url base on hostname, port and ssl options
 */
module.exports = ({ hostname, port, ssl = false }) => {
  const protocol = ssl ? 'https' : 'http';
  const defaultPort = ssl ? 443 : 80;
  const portString = port === undefined || parseInt(port, 10) === defaultPort ? '' : `:${port}`;

  return `${protocol}://${hostname}${portString}`;
};
