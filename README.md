# jtredis - 对redis封装了，只是简单的将函数封装，且在调用时判断一个redis是否连接，方法的调用和原来的没有改变


```js
var jtRedis = require('jtredis');
jtRedis.setConfig('redis', {
  name : 'vicanso',
  uri : 'redis://127.0.0.1:10010'
});
var client = jtRedis.getClient('vicanso');
client.info(function(err, info){
  console.dir(info);
});
```