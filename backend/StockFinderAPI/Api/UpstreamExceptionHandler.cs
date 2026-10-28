using System.Net;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Polly.CircuitBreaker;
using Polly.Timeout;

namespace StockFinderAPI.Api;

/// <summary>Maps market-data provider failures to problem details: 429 passthrough, 504 on timeout, 502 otherwise.</summary>
public sealed class UpstreamExceptionHandler(IProblemDetailsService problemDetails, ILogger<UpstreamExceptionHandler> logger)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var (status, title) = exception switch
        {
            HttpRequestException { StatusCode: HttpStatusCode.TooManyRequests } =>
                (StatusCodes.Status429TooManyRequests, "Market data provider is throttling requests"),
            TimeoutRejectedException =>
                (StatusCodes.Status504GatewayTimeout, "Market data provider timed out"),
            HttpRequestException or BrokenCircuitException or System.Text.Json.JsonException =>
                (StatusCodes.Status502BadGateway, "Market data provider failed"),
            _ => (0, "")
        };

        if (status == 0)
        {
            return false;
        }

        logger.LogWarning(exception, "Upstream market data request failed; returning {StatusCode}", status);

        httpContext.Response.StatusCode = status;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails = new ProblemDetails
            {
                Status = status,
                Title = title,
                Detail = "Please try again later.",
            },
        });
    }
}
