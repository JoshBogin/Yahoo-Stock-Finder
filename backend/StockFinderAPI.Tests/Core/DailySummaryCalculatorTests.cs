using StockFinderAPI.Core;

namespace StockFinderAPI.Tests.Core;

public class DailySummaryCalculatorTests
{
    private const string NewYork = "America/New_York";

    [Fact]
    public void Summarize_NoCandles_ReturnsEmpty()
    {
        var result = DailySummaryCalculator.Summarize(Chart(NewYork));

        Assert.Empty(result);
    }

    [Fact]
    public void Summarize_SingleDay_AveragesHighsAndLowsAndSumsVolume()
    {
        var chart = Chart(NewYork,
            Bar("2026-09-28T13:30:00Z", high: 101m, low: 99m, volume: 1_000),
            Bar("2026-09-28T13:45:00Z", high: 103m, low: 100m, volume: 2_000),
            Bar("2026-09-28T14:00:00Z", high: 102m, low: 98m, volume: 3_000));

        var day = Assert.Single(DailySummaryCalculator.Summarize(chart));

        Assert.Equal(new DateOnly(2026, 9, 28), day.Day);
        Assert.Equal(99m, day.LowAverage);
        Assert.Equal(102m, day.HighAverage);
        Assert.Equal(6_000, day.Volume);
    }

    [Fact]
    public void Summarize_MultipleDays_ReturnsOneEntryPerDaySortedOldestFirst()
    {
        var chart = Chart(NewYork,
            Bar("2026-09-30T14:00:00Z", high: 3m, low: 3m, volume: 3),
            Bar("2026-09-28T14:00:00Z", high: 1m, low: 1m, volume: 1),
            Bar("2026-09-29T14:00:00Z", high: 2m, low: 2m, volume: 2));

        var days = DailySummaryCalculator.Summarize(chart).Select(d => d.Day);

        Assert.Equal([new(2026, 9, 28), new(2026, 9, 29), new DateOnly(2026, 9, 30)], days);
    }

    [Fact]
    public void Summarize_VolumeSum_DoesNotOverflowInt32()
    {
        var chart = Chart(NewYork,
            Bar("2026-09-28T14:00:00Z", high: 1m, low: 1m, volume: 2_000_000_000),
            Bar("2026-09-28T14:15:00Z", high: 1m, low: 1m, volume: 2_000_000_000));

        Assert.Equal(4_000_000_000, Assert.Single(DailySummaryCalculator.Summarize(chart)).Volume);
    }

    // --- Time zones ---

    [Fact]
    public void Summarize_GroupsByExchangeDate_NotUtcDate()
    {
        // 01:00 UTC on Sep 29 is 21:00 on Sep 28 in New York (EDT, UTC-4).
        var chart = Chart(NewYork,
            Bar("2026-09-28T19:00:00Z", high: 10m, low: 10m, volume: 1),
            Bar("2026-09-29T01:00:00Z", high: 20m, low: 20m, volume: 1));

        var day = Assert.Single(DailySummaryCalculator.Summarize(chart));

        Assert.Equal(new DateOnly(2026, 9, 28), day.Day);
        Assert.Equal(15m, day.HighAverage);
    }

    [Fact]
    public void Summarize_ExchangeAheadOfUtc_AssignsToNextLocalDate()
    {
        // 23:30 UTC on Sep 28 is 08:30 on Sep 29 in Tokyo (UTC+9).
        var chart = Chart("Asia/Tokyo", Bar("2026-09-28T23:30:00Z", high: 1m, low: 1m, volume: 1));

        Assert.Equal(new DateOnly(2026, 9, 29), Assert.Single(DailySummaryCalculator.Summarize(chart)).Day);
    }

    [Fact]
    public void Summarize_UsesOffsetInEffectAfterDaylightSavingEnds()
    {
        // DST ends Nov 1, 2026. 04:30 UTC on Nov 2 is 23:30 EST (UTC-5) on Nov 1;
        // a fixed EDT offset (UTC-4) would wrongly give 00:30 on Nov 2.
        var chart = Chart(NewYork, Bar("2026-11-02T04:30:00Z", high: 1m, low: 1m, volume: 1));

        Assert.Equal(new DateOnly(2026, 11, 1), Assert.Single(DailySummaryCalculator.Summarize(chart)).Day);
    }

    // --- Rounding ---

