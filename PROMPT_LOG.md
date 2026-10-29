# Prompt Log

A running log of prompts sent to Claude while working on this project.
Each entry has the prompt exactly as it was sent, plus a **Notes** section for you to fill in.

<!-- New entries are appended below this line, oldest first. -->
---
**Prompt:** 

> Let's start by creating a PRD for this project to plan out implementation steps based on the project Take Home Assessment file's requirements. It has some options so I'd like to C# and the .NET Framework on the backend when creating the Rest API that will return the Stock data from the public API given a stock symbol. It should use React on the frontend to create a webpage to show users to show popular stocks and their trends on a graph, as well as a text box to submit a stock symbol and display it's data on a graph if it exists or display an error if not

**Notes:**
I always like to start by creating a Project Requirements Document (PRD) markdown file that will be used to track the scope of the project and give AI agents a target to aim towards. I just had to update some of the tech stack to use more recent versions of the .NET Framework and TypeScript, and update the APIs and what logic should be owned by the frontend or the backend. I iterated on it manually over time, including adding a future idea I had to include a heatmap graph on the page.

---
**Prompt:** 
> Reference the project PRD. Remove the Weather app template code and setup the initial http client to query the yahoo finance endpoint:
curl "https://query1.finance.yahoo.com/v8/finance/chart/TSLA?interval=15m" -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

**Notes:**
After I setup the ASP.NET project structure, I like to utilize AI to build off of that and take a first swing, removing unecessary files and impelementing the basic dependencies and files for the HTTP Client using the PRD requirements as a backbone. This was mostly correct but gets iterated on overtime as additional features were added.

---
**Prompt:**
> Implement the initial MapGet api route as defined in the PRD

**Notes:**
After I confirmed the intial http structure was sound, I wanted to quickly get the MapGet API for querying a single stock setup so I could test our the connection in Insomnia and map out the response body. I had to update the precision of the high and low stock values to match the requirements but everything else was correct.

---
**Prompt:**
> Reference the project PRD. Start creating the basic frontend components mentioned like the Dashboard of popular stocks, the search box to query the backend for a given stock, and the chart to show the trends of the returned stock

**Notes:**
Then, I repeated the pattern on the frontend, generating the intial layout for the page including the header section with the search box to query the stock endpoing, the Rechart graph to display a given stocks trends, and section displaying smaller graphs of popular stocks that can be clicked on to be displayed in the main graph. It got a good base in place, but I had to update some of the layouts, spacing, and stylings to align more closely with my vision. As describe more in the manual log, there was an additional aspect to the main stock chart that I removed to de-clutter the layout.

---
**Prompt:**
> I've updated the PRD document, implement the new popular stocks endpoint and update the frontend to utilize that endpoint when displaying that section

**Notes:**
I went back and forth a couple times on where the logic should live for determining where the popular stocks should be handled and decided to handle it on the backend. Thus the logic should be updated to hold a list of the stocks on the backend and simply query them in the frontend to get their details. It is important to note that at this point, these were static, but I later found the Yahoo endpoint to iterate on this and make it data-driven.

---
**Prompt:**
> Add an xUnit test project with unit tests for the class DailySummaryCalculator including edge cases like time zones, rounding, null candles, empty data, etc.

**Notes:**
This prompt was used to create a baseline test suite to cover the DailySummaryCalculator class. An essentail class used to organize and average out the data points by day and handle rounding the values as expected. I wanted to get this setup early to confirm the accuracy of this class and ensure it could handle various edge cases smootly.

---
**Prompt:**
> Ensure the vitest and react testing library are setup and implement a test suite to ensure the API responses are being correctly parsed, the stock data being averaged and rounded properly, correct logic is in place for querying stock symbols and handling errors, etc.

**Notes:**
Similarly to the backend, I wanted to get some vitest and react testing library suites setup to ensure data was being properly parse and modeled out for display purposes. These were very comprehensive and only small updates were needed over time as addition functionality was added. 

---
**Prompt:**
> In the main chart, the box around the bar item should always be centered around the bar item and the vertical focus line should always be aligned with it's respective point on the graph. Right now if you hover over the line graph, the bar chart gets misaligned and the reverse if you hover over the bar chart. Their focus points need to be normalized to correct this

**Notes:**
I wanted to come up with a way to align the center of the bar chart items with their respective points on the line graph. AI generated a solution, but it made it so lines ended before reaching the edges of their section of the graph. I didn't like this solutino so I iterated on it with the next prompt.

---
**Prompt:**
> Update the stock chart padding so the bar chart is slightly wider than the line chart, making it so the hover line can be aligned on both graphs with the lines going to the edges of it's graph

**Notes:**
I decided the best way to fix the graph issue would be to let the bounds of the bar chart be slightly wider than those of the line chart. Therefore, it would be obvious that the lines continue out of the scope of the chart, while still ensuring alignment between the volume bars and the line graph points. I liked the equation that AI was able to come up to determine the inset for each graph to ensure alignment: inset = bar / 2 + clearance, where bar = min(MAX_BAR_SIZE, BAR_FILL * (plotWidth - 2 * inset) / (days - 1))

---
**Prompt:**
> Update the popular stocks to show the total average for the current day, and have the hover point on the line dynamically update the amount and date depending on the line location

**Notes:**
Initialy, the cards for the popular stocks were created with a line graph, but just a static number showing todays average high for the stock. I wanted this to be a dynamic value that would show today's overall average, and change to show whichever day the user's curser hovered above on the line chart. And I utilized this solution to do so.

---
**Prompt:**
> Update the stock chart padding so the bar chart is slightly wider than the line chart, making it so the hover line can be aligned on both graphs with the lines going to the edges of it's graph

**Notes:**
I was working on optimizing the alignment of the two line and bar charts in the main stock graph and wanted to see what AI would come up with. It ended up finding an 

---
**Prompt:**
> Remove the tests in the frontend from the src folders and move them to an equivalent folder structure within the test. Then, confirm there is sufficient test coverage

**Notes:**
The initial frontend tests were generated inside the main src folder structure. I used this prompt to simply move the files over to a mirrored folder structure in the tests folder so the project would be more organized.

---
**Prompt:**
> Pull the README files into one centralized file and ensure the setup instructions are comprehensive for a user to run both the backend and frontend projects simultaneously

**Notes:**
I wanted to combine the README files that were living separately in the frontend and backend into one cohesive file that explains how someone can setup and run both projects, ensure they're on the right ports, and can test it out properly. I had to make some small adjustments but the bulk of the content was accurate.

---
**Prompt:**
> Utilize the most_active stocks query, get the top 8 by volume, and return a list of their symbols to the frontend

**Notes:**
I researched the Yahoo Stock API in more depth and found the `most_actives` query parameter as well as the `count` parameter to get the top stocks by trade volume. Then, I used AI to generate another API to expose this endpoint and query the current top 8 stocks by volume. This could then be utilized on the frontend to be displayed in the Trending Stocks section. Following the existing pattern this implementation was pretty smooth the first go around after ensuring the new options and service classes were setup properly.

---
**Prompt:**
> Review all code and tests now and ensure that they are properly formatted and syntactically sound. Then, ensure there is sufficient test coverage on both the frontend and backend and that everything is passing

**Notes:**
I like to have the agent do a final review to ensure I didn't miss anything between my static code analysis or manual testing of the code to ensure everything is sound and sufficiently tested. It helped to address a remaining edge test cases that I kept to further improve my test coverage.
