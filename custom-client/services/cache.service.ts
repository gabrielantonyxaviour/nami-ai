import NodeCache from "node-cache";

export type CacheOptions = {
  expires?: number;
};

export class CacheService {
  private static instance: CacheService;
  private cache: NodeCache;

  private constructor() {
    this.cache = new NodeCache({ stdTTL: 600 }); // 10 minutes TTL
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  public set<T>(key: string, value: T, options?: CacheOptions): boolean {
    return this.cache.set(
      key,
      JSON.stringify({ value, expires: options?.expires ?? 0 })
    );
  }

  async get<T = unknown>(key: string): Promise<T | undefined> {
    const data = await this.cache.get(key);

    if (data) {
      const { value, expires } = JSON.parse(data as string) as {
        value: T;
        expires: number;
      };

      if (!expires || expires > Date.now()) {
        return value;
      }

      this.cache.del(key);
    }

    return undefined;
  }

  public del(key: string): number {
    return this.cache.del(key);
  }
}
