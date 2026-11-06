import Link from 'next/link';

export default function Button({
  children,
  href,
  variant = 'primary',
  size = 'md',
  className = '',
  icon: Icon,
  iconPosition = 'right',
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]';

  const variants = {
    primary:
      'bg-[var(--primary)] text-white shadow-sm hover:bg-[var(--primary-hover)] focus-visible:outline-[var(--primary)]',
    secondary:
      'bg-[var(--surface-raised)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--border)]/60 focus-visible:outline-[var(--text)]',
    outline:
      'border border-[var(--border)] text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)] bg-transparent',
    ghost:
      'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)] bg-transparent',
    white:
      'bg-white text-[var(--deep-navy)] shadow-md hover:bg-slate-50 border border-slate-200/80',
  };

  const sizes = {
    sm: 'text-xs px-3.5 py-1.5 gap-1.5',
    md: 'text-sm px-5 py-2.5 gap-2',
    lg: 'text-base px-6 py-3.5 gap-2.5',
  };

  const combinedClass = `${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`;

  const content = (
    <>
      {Icon && iconPosition === 'left' && <Icon className="size-4 shrink-0" />}
      <span>{children}</span>
      {Icon && iconPosition === 'right' && <Icon className="size-4 shrink-0" />}
    </>
  );

  if (href) {
    const isExternal = href.startsWith('http') || href.startsWith('//');
    if (isExternal) {
      return (
        <a href={href} className={combinedClass} {...props}>
          {content}
        </a>
      );
    }
    return (
      <Link href={href} className={combinedClass} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <button className={combinedClass} {...props}>
      {content}
    </button>
  );
}

