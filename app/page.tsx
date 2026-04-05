'use client';

import { useState, useEffect } from 'react';

interface Highlight {
  id: string;
  source: string;
  title: string;
  url: string;
  time: string;
  timestamp: number;
}

export default function SportsHighlights() {
  const [mode, setMode] = useState('ALL');
  const [lookback, setLookback] = useState('24'); // Removed 'h' to make validation easier
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false); // New state to prevent auto-load

  const isLookbackInvalid = lookback.trim() === '';

  const fetchHighlights = async () => {
    if (isLookbackInvalid) return; // Prevent empty searches
    
    setLoading(true);
    setError(null);
    setHasSearched(true);
    
    try {
      // Appending 'h' here so the user doesn't have to type it
      const res = await fetch(`/api/highlights?mode=${mode}&past-lookback=${lookback}h`);
      if (!res.ok) throw new Error('Failed to fetch highlights');
      const data = await res.json();
      setHighlights(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Empty dependency array = only runs ONCE on mount (optional)
  // Or remove entirely if you want it blank until the first click
  useEffect(() => {
    // fetchHighlights(); // Commented out to prevent auto-run on load
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-slate-300 p-4 md:p-12 font-sans selection:bg-slate-800">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <header className="mb-12 border-b border-slate-900 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tighter text-slate-100 uppercase">
              Spoiler-Free <span className="text-slate-500 font-light">Archive</span>
            </h1>
            <p className="text-slate-500 text-xs mt-1 font-medium tracking-wide">
              NBC • ESPN • CBS 
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select 
              value={mode} 
              onChange={(e) => setMode(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-400 rounded-sm px-3 py-1.5 text-xs focus:border-slate-500 outline-none transition-colors cursor-pointer"
            >
              <option value="ALL">All Sources</option>
              <option value="NBC">NBC (EPL)</option>
              <option value="ESPN">ESPN (La Liga, English Cups, Copa)</option>
              <option value="CBS">CBS (UEFA CL, Serie A)</option>
            </select>

            <div className="relative flex items-center group">
              <input 
                type="text"
                placeholder="24"
                value={lookback} 
                onChange={(e) => setLookback(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchHighlights()}
                className={`w-16 bg-slate-950 border ${isLookbackInvalid ? 'border-red-900' : 'border-slate-800'} text-slate-100 rounded-sm pl-2 pr-5 py-1.5 text-xs focus:border-slate-500 outline-none transition-colors font-mono`}
              />
              <span className={`absolute right-1.5 text-[10px] ${isLookbackInvalid ? 'text-red-900' : 'text-slate-600'} group-focus-within:text-slate-400 font-bold`}>
                h
              </span>
            </div>
            
            <button 
              onClick={fetchHighlights}
              disabled={loading || isLookbackInvalid}
              className="bg-slate-100 hover:bg-white text-black disabled:opacity-20 transition-all rounded-sm px-4 py-1.5 text-xs font-bold uppercase tracking-tight"
            >
              {loading ? '...' : hasSearched ? 'Refresh' : 'Search'}
            </button>
          </div>
        </header>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-950/20 border border-red-900/50 text-red-400 p-3 text-xs rounded-sm mb-8">
            {error}
          </div>
        )}

        {/* Results List */}
        <div className="space-y-1">
          {!hasSearched ? (
            <div className="text-center py-32 text-slate-800 text-[10px] font-bold uppercase tracking-[0.4em] opacity-50">
              Select source and timeframe to begin
            </div>
          ) : loading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-900/30 animate-pulse rounded-sm border border-slate-900/50 mb-1" />
            ))
          ) : highlights.length > 0 ? (
            highlights.map((video) => (
              <a 
                key={video.id} 
                href={video.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="group flex items-center justify-between p-4 bg-transparent border-b border-slate-900 hover:bg-slate-900/40 transition-all"
              >
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-slate-300 group-hover:text-slate-100 transition-colors">
                    {video.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[9px] font-black uppercase tracking-tighter text-slate-600 group-hover:text-slate-400">
                      {video.source}
                    </span>
                    <span className="text-[10px] text-slate-700">•</span>
                    <span className="text-[10px] text-slate-600 font-mono tracking-tighter uppercase">{video.time}</span>
                  </div>
                </div>
                
                <div className="text-slate-800 group-hover:text-slate-400 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </div>
              </a>
            ))
          ) : (
            <div className="text-center py-32 text-slate-700 text-xs font-medium uppercase tracking-[0.2em]">
              Zero matches found.
            </div>
          )}
        </div>

        <footer className="mt-24 text-center border-t border-slate-900 pt-8">
          <p className="text-slate-800 text-[9px] font-bold uppercase tracking-[0.3em]">
            tonystarkjr3 • binary fetch via yt-dlp
          </p>
        </footer>
      </div>
    </main>
  );
}