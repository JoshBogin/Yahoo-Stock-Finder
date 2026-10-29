using System.ComponentModel.DataAnnotations;

namespace StockFinderAPI.Api;

/// <summary>Settings for <c>GET /api/stocks/popular</c>, bound from the "PopularStocks" section.</summary>
public sealed class PopularStocksOptions
{
    public const string SectionName = "PopularStocks";

    /// <summary>
    /// How many of the most actively traded stocks to return. Capped at 25 because the dashboard draws a card per
    /// symbol and each card makes its own daily-summary request to Yahoo, so a large count risks rate limiting (429).
    /// </summary>
    [Range(1, 25)]
    public int Count { get; set; } = 8;

    /// <summary>
    /// Served when the most-active screener fails or returns nothing. An array rather than a list,
    /// so configuration replaces it instead of appending to a default.
    /// </summary>
    [Required, MinLength(1)]
    public string[] FallbackSymbols { get; set; } = [];
}
