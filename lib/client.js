
/**!
* Copyright(c) 2013 vicanso 腻味
* MIT Licensed
*/


(function() {
  var Client, LOG_QUERY_TIME, commands, logger, noop, redis, _,
    __slice = [].slice;

  _ = require('underscore');

  redis = require('redis');

  commands = require('./commands');

  commands.push('on', 'on_connect', 'on_data', 'on_error', 'on_info_cmd', 'on_ready');

  logger = console;

  noop = function() {};

  Client = (function() {

    function Client() {
      this.clients = {};
      this.redisConfigs = {};
      this.isLogger = false;
      this.slaveHandleFunctions = require('./readcommands').sort();
    }

    /**
     * configure 设置配置信息
     * @param {String, Object} key 配置的key或者{key : value}
     * @param {[type]} 配置的值
    */


    Client.prototype.configure = function(key, value) {
      var obj, self;
      self = this;
      if (_.isObject(key)) {
        obj = key;
        _.each(obj, function(value, key) {
          return self.configure(key, value);
        });
      } else if (value != null) {
        switch (key) {
          case 'redis':
            self._addRedisConfig(value);
            break;
          case 'queryTime':
            LOG_QUERY_TIME(self);
        }
      }
      return this;
    };

    /**
     * getClient 获取client（该client有所有red∫∫∫s的方法）
     * @param  {String} name 配置redis时的名字
     * @return {[type]} 返回一个client对象
    */


    Client.prototype.getClient = function(name) {
      var client, self;
      if (name == null) {
        name = 'default';
      }
      self = this;
      client = {};
      _.each(commands, function(command) {
        return client[command] = client[command.toUpperCase()] = function() {
          var args;
          args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
          args.unshift(name, command);
          return self.handle.apply(self, args);
        };
      });
      return client;
    };

    /**
     * handle redis处理
     * @param  {String} name 配置redis时的名字
     * @param  {String} funcName 要执行的redis操作
     * @param  {Array} args... 参数列表
     * @return {[type]} 返回node-redis执行的值
    */


    Client.prototype.handle = function() {
      var args, cbf, client, funcName, name, redisClient;
      name = arguments[0], funcName = arguments[1], args = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
      client = this._client(name, funcName);
      if (this.isLogger) {
        cbf = _.last(args);
        if (client.index === 0) {
          cbf._clientDesc = 'client:master';
        } else {
          cbf._clientDesc = "client:slave(" + client.index + ")";
        }
      }
      redisClient = client.client;
      return redisClient[funcName].apply(redisClient, args);
    };

    /**
     * _addRedisConfig 添加redis的配置信息
     * @param {Object} config 配置信息
     * @return {Client} 返回Client实例
    */


    Client.prototype._addRedisConfig = function(config) {
      var name, redisConfigs, self;
      self = this;
      redisConfigs = this.redisConfigs;
      name = config.name;
      if (name) {
        delete config.name;
        redisConfigs[name] = config;
        self._client(name);
      }
      return this;
    };

    /**
     * _getRedisConfig 获取redis的配置信息
     * @param  {String} name 配置redis时的名字
     * @return {Object} 配置信息或者null
    */


    Client.prototype._getRedisConfig = function(name) {
      var config, redisConfig, uri, uris, url;
      if (name) {
        config = this.redisConfigs[name];
        if (!config) {
          return null;
        }
        uri = config.uri;
        if (!uri) {
          return null;
        }
        url = require('url');
        uris = uri.split(',');
        redisConfig = _.map(uris, function(uri) {
          var uriInfo;
          uriInfo = url.parse(uri.trim());
          return {
            host: uriInfo.hostname,
            port: uriInfo.port,
            keepAlive: config.keepAlive,
            pwd: config.pwd
          };
        });
        return redisConfig;
      } else {
        return null;
      }
    };

    /**
     * _client 获取node-redis创建的redis client
     * @param  {String} name 配置redis时的名字
     * @param  {String} funcName 要执行的redis操作（用于返回决定返回主从client，若为null，则返回主）
     * @return {[type]}      [description]
    */


    Client.prototype._client = function(name, funcName) {
      var clients, connectTotal, redisClients, redisConfig, redisServerTotal, self, _ref;
      self = this;
      clients = this.clients;
      redisClients = clients[name];
      if (!redisClients) {
        redisConfig = self._getRedisConfig(name);
        if (!redisConfig) {
          return self;
        }
        connectTotal = 0;
        redisServerTotal = redisConfig.length;
        redisClients = _.map(redisConfig, function(config) {
          var redisClient;
          redisClient = redis.createClient(config.port, config.host);
          redisClient.once('ready', function(err) {
            logger.info("redis server " + config.host + " " + config.port + " is ready!");
            connectTotal++;
            if (connectTotal === redisServerTotal) {
              self._sortClient(name);
              return connectTotal = -1;
            }
          });
          if (config.pwd) {
            redisClient.auth(config.pwd);
          }
          if (config.keepAlive) {
            setInterval(function() {
              return redisClient.ping();
            }, 120 * 1000);
          }
          return redisClient;
        });
        clients[name] = redisClients;
        if ((_ref = clients['default']) == null) {
          clients['default'] = redisClients;
        }
        return _.delay(function() {
          if (~connectTotal) {
            return self._sortClient(name);
          }
        }, 5000);
      } else {
        if (redisClients.length !== 1 && ~_.indexOf(self.slaveHandleFunctions, funcName.toLowerCase(), true)) {
          return self._getSlaveClient(name);
        } else {
          return {
            index: 0,
            client: redisClients[0]
          };
        }
      }
    };

    /**
     * _getSlaveClient 获取从的client
     * @param  {String} name 配置redis时的名字
     * @return {[type]}      [description]
    */


    Client.prototype._getSlaveClient = function(name) {
      var clients, index, redisClients;
      clients = this.clients;
      redisClients = clients[name];
      index = _.random(1, redisClients.length - 1);
      return {
        index: index,
        client: redisClients[index]
      };
    };

    /**
     * _sortClient 将client排序（master排在第一个）
     * @param  {String} name 配置redis时的名字
     * @return {[type]}      [description]
    */


    Client.prototype._sortClient = function(name) {
      var clients, redisClients;
      clients = this.clients;
      redisClients = clients[name];
      if ((redisClients != null ? redisClients.length : void 0) > 1) {
        clients[name] = _.sortBy(redisClients, function(client) {
          if (client.server_info.role === 'master') {
            return -1;
          } else {
            return 0;
          }
        });
      }
      return this;
    };

    /**
     * _serializationQuery 序列化参数列表（参数类型不为function）
     * @param  {Array} args 参数列表
     * @return {String}
    */


    Client.prototype._serializationQuery = function(args) {
      var serializationList;
      serializationList = [];
      _.each(args, function(arg) {
        if (!_.isFunction(arg)) {
          if (_.isString(arg)) {
            return serializationList.push(arg);
          } else {
            return serializationList.push(JSON.stringify(arg));
          }
        }
      });
      return serializationList.join(',');
    };

    return Client;

  })();

  _.each(commands, function(command) {
    return Client.prototype[command] = Client.prototype[command.toUpperCase()] = function() {
      var args, self;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      self = this;
      args.splice(1, 0, command);
      return self.handle.apply(self, args);
    };
  });

  /**
   * LOG_QUERY_TIME 添加查询时间的log
  */


  LOG_QUERY_TIME = function(self) {
    self.isLogger = true;
    Client.prototype.handle = _.wrap(Client.prototype.handle, function() {
      var args, cbf, func, queryArgs, start;
      func = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      self = this;
      queryArgs = _.toArray(arguments);
      cbf = args.pop();
      if (!_.isFunction(cbf)) {
        args.push(cbf);
        cbf = noop;
      }
      start = Date.now();
      cbf = _.wrap(cbf, function(func, err, data) {
        var se;
        queryArgs.push(cbf._clientDesc);
        se = self._serializationQuery(queryArgs);
        logger.info("" + se + ",use time:" + (Date.now() - start) + "ms");
        return func(err, data);
      });
      args.push(cbf);
      return func.apply(this, args);
    });
    return LOG_QUERY_TIME = noop;
  };

  Client.prototype.setConfig = Client.prototype.configure;

  module.exports = new Client;

}).call(this);
