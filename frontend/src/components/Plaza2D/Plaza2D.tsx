import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
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
) {
  const shownText = text.length > 24 ? `${text.slice(0, 24)}…` : text
  context.font = '700 12px "Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif'
  const width = Math.min(190, Math.max(92, context.measureText(shownText).width + 28))
  const left = Math.max(8, Math.min(viewportWidth - width - 8, x - width / 2))
  const top = Math.max(10, y - 50)

  context.save()
  context.shadowColor = 'rgba(80, 61, 46, 0.18)'
  context.shadowBlur = 10
  context.shadowOffsetY = 4
  context.fillStyle = 'rgba(255, 253, 247, 0.96)'
  roundedRect(context, left, top, width, 34, 14)
  context.fill()
  context.shadowColor = 'transparent'
  context.strokeStyle = 'rgba(202, 147, 123, 0.45)'
  context.lineWidth = 1.5
  context.stroke()
  context.fillStyle = '#634738'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(shownText, left + width / 2, top + 17)
  context.restore()
}

export function Plaza2D({ avatar, visitors, posts, onOpenBulletinBoard }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const frameRef = useRef<HTMLDivElement | null>(null)
  const boardButtonRef = useRef<HTMLButtonElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const simulationRef = useRef<PlazaSimulation | null>(null)
  const viewportRef = useRef<Viewport>({ width: 1, height: 1, dpr: 1 })
  const cameraRef = useRef<Camera>({
    x: MAP_WIDTH / 2,
    y: MAP_HEIGHT / 2,
    scale: 1,
    minScale: 1,
    maxScale: 2.4,
    velocityX: 0,
    velocityY: 0,
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

  useEffect(() => {
    postsRef.current = posts.map((post) => post.text)
    simulationRef.current?.setPosts(postsRef.current)
  }, [posts])

  useEffect(() => {
    const frame = frameRef.current
    const canvas = canvasRef.current
    if (!frame || !canvas) return

    const resize = () => {
      const bounds = frame.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      const viewport = {
        width: Math.max(1, bounds.width),
        height: Math.max(1, bounds.height),
        dpr,
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
        if (pointerMapRef.current.size === 0 && !reducedMotion) {
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
          drawSpeechBubble(context, position.x, position.y, bubble.text, viewport.width)
        }

        const currentUser = simulation.userVisitor()
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
      if (Math.hypot(deltaX, deltaY) > 2) gesture.moved = true
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
  }

  const recenterOnUser = () => {
    const user = simulationRef.current?.userVisitor()
    if (!user) return
    cameraRef.current.x = user.x
    cameraRef.current.y = user.y
    cameraRef.current.velocityX = 0
    cameraRef.current.velocityY = 0
    clampCamera(cameraRef.current, viewportRef.current)
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
        aria-label="まちの掲示板を開く"
        onClick={openBulletinBoard}
      >
        <span>掲示板を見る</span>
      </button>

      <div className={styles.guide} aria-hidden="true">
        <span>↔</span> ドラッグで見渡せます
      </div>

      <button type="button" className={styles.recenterButton} onClick={recenterOnUser}>
        <span aria-hidden="true">⌖</span>
        あなたを探す
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
