using System.Net;
using Microsoft.Extensions.Options;
using StockFinderAPI.Core;

namespace StockFinderAPI.Infrastructure.Yahoo;

/// <summary>Typed HttpClient for Yahoo Finance's chart and screener endpoints.</summary>
public sealed class YahooFinanceClient(HttpClient httpClient, IOptions<YahooFinanceOptions> options) : IMarketDataProvider
{
    private readonly YahooFinanceOptions _options = options.Value;

    public async Task<IntradayChart?> GetIntradayChartAsync(string symbol, CancellationToken cancellationToken = default)
    {
        var result = await GetChartAsync(symbol, cancellationToken);
        return result is null ? null : ToIntradayChart(result);
    }

    /// <summary>
    /// Fetches intraday candles for <paramref name="symbol"/> over the configured range and interval.
    /// Returns null when Yahoo does not know the symbol; throws <see cref="HttpRequestException"/> on other failures.
    /// </summary>
    public async Task<YahooChartResult?> GetChartAsync(string symbol, CancellationToken cancellationToken = default)
    {
        var uri = $"v8/finance/chart/{Uri.EscapeDataString(symbol)}" +
                  $"?range={Uri.EscapeDataString(_options.Range)}&interval={Uri.EscapeDataString(_options.Interval)}";

        using var response = await httpClient.GetAsync(uri, cancellationToken);

        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<YahooChartResponse>(cancellationToken);
        return body?.Chart.Result is [var result, ..] ? result : null;
    }

    /// <summary>
    /// Reads Yahoo's predefined "most_actives" screener, which lists stocks by today's volume, highest first, and
    /// returns the first <paramref name="count"/> symbols in that order. Throws <see cref="HttpRequestException"/> on failures.
    /// </summary>
    public async Task<IReadOnlyList<string>> GetMostActiveSymbolsAsync(int count, CancellationToken cancellationToken = default)
    {
        var uri = $"v1/finance/screener/predefined/saved?scrIds=most_actives&count={count}";

        using var response = await httpClient.GetAsync(uri, cancellationToken);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<YahooScreenerResponse>(cancellationToken);
        var quotes = body?.Finance?.Result is [var result, ..] ? result.Quotes ?? [] : [];

        return [.. quotes
            .Where(quote => !string.IsNullOrWhiteSpace(quote.Symbol))
            .Select(quote => quote.Symbol!)];
    }

    private static IntradayChart ToIntradayChart(YahooChartResult result)
    {
        var timestamps = result.Timestamp ?? [];
        var quote = result.Indicators.Quote is [var q, ..] ? q : null;

        var candles = timestamps
            .Select((ts, i) => new Candle(
                DateTimeOffset.FromUnixTimeSeconds(ts),
                ValueAt(quote?.High, i),
                ValueAt(quote?.Low, i),
                ValueAt(quote?.Volume, i)))
            .ToList();

        return new IntradayChart(result.Meta.Symbol, result.Meta.ExchangeTimezoneName, candles);
    }

    // Yahoo's arrays are parallel to the timestamps, but guard against short arrays.
    private static T? ValueAt<T>(IReadOnlyList<T?>? values, int index) where T : struct =>
        values is not null && index < values.Count ? values[index] : null;
}
