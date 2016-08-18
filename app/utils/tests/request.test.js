/**
 * Test the request function
 */

import request from '../request';
import sinon from 'sinon';
import expect from 'expect';

describe('request', () => {
  // Before each test, stub the fetch function
  beforeEach(() => {
    sinon.stub(window, 'fetch');
  });

  // After each test, restore the fetch function
  afterEach(() => {
    window.fetch.restore();
  });

  describe('stubbing successful response', () => {
    // Before each test, pretend we got a successful response
    beforeEach(() => {
      const res = new Response('{"hello":"world"}', {
        status: 200,
        headers: {
          'Content-type': 'application/json',
        },
      });

      window.fetch.returns(Promise.resolve(res));
    });

    it('should format the response correctly', (done) => {
      request('/thisurliscorrect')
        .catch(done)
        .then((json) => {
          expect(json.data.hello).toEqual('world');
          done();
        });
    });
  });

  describe('stubbing error response', () => {
    // Before each test, pretend we got an unsuccessful response
    beforeEach(() => {
      const res = new Response('', {
        status: 404,
        statusText: 'Not Found',
        headers: {
          'Content-type': 'application/json',
        },
      });

      window.fetch.returns(Promise.resolve(res));
    });

    it('should catch errors', (done) => {
      request('/thisdoesntexist')
        .then((json) => {
          expect(json.err.response.status).toEqual(404);
          expect(json.err.response.statusText).toEqual('Not Found');
          done();
        });
    });
  });
});
