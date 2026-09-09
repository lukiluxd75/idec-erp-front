export function Card({
  children,
  className = '',
  glass = true,
  ...props
}) {
  const glassStyle = glass
    ? 'border border-white/60 bg-white/55 backdrop-blur-md shadow-[0_8px_32px_rgba(100,116,139,0.12),inset_0_1px_1px_rgba(255,255,255,0.7)]'
    : 'border border-slate-200/80 bg-white shadow-xs'

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
