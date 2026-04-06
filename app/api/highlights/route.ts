import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as youtubedl from 'youtube-dl-exec'; 
import * as path from 'path';                

export const runtime = 'nodejs';

// --- CONFIGURATION & CLEANING LOGIC ---

interface ChannelConfig {
  url: string;
  pattern: RegExp;
  clean: (title: string) => string;
}

const CHANNELS: Record<string, ChannelConfig> = {
  NBC: {
    url: 'https://www.youtube.com/@NBCSports/videos',
    pattern: / v\. .* \| PREMIER LEAGUE (HIGHLIGHTS|EXTENDED)/,
    clean: (title) => title 
  },
  ESPN: {
    url: 'https://www.youtube.com/@ESPNFC/videos',
    pattern: /.+\s+(?:vs?\.?|v\.)\s+.+\|.*Highlights\s*\|/i,
    clean: (title) => {
      const segments = title.split('|').map(s => s.trim());
      if (segments.length < 2) return ''; 

      // 1. Competition Logic (Exclude MLS)
      const competition = segments[1].replace(/highlights/i, '').trim();
      if (competition.toUpperCase() === 'MLS') return '';

      // 2. Matchup Logic
      const match = segments[0].match(/(.+?)\s+(?:vs?\.?|v\.)\s+(.+)/i);
      if (match) {
        const side1Words = match[1].trim().split(/\s+/);
        const side2Words = match[2].trim().split(/\s+/);

        // 3. Strict Word Count Check: 
        // If > 3 words, it's a specific play/spoiler, not a full game highlight.
        if (side1Words.length > 3 || side2Words.length > 3) return '';

        return `${side1Words.join(' ')} vs. ${side2Words.join(' ')} (${competition})`;
      }
      
      return '';
    }
  },
  CBS: {
    url: 'https://www.youtube.com/@CBSSportsGolazo/videos',
    pattern: / vs\. .* (Extended Highlights|Highlights)/,
    clean: (title) => title
  }
};

// --- HELPERS ---

function timeAgo(seconds: number): string {
  const diff = Math.floor(Date.now() / 1000) - seconds;
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (h > 0) return `${h}h ${m}m ago`;
  return `${m}m ago`;
}

// --- API HANDLER ---

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // 1. Extract Params
  const mode = searchParams.get('mode')?.toUpperCase() || 'ALL';
  const lookbackStr = searchParams.get('past-lookback') || '24h';
  const hours = parseInt(lookbackStr.replace(/[^0-9]/g, '')) || 24;
  
  // 2. Setup Cutoff
  const cutoffSec = Math.floor(Date.now() / 1000) - (hours * 3600);

  // 3. Determine which channels to fetch
  const targets = (mode === 'ALL') 
    ? Object.entries(CHANNELS) 
    : CHANNELS[mode] ? [[mode, CHANNELS[mode]] as [string, ChannelConfig]] : [];

  if (targets.length === 0) {
    return NextResponse.json({ error: `Unknown mode: ${mode}` }, { status: 400 });
  }

  try {
    // 4. Fetch and Process (In Parallel)
    const allResults = await Promise.all(targets.map(async ([key, config]) => {
      const limit = Math.min(Math.max(hours * 5, 50), 200);
      // const binPath = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp');
      const binPath = path.join(process.cwd(), 'bin', 'yt-dlp');

      const data = await new Promise((resolve, reject) => {
        const args = [
          config.url,
          '--dump-single-json',
          '--playlist-end', limit.toString(),
          '--flat-playlist',
          '--no-warnings',
          '--quiet',
          '--extractor-args', 'youtubetab:approximate_date=a'
        ];

        const child = spawn(binPath, args, 
          { 
            env: {
              ...process.env,
              // telling the child process where to look for Python
              // PATH: `${process.env.PATH}:/usr/bin/python3:/usr/bin/python`
            } 
          }
        );
        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (chunk) => { stdout += chunk; });
        child.stderr.on('data', (chunk) => { stderr += chunk; });

        child.on('close', (code) => {
          if (code !== 0) {
            return reject(new Error(`yt-dlp failed (code ${code}): ${stderr}`));
          }
          try {
            resolve(JSON.parse(stdout));
          } catch (e) {
            reject(new Error("Failed to parse JSON output from yt-dlp"));
          }
        });

        child.on('error', (err) => {
          // If this hits, the path is definitely wrong for the Next.js process
          reject(err);
        });
      });

      // youtube-dl-exec returns the full JSON as 'data'
      // If it's a channel/playlist, videos are in 'entries'
      const entries = (data as any).entries || [];

      return entries
        .filter((v: any) => v.timestamp && v.timestamp >= cutoffSec && config.pattern.test(v.title))
        .map((v: any) => ({
          id: v.id,
          source: key,
          title: config.clean(v.title),
          url: `https://www.youtube.com/watch?v=${v.id}`,
          time: timeAgo(v.timestamp),
          timestamp: v.timestamp // Kept for sorting
        }))
        .filter((v: any) => v.title !== '');
    }));

    // 5. Flatten and Sort by newest first
    const flattened = allResults.flat().sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json(flattened);

  } catch (error: any) {
    console.error("Fetch Error:", error);
    return NextResponse.json({ error: "Failed to scrape YouTube", details: error.message }, { status: 500 });
  }
}