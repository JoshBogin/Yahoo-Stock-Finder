using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;
using StockFinderAPI.Core;

namespace StockFinderAPI.Infrastructure.Yahoo;

public static class YahooFinanceServiceCollectionExtensions
{
    /// <summary>Registers <see cref="YahooFinanceClient"/> as the <see cref="IMarketDataProvider"/>, with its options and the standard resilience pipeline (timeout, retry, circuit breaker).</summary>
    public static IServiceCollection AddYahooFinanceClient(this IServiceCollection services)
    {
        services.AddOptions<YahooFinanceOptions>()
            .BindConfiguration(YahooFinanceOptions.SectionName)
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddHttpClient<IMarketDataProvider, YahooFinanceClient>((sp, client) =>
            {
                var options = sp.GetRequiredService<IOptions<YahooFinanceOptions>>().Value;
                client.BaseAddress = new Uri(options.BaseAddress);
                client.DefaultRequestHeaders.TryAddWithoutValidation(HeaderNames.UserAgent, options.UserAgent);
                client.DefaultRequestHeaders.Accept.ParseAdd("application/json");
            })
            .AddStandardResilienceHandler();

        return services;
    }
}
