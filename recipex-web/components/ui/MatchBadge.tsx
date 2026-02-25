interface MatchBadgeProps {
  percent: number;
}

export function MatchBadge({ percent }: MatchBadgeProps) {
  const color = percent >= 80 ? 'bg-matchHigh' : percent >= 55 ? 'bg-matchMid' : 'bg-matchLow';
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white ${color}`}>{percent}% match</span>;
}
