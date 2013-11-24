redis = require 'redis'
util = require 'util'
jtRedis = require '../lib/client'
jtRedis.configure
  profiling : true
  redis : 
    name : 'vicanso'
    uri : 'redis://127.0.0.1:10010'
    pwd : 'MY_REDIS_JENNY_TREE'

client = jtRedis.getClient 'vicanso'
client1 = jtRedis.getNewClient 'vicanso'
client.on 'profiling', (profiling) ->
  console.dir profiling
client1.on 'profiling', (profiling) ->
  console.dir profiling
client.on 'error', (err) ->
	console.error "err:#{err}"
client.on 'message', (channel, message) ->
  console.dir "client channel #{channel}: #{message}"

setTimeout ->
  client.on 'subscribe', (channel, count) ->
    console.dir "client subscribed to #{channel}, #{count} total subscriptions"
    if count == 2
      client1.publish 'a nice channel', 'i am sedding message'
  client.subscribe "a nice channel", "another one"
  # client.config 'set', 'slowlog-log-slower-than', 0, (err, data) ->
  #   client.get '456'
  #   client.set '7897', '123', (err, data) ->
  #     console.dir err
  #   client.get '7897', (err, data) ->
  #     console.dir data
  #   client.multi([
  #     ['get', '123', redis.print]
  #     ['set', '234', 'eofaofjeoajfe', redis.print]
  #     ['get', '345']
  #     ['get', '456']
  #   ]).exec (err, replies) ->
  #     console.dir replies
    # setTimeout ->
    #   client.slowlog 'get', 100, (err, data) ->
    #     console.dir data
    # , 1000

, 1000

