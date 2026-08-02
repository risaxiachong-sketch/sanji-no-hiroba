import { useEffect, useRef, useState } from 'react'
import type { MouseEvent, PointerEvent } from 'react'
import type { Avatar, DummyUser, Post } from '../../types'
import plazaDayUrl from '../../assets/plaza-2d/plaza-day.png'
import plazaWalkMaskUrl from '../../assets/plaza-2d/plaza-walk-mask.png'
import { buildWalkGrid } from './pathfinding'
import { PlazaSimulation, type PlazaParticipant, type PlazaVisitor2D } from './plazaSimulation'
import styles from './Plaza2D.module.css'

const MAP_WIDTH = 1448
const MAP_HEIGHT = 1086
const MAX_DPR = 1.5
const MAX_ZOOM_FACTOR = 2.4
const BOARD_RECT = { x: 426, y: 646, width: 282, height: 268 }
const CAMERA_FOCUS_RATE = 8
const FOLLOW_LONG_PRESS_MS = 550
const FOLLOW_PRESS_MOVE_TOLERANCE = 10

type Camera = {
  x: number
  y: number
  scale: number
  minScale: number
  maxScale: number
  velocityX: number
  velocityY: number
}

type Viewport = {
  width: number
  height: number
  dpr: number
  topInset: number
  bottomInset: number
  leftInset: number
  rightInset: number
}

type PointerSample = {
  x: number
  y: number
}

interface Props {
  avatar: Avatar
  visitors: DummyUser[]
  posts: Post[]
  onOpenBulletinBoard: () => void
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`画像を読み込めませんでした: ${url}`))
    image.src = url
  })
}

function clampCamera(camera: Camera, viewport: Viewport) {
  const halfWidth = viewport.width / camera.scale / 2
  const halfHeight = viewport.height / camera.scale / 2
  camera.x = halfWidth * 2 >= MAP_WIDTH
    ? MAP_WIDTH / 2
    : Math.max(halfWidth, Math.min(MAP_WIDTH - halfWidth, camera.x))
  camera.y = halfHeight * 2 >= MAP_HEIGHT
    ? MAP_HEIGHT / 2
    : Math.max(halfHeight, Math.min(MAP_HEIGHT - halfHeight, camera.y))
}

function worldToScreen(point: { x: number; y: number }, camera: Camera, viewport: Viewport) {
  return {
    x: viewport.width / 2 + (point.x - camera.x) * camera.scale,
    y: viewport.height / 2 + (point.y - camera.y) * camera.scale,
  }
}

function screenToWorld(point: { x: number; y: number }, camera: Camera, viewport: Viewport) {
  return {
    x: camera.x + (point.x - viewport.width / 2) / camera.scale,
    y: camera.y + (point.y - viewport.height / 2) / camera.scale,
  }
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.roundRect(x, y, width, height, safeRadius)
}

function drawSpeechBubble(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  viewportWidth: number,
  viewportHeight: number,
  insets: Pick<Viewport, 'topInset' | 'bottomInset' | 'leftInset' | 'rightInset'>,
) {
  const fontSize = 12
  const lineHeight = 17
  const horizontalPadding = 14
  const verticalPadding = 9
  const maxWidth = Math.min(220, viewportWidth - insets.leftInset - insets.rightInset - 16)
  context.font = '700 12px "Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif'
  const lines = wrapSpeechText(context, text, Math.max(112, maxWidth - horizontalPadding * 2))
  const textWidth = Math.max(...lines.map((line) => context.measureText(line).width), 0)
  const width = Math.min(maxWidth, Math.max(92, textWidth + horizontalPadding * 2))
  const height = lines.length * lineHeight + verticalPadding * 2
  const left = Math.max(
    insets.leftInset,
    Math.min(viewportWidth - insets.rightInset - width, x - width / 2),
  )
  const bottomLimit = Math.max(insets.topInset + height, viewportHeight - insets.bottomInset)
  const preferredTop = y - height - 10
  const placeBelow = preferredTop < insets.topInset
  const top = Math.max(
    insets.topInset,
    placeBelow
      ? Math.min(y + 10, bottomLimit - height)
      : Math.min(preferredTop, bottomLimit - height),
  )
  const tailX = Math.max(left + 18, Math.min(left + width - 18, x))

  context.save()
  context.shadowColor = 'rgba(80, 61, 46, 0.18)'
  context.shadowBlur = 10
  context.shadowOffsetY = 4
  context.fillStyle = 'rgba(255, 253, 247, 0.96)'
  roundedRect(context, left, top, width, height, 14)
  context.moveTo(tailX - 7, placeBelow ? top : top + height)
  context.lineTo(tailX, placeBelow ? Math.max(top - 10, y) : Math.min(top + height + 10, y))
  context.lineTo(tailX + 7, placeBelow ? top : top + height)
  context.closePath()
  context.fill()
  context.shadowColor = 'transparent'
  context.strokeStyle = 'rgba(202, 147, 123, 0.45)'
  context.lineWidth = 1.5
  context.stroke()
  context.fillStyle = '#634738'
  context.textAlign = 'center'
  context.textBaseline = 'alphabetic'
  lines.forEach((line, index) => {
    context.fillText(
      line,
      left + width / 2,
      top + verticalPadding + fontSize + index * lineHeight,
    )
  })
  context.restore()
}

