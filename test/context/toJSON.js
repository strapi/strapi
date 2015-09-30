'use strict';

const context = require('../helpers/context');

describe('ctx.toJSON()', function () {
  it('should return a json representation', function () {
    const ctx = context();

    ctx.req.method = 'POST';
    ctx.req.url = '/items';
    ctx.req.headers['content-type'] = 'text/plain';
    ctx.status = 200;
    ctx.body = '<p>Hey</p>';

    const obj = JSON.parse(JSON.stringify(ctx));
    const req = obj.request;
    const res = obj.response;

    req.should.eql({
      method: 'POST',
      url: '/items',
      header: {
        'content-type': 'text/plain'
      }
    });

    res.should.eql({
      status: 200,
      message: 'OK',
      header: {
        'content-type': 'text/html; charset=utf-8',
        'content-length': '10'
      }
    });
  });
});
