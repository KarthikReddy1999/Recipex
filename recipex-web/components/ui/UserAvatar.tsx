'use client';

type UserAvatarProps = {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
};

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-base'
} as const;

function buildInitials(name?: string | null, email?: string | null) {
  const source = (name || email || '').trim();
  if (!source) return 'U';

  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  }

  const token = parts[0] || source;
  if (token.includes('@')) {
    return (token[0] || 'U').toUpperCase();
  }

  return token.slice(0, 2).toUpperCase();
}

export function UserAvatar({ name, email, avatarUrl, size = 'md' }: UserAvatarProps) {
  const initials = buildInitials(name, email);

  if (avatarUrl) {
    return (
      <div className={`overflow-hidden rounded-full border border-white/60 bg-white/70 ${sizeMap[size]}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarUrl} alt={name || email || 'User avatar'} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full border border-white/60 bg-slate-200/90 font-semibold text-slate-700 ${sizeMap[size]}`}
      aria-label={name || email || 'User avatar'}
      title={name || email || 'User'}
    >
      {initials}
    </div>
  );
}
