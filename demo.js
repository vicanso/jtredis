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
    client.set('7897', '123', function(err, data) {
      return console.dir(err);
    });
    return client.get('7897', function(err, data) {
      return console.dir(data);
    });
  }, 1000);

}).call(this);
