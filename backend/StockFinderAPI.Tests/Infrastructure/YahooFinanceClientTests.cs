using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using StockFinderAPI.Core;
using StockFinderAPI.Infrastructure.Yahoo;

namespace StockFinderAPI.Tests.Infrastructure;

public class YahooFinanceClientTests
{
    // Trimmed from a real /v8/finance/chart response; the second bar is a halt (nulls).
    private const string ChartJson = """
        {
          "chart": {
            "result": [{
              "meta": { "symbol": "TSLA", "currency": "USD", "exchangeName": "NMS",
                        "exchangeTimezoneName": "America/New_York", "instrumentType": "EQUITY" },
              "timestamp": [1790604000, 1790604900],
              "indicators": { "quote": [{
                "open":   [369.1, null],
                "high":   [369.4200134277344, null],
                "low":    [368.0, null],
                "close":  [369.0, null],
                "volume": [1250000, null]
              }] }
            }],
            "error": null
          }
        }
        """;

    [Fact]
    public async Task GetIntradayChart_RequestsTheConfiguredRangeAndIntervalWithAnEscapedSymbol()
    {
        var handler = new StubHandler(_ => Json(ChartJson));

        await Client(handler).GetIntradayChartAsync("^GSPC");

        Assert.Equal(
            "https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?range=1mo&interval=15m",
            handler.Requests.Single().RequestUri!.AbsoluteUri);
    }

    [Fact]
    public async Task GetIntradayChart_MapsCandlesAndExchangeTimeZone_KeepingNullsForHalts()
    {
        var chart = await Client(new StubHandler(_ => Json(ChartJson))).GetIntradayChartAsync("TSLA");

        Assert.NotNull(chart);
        Assert.Equal("TSLA", chart.Symbol);
        Assert.Equal("America/New_York", chart.ExchangeTimeZoneId);
        Assert.Equal(
            [
                new Candle(DateTimeOffset.FromUnixTimeSeconds(1790604000), 369.4200134277344m, 368.0m, 1_250_000),
                new Candle(DateTimeOffset.FromUnixTimeSeconds(1790604900), null, null, null),
            ],
            chart.Candles);
    }

    [Fact]
    public async Task GetIntradayChart_ShortQuoteArrays_TreatMissingValuesAsNull()
    {
        const string json = """
            { "chart": { "result": [{
              "meta": { "symbol": "TSLA", "exchangeTimezoneName": "America/New_York" },
              "timestamp": [1790604000, 1790604900],
              "indicators": { "quote": [{ "high": [10.5], "low": [9.5], "volume": [100] }] }
            }] } }
            """;

        var chart = await Client(new StubHandler(_ => Json(json))).GetIntradayChartAsync("TSLA");

        Assert.NotNull(chart);
        Assert.Equal(new Candle(DateTimeOffset.FromUnixTimeSeconds(1790604900), null, null, null), chart.Candles[1]);
    }

    [Fact]
    public async Task GetIntradayChart_NoQuoteSeries_KeepsTheTimestampsWithNullValues()
    {
        const string json = """
            { "chart": { "result": [{
              "meta": { "symbol": "TSLA", "exchangeTimezoneName": "America/New_York" },
              "timestamp": [1790604000],
              "indicators": { "quote": [] }
            }] } }
            """;

        var chart = await Client(new StubHandler(_ => Json(json))).GetIntradayChartAsync("TSLA");

        Assert.NotNull(chart);
        Assert.Equal([new Candle(DateTimeOffset.FromUnixTimeSeconds(1790604000), null, null, null)], chart.Candles);
    }

    [Fact]
    public async Task GetIntradayChart_NoTimestamps_ReturnsAChartWithNoCandles()
    {
        const string json = """
            { "chart": { "result": [{
              "meta": { "symbol": "TSLA", "exchangeTimezoneName": "America/New_York" },
              "indicators": { "quote": [{}] }
            }] } }
            """;

        var chart = await Client(new StubHandler(_ => Json(json))).GetIntradayChartAsync("TSLA");

        Assert.NotNull(chart);
        Assert.Empty(chart.Candles);
    }

    [Fact]
    public async Task GetIntradayChart_UnknownSymbol_ReturnsNull()
    {
        const string json = """{ "chart": { "result": null, "error": { "code": "Not Found", "description": "No data found, symbol may be delisted" } } }""";

        var chart = await Client(new StubHandler(_ => Json(json, HttpStatusCode.NotFound))).GetIntradayChartAsync("ZZZZ");

        Assert.Null(chart);
    }

    [Fact]
    public async Task GetIntradayChart_SuccessWithEmptyResult_ReturnsNull()
    {
        var chart = await Client(new StubHandler(_ => Json("""{ "chart": { "result": [] } }"""))).GetIntradayChartAsync("TSLA");

        Assert.Null(chart);
    }

