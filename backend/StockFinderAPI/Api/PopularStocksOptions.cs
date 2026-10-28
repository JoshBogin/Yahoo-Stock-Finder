using System.ComponentModel.DataAnnotations;

namespace StockFinderAPI.Api;

/// <summary>The curated list served by <c>GET /api/stocks/popular</c>, bound from the "PopularStocks" section.</summary>
public sealed class PopularStocksOptions
{
    public const string SectionName = "PopularStocks";

    /// <summary>An array rather than a list, so configuration replaces it instead of appending to a default.</summary>
    [Required, MinLength(1)]
    public string[] Symbols { get; set; } = [];
}
