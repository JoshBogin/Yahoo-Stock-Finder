import { Dashboard } from './components/Dashboard'
import { SearchBox } from './components/SearchBox'
import { StockDetail } from './components/StockDetail'
import { useSelectedSymbol } from './hooks/useSelectedSymbol'

function App() {
  const [symbol, setSymbol] = useSelectedSymbol()

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__brand">
          <h1>StockFinder</h1>
          <p>One month of stock trends, summarized by day</p>
        </div>
        <SearchBox onSearch={setSymbol} />
      </header>

      <main className="app-main">
        {symbol && <StockDetail key={symbol} symbol={symbol} onClose={() => setSymbol(null)} />}
        <Dashboard onSelect={setSymbol} />
      </main>
    </div>
  )
}

export default App
