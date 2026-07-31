import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import type { Avatar } from '../../types'
import { AVATARS } from '../../data/avatars'
import styles from './AvatarPicker.module.css'

const CAROUSEL_STEP = 76
const MAX_VELOCITY = 0.035
const MIN_INERTIA_VELOCITY = 0.0012
const MIN_FLING_DISTANCE = 22
const FRICTION = 0.006
const SPRING_STRENGTH = 0.00045
const SPRING_DAMPING = 0.018
const CAROUSEL_SOUND_INTERVAL = 0.055
const SILENT_GAIN = 0.0001

interface ToneOptions {
  startTime: number
  startFrequency: number
  endFrequency: number
  duration: number
  volume: number
  type: OscillatorType
}

function scheduleTone(context: AudioContext, options: ToneOptions) {
  const oscillator = context.createOscillator()
  const envelope = context.createGain()
  const attackEnd = options.startTime + Math.min(0.006, options.duration * 0.15)
  const endTime = options.startTime + options.duration

  oscillator.type = options.type
  oscillator.frequency.setValueAtTime(options.startFrequency, options.startTime)
  oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, endTime)
  envelope.gain.setValueAtTime(SILENT_GAIN, options.startTime)
  envelope.gain.exponentialRampToValueAtTime(options.volume, attackEnd)
  envelope.gain.exponentialRampToValueAtTime(SILENT_GAIN, endTime)

  oscillator.connect(envelope)
  envelope.connect(context.destination)
  oscillator.addEventListener('ended', () => {
    oscillator.disconnect()
    envelope.disconnect()
  }, { once: true })
  oscillator.start(options.startTime)
  oscillator.stop(endTime + 0.01)
}

interface Props {
  initialAvatar?: Avatar | null
  onConfirm: (avatar: Avatar) => void
  onBack?: () => void
}

