import { useEffect, useRef, useState } from 'react'
import type { MouseEvent, PointerEvent } from 'react'
import type { Avatar, DummyUser, Post, ReactionOption, ReactionType } from '../../types'
import plazaDayUrl from '../../assets/plaza-2d/plaza-day.png'
import plazaWalkMaskUrl from '../../assets/plaza-2d/plaza-walk-mask.png'
import { useCharacterScale } from '../../characterScale/CharacterScaleContext'
import type { CharacterScale } from '../../characterScale/CharacterScaleContext'
import { buildWalkGrid } from './pathfinding'
import { PlazaSimulation, type PlazaParticipant, type PlazaVisitor2D } from './plazaSimulation'
import styles from './Plaza2D.module.css'

const MAP_WIDTH = 1448
const MAP_HEIGHT = 1086
const MAX_DPR = 1.5
const MAX_ZOOM_FACTOR = 2.4
const BOARD_RECT = { x: 426, y: 646, width: 282, height: 268 }

/** キャラクタースプライトの一辺のサイズ（px）。影・ラベル位置はこの値を基準に比例計算する。 */
const SPRITE_SIZE: Record<CharacterScale, number> = {
  small: 120,
  medium: 148,
  large: 180,
}
const SHADOW_RADIUS_X_RATIO = 36 / 148
const SHADOW_RADIUS_Y_WALK_RATIO = 11 / 148
const SHADOW_RADIUS_Y_IDLE_RATIO = 12 / 148
const BUBBLE_OFFSET_RATIO = 141 / 148
const LABEL_OFFSET_RATIO = 153 / 148
const REACTION_BAR_OFFSET_RATIO = 0.12
const REACTION_BAR_WIDTH = 176
const REACTION_BAR_HEIGHT = 64
const REACTION_BAR_MARGIN = 8

const REACTIONS: ReactionOption[] = [
  { value: 'wakaru', label: 'わかるよ', emoji: '🫶' },
  { value: 'otsukare', label: 'おつかれさま', emoji: '☕' },
  { value: 'kokoniiruyo', label: 'ここにいるよ', emoji: '🌿' },
  { value: 'watashimo', label: '私も同じ', emoji: '🙋' },
  { value: 'ouen', label: '応援してるよ', emoji: '📣' },
  { value: 'kyoumo', label: '今日もおつかれさま', emoji: '🌙' },
  { value: 'yokattane', label: 'よかったね', emoji: '🎉' },
  { value: 'hitoiki', label: 'ひと息ついてね', emoji: '🍀' },
]

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
  onVisitorTap: (visitorId: string | null) => void
  selectedVisitorId: string | null
  selectedPost: Post | null
  onReact: (postId: string, type: ReactionType) => void
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
  // 改行は段落の区切りとして扱う（空行は詰めて2行分の表示枠を無駄にしない）。
  const paragraphs = text.trim().split('\n').filter((paragraph) => paragraph.length > 0)
  const totalContentLength = paragraphs.reduce((sum, paragraph) => sum + Array.from(paragraph).length, 0)
  const lines: string[] = []
  let consumedLength = 0

  for (const paragraph of paragraphs) {
    if (lines.length >= 2) break
    let currentLine = ''

    for (const character of Array.from(paragraph)) {
      const candidate = currentLine + character
      if (currentLine && context.measureText(candidate).width > maxTextWidth) {
        lines.push(currentLine)
        consumedLength += Array.from(currentLine).length
        currentLine = character
        if (lines.length === 2) break
      } else {
        currentLine = candidate
      }
    }

    if (lines.length < 2) {
      lines.push(currentLine)
      consumedLength += Array.from(currentLine).length
    }
  }

  if (lines.length === 0) lines.push('…')

  if (consumedLength < totalContentLength) {
    let lastLine = lines[lines.length - 1]
    while (lastLine && context.measureText(`${lastLine}…`).width > maxTextWidth) {
      lastLine = lastLine.slice(0, -1)
    }
    lines[lines.length - 1] = `${lastLine}…`
  }

  return lines
}

