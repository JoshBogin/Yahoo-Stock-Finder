using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using StockFinderAPI.Core;

namespace StockFinderAPI.Api;

/// <summary>
/// The dashboard's symbols: today's most actively traded stocks, cached briefly so page loads don't each hit
/// Yahoo. When the screener fails or returns nothing, the configured fallback list is served instead, cached
/// for a shorter time so the live list comes back soon after Yahoo recovers.
/// </summary>
public sealed class PopularSymbolsService(
    IMarketDataProvider marketData,
    IMemoryCache cache,
    IOptions<PopularStocksOptions> options,
    ILogger<PopularSymbolsService> logger)
{
    public static readonly TimeSpan MostActiveCacheDuration = TimeSpan.FromMinutes(5);
    public static readonly TimeSpan FallbackCacheDuration = TimeSpan.FromMinutes(1);

    private static readonly object CacheKey = new();

    public async Task<IReadOnlyList<string>> GetAsync(CancellationToken cancellationToken = default)
    {
        if (cache.TryGetValue(CacheKey, out IReadOnlyList<string>? cached) && cached is not null)
        {
            return cached;
        }

        var (symbols, duration) = await FetchAsync(cancellationToken);
        cache.Set(CacheKey, symbols, duration);
        return symbols;
    }

    private async Task<(IReadOnlyList<string> Symbols, TimeSpan Duration)> FetchAsync(CancellationToken cancellationToken)
    {
        var settings = options.Value;
        try
        {
            var symbols = await marketData.GetMostActiveSymbolsAsync(settings.Count, cancellationToken);
            if (symbols.Count > 0)
            {
                return (symbols, MostActiveCacheDuration);
            }

            logger.LogWarning("The most-active screener returned no symbols; serving the fallback list");
        }
        catch (Exception exception) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning(exception, "The most-active screener failed; serving the fallback list");
        }

        return (settings.FallbackSymbols, FallbackCacheDuration);
    }
}
