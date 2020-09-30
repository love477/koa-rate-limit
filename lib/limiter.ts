const LUA_SCRIPT = `
--rate limiter key prefix
local key = KEYS[1]

--rate limit
local limit = ARGV[1]

--rate limit duration
local duration = ARGV[2]

local token_remain = redis.call('get', key);

--if have such key
if token_remain then
		--decuct the key directly
		token_remain = redis.call('decr', key);

		if token_remain < -1 then
				token_remain = -1;
		end

		local time_to_reset = redis.call('ttl', key);

		return {token_remain, time_to_reset}
else
		--if no such key, create a key and store the remaining key in db
		redis.call('set', key, limit - 1, 'PX', duration * 1000);
		return {limit - 1, duration}
end
`;

/**
 * redisClient: ioredis客户端  
 * key: 限流key  
 * limit: 最大流量  
 * duration: 限流区间, 单位：S
 */
export interface LIMITER_OPS {
  redisClient: any;
  key: string;
  prefix?: string;
  limit: number;
  duration: number;
}

/**
 * limit: 最大流量  
 * remaining: 剩余流量  
 * reset: 剩余重置时间
 */
export interface IResponse {
  limit: number,
  remaining: number,
  reset: number,
}

export class Limiter {
  redisClient: any;
  key: string;
  limit: number;
  duration: number;
  
	constructor({
		redisClient, key, prefix, limit = 10, duration = 60
	}: LIMITER_OPS) {
		this.redisClient = redisClient;
    this.key = prefix ? `${prefix}${key}` : key;
		this.limit = limit;
		this.duration = duration;

		this.redisClient.defineCommand('getRateLimit', {
			numberOfKeys: 1,
			lua: LUA_SCRIPT,
      });
	}

	async get(key?: string): Promise<IResponse> {
    const result = await this.redisClient.getRateLimit(key ? key : this.key, this.limit, this.duration);
		return {
			limit: this.limit,
			remaining: result[0],
			reset: parseInt(result[1], 10)
		};
	}

	/**
	 * A helper for getting token and fire the callback
	 * if rate limit reached, it will try to get token again until token available.
	 */
	async run(): Promise<IResponse> {
		const result = await this.get();
		if (result.remaining < 0) {
			await (new Promise((resolve) => {
				setTimeout(() => {
					resolve();
				}, 1000 * (result.reset + 1));
			}));
			return this.run();
		}
		return result;
	}
}