export function Plaza2D({
  avatar,
  visitors,
  posts,
  onOpenBulletinBoard,
  onVisitorTap,
  selectedVisitorId,
  selectedPost,
  onReact,
}: Props) {
  const { scale: characterScale } = useCharacterScale()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const frameRef = useRef<HTMLDivElement | null>(null)
  const boardButtonRef = useRef<HTMLButtonElement | null>(null)
  const reactionBarRef = useRef<HTMLDivElement | null>(null)
  const selectedVisitorIdRef = useRef(selectedVisitorId)
  const selectedPostRef = useRef(selectedPost)
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
    selectedVisitorIdRef.current = selectedVisitorId
  }, [selectedVisitorId])

  useEffect(() => {
    selectedPostRef.current = selectedPost
  }, [selectedPost])

  useEffect(() => {
    simulationRef.current?.setFrozen(selectedVisitorId)
  }, [selectedVisitorId])

  useEffect(() => {
    const frame = frameRef.current
    const canvas = canvasRef.current
    if (!frame || !canvas) return

    const resize = () => {
      const bounds = frame.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      const isDesktopNav = window.matchMedia('(min-width: 1024px)').matches
      const navSize = Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--bottom-nav-height'),
      ) || 0
      const viewport = {
        width: Math.max(1, bounds.width),
        height: Math.max(1, bounds.height),
        dpr,
        topInset: 8,
        bottomInset: isDesktopNav ? 8 : navSize,
        leftInset: 8,
        rightInset: isDesktopNav ? navSize : 8,
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
    const spriteSize = SPRITE_SIZE[characterScale]

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
      simulation.setFrozen(selectedVisitorIdRef.current)

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
          context.ellipse(
            visitor.x,
            visitor.y + 2,
            spriteSize * SHADOW_RADIUS_X_RATIO,
            spriteSize * (isWalking ? SHADOW_RADIUS_Y_WALK_RATIO : SHADOW_RADIUS_Y_IDLE_RATIO),
            0, 0, Math.PI * 2,
          )
          context.fill()
          if (sprite) {
            context.translate(visitor.x, visitor.y - bob)
            context.scale(visitor.facing, 1)
            context.drawImage(sprite, -spriteSize / 2, -spriteSize, spriteSize, spriteSize)
          }
          context.restore()
        }
        context.restore()

        context.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0)
        for (const bubble of simulation.bubbles()) {
          const visitor = simulation.visitors.find((item) => item.id === bubble.visitorId)
          if (!visitor) continue
          const position = worldToScreen({ x: visitor.x, y: visitor.y - spriteSize * BUBBLE_OFFSET_RATIO }, camera, viewport)
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

        const selectedVisitor2D = selectedVisitorIdRef.current
          ? simulation.visitors.find((item) => item.id === selectedVisitorIdRef.current)
          : undefined
        if (selectedVisitor2D) {
          const fallbackMessage = visitors.find((item) => item.id === selectedVisitor2D.id)?.message ?? ''
          const bubbleText = selectedPostRef.current?.text ?? fallbackMessage
          if (bubbleText) {
            const position = worldToScreen(
              { x: selectedVisitor2D.x, y: selectedVisitor2D.y - spriteSize * BUBBLE_OFFSET_RATIO },
              camera,
              viewport,
            )
            drawSpeechBubble(context, position.x, position.y, bubbleText, viewport.width, viewport.height, viewport)
          }
        }
        positionReactionBar(
          reactionBarRef.current,
          selectedPostRef.current ? selectedVisitor2D : undefined,
          camera,
          viewport,
          spriteSize,
        )

        const currentUser = simulation.userVisitor()
        if (currentUser) drawUserMarker(context, currentUser, camera, viewport, spriteSize)
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
  }, [avatar, visitors, characterScale])

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    if (event.target instanceof HTMLButtonElement) return
    if (reactionBarRef.current?.contains(event.target as Node)) return
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

  const handleFrameClick = (event: MouseEvent<HTMLDivElement>) => {
    if (gestureRef.current.moved) return
    if (event.target instanceof HTMLButtonElement) return
    if (reactionBarRef.current?.contains(event.target as Node)) return
    const frame = frameRef.current
    const simulation = simulationRef.current
    if (!frame || !simulation) return

    const bounds = frame.getBoundingClientRect()
    const point = { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
    const world = screenToWorld(point, cameraRef.current, viewportRef.current)
    const spriteSize = SPRITE_SIZE[characterScale]
    const hitRadius = spriteSize / 2

    let nearest: PlazaVisitor2D | null = null
    let nearestDistance = Infinity
    for (const visitor of simulation.visitors) {
      if (visitor.isUser) continue
      const characterCenterY = visitor.y - spriteSize / 2
      const distance = Math.hypot(visitor.x - world.x, characterCenterY - world.y)
      if (distance <= hitRadius && distance < nearestDistance) {
        nearest = visitor
        nearestDistance = distance
      }
    }

    onVisitorTap(nearest ? nearest.id : null)
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
      onClick={handleFrameClick}
    >
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />

      <button
        ref={boardButtonRef}
        type="button"
        className={styles.boardHotspot}
        data-sfx="navigate"
        aria-label="まちの掲示板を開く"
        onClick={openBulletinBoard}
      />

      <div className={styles.guide} aria-hidden="true">
        <span>↔</span> ドラッグで見渡せます
      </div>

      <button type="button" className={styles.recenterButton} data-sfx="select" onClick={recenterOnUser}>
        <span aria-hidden="true">⌖</span>
        あなたを探す
      </button>

      {selectedPost && (
        <div
          ref={reactionBarRef}
          className={styles.reactionBar}
          aria-label={`${selectedPost.nickname}の投稿へのリアクション`}
        >
          {REACTIONS.map((reaction) => {
            const count = selectedPost.reactions[reaction.value]
            const isMine = selectedPost.myReactions.includes(reaction.value)
            return (
              <button
                key={reaction.value}
                type="button"
                className={`${styles.reactionBtn} ${isMine ? styles.reactionBtnActive : ''}`}
                data-sfx="select"
                aria-pressed={isMine}
                aria-label={reaction.label + (count ? `（${count}件）` : '')}
                onClick={() => onReact(selectedPost.id, reaction.value)}
              >
                <span aria-hidden="true">{reaction.emoji}</span>
                {count > 0 && <span className={styles.reactionCount}>{count}</span>}
              </button>
            )
          })}
        </div>
      )}

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
  spriteSize: number,
) {
  const position = worldToScreen({ x: visitor.x, y: visitor.y - spriteSize * LABEL_OFFSET_RATIO }, camera, viewport)
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

function positionReactionBar(
  element: HTMLDivElement | null,
  visitor: PlazaVisitor2D | undefined,
  camera: Camera,
  viewport: Viewport,
  spriteSize: number,
) {
  if (!element) return
  if (!visitor) {
    element.hidden = true
    return
  }
  const position = worldToScreen(
    { x: visitor.x, y: visitor.y + spriteSize * REACTION_BAR_OFFSET_RATIO },
    camera,
    viewport,
  )
  const halfWidth = REACTION_BAR_WIDTH / 2
  const clampedX = Math.max(
    viewport.leftInset + REACTION_BAR_MARGIN + halfWidth,
    Math.min(viewport.width - viewport.rightInset - REACTION_BAR_MARGIN - halfWidth, position.x),
  )
  const clampedY = Math.max(
    viewport.topInset + REACTION_BAR_MARGIN,
    Math.min(
      viewport.height - viewport.bottomInset - REACTION_BAR_HEIGHT - REACTION_BAR_MARGIN,
      position.y,
    ),
  )
  element.style.left = `${clampedX}px`
  element.style.top = `${clampedY}px`
  element.hidden = false
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
