###*!
* Copyright(c) 2013 vicanso 腻味
* MIT Licensed
###

_ = require 'underscore'
redis = require 'redis'
url = require 'url'
noop = ->
clientConfigs = null
clients = {}
queryLog = ->
  sendCommand = redis.RedisClient.prototype.send_command
  redis.RedisClient.prototype.send_command = (command, args, cbf) ->
    if !_.isArray args
      throw new Error("send_command: second argument must be an array");
      return
    if !cbf
      lastArg = _.last args
      if !lastArg || _.isFunction lastArg
        cbf = args.pop()
    cbf ?= noop
    start = process.hrtime()
    logParams = [command]
    logParams.push JSON.stringify args
    cbf = _.wrap cbf, (fn, args...) =>
      hrtime = process.hrtime start
      logParams.push hrtime[0] * 1000 + GLOBAL.parseFloat (hrtime[1] / 1000000).toFixed 3
      err = _.first args
      if !err
        @emit 'log', logParams.join ' '
      fn.apply null, args
    sendCommand.call @, command, args, cbf
  queryLog = noop
getConfig = (name) ->
  _.find clientConfigs, (config) ->
    config.name == name
initClient = (name) ->
  config = getConfig name
  client = null
  if config
    uriInfo = url.parse config.uri
    name = config.name || 'defaultRedis'
    pwd = config.pwd
    client = redis.createClient uriInfo.port, uriInfo.hostname, config.options
    if pwd
      client.auth pwd
  client
jtRedis = 
  configure : (key, value) ->
    if _.isObject key
      _.each key, (value, key) ->
        jtRedis.configure key, value
    else
      if key == 'log' && value == true
        queryLog()
      else if key == 'redis'
        if !_.isArray value
          clientConfigs = [value]
        else
          clientConfigs = value
    @
  getClient : (name) ->
    if !clients[name]
      clients[name] = initClient name
    clients[name]
  getNewClient : (name) ->
    initClient name

module.exports = jtRedis