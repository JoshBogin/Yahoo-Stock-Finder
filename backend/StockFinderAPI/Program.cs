using StockFinderAPI.Api;
using StockFinderAPI.Infrastructure.Yahoo;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddOpenApi();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowVite", policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<UpstreamExceptionHandler>();

builder.Services.AddYahooFinanceClient();

// Register popular stocks options with the dependency injection container
builder.Services.AddOptions<PopularStocksOptions>()
    .BindConfiguration(PopularStocksOptions.SectionName)
    .ValidateDataAnnotations()
    .ValidateOnStart();
builder.Services.AddMemoryCache();
//
builder.Services.AddScoped<PopularSymbolsService>();

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("AllowVite");

app.MapStockEndpoints();

app.Run();
