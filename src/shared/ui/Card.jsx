export function Card({
  children,
  className = '',
  glass = true,
  ...props
}) {
  const glassStyle = glass ? 'liquid-glass-panel' : 'border border-slate-200/80 bg-white shadow-xs'

  return (
    <div
      className={`rounded-3xl p-6 sm:p-7 ${glassStyle} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card
