'use strict';

const getUrlFromSegments = require('../url-from-segments');

describe('getUrlFromSegments', () => {
  test('Handles hostname', () => {
    expect(getUrlFromSegments({ hostname: 'localhost' })).toEqual('http://localhost');
    expect(getUrlFromSegments({ hostname: 'otherhost.com' })).toEqual('http://otherhost.com');
  });

  test('Handles port', () => {
    expect(getUrlFromSegments({ hostname: 'localhost', port: '80' })).toEqual('http://localhost');
    expect(getUrlFromSegments({ hostname: 'localhost', port: '8000' })).toEqual(
      'http://localhost:8000'
    );
    expect(getUrlFromSegments({ hostname: 'otherhost.com', port: 5421 })).toEqual(
      'http://otherhost.com:5421'
    );
  });

  test('Handles ssl and ports', () => {
    expect(getUrlFromSegments({ hostname: 'localhost', ssl: true })).toEqual('https://localhost');

    expect(getUrlFromSegments({ hostname: 'localhost', ssl: true, port: 532 })).toEqual(
      'https://localhost:532'
    );

    expect(getUrlFromSegments({ hostname: 'localhost', ssl: true, port: 443 })).toEqual(
      'https://localhost'
    );

    expect(getUrlFromSegments({ hostname: 'otherhost.com', ssl: true })).toEqual(
      'https://otherhost.com'
    );

    expect(getUrlFromSegments({ hostname: 'otherhost.com', ssl: true, port: 7263 })).toEqual(
      'https://otherhost.com:7263'
    );
  });
});
