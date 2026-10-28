using System.ComponentModel.DataAnnotations;

namespace StockFinderAPI.Infrastructure.Yahoo;

/// <summary>Configuration for the Yahoo Finance chart endpoint, bound from the "YahooFinance" section.</summary>
public sealed class YahooFinanceOptions
{
    public const string SectionName = "YahooFinance";

    [Required, Url]
    public string BaseAddress { get; set; } = "https://query1.finance.yahoo.com/";

    /// <summary>Yahoo rejects requests without a browser-style User-Agent.</summary>
    [Required]
    public string UserAgent { get; set; } = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

    [Required]
    public string Range { get; set; } = "1mo";

    [Required]
    public string Interval { get; set; } = "15m";
}
