# Yahoo Stock Finder

Monorepo for the Yahoo Stock Finder project.

| Folder | What it is |
| --- | --- |
| [`backend/`](backend/) | ASP.NET Core API (`StockFinderAPI`) + tests |
| [`frontend/`](frontend/) | Vite + React + TypeScript client |

Both folders were merged in from the former `StockFinder-Backend` and
`StockFinder-Frontend` repositories with their full commit history.

## Running locally

```bash
# Backend
cd backend
dotnet run --project StockFinderAPI

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```
