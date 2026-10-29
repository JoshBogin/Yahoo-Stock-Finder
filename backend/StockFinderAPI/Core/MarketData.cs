namespace StockFinderAPI.Core;

/// <summary>One intraday bar. Values are null when the provider reports a halt or gap.</summary>
public sealed record Candle(DateTimeOffset Timestamp, decimal? High, decimal? Low, long? Volume);

/// <summary>Intraday bars for a symbol, with the exchange time zone (IANA id) used to assign bars to trading days.</summary>
public sealed record IntradayChart(string Symbol, string ExchangeTimeZoneId, IReadOnlyList<Candle> Candles);

/// <summary>Per-day summary returned by GET /api/stocks/{symbol}/daily-summary.</summary>
public sealed record DailySummary(DateOnly Day, decimal LowAverage, decimal HighAverage, long Volume);

/// <summary>Source of market data.</summary>
public interface IMarketDataProvider
{
    /// <summary>Intraday bars for <paramref name="symbol"/>, or null when the symbol is unknown.</summary>
    Task<IntradayChart?> GetIntradayChartAsync(string symbol, CancellationToken cancellationToken = default);

    /// <summary>Up to <paramref name="count"/> of today's most actively traded stocks, highest volume first.</summary>
    Task<IReadOnlyList<string>> GetMostActiveSymbolsAsync(int count, CancellationToken cancellationToken = default);
}
