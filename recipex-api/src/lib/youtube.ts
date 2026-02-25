export function buildYouTubeSearchUrl(query?: string | null): string {
  const cleaned = String(query || '')
    .replace(/\bundefined\b/gi, '')
    .replace(/\bnull\b/gi, '')
    .trim();
  const searchTerm = cleaned || 'easy cooking recipe';
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${searchTerm} recipe`)}`;
}
