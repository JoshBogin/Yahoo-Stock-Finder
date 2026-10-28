namespace StockFinderAPI.Infrastructure.Yahoo;

// DTOs for the subset of /v8/finance/chart/{symbol} we consume. Price and volume
// entries are nullable because Yahoo emits nulls for halts and gaps.

public sealed record YahooChartResponse(YahooChart Chart);

public sealed record YahooChart(IReadOnlyList<YahooChartResult>? Result, YahooChartError? Error);

public sealed record YahooChartError(string? Code, string? Description);

public sealed record YahooChartResult(
    YahooChartMeta Meta,
    IReadOnlyList<long>? Timestamp,
    YahooIndicators Indicators);

public sealed record YahooChartMeta(
    string Symbol,
    string? Currency,
    string? ExchangeName,
    string ExchangeTimezoneName,
    string? InstrumentType);

public sealed record YahooIndicators(IReadOnlyList<YahooQuote> Quote);

public sealed record YahooQuote(
    IReadOnlyList<decimal?>? Open,
    IReadOnlyList<decimal?>? High,
    IReadOnlyList<decimal?>? Low,
    IReadOnlyList<decimal?>? Close,
    IReadOnlyList<long?>? Volume);
