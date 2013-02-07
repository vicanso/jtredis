_ = require 'underscore'
async = require 'async'
assert = require 'assert'
jtRedis = require '../index'
jtRedis.setConfig
  queryTime : true
  redis : 
    name : 'vicanso'
    uri : 'redis://koala:6380'
    keepAlive : true
client = jtRedis.getClient 'vicanso'


describe 'jtRedis', () ->
  describe '#set(), #get()', () ->
    it 'check set and get functions', (done) ->
      testKey = '123456'
      testValue = 'abceafea'
      client.set testKey, testValue, (err) ->
        if err
          done err
        else
          client.get testKey, (err, result) ->
            if err
              done err
            else if testValue != result
              done new Error 'set and get is fail'
            else
              done()

  describe '@multi()', () ->
    it 'check the multi function', (done) ->
      testKey1 = '123456'
      testValue1 = 'abceafea'
      testKey2 = '234567'
      testValue2 = 'bafeafeafe'
      client.multi([
        ['get', testKey1]
        ['set', testKey2, testValue2]
      ]).exec (err, replies) ->
        if err
          done err
        else if !_.isArray replies
          done new Error 'the replies is not a array'
        else if "#{testValue1} OK" != replies.join ' '
          done new Error 'the replies is wrong'
        else
          client.get testKey2, (err, result) ->
            if err
              done err
            else if testValue2 != result
              done new Error 'the set function is fail'
            else
              done()
