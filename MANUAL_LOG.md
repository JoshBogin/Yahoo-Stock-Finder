## Manual Change Log

### Initial Setup and Documentation
- My first manual steps usually include setting up my environment for both projects. I implemented the basic structure and dependencies for both the React frontend app using Vite, and the ASP.NET Web API backend app.
- Reviewed and updated PRD after initial generation to ensure requirements were accurate including dependency versioning, numeric adjustments for various specifications, and overall feature corrections. Then, I kept it up-to-date throughout the process to ensure parity between requirements and implementations.

### Frontend updates
- Replaced stock chart close button with an X close button instead. This included drawing centered lines in the middle of a circle to ensure alignment. I also wanted to comply with frontend best practices, including relying universally understood shapes for action buttons in appose to only language specific text.
- Deleted a table that showed a more detailed breakdown of a stocks trends. I just wanted it to show the visual chart of daily trends for a given stock and not have the big wall of numbers that would be hard for a user to easily process.
- I had to adjust some of the padding constants and sizing ratios involed in the bar and line chart alignments to make it better able to handle various data sizes and overall more aethetically pleasing.
- I updated numerous CSS values, especially by defining specific brand colors like the main teal accent color which would be used for the title, search button, and lines in both the large and small charts. It would have to be tweaked for accessibility reasons as well to maintain the standard 4.5:1 ratio
- I utilized the existing trending stocks layout and charts to create the additional section for the Market Indexes. This included adding the names for these stocks to be more intuitive, since they are very different from the well-known index names. If the name exists then the label will be the name, and the stock symbox will show up smaller next too it. But none market indexes will continue as usual with just the symbol being displayed
