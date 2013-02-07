(function() {
  var assert, async, client, jtRedis, _;

  _ = require('underscore');

  async = require('async');

  assert = require('assert');

  jtRedis = require('../index');

  jtRedis.setConfig({
    queryTime: true,
    redis: {
      name: 'vicanso',
      uri: 'redis://koala:6380',
      keepAlive: true
    }
  });

  client = jtRedis.getClient('vicanso');

  describe('jtRedis', function() {
    describe('#set(), #get()', function() {
      return it('check set and get functions', function(done) {
        var testKey, testValue;
        testKey = '123456';
        testValue = 'abceafea';
        return client.set(testKey, testValue, function(err) {
          if (err) {
            return done(err);
          } else {
            return client.get(testKey, function(err, result) {
              if (err) {
                return done(err);
              } else if (testValue !== result) {
                return done(new Error('set and get is fail'));
              } else {
                return done();
              }
            });
          }
        });
      });
    });
    return describe('@multi()', function() {
      return it('check the multi function', function(done) {
        var testKey1, testKey2, testValue1, testValue2;
        testKey1 = '123456';
        testValue1 = 'abceafea';
        testKey2 = '234567';
        testValue2 = 'bafeafeafe';
        return client.multi([['get', testKey1], ['set', testKey2, testValue2]]).exec(function(err, replies) {
          if (err) {
            return done(err);
          } else if (!_.isArray(replies)) {
            return done(new Error('the replies is not a array'));
          } else if (("" + testValue1 + " OK") !== replies.join(' ')) {
            return done(new Error('the replies is wrong'));
          } else {
            return client.get(testKey2, function(err, result) {
              if (err) {
                return done(err);
              } else if (testValue2 !== result) {
                return done(new Error('the set function is fail'));
              } else {
                return done();
              }
            });
          }
        });
      });
    });
  });

}).call(this);
