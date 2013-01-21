(function() {
  var client, jtRedis, redis;

  redis = require('redis');

  jtRedis = require('./lib/client');

  jtRedis.setConfig({
    queryTime: true,
    redis: {
      name: 'vicanso',
      uri: 'redis://127.0.0.1:10011,redis://127.0.0.1:10010',
      keepAlive: true
    }
  });

  client = jtRedis.getClient('vicanso');

  setTimeout(function() {
    return client.multi([['get', '123', redis.print], ['set', '234', 'eofaofjeoajfe', redis.print], ['get', '345'], ['get', '456']]).exec(function(err, replies) {
      return console.dir(replies);
    });
  }, 1000);

}).call(this);
