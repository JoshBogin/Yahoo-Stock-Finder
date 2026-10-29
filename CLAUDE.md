# CLAUDE.md

Instructions for Claude when working in this repository.

## Required: log every prompt in PROMPT_LOG.md

Do this for **every** prompt the user sends, before starting any other work on it:

1. Open `PROMPT_LOG.md` at the repo root
2. Append a new entry at the **bottom** of the file, using exactly this format:

   ```markdown
   ---
   **Prompt:**
   > <the user's prompt, verbatim; prefix every line with "> ">

   **Notes:**
   _Add notes here._
   ```

3. Copy the prompt word for word. Don't summarize, fix typos or leave anything out.
4. Never edit or remove anything in an existing entry's **Notes** section. Those notes are the user's.
5. Don't log Claude's replies, only the user's prompts.
6. Logging doesn't replace the actual task. After the entry is added, carry out the prompt as usual.

## Repository layout

- `backend/`: ASP.NET Core API (`StockFinderAPI`) and its tests (`StockFinderAPI.Tests`)
- `frontend/`: Vite + React + TypeScript client
- `PROMPT_LOG.md`: the prompt log described above
