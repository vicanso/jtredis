/**!
* Copyright(c) 2013 vicanso 腻味
* MIT Licensed
*/


(function() {
  var clientConfigs, clients, getConfig, initClient, jtRedis, noop, profiling, redis, url, _,
    __slice = [].slice;

  _ = require('underscore');

  redis = require('redis');

  url = require('url');

  noop = function() {};

  clientConfigs = null;

  clients = {};

  profiling = function() {
    var sendCommand;
    sendCommand = redis.RedisClient.prototype.send_command;
    redis.RedisClient.prototype.send_command = function(command, args, cbf) {
      var lastArg, params, start,
        _this = this;
      if (!_.isArray(args)) {
        throw new Error("send_command: second argument must be an array");
        return;
      }
      if (!cbf) {
        lastArg = _.last(args);
        if (!lastArg || _.isFunction(lastArg)) {
          cbf = args.pop();
        }
      }
      if (cbf == null) {
        cbf = noop;
      }
      start = process.hrtime();
      params = JSON.stringify(args);
      cbf = _.wrap(cbf, function() {
        var args, elapsedTime, err, fn, hrtime;
        fn = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        hrtime = process.hrtime(start);
        elapsedTime = hrtime[0] * 1000 + GLOBAL.parseFloat((hrtime[1] / 1000000).toFixed(3));
        err = _.first(args);
        if (!err) {
          _this.emit('profiling', {
            category: 'handle',
            method: command,
            params: params,
            date: new Date(),
            elapsedTime: elapsedTime
          });
        }
        return fn.apply(null, args);
      });
      return sendCommand.call(this, command, args, cbf);
    };
    return profiling = noop;
  };

  getConfig = function(name) {
    return _.find(clientConfigs, function(config) {
      return config.name === name;
    });
  };

  initClient = function(name) {
    var client, config, pwd, uriInfo;
    config = getConfig(name);
    client = null;
    if (config) {
      uriInfo = url.parse(config.uri);
      name = config.name || 'defaultRedis';
      pwd = config.pwd;
      client = redis.createClient(uriInfo.port, uriInfo.hostname, config.options);
      if (pwd) {
        client.auth(pwd);
      }
    }
    return client;
  };

  jtRedis = {
    configure: function(key, value) {
      if (_.isObject(key)) {
        _.each(key, function(value, key) {
          return jtRedis.configure(key, value);
        });
      } else {
        if (key === 'profiling' && value === true) {
          profiling();
        } else if (key === 'redis') {
          if (!_.isArray(value)) {
            clientConfigs = [value];
          } else {
            clientConfigs = value;
          }
        }
      }
      return this;
    },
    getClient: function(name) {
      if (!clients[name]) {
        clients[name] = initClient(name);
      }
      return clients[name];
    },
    getNewClient: function(name) {
      return initClient(name);
    }
  };

  module.exports = jtRedis;

}).call(this);