function wrapSpeechText(context: CanvasRenderingContext2D, text: string, maxTextWidth: number) {
  const characters = Array.from(text.trim())
  const lines: string[] = []
  let currentLine = ''

  for (const character of characters) {
    const candidate = currentLine + character
    if (currentLine && context.measureText(candidate).width > maxTextWidth) {
      lines.push(currentLine)
      currentLine = character
      if (lines.length === 2) break
    } else {
      currentLine = candidate
    }
  }

  if (lines.length < 2 && currentLine) lines.push(currentLine)
  if (lines.length === 0) lines.push('…')

  if (lines.join('').length < characters.length) {
    let lastLine = lines[lines.length - 1]
    while (lastLine && context.measureText(`${lastLine}…`).width > maxTextWidth) {
      lastLine = lastLine.slice(0, -1)
    }
    lines[lines.length - 1] = `${lastLine}…`
  }

  return lines
}

export function Plaza2D({ avatar, visitors, posts, onOpenBulletinBoard }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const frameRef = useRef<HTMLDivElement | null>(null)
  const boardButtonRef = useRef<HTMLButtonElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const simulationRef = useRef<PlazaSimulation | null>(null)
  const viewportRef = useRef<Viewport>({
    width: 1,
    height: 1,
    dpr: 1,
    topInset: 8,
    bottomInset: 8,
    leftInset: 8,
    rightInset: 8,
  })
  const cameraRef = useRef<Camera>({
    x: MAP_WIDTH / 2,
    y: MAP_HEIGHT / 2,
    scale: 1,
    minScale: 1,
    maxScale: 2.4,
    velocityX: 0,
    velocityY: 0,
  })
  const followUserRef = useRef(false)
  const cameraFocusTargetRef = useRef<{ x: number; y: number } | null>(null)
  const followPressTimerRef = useRef<number | null>(null)
  const followPressRef = useRef({
    pointerId: null as number | null,
    startX: 0,
    startY: 0,
    moved: false,
    longPressed: false,
  })
  const pointerMapRef = useRef(new Map<number, PointerSample>())
  const gestureRef = useRef({
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    pinchDistance: 0,
    pinchMidX: 0,
    pinchMidY: 0,
    moved: false,
  })
  const postsRef = useRef(posts.map((post) => post.text))
  const [isReady, setIsReady] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [isFollowingUser, setIsFollowingUser] = useState(false)

  useEffect(() => {
    postsRef.current = posts.map((post) => post.text)
    simulationRef.current?.setPosts(postsRef.current)
  }, [posts])

  useEffect(() => () => {
    if (followPressTimerRef.current !== null) {
      window.clearTimeout(followPressTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const frame = frameRef.current
    const canvas = canvasRef.current
    if (!frame || !canvas) return

    const resize = () => {
      const bounds = frame.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      const isLandscape = window.matchMedia('(orientation: landscape)').matches
      const navSize = Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--bottom-nav-height'),
      ) || 0
      const viewport = {
        width: Math.max(1, bounds.width),
        height: Math.max(1, bounds.height),
        dpr,
        topInset: 8,
        bottomInset: isLandscape ? 8 : navSize,
        leftInset: 8,
        rightInset: isLandscape ? navSize : 8,
      }
      viewportRef.current = viewport
      canvas.width = Math.round(viewport.width * dpr)
      canvas.height = Math.round(viewport.height * dpr)
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`

      const camera = cameraRef.current
      const previousMinScale = camera.minScale
      camera.minScale = Math.max(viewport.width / MAP_WIDTH, viewport.height / MAP_HEIGHT)
      camera.maxScale = camera.minScale * MAX_ZOOM_FACTOR
      camera.scale = previousMinScale === 1
        ? camera.minScale
        : Math.max(camera.minScale, Math.min(camera.maxScale, camera.scale))
      clampCamera(camera, viewport)
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const participants: PlazaParticipant[] = [
      {
        id: 'you',
        spriteUrl: avatar.mapSpriteUrl ?? avatar.selectionImageUrl ?? '',
        message: '今日は広場をゆっくり歩いています',
        startX: 0.52,
        startY: 0.58,
        isUser: true,
      },
      ...visitors.map((visitor) => ({
        id: visitor.id,
        spriteUrl: visitor.avatar.mapSpriteUrl ?? visitor.avatar.selectionImageUrl ?? '',
        message: visitor.message,
        startX: visitor.x / 100,
        startY: visitor.y / 100,
      })),
    ]
    const spriteUrls = [...new Set(participants.map((participant) => participant.spriteUrl).filter(Boolean))]

    void Promise.all([
      loadImage(plazaDayUrl),
      loadImage(plazaWalkMaskUrl),
      ...spriteUrls.map(loadImage),
    ]).then(([mapImage, maskImage, ...spriteImages]) => {
      if (cancelled) return
      const maskCanvas = document.createElement('canvas')
      maskCanvas.width = MAP_WIDTH
      maskCanvas.height = MAP_HEIGHT
      const maskContext = maskCanvas.getContext('2d', { willReadFrequently: true })
      if (!maskContext) throw new Error('移動マスクを読み込めませんでした')
      maskContext.drawImage(maskImage, 0, 0, MAP_WIDTH, MAP_HEIGHT)
      const grid = buildWalkGrid(maskContext.getImageData(0, 0, MAP_WIDTH, MAP_HEIGHT))
      const simulation = new PlazaSimulation(grid, participants, postsRef.current)
      const spriteMap = new Map(spriteUrls.map((url, index) => [url, spriteImages[index]]))
      simulationRef.current = simulation

      const user = simulation.userVisitor()
      if (user) {
        cameraRef.current.x = user.x
        cameraRef.current.y = user.y
        clampCamera(cameraRef.current, viewportRef.current)
      }

      let lastTime = window.performance.now()
      const draw = (time: number) => {
        const canvas = canvasRef.current
        if (!canvas || cancelled) return
        const context = canvas.getContext('2d')
        if (!context) return
        const viewport = viewportRef.current
        const camera = cameraRef.current
        const delta = Math.min((time - lastTime) / 1000, 0.05)
        lastTime = time

        simulation.step(delta)
        const currentUser = simulation.userVisitor()
        const focusTarget = followUserRef.current ? currentUser : cameraFocusTargetRef.current

        if (focusTarget) {
          const targetCamera = {
            ...camera,
            x: focusTarget.x,
            y: focusTarget.y,
            velocityX: 0,
            velocityY: 0,
          }
          clampCamera(targetCamera, viewport)
          const deltaX = targetCamera.x - camera.x
          const deltaY = targetCamera.y - camera.y
          const blend = reducedMotion ? 1 : 1 - Math.exp(-CAMERA_FOCUS_RATE * delta)
          camera.x += deltaX * blend
          camera.y += deltaY * blend
          camera.velocityX = 0
          camera.velocityY = 0

          if (!followUserRef.current && (reducedMotion || Math.hypot(deltaX, deltaY) < 0.5)) {
            camera.x = targetCamera.x
            camera.y = targetCamera.y
            cameraFocusTargetRef.current = null
          }
        } else if (pointerMapRef.current.size === 0 && !reducedMotion) {
          camera.x += camera.velocityX * delta
          camera.y += camera.velocityY * delta
          const friction = Math.exp(-7 * delta)
          camera.velocityX *= friction
          camera.velocityY *= friction
          if (Math.abs(camera.velocityX) < 1) camera.velocityX = 0
          if (Math.abs(camera.velocityY) < 1) camera.velocityY = 0
        }
        clampCamera(camera, viewport)

        context.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0)
        context.clearRect(0, 0, viewport.width, viewport.height)
        context.save()
        context.translate(
          viewport.width / 2 - camera.x * camera.scale,
          viewport.height / 2 - camera.y * camera.scale,
        )
        context.scale(camera.scale, camera.scale)
        context.drawImage(mapImage, 0, 0, MAP_WIDTH, MAP_HEIGHT)

        const sortedVisitors = [...simulation.visitors].sort((left, right) => left.y - right.y)
        for (const visitor of sortedVisitors) {
          const isWalking = visitor.mode === 'walk' || visitor.mode === 'approach'
          const bob = isWalking && !reducedMotion ? Math.abs(Math.sin(visitor.bobPhase)) * 3 : 0
          const sprite = spriteMap.get(visitor.spriteUrl)

          context.save()
          context.fillStyle = 'rgba(75, 59, 43, 0.2)'
          context.beginPath()
          context.ellipse(visitor.x, visitor.y + 2, 23, isWalking ? 7 : 8, 0, 0, Math.PI * 2)
          context.fill()
          if (sprite) {
            context.translate(visitor.x, visitor.y - bob)
            context.scale(visitor.facing, 1)
            context.drawImage(sprite, -47, -94, 94, 94)
          }
          context.restore()
        }
        context.restore()

        context.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0)
        for (const bubble of simulation.bubbles()) {
          const visitor = simulation.visitors.find((item) => item.id === bubble.visitorId)
          if (!visitor) continue
          const position = worldToScreen({ x: visitor.x, y: visitor.y - 88 }, camera, viewport)
          if (
            position.x < -180
            || position.x > viewport.width + 180
            || position.y < -80
            || position.y > viewport.height + 80
          ) continue
          drawSpeechBubble(
            context,
            position.x,
            position.y,
            bubble.text,
            viewport.width,
            viewport.height,
            viewport,
          )
        }

        if (currentUser) drawUserMarker(context, currentUser, camera, viewport)
        positionBoardButton(boardButtonRef.current, camera, viewport)
        animationFrameRef.current = window.requestAnimationFrame(draw)
      }

      setIsReady(true)
      animationFrameRef.current = window.requestAnimationFrame(draw)
    }).catch((error: unknown) => {
      if (!cancelled) setLoadError(error instanceof Error ? error.message : '広場を読み込めませんでした')
    })

    return () => {
      cancelled = true
      simulationRef.current = null
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [avatar, visitors])

  const clearFollowPressTimer = () => {
    if (followPressTimerRef.current === null) return
    window.clearTimeout(followPressTimerRef.current)
    followPressTimerRef.current = null
  }

  const stopFollowingUser = () => {
    cameraFocusTargetRef.current = null
    if (!followUserRef.current) return
    followUserRef.current = false
    setIsFollowingUser(false)
  }

  const focusOnUserOnce = () => {
    const user = simulationRef.current?.userVisitor()
    if (!user) return
    stopFollowingUser()
    cameraFocusTargetRef.current = { x: user.x, y: user.y }
    cameraRef.current.velocityX = 0
    cameraRef.current.velocityY = 0
  }

  const startFollowingUser = () => {
    const user = simulationRef.current?.userVisitor()
    if (!user) return false
    cameraFocusTargetRef.current = null
    followUserRef.current = true
    cameraRef.current.velocityX = 0
    cameraRef.current.velocityY = 0
    setIsFollowingUser(true)
    return true
  }

  const activateRecenterButton = () => {
    if (followUserRef.current) {
      stopFollowingUser()
      return
    }
    focusOnUserOnce()
  }

  const handleRecenterPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    clearFollowPressTimer()
    followPressRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      longPressed: false,
    }

    if (followUserRef.current) return
    const pointerId = event.pointerId
    followPressTimerRef.current = window.setTimeout(() => {
      const press = followPressRef.current
      if (press.pointerId !== pointerId || press.moved) return
      press.longPressed = startFollowingUser()
      followPressTimerRef.current = null
    }, FOLLOW_LONG_PRESS_MS)
  }

  const handleRecenterPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    const press = followPressRef.current
    if (press.pointerId !== event.pointerId || press.moved) return
    if (Math.hypot(event.clientX - press.startX, event.clientY - press.startY) <= FOLLOW_PRESS_MOVE_TOLERANCE) return
    press.moved = true
    clearFollowPressTimer()
  }

  const finishRecenterPointer = (event: PointerEvent<HTMLButtonElement>, cancelled = false) => {
    event.stopPropagation()
    const press = followPressRef.current
    if (press.pointerId !== event.pointerId) return
    clearFollowPressTimer()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    followPressRef.current.pointerId = null
    if (!cancelled && !press.moved && !press.longPressed) activateRecenterButton()
  }

  const handleRecenterClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail !== 0) return
    activateRecenterButton()
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    pointerMapRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    cameraRef.current.velocityX = 0
    cameraRef.current.velocityY = 0
    gestureRef.current.moved = false
    gestureRef.current.lastTime = event.timeStamp

    if (pointerMapRef.current.size === 1) {
      gestureRef.current.lastX = event.clientX
      gestureRef.current.lastY = event.clientY
      gestureRef.current.pinchDistance = 0
    } else if (pointerMapRef.current.size === 2) {
      resetPinchGesture()
    }
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointerMapRef.current.has(event.pointerId)) return
    pointerMapRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const camera = cameraRef.current
    const viewport = viewportRef.current
    const gesture = gestureRef.current

    if (pointerMapRef.current.size === 1) {
      const deltaX = event.clientX - gesture.lastX
      const deltaY = event.clientY - gesture.lastY
      const deltaTime = Math.max((event.timeStamp - gesture.lastTime) / 1000, 0.001)
      if (Math.hypot(deltaX, deltaY) > 2) {
        gesture.moved = true
        stopFollowingUser()
      }
      camera.x -= deltaX / camera.scale
      camera.y -= deltaY / camera.scale
      camera.velocityX = (-deltaX / camera.scale) / deltaTime
      camera.velocityY = (-deltaY / camera.scale) / deltaTime
      gesture.lastX = event.clientX
      gesture.lastY = event.clientY
      gesture.lastTime = event.timeStamp
      clampCamera(camera, viewport)
      return
    }

    if (pointerMapRef.current.size === 2) {
      const [first, second] = [...pointerMapRef.current.values()]
      const distance = Math.hypot(second.x - first.x, second.y - first.y)
      const midX = (first.x + second.x) / 2
      const midY = (first.y + second.y) / 2
      if (gesture.pinchDistance > 0) {
        const worldBefore = screenToWorld(
          { x: gesture.pinchMidX, y: gesture.pinchMidY },
          camera,
          viewport,
        )
        camera.scale = Math.max(
          camera.minScale,
          Math.min(camera.maxScale, camera.scale * (distance / gesture.pinchDistance)),
        )
        camera.x = worldBefore.x - (midX - viewport.width / 2) / camera.scale
        camera.y = worldBefore.y - (midY - viewport.height / 2) / camera.scale
        gesture.moved = true
        clampCamera(camera, viewport)
      }
      gesture.pinchDistance = distance
      gesture.pinchMidX = midX
      gesture.pinchMidY = midY
    }
  }

  const finishPointer = (event: PointerEvent<HTMLDivElement>) => {
    pointerMapRef.current.delete(event.pointerId)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (pointerMapRef.current.size === 1) {
      const remaining = [...pointerMapRef.current.values()][0]
      gestureRef.current.lastX = remaining.x
      gestureRef.current.lastY = remaining.y
      gestureRef.current.lastTime = event.timeStamp
      gestureRef.current.pinchDistance = 0
    }
  }

  const resetPinchGesture = () => {
    const [first, second] = [...pointerMapRef.current.values()]
    gestureRef.current.pinchDistance = Math.hypot(second.x - first.x, second.y - first.y)
    gestureRef.current.pinchMidX = (first.x + second.x) / 2
    gestureRef.current.pinchMidY = (first.y + second.y) / 2
    gestureRef.current.moved = true
    stopFollowingUser()
  }

  const openBulletinBoard = () => {
    if (gestureRef.current.moved) return
    onOpenBulletinBoard()
  }

  return (
    <div
      ref={frameRef}
      className={styles.frame}
      role="region"
      aria-label="キャラクターが散歩し、立ち話をしている2Dの広場"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
    >
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />

      <button
        ref={boardButtonRef}
        type="button"
        className={styles.boardHotspot}
        data-sfx="navigate"
        aria-label="まちの掲示板を開く"
        onClick={openBulletinBoard}
      >
        <span>掲示板を見る</span>
      </button>

      <div className={styles.guide} aria-hidden="true">
        <span>↔</span> ドラッグで見渡せます
      </div>

      <button
        type="button"
        className={`${styles.recenterButton} ${isFollowingUser ? styles.recenterButtonFollowing : ''}`}
        data-sfx="select"
        aria-label={isFollowingUser ? '自分のキャラクターへの追従を解除' : '自分のキャラクターを探す。長押しで追従を固定'}
        aria-pressed={isFollowingUser}
        title={isFollowingUser ? '押すと追従を解除' : '長押しで追従を固定'}
        onClick={handleRecenterClick}
        onPointerDown={handleRecenterPointerDown}
        onPointerMove={handleRecenterPointerMove}
        onPointerUp={(event) => finishRecenterPointer(event)}
        onPointerCancel={(event) => finishRecenterPointer(event, true)}
        onContextMenu={(event) => event.preventDefault()}
      >
        <span aria-hidden="true">⌖</span>
        {isFollowingUser ? '追従中' : 'あなたを探す'}
      </button>

      {!isReady && !loadError && <div className={styles.loading}>広場を準備しています…</div>}
      {loadError && <div className={styles.loading}>{loadError}</div>}
    </div>
  )
}

function drawUserMarker(
  context: CanvasRenderingContext2D,
  visitor: PlazaVisitor2D,
  camera: Camera,
  viewport: Viewport,
) {
  const position = worldToScreen({ x: visitor.x, y: visitor.y - 98 }, camera, viewport)
  if (position.x < -60 || position.x > viewport.width + 60 || position.y < -40 || position.y > viewport.height + 40) {
    return
  }

  context.save()
  context.font = '800 11px "Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.shadowColor = 'rgba(90, 61, 44, 0.18)'
  context.shadowBlur = 8
  context.fillStyle = 'rgba(255, 253, 247, 0.96)'
  roundedRect(context, position.x - 28, position.y - 12, 56, 24, 12)
  context.fill()
  context.shadowColor = 'transparent'
  context.strokeStyle = '#ee9e96'
  context.lineWidth = 1.5
  context.stroke()
  context.fillStyle = '#76503e'
  context.fillText('あなた', position.x, position.y)
  context.restore()
}

function positionBoardButton(
  button: HTMLButtonElement | null,
  camera: Camera,
  viewport: Viewport,
) {
  if (!button) return
  const position = worldToScreen({ x: BOARD_RECT.x, y: BOARD_RECT.y }, camera, viewport)
  const width = BOARD_RECT.width * camera.scale
  const height = BOARD_RECT.height * camera.scale
  button.style.left = `${position.x}px`
  button.style.top = `${position.y}px`
  button.style.width = `${width}px`
  button.style.height = `${height}px`
  button.hidden = (
    position.x + width < 0
    || position.y + height < 0
    || position.x > viewport.width
    || position.y > viewport.height
  )
}