export function AvatarPicker({ initialAvatar, onConfirm, onBack }: Props) {
  const initialIndex = Math.max(0, AVATARS.findIndex((avatar) => avatar.id === initialAvatar?.id))
  const [carouselPosition, setCarouselPosition] = useState(initialIndex)
  const [isDragging, setIsDragging] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const positionRef = useRef(initialIndex)
  const animationFrameRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioArmedRef = useRef(false)
  const lastCarouselSoundRef = useRef(-Infinity)
  const lastScheduledSoundEndRef = useRef(0)
  const lastSoundedIndexRef = useRef(initialIndex)
  const dragState = useRef({
    pointerId: -1,
    startX: 0,
    startPosition: initialIndex,
    lastX: 0,
    lastTime: 0,
    velocity: 0,
    moved: false,
  })
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([])
  const getAvatarIndex = (position: number) => (
    (Math.round(position) % AVATARS.length + AVATARS.length) % AVATARS.length
  )
  const selectedIndex = getAvatarIndex(carouselPosition)
  const selected = AVATARS[selectedIndex]
  const isMoving = isDragging || isAnimating

  const prepareAudio = () => {
    let context = audioContextRef.current

    if (!context || context.state === 'closed') {
      context = new AudioContext()
      audioContextRef.current = context
    }
    audioArmedRef.current = true
    if (context.state === 'suspended') {
      void context.resume()
    }
    return context
  }

  const playCarouselSound = () => {
    const context = audioContextRef.current
    if (!audioArmedRef.current || !context || context.state === 'closed') return

    const now = context.currentTime
    if (now - lastCarouselSoundRef.current < CAROUSEL_SOUND_INTERVAL) return

    lastCarouselSoundRef.current = now
    lastScheduledSoundEndRef.current = Math.max(lastScheduledSoundEndRef.current, now + 0.065)
    scheduleTone(context, {
      startTime: now,
      startFrequency: 430,
      endFrequency: 190,
      duration: 0.055,
      volume: 0.026,
      type: 'triangle',
    })
  }

  const playConfirmationSound = () => {
    const context = prepareAudio()
    const startTime = context.currentTime + 0.008

    scheduleTone(context, {
      startTime,
      startFrequency: 523.25,
      endFrequency: 493.88,
      duration: 0.22,
      volume: 0.032,
      type: 'sine',
    })
    scheduleTone(context, {
      startTime: startTime + 0.085,
      startFrequency: 659.25,
      endFrequency: 622.25,
      duration: 0.25,
      volume: 0.028,
      type: 'sine',
    })
    lastScheduledSoundEndRef.current = Math.max(lastScheduledSoundEndRef.current, startTime + 0.345)
  }

  const updatePosition = (nextPosition: number) => {
    const nextIndex = getAvatarIndex(nextPosition)
    if (nextIndex !== lastSoundedIndexRef.current) {
      lastSoundedIndexRef.current = nextIndex
      playCarouselSound()
    }
    positionRef.current = nextPosition
    setCarouselPosition(nextPosition)
  }

  const normalizePosition = (position: number) => (
    (position % AVATARS.length + AVATARS.length) % AVATARS.length
  )

  const getCircularOffset = (index: number, position = carouselPosition) => {
    let offset = index - position
    const halfway = AVATARS.length / 2
    while (offset > halfway) offset -= AVATARS.length
    while (offset < -halfway) offset += AVATARS.length
    return offset
  }

  const cancelAnimation = () => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    setIsAnimating(false)
  }

  const settlePosition = (target: number) => {
    updatePosition(normalizePosition(target))
    animationFrameRef.current = null
    setIsAnimating(false)
  }

  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const springToPosition = (target: number, initialVelocity = 0) => {
    cancelAnimation()
    if (prefersReducedMotion()) {
      settlePosition(target)
      return
    }

    setIsAnimating(true)
    let velocity = initialVelocity
    let lastTime = window.performance.now()

    const tick = (time: number) => {
      const deltaTime = Math.min(Math.max(time - lastTime, 1), 32)
      lastTime = time
      const displacement = target - positionRef.current
      velocity += displacement * SPRING_STRENGTH * deltaTime
      velocity *= Math.exp(-SPRING_DAMPING * deltaTime)
      updatePosition(positionRef.current + velocity * deltaTime)

      if (Math.abs(displacement) < 0.001 && Math.abs(velocity) < 0.0001) {
        settlePosition(target)
        return
      }
      animationFrameRef.current = window.requestAnimationFrame(tick)
    }

    animationFrameRef.current = window.requestAnimationFrame(tick)
  }

  const startInertia = (initialVelocity: number) => {
    cancelAnimation()
    if (prefersReducedMotion()) {
      settlePosition(Math.round(positionRef.current))
      return
    }

    setIsAnimating(true)
    let velocity = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, initialVelocity))
    let lastTime = window.performance.now()

    const tick = (time: number) => {
      const deltaTime = Math.min(Math.max(time - lastTime, 1), 32)
      lastTime = time
      velocity *= Math.exp(-FRICTION * deltaTime)
      updatePosition(positionRef.current + velocity * deltaTime)

      if (Math.abs(velocity) <= MIN_INERTIA_VELOCITY) {
        springToPosition(Math.round(positionRef.current), velocity)
        return
      }
      animationFrameRef.current = window.requestAnimationFrame(tick)
    }

    animationFrameRef.current = window.requestAnimationFrame(tick)
  }

  const targetPositionForIndex = (index: number) => (
    positionRef.current + getCircularOffset(index, positionRef.current)
  )

  useEffect(() => () => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
    }
    const context = audioContextRef.current
    if (context && context.state !== 'closed') {
      const remainingSoundMs = Math.max(0, lastScheduledSoundEndRef.current - context.currentTime) * 1000
      window.setTimeout(() => {
        if (context.state !== 'closed') void context.close()
      }, remainingSoundMs)
    }
  }, [])

  const moveToPosition = (target: number) => {
    springToPosition(target)
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    prepareAudio()
    cancelAnimation()
    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startPosition: positionRef.current,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
      moved: false,
    }
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragState.current.pointerId !== event.pointerId) return
    const distance = event.clientX - dragState.current.startX
    if (Math.abs(distance) > 4) dragState.current.moved = true
    const deltaTime = Math.max(event.timeStamp - dragState.current.lastTime, 1)
    const instantaneousVelocity = -(event.clientX - dragState.current.lastX) / CAROUSEL_STEP / deltaTime
    dragState.current.velocity = dragState.current.velocity * 0.35 + instantaneousVelocity * 0.65
    dragState.current.lastX = event.clientX
    dragState.current.lastTime = event.timeStamp
    updatePosition(dragState.current.startPosition - distance / CAROUSEL_STEP)
  }

  const finishDrag = (event: PointerEvent<HTMLDivElement>, useInertia: boolean) => {
    if (dragState.current.pointerId !== event.pointerId) return
    const dragDistance = Math.abs(positionRef.current - dragState.current.startPosition) * CAROUSEL_STEP

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragState.current.pointerId = -1
    setIsDragging(false)

    if (
      useInertia
      && dragDistance >= MIN_FLING_DISTANCE
      && Math.abs(dragState.current.velocity) >= MIN_INERTIA_VELOCITY
    ) {
      startInertia(dragState.current.velocity)
    } else {
      springToPosition(Math.round(positionRef.current), dragState.current.velocity)
    }
  }

  const handleAvatarClick = (index: number) => {
    if (dragState.current.moved) {
      dragState.current.moved = false
      return
    }
    moveToPosition(targetPositionForIndex(index))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let nextIndex: number | null = null

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (selectedIndex + 1) % AVATARS.length
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (selectedIndex - 1 + AVATARS.length) % AVATARS.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = AVATARS.length - 1
    }

    if (nextIndex === null) return
    event.preventDefault()
    prepareAudio()
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      moveToPosition(Math.round(positionRef.current) + 1)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      moveToPosition(Math.round(positionRef.current) - 1)
    } else {
      moveToPosition(targetPositionForIndex(nextIndex))
    }
    buttonRefs.current[nextIndex]?.focus()
  }

  const handleConfirm = () => {
    cancelAnimation()
    const confirmedIndex = getAvatarIndex(positionRef.current)
    updatePosition(confirmedIndex)
    playConfirmationSound()
    onConfirm(AVATARS[confirmedIndex])
  }

  return (
    <main className={styles.page}>
      <span className={`${styles.sparkle} ${styles.sparkleOne}`} aria-hidden="true">✦</span>
      <span className={`${styles.sparkle} ${styles.sparkleTwo}`} aria-hidden="true">✧</span>
      <span className={`${styles.sparkle} ${styles.sparkleThree}`} aria-hidden="true">✦</span>

      <header className={styles.header}>
        {onBack ? (
          <button type="button" className={styles.backButton} onClick={onBack} aria-label="前の画面に戻る">
            <span aria-hidden="true">←</span>
          </button>
        ) : (
          <span className={styles.headerSpacer} aria-hidden="true" />
        )}

        <div className={styles.headingGroup}>
          <span className={styles.eyebrow}>AVATAR CLOSET</span>
          <h1 className={styles.title}>どの子でひろばに行く？</h1>
        </div>

        <span className={styles.headerSpacer} aria-hidden="true" />
      </header>

      <section className={styles.stage} aria-label="選択中のアバター">
        <span className={styles.cloudLeft} aria-hidden="true" />
        <span className={styles.cloudRight} aria-hidden="true" />
        <span className={styles.heart} aria-hidden="true">♡</span>

        <div key={selected.id} className={isMoving ? styles.previewMoving : styles.previewEntrance}>
          {selected.selectionImageUrl ? (
            <img
              className={styles.previewImage}
              src={selected.selectionImageUrl}
              alt=""
            />
          ) : (
            <span className={styles.previewFallback} aria-hidden="true">{selected.emoji}</span>
          )}
        </div>

        <span className={styles.visuallyHidden} aria-live="polite">
          {selected.label}を選択中
        </span>
      </section>

      <div className={styles.chooser}>
        <p className={styles.hint}>左右にスワイプして選んでね</p>
        <div
          className={`${styles.carouselViewport} ${isDragging ? styles.dragging : ''} ${isMoving ? styles.moving : ''}`}
          role="radiogroup"
          aria-label="アバター選択"
          aria-orientation="horizontal"
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => finishDrag(event, true)}
          onPointerCancel={(event) => finishDrag(event, false)}
        >
          <div className={styles.carouselTrack}>
            {AVATARS.map((avatar, index) => {
              const isSelected = selectedIndex === index
              const offset = getCircularOffset(index)
              const distance = Math.abs(offset)
              const itemStyle = {
                '--avatar-color': avatar.color,
                '--carousel-x': `${offset * CAROUSEL_STEP}px`,
                '--carousel-scale': Math.max(0.78, 1 - distance * 0.1),
                '--carousel-opacity': Math.max(0.3, 1 - distance * 0.2),
                '--carousel-z': 100 - Math.round(distance * 10),
              } as CSSProperties

              return (
                <button
                  key={avatar.id}
                  ref={(element) => {
                    buttonRefs.current[index] = element
                  }}
                  type="button"
                  role="radio"
                  tabIndex={isSelected ? 0 : -1}
                  aria-checked={isSelected}
                  aria-label={`${avatar.label}を選ぶ`}
                  className={`${styles.thumbnailButton} ${isSelected ? styles.selected : ''}`}
                  style={itemStyle}
                  onClick={() => handleAvatarClick(index)}
                >
                  {avatar.selectionImageUrl ? (
                    <img className={styles.thumbnailImage} src={avatar.selectionImageUrl} alt="" draggable="false" />
                  ) : (
                    <span className={styles.thumbnailFallback} aria-hidden="true">{avatar.emoji}</span>
                  )}
                  {isSelected && <span className={styles.checkmark} aria-hidden="true">♥</span>}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <footer className={styles.footer}>
        <button
          type="button"
          className={styles.confirmButton}
          onPointerDown={() => {
            prepareAudio()
            cancelAnimation()
          }}
          onClick={handleConfirm}
        >
          <span>この子にする</span>
          <span className={styles.confirmArrow} aria-hidden="true">→</span>
        </button>
      </footer>
    </main>
  )
}
