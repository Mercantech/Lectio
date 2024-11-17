using System;
using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;

public static class DistributedCacheExtensions
{
    public static async Task SetAsync<T>(
        this IDistributedCache cache,
        string key,
        T value,
        TimeSpan absoluteExpiration
    )
    {
        var options = new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = absoluteExpiration
        };

        var jsonData = JsonSerializer.Serialize(value);
        await cache.SetStringAsync(key, jsonData, options);
    }

    public static async Task<T> GetAsync<T>(this IDistributedCache cache, string key)
    {
        var jsonData = await cache.GetStringAsync(key);

        if (string.IsNullOrEmpty(jsonData))
            return default;

        return JsonSerializer.Deserialize<T>(jsonData);
    }
}
