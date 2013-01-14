(function() {
  var clients, initRedisClient, redisClient, _,
    __slice = [].slice;

  _ = require('underscore');

  /**
   * initRedisClient 初始化redis client，将原来client的函数添加到redisClient中，增加对client的调用会先判断是否已连接
   * @param  {Object} redisClient 新的redis client
   * @param  {RedisClient} client 原有的redis client
  */


  initRedisClient = function(redisClient, client) {
    var functions;
    functions = _.functions(client);
    _.each(functions, function(func, i) {
      return redisClient[func] = function() {
        var args, cbf, err;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        if (client.connected) {
          return client[func].apply(client, args);
        } else {
          cbf = args.pop();
          err = new Error('redis is not connected');
          if (_.isFunction(cbf)) {
            return cbf(err);
          }
        }
      };
    });
    return redisClient;
  };

  clients = {};

  redisClient = {
    /**
     * getClient 获取redisClient对象
     * @param  {Object} options redis服务器的host和port
     * @return {Client}         [description]
    */

    getClient: function(options) {
      var client, key;
      options = _.pick(options, 'port', 'host');
      if (options.port && options.host) {
        key = JSON.stringify(options);
        client = clients[key];
        if (client) {
          return client;
        } else {
          client = require('redis').createClient(options.port, options.host);
          client = initRedisClient({}, client);
          clients[key] = client;
          return client;
        }
      } else {
        return null;
      }
    }
  };

  module.exports = redisClient;

}).call(this);
