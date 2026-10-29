using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http.HttpResults;
using StockFinderAPI.Core;

namespace StockFinderAPI.Api;

public static partial class StockEndpoints
{
    public static IEndpointRouteBuilder MapStockEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/stocks").WithTags("Stocks");

        group.MapGet("/{symbol}/daily-summary", GetDailySummary)
            .WithName("GetDailySummary")
            .WithSummary("Daily low/high averages and total volume for the last month of 15-minute data.")
            .ProducesProblem(StatusCodes.Status429TooManyRequests)
            .ProducesProblem(StatusCodes.Status502BadGateway)
            .ProducesProblem(StatusCodes.Status504GatewayTimeout);

        group.MapGet("/popular", GetPopularSymbols)
            .WithName("GetPopularSymbols")
            .WithSummary("Today's most actively traded stocks by volume, or the configured fallback list if Yahoo is unavailable.");

        return app;
    }

    private static async Task<Ok<IReadOnlyList<string>>> GetPopularSymbols(
        PopularSymbolsService popular, CancellationToken cancellationToken) =>
        TypedResults.Ok(await popular.GetAsync(cancellationToken));

    private static async Task<Results<Ok<IReadOnlyList<DailySummary>>, ProblemHttpResult>> GetDailySummary(
        string symbol, IMarketDataProvider marketData, CancellationToken cancellationToken)
    {
        var normalized = symbol.Trim().ToUpperInvariant();
        if (!SymbolPattern().IsMatch(normalized))
        {
            return TypedResults.Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid symbol",
                detail: "Symbols are 1-15 characters: letters, digits, '.', '-', '^' or '='.");
        }

        var chart = await marketData.GetIntradayChartAsync(normalized, cancellationToken);
        var summaries = chart is null ? [] : DailySummaryCalculator.Summarize(chart);

        if (summaries.Count == 0)
        {
            return TypedResults.Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "Symbol not found",
                detail: $"No data was found for '{normalized}'. Try another stock symbol.");
        }

        return TypedResults.Ok(summaries);
    }

    // Covers equities (TSLA), share classes (BRK-B), foreign listings (SHOP.TO), indexes (^GSPC) and futures/FX (ES=F).
    [GeneratedRegex(@"^[A-Z0-9.\-\^=]{1,15}$")]
    private static partial Regex SymbolPattern();
}
