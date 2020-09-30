# 限流中间件
koa-rate-limit是基于@aftership/rate-limiter实现的koa的限流中间件，没有直接使用@aftership/rate-limiter 的npm包，而是使用其源码进行封装的。核心是基于Redis的过期key实现，所以在使用的时候确保已经安装Redis。  
提供的能力： 
1. 基本的限流实现，基于固定窗口的限流算法
2. 支持API级的限流，遵循路由匹配原则的限流规则匹配

开发中的能力：
1. 令牌桶限流算法的实现
2. 基于用户IP的限流
3. 限流配置的动态配置

## 使用说明
### 安装
```sh
# npm
npm i koa-rate-limit

# yarn 
yarn add koa-rate-limit
```
### 使用示例
```ts
import * as Koa from 'koa';
import * as Redis from 'ioredis';
import * as Router from 'koa-router';
import { WindowRateLimiter IConfig } from 'koa-rate-limit';

const app = new Koa();

const limitConfig: IConfig = {
    default: {
        limit: 10,
        duration: 10,
    },
    _hello: {
        limit: 3,
        duration: 10,
    },
};
WindowRateLimiter.init(new Redis(), limiterConfig);

app.use(WindowRateLimiter.limiter);

const router = new Router();
router.get('/hello', (ctx, next) => {
  ctx.body = 'hello world';
});

app.use(router.routes());

app.use((ctx, next) => {
  ctx.body = ctx.path;
});

app.listen(3000);
```

### 使用示例说明
关于Redis和ioredis的使用，请参考下面的文档:
[Redis使用指南](http://www.redis.cn/)
[ioredis使用指南](https://github.com/luin/ioredis#readme)

关于koa中间件的使用，请参考下面的文档：
[koa中间件机制详解](https://cnodejs.org/topic/58fd8ec7523b9d0956dad945)


## 支持功能
功能：
1. 支持接口级别的限流
2. 支持固定窗口限流算法和令牌桶限流算法

## 版本记录
### 1.0.0  
1. 基于@after/rate-limiter的固定窗口限流算法实现KOA中间件  
2. 支持接口级别的限流