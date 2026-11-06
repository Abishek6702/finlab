export default function SectionHeading({
  badge,
  title,
  description,
  align = 'center',
  className = '',
}) {
  const alignmentClass =
    align === 'left'
      ? 'text-left items-start'
      : align === 'right'
      ? 'text-right items-end'
      : 'text-center items-center mx-auto';

  return (
    <div className={`flex flex-col max-w-3xl mb-12 sm:mb-16 ${alignmentClass} ${className}`}>
      {badge && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 text-xs font-semibold tracking-wider uppercase rounded-full bg-[var(--primary-soft)] text-[var(--primary)] border border-[var(--primary)]/10 shadow-xs">
          {badge}
        </span>
      )}
      {title && (
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[var(--text)] leading-tight">
          {title}
        </h2>
      )}
      {description && (
        <p className="mt-4 text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed font-normal">
          {description}
        </p>
      )}
    </div>
  );
}

