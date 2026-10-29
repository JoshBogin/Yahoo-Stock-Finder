using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using StockFinderAPI.Api;
using StockFinderAPI.Core;

namespace StockFinderAPI.Tests.Api;

/// <summary>
/// Runs the real API pipeline in memory (routing, validation, error mapping, JSON) with Yahoo replaced
/// by <see cref="FakeMarketDataProvider"/>, so tests never touch the network.
/// </summary>
public sealed class StockApiFactory(string environment = "Production") : WebApplicationFactory<Program>
{
    public FakeMarketDataProvider MarketData { get; } = new();

    /// <summary>Overrides the configured fallback list; null keeps appsettings.json.</summary>
    public string[]? FallbackSymbols { get; init; }

    /// <summary>Overrides the configured most-active count; null keeps appsettings.json.</summary>
    public int? PopularCount { get; init; }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(environment);
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IMarketDataProvider>();
            services.AddSingleton<IMarketDataProvider>(MarketData);

            // PostConfigure replaces the bound array instead of merging with appsettings by index.
            services.PostConfigure<PopularStocksOptions>(options =>
            {
                if (FallbackSymbols is { } symbols) options.FallbackSymbols = symbols;
                if (PopularCount is { } count) options.Count = count;
            });
        });
    }
}

/// <summary>Records what it was asked for and answers with <see cref="Respond"/> and <see cref="RespondMostActive"/>.</summary>
public sealed class FakeMarketDataProvider : IMarketDataProvider
{
    public List<string> RequestedSymbols { get; } = [];

    public List<int> RequestedMostActiveCounts { get; } = [];

    public Func<string, IntradayChart?> Respond { get; set; } = _ => null;

    public Func<int, IReadOnlyList<string>> RespondMostActive { get; set; } = _ => [];

    public Task<IntradayChart?> GetIntradayChartAsync(string symbol, CancellationToken cancellationToken = default)
    {
        RequestedSymbols.Add(symbol);
        return Task.FromResult(Respond(symbol));
    }

    public Task<IReadOnlyList<string>> GetMostActiveSymbolsAsync(int count, CancellationToken cancellationToken = default)
    {
        RequestedMostActiveCounts.Add(count);
        return Task.FromResult(RespondMostActive(count));
    }
}
