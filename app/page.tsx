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

// Helper to extract YouTube Video ID for the secure iframe embed
function getYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export default function SportsHighlights() {
  const [mode, setMode] = useState('FOX');
  const [lookback, setLookback] = useState('24'); 
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false); 
  
  // Track which video is currently expanded for inline playback
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const isLookbackInvalid = lookback.trim() === '';

  const fetchHighlights = async () => {
    if (isLookbackInvalid) return; 
    
    setLoading(true);
    setError(null);
    setHasSearched(true);
    setActiveVideoId(null); // Reset player on new search
    
    try {
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

  useEffect(() => {
    // fetchHighlights(); 
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
            <p className="text-slate-500 text-[10px] mt-1 font-bold uppercase tracking-widest">
              FOX • NBC • ESPN • CBS 
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select 
              value={mode} 
              onChange={(e) => setMode(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-400 rounded-sm px-3 py-1.5 text-xs focus:border-slate-500 outline-none transition-colors cursor-pointer max-w-[220px] sm:max-w-none"
            >
              <option value="ALL">All Sources</option>
              <option value="FOX">FOX (World Cup Extended)</option>
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
            highlights.map((video) => {
              const isExpanded = activeVideoId === video.id;
              const ytId = getYouTubeId(video.url);

              return (
                <div 
                  key={video.id}
                  className="border-b border-slate-900 bg-transparent transition-all"
                >
                  {/* Row Trigger */}
                  <button 
                    onClick={() => setActiveVideoId(isExpanded ? null : video.id)}
                    className={`w-full text-left flex items-center justify-between p-4 hover:bg-slate-900/40 transition-all outline-none ${isExpanded ? 'bg-slate-900/20' : ''}`}
                  >
                    <div className="flex-1">
                      <h3 className={`text-sm font-medium transition-colors ${isExpanded ? 'text-slate-100' : 'text-slate-300'}`}>
                        {video.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] font-black uppercase tracking-tighter text-slate-600">
                          {video.source}
                        </span>
                        <span className="text-[10px] text-slate-700">•</span>
                        <span className="text-[10px] text-slate-600 font-mono tracking-tighter uppercase">{video.time}</span>
                      </div>
                    </div>
                    
                    {/* Icon updates based on open/closed state */}
                    <div className={`${isExpanded ? 'text-slate-400 rotate-90' : 'text-slate-800'} transition-transform duration-200 ml-4`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                    </div>
                  </button>

                  {/* Inline Video Player Dropdown */}
                  {isExpanded && (
                    <div className="px-4 pb-4 bg-slate-950/40 animate-fadeIn">
                      {ytId ? (
                        <div className="relative w-full aspect-video rounded-sm overflow-hidden border border-slate-900 bg-black">
                          <iframe
                            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
                            title={video.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            className="absolute top-0 left-0 w-full h-full"
                          ></iframe>
                        </div>
                      ) : (
                        <div className="text-xs p-4 bg-slate-900/50 border border-slate-800 text-slate-500 rounded-sm">
                          Unable to render native player. <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-slate-400 underline hover:text-slate-200">Open source link directly.</a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
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