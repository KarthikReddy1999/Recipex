import { HTMLAttributes } from 'react';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export function GlassCard({ padded = true, className = '', ...props }: GlassCardProps) {
  return <div className={`glass-card ${padded ? 'p-6' : ''} ${className}`} {...props} />;
}