    [Fact]
    public void Summarize_RoundsAveragesToFourDecimalPlaces()
    {
        // Lows average 4/3 = 1.3333...; highs average 5/3 = 1.6666...
        var chart = Chart(NewYork,
            Bar("2026-09-28T14:00:00Z", high: 1m, low: 1m, volume: 1),
            Bar("2026-09-28T14:15:00Z", high: 2m, low: 1m, volume: 1),
            Bar("2026-09-28T14:30:00Z", high: 2m, low: 2m, volume: 1));

        var day = Assert.Single(DailySummaryCalculator.Summarize(chart));

        Assert.Equal(1.3333m, day.LowAverage);
        Assert.Equal(1.6667m, day.HighAverage);
    }

    [Fact]
    public void Summarize_MidpointRoundsAwayFromZero()
    {
        // Average is exactly 1.00005; banker's rounding would give 1.0000.
        var chart = Chart(NewYork,
            Bar("2026-09-28T14:00:00Z", high: 1.0000m, low: 1.0000m, volume: 1),
            Bar("2026-09-28T14:15:00Z", high: 1.0001m, low: 1.0001m, volume: 1));

        var day = Assert.Single(DailySummaryCalculator.Summarize(chart));

        Assert.Equal(1.0001m, day.LowAverage);
        Assert.Equal(1.0001m, day.HighAverage);
    }

    [Fact]
    public void Summarize_PreservesFullPrecisionPrices()
    {
        // Yahoo sends float-derived values like 369.4200134277344.
        var chart = Chart(NewYork, Bar("2026-09-28T14:00:00Z", high: 369.4200134277344m, low: 40.29575m, volume: 1));

        var day = Assert.Single(DailySummaryCalculator.Summarize(chart));

        Assert.Equal(369.4200m, day.HighAverage);
        Assert.Equal(40.2958m, day.LowAverage);
    }

    // --- Null candles ---

    [Theory]
    [InlineData(null, 1.0, 1L)]
    [InlineData(1.0, null, 1L)]
    [InlineData(1.0, 1.0, null)]
    public void Summarize_SkipsCandleWithAnyNullValue(double? high, double? low, long? volume)
    {
        var chart = Chart(NewYork,
            Bar("2026-09-28T14:00:00Z", high: 10m, low: 8m, volume: 100),
            Bar("2026-09-28T14:15:00Z", high: (decimal?)high, low: (decimal?)low, volume: volume));

        var day = Assert.Single(DailySummaryCalculator.Summarize(chart));

        Assert.Equal(10m, day.HighAverage);
        Assert.Equal(8m, day.LowAverage);
        Assert.Equal(100, day.Volume);
    }

    [Fact]
    public void Summarize_OmitsDayWithOnlyNullCandles()
    {
        var chart = Chart(NewYork,
            Bar("2026-09-28T14:00:00Z", high: 1m, low: 1m, volume: 1),
            Bar("2026-09-29T14:00:00Z", high: null, low: null, volume: null),
            Bar("2026-09-29T14:15:00Z", high: null, low: null, volume: null));

        Assert.Equal(new DateOnly(2026, 9, 28), Assert.Single(DailySummaryCalculator.Summarize(chart)).Day);
    }

    [Fact]
    public void Summarize_AllCandlesNull_ReturnsEmpty()
    {
        var chart = Chart(NewYork, Bar("2026-09-28T14:00:00Z", high: null, low: null, volume: null));

        Assert.Empty(DailySummaryCalculator.Summarize(chart));
    }

    [Fact]
    public void Summarize_ZeroVolumeCandle_IsIncluded()
    {
        // Yahoo reports volume 0 for the in-progress bar; it is valid data, not a gap.
        var chart = Chart(NewYork,
            Bar("2026-09-28T14:00:00Z", high: 10m, low: 10m, volume: 50),
            Bar("2026-09-28T14:15:00Z", high: 20m, low: 20m, volume: 0));

        var day = Assert.Single(DailySummaryCalculator.Summarize(chart));

        Assert.Equal(15m, day.HighAverage);
        Assert.Equal(50, day.Volume);
    }

    private static IntradayChart Chart(string timeZoneId, params Candle[] candles) =>
        new("TEST", timeZoneId, candles);

    private static Candle Bar(string utc, decimal? high, decimal? low, long? volume) =>
        new(DateTimeOffset.Parse(utc), high, low, volume);
}
