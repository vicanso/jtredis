
redis = require 'redis'
jtRedis = require './lib/client'
jtRedis.setConfig
  queryTime : true
  redis : 
    name : 'vicanso'
    uri : 'redis://127.0.0.1:10010,redis://127.0.0.1:10011'
    keepAlive : true

client = jtRedis.getClient 'vicanso'
client.set '456', '12345'
client.set '7897', '123', (err, data) ->
  console.dir err
client.get '7897', (err, data) ->
  console.dir data
client.multi([
  ['get', '123', redis.print]
  ['set', '234', 'eofaofjeoajfe', redis.print]
  ['get', '345']
  ['get', '456']
]).exec (err, replies) ->
  console.dir replies
