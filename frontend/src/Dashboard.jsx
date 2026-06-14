import { useState } from 'react';
import { Search, Loader2, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const [tickerInput, setTickerInput] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!tickerInput.trim()) return;

    // Harden: Split by space or comma, handling both behaviors naturally
    const tickers = tickerInput
      .split(/[\s,]+/)
      .map((t) => t.trim().toUpperCase())
      .filter((t) => t.length > 0);

    setTickerInput('');

    const seen = new Set();
    for (const t of tickers) {
      if (seen.has(t) || results.some((r) => r.ticker === t)) continue;
      fetchAnalysis(t);
      seen.add(t);
    }
  };

  const fetchAnalysis = async (ticker) => {
    setLoading((prev) => ({ ...prev, [ticker]: true }));
    setErrors((prev) => ({ ...prev, [ticker]: null }));

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker }),
      });

      const data = await response.json();

      let snapshot = null;
      if (data.decision_snapshot) {
        snapshot = data.decision_snapshot;
      } else if (data.signal) {
        snapshot = data;
      } else {
        snapshot = {
          ...data,
          signal: data.verdict || 'WAIT',
          reason: data.analysis || 'Data processed.',
        };
      }

      setResults((prev) => {
        const filtered = prev.filter((r) => r.ticker !== ticker);
        return [{ ticker, ...snapshot }, ...filtered];
      });
    } catch (err) {
      setErrors((prev) => ({ ...prev, [ticker]: 'Failed to fetch data' }));
      setResults((prev) => {
        const filtered = prev.filter((r) => r.ticker !== ticker);
        return [{ ticker, isError: true }, ...filtered];
      });
    }
    setLoading((prev) => ({ ...prev, [ticker]: false }));
  };

  const removeCard = (ticker) => {
    setResults((prev) => prev.filter((r) => r.ticker !== ticker));
    setErrors((prev) => ({ ...prev, [ticker]: null }));
  };

  const getBadgeVariant = (signal) => {
    if (!signal) return 'outline';
    const s = signal.toUpperCase();
    if (s.includes('BUY') || s.includes('ADD')) return 'success';
    if (s.includes('SELL') || s.includes('AVOID')) return 'destructive';
    return 'warning';
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-12 font-sans selection:bg-surface-hover">
      <header className="max-w-5xl mx-auto mb-10 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-status-success"></div>
            Market Oracle
          </h1>
          <span className="text-xs text-muted font-mono uppercase tracking-widest">v1.0.0</span>
        </div>
        <p className="text-sm text-muted">Real-time quantitative screening & decision snapshot.</p>
      </header>

      <main className="max-w-5xl mx-auto space-y-8">
        {/* Command Bar */}
        <form onSubmit={handleSearch} className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted group-focus-within:text-foreground transition-colors" />
          </div>
          <Input
            type="text"
            className="w-full bg-surface border-border focus-visible:ring-1 focus-visible:ring-border-hover pl-10 py-6 text-lg font-mono placeholder:text-muted placeholder:font-sans transition-all rounded-md"
            placeholder="Add ticker (e.g. NVDA AAPL) and press Enter..."
            value={tickerInput}
            onChange={(e) => setTickerInput(e.target.value)}
          />
          <div className="absolute inset-y-0 right-2 flex items-center">
            <Badge variant="outline" className="text-[10px] font-mono text-muted uppercase tracking-wider border-border hidden sm:flex">
              Enter
            </Badge>
          </div>
        </form>

        {/* Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.keys(loading).map(
            (t) =>
              loading[t] && (
                <Card key={`loading-${t}`} className="bg-surface border-border animate-pulse rounded-md">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <div className="h-6 w-16 bg-border rounded"></div>
                    <Loader2 className="h-4 w-4 text-muted animate-spin" />
                  </CardHeader>
                  {/* Polish: Made skeleton height naturally match the real card */}
                  <CardContent className="space-y-4">
                    <div className="h-10 w-24 bg-border rounded"></div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      <div className="h-8 w-full bg-border rounded"></div>
                      <div className="h-8 w-full bg-border rounded"></div>
                      <div className="h-8 w-full bg-border rounded"></div>
                      <div className="h-8 w-full bg-border rounded"></div>
                    </div>
                    <div className="pt-3 border-t border-border mt-4">
                      <div className="h-12 w-full bg-border rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              )
          )}

          {results.map((res) => {
            if (res.isError) {
              return (
                <Card key={res.ticker} className="bg-surface border-status-danger/30 rounded-md relative overflow-hidden group">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 text-muted opacity-50 hover:opacity-100 hover:text-foreground transition-opacity"
                    onClick={() => removeCard(res.ticker)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-bold tracking-tight text-status-danger">{res.ticker}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted">{errors[res.ticker] || 'Failed to retrieve signal.'}</p>
                  </CardContent>
                </Card>
              );
            }

            const signalClass = getBadgeVariant(res.signal);

            return (
              <Card
                key={res.ticker}
                className="bg-surface border-border hover:border-border-hover transition-colors rounded-md relative overflow-hidden group"
              >
                {/* Layout: Changed from opacity-0 group-hover:opacity-100 to opacity-50 hover:opacity-100 */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 text-muted opacity-50 hover:opacity-100 hover:text-foreground transition-opacity"
                  onClick={() => removeCard(res.ticker)}
                >
                  <X className="h-4 w-4" />
                </Button>

                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-xl font-bold tracking-tight">{res.ticker}</CardTitle>
                  <div
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${
                      signalClass === 'success'
                        ? 'bg-status-success-bg text-status-success border border-status-success/20'
                        : signalClass === 'destructive'
                          ? 'bg-status-danger-bg text-status-danger border border-status-danger/20'
                          : 'bg-status-warning-bg text-status-warning border border-status-warning/20'
                    }`}
                  >
                    {res.signal || 'WAIT'}
                  </div>
                </CardHeader>

                <CardContent className="pb-4">
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-3xl font-light font-mono">${res.last_price || res.price || '---'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
                    <div className="flex flex-col">
                      {/* Polish: Changed text-[10px] to text-xs */}
                      <span className="text-xs text-muted uppercase tracking-wider font-semibold">PEG Ratio</span>
                      <span className="text-sm font-mono text-foreground">{res.peg || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted uppercase tracking-wider font-semibold">50D MA</span>
                      <span className="text-sm font-mono text-foreground">{res.ma50 || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted uppercase tracking-wider font-semibold">ATR</span>
                      <span className="text-sm font-mono text-foreground">{res.atr || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted uppercase tracking-wider font-semibold">Stop Loss</span>
                      <span className="text-sm font-mono text-status-danger">{res.stop_loss || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted leading-relaxed line-clamp-3" title={res.reason}>
                      {res.reason}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {results.length === 0 && Object.keys(loading).length === 0 && (
            <div className="col-span-full py-16 flex items-center justify-center border border-dashed border-border rounded-md mt-4">
              <p className="text-sm text-muted">Enter a ticker to start analysis.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
