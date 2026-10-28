namespace StockFinderAPI.Core;

/// <summary>One intraday bar. Values are null when the provider reports a halt or gap.</summary>
public sealed record Candle(DateTimeOffset Timestamp, decimal? High, decimal? Low, long? Volume);

/// <summary>Intraday bars for a symbol, with the exchange time zone (IANA id) used to assign bars to trading days.</summary>
public sealed record IntradayChart(string Symbol, string ExchangeTimeZoneId, IReadOnlyList<Candle> Candles);

/// <summary>Per-day summary returned by GET /api/stocks/{symbol}/daily-summary.</summary>
public sealed record DailySummary(DateOnly Day, decimal LowAverage, decimal HighAverage, long Volume);

/// <summary>Source of intraday market data. Returns null when the symbol is unknown.</summary>
public interface IMarketDataProvider
{
    Task<IntradayChart?> GetIntradayChartAsync(string symbol, CancellationToken cancellationToken = default);
}
