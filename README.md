# jtredis - 对redis封装了，只是简单的将函数封装，且在调用时判断一个redis是否连接，方法的调用和原来的没有改变

##特性：
- 能对各操作添加时间统计输出（multi）的操作例外
- 如果redis server是Replication配置，将读取的操作随机分配到slave。

##注意事项：
- 如果redis server是Replication配置，是在连接所有server之后，再查找出master，因此刚创建client的时候（未连接到redis server，连接server需要的时候很短，但是也是有延时)时无法判断哪个是master，因为如果在setConfig之后立刻调用，有可能导致一些set操作出错,若真需要setConfig之后立刻使用，在uri字符串中master的地址写在前面。

##Demo
```js
var jtRedis = require('jtredis');
jtRedis.setConfig('redis', {
  name : 'vicanso',
  uri : 'redis://127.0.0.1:10010' //如果是replication, uri为'redis://127.0.0.1:10010,redis://127.0.0.1:10011'
});
var client = jtRedis.getClient('vicanso');
client.info(function(err, info){
  console.dir(info);
});
client.set('123', '456', function(err){
  client.get('123', function(err, data){
    console.dir(data);
  });
});
client.multi([
  ['get', '123', redis.print],
  ['set', '234', 'eofaofjeoajfe', redis.print],
  ['get', '345'],
  ['get', '456'],
]).exec(function(err, replies){
  console.dir(replies);
});
```