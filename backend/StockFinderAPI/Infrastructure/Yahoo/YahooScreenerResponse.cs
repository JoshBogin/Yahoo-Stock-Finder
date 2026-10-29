namespace StockFinderAPI.Infrastructure.Yahoo;

// DTOs for the subset of /v1/finance/screener/predefined/saved we consume.

public sealed record YahooScreenerResponse(YahooScreenerFinance? Finance);

public sealed record YahooScreenerFinance(IReadOnlyList<YahooScreenerResult>? Result);

public sealed record YahooScreenerResult(IReadOnlyList<YahooScreenerQuote>? Quotes);

public sealed record YahooScreenerQuote(string? Symbol);
