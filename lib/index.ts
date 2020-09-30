import { Next, ParameterizedContext } from 'koa';

import { Limiter } from './limiter';

const DEFAULT_LIMITER = 'default';

export interface IConfig {
  [key: string]: {
    readonly limit: number;
    readonly duration: number;
  }
}

export interface ILimiters {
  [key: string]: Limiter
}

export class WindowRateLimiter {
  static redisClient: any;
  static config: IConfig;
  static limiters: ILimiters = {};

  static init(redisClient: any, config: IConfig, prefix?: string): void {
    WindowRateLimiter.redisClient = redisClient;
    WindowRateLimiter.config = config;
    for (const key in config) {
      const limiter = new Limiter({
        redisClient: WindowRateLimiter.redisClient,
        key,
        limit: config[key].limit,
        duration: config[key].duration,
        prefix,
      });
      WindowRateLimiter.limiters[key] = limiter;
    }
  }

  static async limiter(ctx: ParameterizedContext , next: Next): Promise<boolean | undefined> {
    const path = ctx.path;
    const apiKey = path.replace(/\//g, '_');
    let keyLength = 0;
    let limiter = WindowRateLimiter.limiters[DEFAULT_LIMITER] ? WindowRateLimiter.limiters[DEFAULT_LIMITER] : null;
    for (const key in WindowRateLimiter.limiters) {
      // 遵循最佳匹配原则
      if (apiKey.startsWith(key) && (key.length >= keyLength)) {
        limiter = WindowRateLimiter.limiters[key];
        keyLength = key.length;
      }
    }
    if (!limiter) {
      return next();
    }
    const limitInfo = await limiter.get();
    if (limitInfo.remaining >= 0) {
      return next();
    } else {
      ctx.body = 'request frequency limited';
      return;
    }
  }
}