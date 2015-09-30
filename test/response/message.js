'use strict';

const response = require('../helpers/context').response;

describe('res.message', function () {
  it('should return the response status message', function () {
    const res = response();
    res.status = 200;
    res.message.should.equal('OK');
  });

  describe('when res.message not present', function () {
    it('should look up in statuses', function () {
      const res = response();
      res.res.statusCode = 200;
      res.message.should.equal('OK');
    });
  });
});

describe('res.message=', function () {
  it('should set response status message', function () {
    const res = response();
    res.status = 200;
    res.message = 'ok';
    res.res.statusMessage.should.equal('ok');
    res.inspect().message.should.equal('ok');
  });
});