    [Theory]
    [InlineData(HttpStatusCode.TooManyRequests)]
    [InlineData(HttpStatusCode.InternalServerError)]
    [InlineData(HttpStatusCode.Unauthorized)]
    public async Task GetIntradayChart_OtherFailures_ThrowWithTheUpstreamStatus(HttpStatusCode status)
    {
        var client = Client(new StubHandler(_ => new HttpResponseMessage(status)));

        var error = await Assert.ThrowsAsync<HttpRequestException>(() => client.GetIntradayChartAsync("TSLA"));

        Assert.Equal(status, error.StatusCode);
    }

    [Fact]
    public async Task GetIntradayChart_MalformedJson_Throws()
    {
        var client = Client(new StubHandler(_ => Json("<html>oops</html>")));

        await Assert.ThrowsAnyAsync<JsonException>(() => client.GetIntradayChartAsync("TSLA"));
    }

    [Fact]
    public async Task AddYahooFinanceClient_SendsABrowserUserAgentToTheConfiguredHost()
    {
        var handler = new StubHandler(_ => Json(ChartJson));
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["YahooFinance:BaseAddress"] = "https://yahoo.test/",
                ["YahooFinance:UserAgent"] = "Mozilla/5.0 (Test)",
            })
            .Build();
        var services = new ServiceCollection()
            .AddSingleton<IConfiguration>(configuration)
            .AddLogging()
            .AddYahooFinanceClient();
        services.ConfigureHttpClientDefaults(http => http.ConfigurePrimaryHttpMessageHandler(() => handler));

        await using var provider = services.BuildServiceProvider();
        await provider.GetRequiredService<IMarketDataProvider>().GetIntradayChartAsync("TSLA");

        var request = handler.Requests.Single();
        Assert.StartsWith("https://yahoo.test/v8/finance/chart/TSLA", request.RequestUri!.AbsoluteUri);
        Assert.Equal("Mozilla/5.0 (Test)", request.Headers.UserAgent.ToString());
    }

    [Fact]
    public async Task GetMostActiveSymbols_RequestsTheMostActivesScreenerForTheCount()
    {
        var handler = new StubHandler(_ => Json("""{ "finance": { "result": [{ "quotes": [] }] } }"""));

        await Client(handler).GetMostActiveSymbolsAsync(8);

        Assert.Equal(
            "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=most_actives&count=8",
            handler.Requests.Single().RequestUri!.AbsoluteUri);
    }

    [Fact]
    public async Task GetMostActiveSymbols_KeepsYahoosOrder_SkippingBlankSymbols()
    {
        const string json = """
            { "finance": { "result": [{ "id": "most_actives", "quotes": [
              { "symbol": "NVDA", "regularMarketVolume": 210000000 },
              { "symbol": "",     "regularMarketVolume": 150000000 },
              { "symbol": "TSLA", "regularMarketVolume": 120000000 },
              { "regularMarketVolume": 100000000 },
              { "symbol": "F",    "regularMarketVolume": 90000000 }
            ] }], "error": null } }
            """;

        var symbols = await Client(new StubHandler(_ => Json(json))).GetMostActiveSymbolsAsync(5);

        Assert.Equal(["NVDA", "TSLA", "F"], symbols);
    }

    [Theory]
    [InlineData("""{ "finance": { "result": [] } }""")]
    [InlineData("""{ "finance": { "result": [{ "quotes": null }] } }""")]
    [InlineData("""{ "finance": null }""")]
    public async Task GetMostActiveSymbols_NoQuotes_ReturnsEmpty(string json)
    {
        var symbols = await Client(new StubHandler(_ => Json(json))).GetMostActiveSymbolsAsync(8);

        Assert.Empty(symbols);
    }

    [Theory]
    [InlineData(HttpStatusCode.TooManyRequests)]
    [InlineData(HttpStatusCode.Unauthorized)]
    public async Task GetMostActiveSymbols_Failure_ThrowsWithTheUpstreamStatus(HttpStatusCode status)
    {
        var client = Client(new StubHandler(_ => new HttpResponseMessage(status)));

        var error = await Assert.ThrowsAsync<HttpRequestException>(() => client.GetMostActiveSymbolsAsync(8));

        Assert.Equal(status, error.StatusCode);
    }

    private static YahooFinanceClient Client(StubHandler handler) =>
        new(new HttpClient(handler) { BaseAddress = new Uri("https://query1.finance.yahoo.com/") },
            Options.Create(new YahooFinanceOptions()));

    private static HttpResponseMessage Json(string body, HttpStatusCode status = HttpStatusCode.OK) =>
        new(status) { Content = new StringContent(body, Encoding.UTF8, "application/json") };

    private sealed class StubHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        public List<HttpRequestMessage> Requests { get; } = [];

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Requests.Add(request);
            return Task.FromResult(respond(request));
        }
    }
}
