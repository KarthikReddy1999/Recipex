interface BrandWordmarkProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses: Record<NonNullable<BrandWordmarkProps['size']>, string> = {
  sm: 'text-[2.2rem]',
  md: 'text-4xl md:text-5xl',
  lg: 'text-5xl md:text-6xl'
};

export function BrandWordmark({ size = 'md', className = '' }: BrandWordmarkProps) {
  return (
    <span className={`brand-wordmark ${sizeClasses[size]} ${className}`} aria-label="Recipex">
      <span className="brand-wordmark-main">Recipe</span>
      <span className="brand-wordmark-accent">x</span>
    </span>
  );
}
