###*!
* Copyright(c) 2013 vicanso 腻味
* MIT Licensed
###

_ = require 'underscore'
redis = require 'redis'
commands = require './commands'
commands.push 'on', 'on_connect', 'on_data', 'on_error', 'on_info_cmd', 'on_ready'

logger = console
noop = () ->

class Client
  constructor : () ->
    @clients = {}
    @redisConfigs = {}
    @isLogger = false
    @slaveHandleFunctions = require('./readcommands').sort()
  ###*
   * configure 设置配置信息
   * @param {String, Object} key 配置的key或者{key : value}
   * @param {[type]} 配置的值
  ###
  configure : (key, value) ->
    self = @
    if _.isObject key
      obj = key
      _.each obj, (value, key) ->
        self.configure key, value
    else if value?
      switch key
        when 'redis'
        then self._addRedisConfig value
        when 'queryTime'
        then LOG_QUERY_TIME self
    return @
  ###*
   * getClient 获取client（该client有所有red∫∫∫s的方法）
   * @param  {String} name 配置redis时的名字
   * @return {[type]} 返回一个client对象
  ###
  getClient : (name = 'default') ->
    self = @
    client = {}
    _.each commands, (command) ->
      client[command] = client[command.toUpperCase()] = (args...) ->
        args.unshift name, command
        self.handle.apply self, args
    return client
  ###*
   * handle redis处理
   * @param  {String} name 配置redis时的名字
   * @param  {String} funcName 要执行的redis操作
   * @param  {Array} args... 参数列表
   * @return {[type]} 返回node-redis执行的值
  ###
  handle : (name,  funcName, args...) ->
    client = @_client name, funcName
    if @isLogger
      cbf = _.last args
      if client.index == 0
        cbf._clientDesc = 'client:master'
      else
        cbf._clientDesc = "client:slave(#{client.index})"
    redisClient = client.client
    return redisClient[funcName].apply redisClient, args
  ###*
   * _addRedisConfig 添加redis的配置信息
   * @param {Object} config 配置信息
   * @return {Client} 返回Client实例
  ###
  _addRedisConfig : (config) ->
    self = @
    redisConfigs = @redisConfigs
    name = config.name
    if name
      delete config.name
      if !redisConfigs[name]
        redisConfigs[name] = config
        self._client name
    return @
  ###*
   * _getRedisConfig 获取redis的配置信息
   * @param  {String} name 配置redis时的名字
   * @return {Object} 配置信息或者null
  ###
  _getRedisConfig : (name) ->
    if name
      config = @redisConfigs[name]
      if !config
        return null
      uri = config.uri
      if !uri
        return null
      url = require 'url'
      uris = uri.split ','
      redisConfig = _.map uris, (uri) ->
        uriInfo = url.parse uri.trim()
        return {
          host : uriInfo.hostname
          port : uriInfo.port
          keepAlive : config.keepAlive
          pwd : config.pwd
        }
      return redisConfig
    else
      return null
  ###*
   * _client 获取node-redis创建的redis client
   * @param  {String} name 配置redis时的名字
   * @param  {String} funcName 要执行的redis操作（用于返回决定返回主从client，若为null，则返回主）
   * @return {[type]}      [description]
  ###
  _client : (name, funcName) ->
    self = @
    clients = @clients
    redisClients = clients[name]
    if !redisClients
      redisConfig = self._getRedisConfig name
      if !redisConfig
        return self
      connectTotal = 0
      redisServerTotal = redisConfig.length
      redisClients = _.map redisConfig, (config) ->
        redisClient = redis.createClient config.port, config.host
        redisClient.once 'ready', (err) ->
          logger.info "redis server #{config.host} #{config.port} is ready!"
          connectTotal++
          if connectTotal == redisServerTotal
            self._sortClient name
            connectTotal = -1
        if config.pwd
          redisClient.auth config.pwd
        if config.keepAlive
          setInterval () ->
            redisClient.ping()
          , 120 * 1000
        return redisClient
      clients[name] = redisClients
      clients['default'] ?= redisClients
      _.delay () ->
        if ~connectTotal
          self._sortClient name
      , 5000
    else
      if redisClients.length != 1 && ~_.indexOf self.slaveHandleFunctions, funcName.toLowerCase(), true
        return self._getSlaveClient name
      else
        return {
          index : 0
          client : redisClients[0]
        }
  ###*
   * _getSlaveClient 获取从的client
   * @param  {String} name 配置redis时的名字
   * @return {[type]}      [description]
  ###
  _getSlaveClient : (name) ->
    clients = @clients
    redisClients = clients[name]
    index = _.random 1, redisClients.length - 1
    return {
      index : index
      client : redisClients[index]
    }
  ###*
   * _sortClient 将client排序（master排在第一个）
   * @param  {String} name 配置redis时的名字
   * @return {[type]}      [description]
  ###
  _sortClient : (name) ->
    clients = @clients
    redisClients = clients[name]
    if redisClients?.length > 1
      clients[name] = _.sortBy redisClients, (client) ->
        if client.server_info.role == 'master'
          return -1
        else
          return 0
    return @
  ###*
   * _serializationQuery 序列化参数列表（参数类型不为function）
   * @param  {Array} args 参数列表
   * @return {String} 
  ###
  _serializationQuery : (args) ->
    serializationList = []
    _.each args, (arg) ->
      if! _.isFunction arg
        if _.isString arg
          serializationList.push arg
        else
          serializationList.push JSON.stringify arg
    return serializationList.join ','


  
_.each commands, (command) ->
  Client.prototype[command] = Client.prototype[command.toUpperCase()] = (args...) ->
    self = @
    args.splice 1, 0, command
    self.handle.apply self, args

###*
 * LOG_QUERY_TIME 添加查询时间的log
###
LOG_QUERY_TIME = (self) ->
  self.isLogger = true
  Client.prototype.handle = _.wrap Client.prototype.handle, (func, args...) ->
    self = @
    queryArgs = _.toArray arguments
    cbf = args.pop()
    if !_.isFunction cbf
      args.push cbf
      cbf = noop
    start = Date.now()
    cbf = _.wrap cbf, (func, err, data) ->
      queryArgs.push cbf._clientDesc
      se = self._serializationQuery queryArgs
      logger.info "#{se},use time:#{Date.now() - start}ms"
      func err, data
    args.push cbf
    func.apply @, args
  LOG_QUERY_TIME = noop

Client.prototype.setConfig = Client.prototype.configure

module.exports = new Client