# Prompt Log

A running log of every prompt sent to Claude while working on this project.
Each entry has the prompt exactly as it was sent, plus a **Notes** section for you to fill in.

<!-- New entries are appended below this line, oldest first. -->
---
**Prompt:** 

> Let's start by creating a PRD for this project to plan out implementation steps based on the project Take Home Assessment file's requirements. It has some options so I'd like to C# and the .NET Framework on the backend when creating the Rest API that will return the Stock data from the public API given a stock symbol. It should use React on the frontend to create a webpage to show users to show popular stocks and their trends on a graph, as well as a text box to submit a stock symbol and display it's data on a graph if it exists or display an error if not

**Notes:**
I always like to start by creating a Project Requirements Document (PRD) markdown file that will be used to track the scope of the project and give AI agents a target to aim towards. I just had to update some of the tech stack to use more recent versions of the .NET Framework and TypeScript, and update the APIs and what logic should be owned by the frontend or the backend.

---
**Prompt:** 
> Reference the project PRD. Remove the Weather app template code and setup the initial http client to querry the yahoo finance endpoint:
curl "https://query1.finance.yahoo.com/v8/finance/chart/TSLA?interval=15m" -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

---
**Prompt:**
> Add the mapget api route as defined in the prd

---
**Prompt:**
> Reference the project PRD. Start creating the basic frontend components mentioned like the Dashboard of popular stocks, the search box to querry the backend for a given stock, and the chart to show the trends of the returned stock

---
**Prompt:**
> I've updated the PRD document, implement the new popular stocks endpoint and update the frontend to utilize that endpoint when displaying that section

**Notes:**

_Add notes here._

---
