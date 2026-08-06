import { COLORS } from './DeviceFrames'

/** Service wordmark used by the ending card. */
export const Wordmark = ({ compact }: Readonly<{ compact: boolean }>) => {
  const parts = [
    ['アル', COLORS.coral],
    ['パ', COLORS.yellow],
    ['カ', COLORS.green],
    ['の', '#9a6a55'],
    ['あ', '#ed9d9b'],
    ['く', '#f2b071'],
    ['び', COLORS.blue],
  ] as const

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'baseline',
        fontSize: compact ? 26 : 48,
        fontWeight: 900,
        letterSpacing: '-0.1em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        filter: 'drop-shadow(0 4px 3px rgba(111, 76, 54, 0.13))',
      }}
    >
      {parts.map(([text, color], index) => (
        <span
          key={text}
          style={{
            color,
            WebkitTextStroke: `${compact ? 2 : 3}px #fffdf7`,
            paintOrder: 'stroke fill',
            textShadow: '0 2px 0 #a9795f',
            transform: `translateY(${index % 2 === 0 ? 1 : -1}px) rotate(${index % 2 === 0 ? -1 : 1}deg)`,
          }}
        >
          {text}
        </span>
      ))}
    </div>
  )
}
