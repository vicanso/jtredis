(function() {
  var client, client1, jtRedis, redis, util;

  redis = require('redis');

  util = require('util');

  jtRedis = require('../lib/client');

  jtRedis.configure({
    profiling: true,
    redis: {
      name: 'vicanso',
      uri: 'redis://127.0.0.1:10010',
      pwd: 'MY_REDIS_JENNY_TREE'
    }
  });

  client = jtRedis.getClient('vicanso');

  client1 = jtRedis.getNewClient('vicanso');

  client.on('profiling', function(profiling) {
    return console.dir(profiling);
  });

  client1.on('profiling', function(profiling) {
    return console.dir(profiling);
  });

  client.on('error', function(err) {
    return console.error("err:" + err);
  });

  client.on('message', function(channel, message) {
    return console.dir("client channel " + channel + ": " + message);
  });

  setTimeout(function() {
    client.on('subscribe', function(channel, count) {
      console.dir("client subscribed to " + channel + ", " + count + " total subscriptions");
      if (count === 2) {
        return client1.publish('a nice channel', 'i am sedding message');
      }
    });
    return client.subscribe("a nice channel", "another one");
  }, 1000);

}).call(this);
