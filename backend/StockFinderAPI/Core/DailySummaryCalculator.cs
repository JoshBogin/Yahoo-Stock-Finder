namespace StockFinderAPI.Core;

public static class DailySummaryCalculator
{
    private const int PriceDecimals = 4;

    /// <summary>
    /// Groups candles by trading date in the exchange's time zone and averages each day's highs and lows.
    /// Candles with a null high, low or volume are skipped; days with no valid candles are omitted.
    /// </summary>
    public static IReadOnlyList<DailySummary> Summarize(IntradayChart chart)
    {
        var timeZone = TimeZoneInfo.FindSystemTimeZoneById(chart.ExchangeTimeZoneId);

        return chart.Candles
            .Where(c => c is { High: not null, Low: not null, Volume: not null })
            .GroupBy(c => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(c.Timestamp, timeZone).DateTime))
            .OrderBy(g => g.Key)
            .Select(g => new DailySummary(
                g.Key,
                Round(g.Average(c => c.Low!.Value)),
                Round(g.Average(c => c.High!.Value)),
                g.Sum(c => c.Volume!.Value)))
            .ToList();
    }

    private static decimal Round(decimal value) =>
        Math.Round(value, PriceDecimals, MidpointRounding.AwayFromZero);
}
