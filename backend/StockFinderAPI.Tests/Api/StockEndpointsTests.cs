using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Polly.CircuitBreaker;
using Polly.Timeout;
using StockFinderAPI.Core;

namespace StockFinderAPI.Tests.Api;

public class StockEndpointsTests
{
    private const string NewYork = "America/New_York";

    [Fact]
    public async Task DailySummary_ValidSymbol_ReturnsTheAssessmentJsonShapeAndPrecision()
    {
        using var factory = new StockApiFactory();
        factory.MarketData.Respond = symbol => Chart(symbol,
            new Candle(DateTimeOffset.Parse("2026-09-28T14:00:00Z"), High: 49.7534m, Low: 40.2958m, Volume: 49_073_348));

        var response = await factory.CreateClient().GetAsync("/api/stocks/TSLA/daily-summary");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(
            """[{"day":"2026-09-28","lowAverage":40.2958,"highAverage":49.7534,"volume":49073348}]""",
            await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task DailySummary_ReturnsOneEntryPerTradingDayOldestFirst()
    {
        using var factory = new StockApiFactory();
        factory.MarketData.Respond = symbol => Chart(symbol,
            new Candle(DateTimeOffset.Parse("2026-09-29T14:00:00Z"), 12m, 10m, 200),
            new Candle(DateTimeOffset.Parse("2026-09-28T14:00:00Z"), 11m, 9m, 100),
            new Candle(DateTimeOffset.Parse("2026-09-28T14:15:00Z"), 13m, 11m, 300));

        var days = await factory.CreateClient().GetFromJsonAsync<JsonElement[]>("/api/stocks/TSLA/daily-summary");

        Assert.NotNull(days);
        Assert.Equal(["2026-09-28", "2026-09-29"], days.Select(d => d.GetProperty("day").GetString()));
        Assert.Equal(400, days[0].GetProperty("volume").GetInt64());
    }

    [Theory]
    [InlineData("tsla", "TSLA")]
    [InlineData("%20brk-b%20", "BRK-B")]
    [InlineData("%5Egspc", "^GSPC")]
    [InlineData("es=f", "ES=F")]
    [InlineData("shop.to", "SHOP.TO")]
    public async Task DailySummary_NormalizesTheSymbolBeforeQueryingTheProvider(string path, string expected)
    {
        using var factory = new StockApiFactory();

        await factory.CreateClient().GetAsync($"/api/stocks/{path}/daily-summary");

        Assert.Equal([expected], factory.MarketData.RequestedSymbols);
    }

    [Theory]
    [InlineData("TS$LA")]
    [InlineData("AA%20PL")]
    [InlineData("MSFT%3Fx%3D1")]
    [InlineData("ABCDEFGHIJKLMNOP")]
    [InlineData("%20%20")]
    public async Task DailySummary_InvalidSymbol_Returns400WithoutCallingTheProvider(string path)
    {
        using var factory = new StockApiFactory();

        var response = await factory.CreateClient().GetAsync($"/api/stocks/{path}/daily-summary");

        var problem = await AssertProblem(response, HttpStatusCode.BadRequest);
        Assert.Equal("Invalid symbol", problem.Title);
        Assert.Empty(factory.MarketData.RequestedSymbols);
    }

    [Fact]
    public async Task DailySummary_UnknownSymbol_Returns404()
    {
        using var factory = new StockApiFactory();
        factory.MarketData.Respond = _ => null;

        var response = await factory.CreateClient().GetAsync("/api/stocks/ZZZZ/daily-summary");

        var problem = await AssertProblem(response, HttpStatusCode.NotFound);
        Assert.Equal("Symbol not found", problem.Title);
        Assert.Contains("ZZZZ", problem.Detail);
    }

    [Fact]
    public async Task DailySummary_SymbolWithNoUsableCandles_Returns404()
    {
        using var factory = new StockApiFactory();
        factory.MarketData.Respond = symbol => Chart(symbol,
            new Candle(DateTimeOffset.Parse("2026-09-28T14:00:00Z"), High: null, Low: null, Volume: null));

        var response = await factory.CreateClient().GetAsync("/api/stocks/TSLA/daily-summary");

        await AssertProblem(response, HttpStatusCode.NotFound);
    }

    public static TheoryData<string, int> UpstreamFailures => new()
    {
        { "throttled", StatusCodes.Status429TooManyRequests },
        { "timeout", StatusCodes.Status504GatewayTimeout },
        { "server error", StatusCodes.Status502BadGateway },
        { "circuit open", StatusCodes.Status502BadGateway },
        { "bad json", StatusCodes.Status502BadGateway },
    };

    [Theory]
    [MemberData(nameof(UpstreamFailures))]
    public async Task DailySummary_UpstreamFailure_MapsToProblemDetails(string failure, int expectedStatus)
    {
        using var factory = new StockApiFactory();
        factory.MarketData.Respond = _ => throw failure switch
        {
            "throttled" => new HttpRequestException("429", null, HttpStatusCode.TooManyRequests),
            "timeout" => new TimeoutRejectedException(),
            "server error" => new HttpRequestException("500", null, HttpStatusCode.InternalServerError),
            "circuit open" => new BrokenCircuitException(),
            "bad json" => new JsonException("unexpected token"),
            _ => throw new ArgumentOutOfRangeException(nameof(failure)),
        };

        var response = await factory.CreateClient().GetAsync("/api/stocks/TSLA/daily-summary");

        var problem = await AssertProblem(response, (HttpStatusCode)expectedStatus);
        Assert.Equal("Please try again later.", problem.Detail);
    }

    [Fact]
    public async Task DailySummary_UnexpectedError_Returns500WithoutLeakingDetails()
    {
        using var factory = new StockApiFactory();
        factory.MarketData.Respond = _ => throw new InvalidOperationException("secret connection string");

        var response = await factory.CreateClient().GetAsync("/api/stocks/TSLA/daily-summary");

        await AssertProblem(response, HttpStatusCode.InternalServerError);
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("secret connection string", body);
        Assert.DoesNotContain("InvalidOperationException", body);
    }

    [Fact]
    public async Task Popular_ReturnsTheMostActiveSymbolsFromTheProvider()
    {
        using var factory = new StockApiFactory();
        factory.MarketData.RespondMostActive = _ => ["NVDA", "F", "TSLA"];

        var symbols = await factory.CreateClient().GetFromJsonAsync<string[]>("/api/stocks/popular");

        Assert.NotNull(symbols);
        Assert.Equal(["NVDA", "F", "TSLA"], symbols);
    }

    [Fact]
    public async Task Popular_AsksForTheTopEightByDefault()
    {
        using var factory = new StockApiFactory();
        factory.MarketData.RespondMostActive = _ => ["NVDA"];

        await factory.CreateClient().GetAsync("/api/stocks/popular");

        Assert.Equal([8], factory.MarketData.RequestedMostActiveCounts);
    }

    [Fact]
    public async Task Popular_AsksForTheConfiguredCount()
    {
        using var factory = new StockApiFactory { PopularCount = 3 };
        factory.MarketData.RespondMostActive = _ => ["NVDA"];

        await factory.CreateClient().GetAsync("/api/stocks/popular");

        Assert.Equal([3], factory.MarketData.RequestedMostActiveCounts);
    }

    [Fact]
    public async Task Popular_CachesTheMostActiveList()
    {
        using var factory = new StockApiFactory();
        factory.MarketData.RespondMostActive = _ => ["NVDA"];
        var client = factory.CreateClient();

        await client.GetAsync("/api/stocks/popular");
        var second = await client.GetFromJsonAsync<string[]>("/api/stocks/popular");

        Assert.NotNull(second);
        Assert.Equal(["NVDA"], second);
        Assert.Single(factory.MarketData.RequestedMostActiveCounts);
    }

    public static TheoryData<string> ScreenerFailures => ["throttled", "server error", "circuit open", "bad json", "empty"];

    [Theory]
    [MemberData(nameof(ScreenerFailures))]
    public async Task Popular_ScreenerFailsOrIsEmpty_ReturnsTheFallbackList(string failure)
    {
        using var factory = new StockApiFactory { FallbackSymbols = ["AMD", "F"] };
        factory.MarketData.RespondMostActive = _ => failure switch
        {
            "throttled" => throw new HttpRequestException("429", null, HttpStatusCode.TooManyRequests),
            "server error" => throw new HttpRequestException("500", null, HttpStatusCode.InternalServerError),
            "circuit open" => throw new BrokenCircuitException(),
            "bad json" => throw new JsonException("unexpected token"),
            "empty" => [],
            _ => throw new ArgumentOutOfRangeException(nameof(failure)),
        };

        var response = await factory.CreateClient().GetAsync("/api/stocks/popular");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var symbols = await response.Content.ReadFromJsonAsync<string[]>();
        Assert.NotNull(symbols);
        Assert.Equal(["AMD", "F"], symbols);
    }

    [Fact]
    public async Task Popular_DefaultFallbackList_HasEightSymbols()
    {
        using var factory = new StockApiFactory();
        factory.MarketData.RespondMostActive = _ => throw new HttpRequestException("down");

        var symbols = await factory.CreateClient().GetFromJsonAsync<string[]>("/api/stocks/popular");

        Assert.NotNull(symbols);
        Assert.Equal(8, symbols.Length);
    }

    [Fact]
    public void Startup_FailsFastWhenNoFallbackSymbolsAreConfigured()
    {
        using var factory = new StockApiFactory { FallbackSymbols = [] };

        Assert.Throws<OptionsValidationException>(() => factory.CreateClient());
    }

    [Theory]
    [InlineData(0)]
    [InlineData(26)]
    public void Startup_FailsFastWhenTheCountIsOutOfRange(int count)
    {
        using var factory = new StockApiFactory { PopularCount = count };

        Assert.Throws<OptionsValidationException>(() => factory.CreateClient());
    }

    [Theory]
    [InlineData("Development", HttpStatusCode.OK)]
    [InlineData("Production", HttpStatusCode.NotFound)]
    public async Task OpenApiDocument_IsOnlyServedInDevelopment(string environment, HttpStatusCode expected)
    {
        using var factory = new StockApiFactory(environment);

        var response = await factory.CreateClient().GetAsync("/openapi/v1.json");

        Assert.Equal(expected, response.StatusCode);
        if (expected == HttpStatusCode.OK)
        {
            Assert.Contains("/api/stocks/{symbol}/daily-summary", await response.Content.ReadAsStringAsync());
        }
    }

    private static IntradayChart Chart(string symbol, params Candle[] candles) => new(symbol, NewYork, candles);

    private static async Task<ProblemDetails> AssertProblem(HttpResponseMessage response, HttpStatusCode status)
    {
        Assert.Equal(status, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.NotNull(problem);
        Assert.Equal((int)status, problem.Status);
        return problem;
    }
}
