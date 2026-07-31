import type { MapPoint, WalkGrid } from './pathfinding'
import { findPath, nearestWalkablePoint, randomWalkablePoint } from './pathfinding'

export type PlazaParticipant = {
  id: string
  spriteUrl: string
  message: string
  startX: number
  startY: number
  isUser?: boolean
}

export type VisitorMode = 'idle' | 'walk' | 'approach' | 'talk'

export type PlazaVisitor2D = {
  id: string
  spriteUrl: string
  isUser: boolean
  x: number
  y: number
  facing: -1 | 1
  bobPhase: number
  mode: VisitorMode
  path: MapPoint[]
  pathIndex: number
  waitTimer: number
  conversationCooldown: number
  partnerId: string | null
}

export type PlazaBubble2D = {
  visitorId: string
  text: string
}

type Conversation = {
  firstId: string
  secondId: string
  state: 'approach' | 'talk'
  timer: number
  elapsed: number
  post: string
  reply: string
}

const WALK_SPEED = 58
const MAX_CONVERSATIONS = 2
const TALK_TURN_SECONDS = 2.7
const ACKNOWLEDGEMENTS = [
  'わかるよ、うちも同じです',
  '今日も本当におつかれさま',
  '話してくれてありがとう',
  'ここではゆっくりしてね',
  'それは大変だったね',
]

function createRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

function distanceBetween(first: MapPoint, second: MapPoint) {
  return Math.hypot(first.x - second.x, first.y - second.y)
}

export class PlazaSimulation {
  readonly visitors: PlazaVisitor2D[]
  private readonly grid: WalkGrid
  private readonly random: () => number
  private readonly fallbackMessages: string[]
  private posts: string[]
  private conversations: Conversation[] = []
  private conversationTimer = 1.5
  private postCursor = 0

  constructor(grid: WalkGrid, participants: PlazaParticipant[], posts: string[], seed = 20260801) {
    this.grid = grid
    this.random = createRandom(seed)
    this.posts = posts.filter(Boolean)
    this.fallbackMessages = participants.map((participant) => participant.message).filter(Boolean)
    this.visitors = participants.map((participant, index) => {
      const preferred = participant.isUser
        ? { x: 760, y: 625 }
        : {
            x: participant.startX * grid.columns * grid.cellSize,
            y: participant.startY * grid.rows * grid.cellSize,
          }
      const start = nearestWalkablePoint(grid, preferred)
      return {
        id: participant.id,
        spriteUrl: participant.spriteUrl,
        isUser: participant.isUser ?? false,
        x: start.x,
        y: start.y,
        facing: index % 2 === 0 ? 1 : -1,
        bobPhase: this.random() * Math.PI * 2,
        mode: 'idle',
        path: [],
        pathIndex: 0,
        waitTimer: 0.4 + this.random() * 3,
        conversationCooldown: this.random() * 4,
        partnerId: null,
      } satisfies PlazaVisitor2D
    })
  }

  setPosts(posts: string[]) {
    this.posts = posts.filter(Boolean)
  }

  userVisitor() {
    return this.visitors.find((visitor) => visitor.isUser) ?? null
  }

  bubbles(): PlazaBubble2D[] {
    return this.conversations.flatMap((conversation) => {
      if (conversation.state !== 'talk') return []
      const firstSpeaking = Math.floor(conversation.elapsed / TALK_TURN_SECONDS) % 2 === 0
      return [{
        visitorId: firstSpeaking ? conversation.firstId : conversation.secondId,
        text: firstSpeaking ? conversation.post : conversation.reply,
      }]
    })
  }

  step(delta: number) {
    const elapsed = Math.min(delta, 0.05)
    for (const visitor of this.visitors) {
      visitor.conversationCooldown = Math.max(0, visitor.conversationCooldown - elapsed)
      if (visitor.mode === 'walk' || visitor.mode === 'approach') {
        this.moveVisitor(visitor, elapsed)
      } else if (visitor.mode === 'idle') {
        visitor.waitTimer -= elapsed
        if (visitor.waitTimer <= 0) this.beginWander(visitor)
      }
    }

    this.stepConversations(elapsed)
    this.conversationTimer -= elapsed
    if (this.conversationTimer <= 0 && this.conversations.length < MAX_CONVERSATIONS) {
      this.tryStartConversation()
      this.conversationTimer = 2.5 + this.random() * 3.5
    }
  }

  private moveVisitor(visitor: PlazaVisitor2D, delta: number) {
    const target = visitor.path[visitor.pathIndex]
    if (!target) {
      if (visitor.mode === 'walk') this.beginIdle(visitor)
      return
    }

    const dx = target.x - visitor.x
    const dy = target.y - visitor.y
    const distance = Math.hypot(dx, dy)
    const movement = Math.min(distance, WALK_SPEED * delta)
    if (distance > 0) {
      visitor.x += (dx / distance) * movement
      visitor.y += (dy / distance) * movement
      if (Math.abs(dx) > 0.25) visitor.facing = dx >= 0 ? 1 : -1
      visitor.bobPhase += delta * 10
    }

    if (distance <= WALK_SPEED * delta + 0.1) {
      visitor.x = target.x
      visitor.y = target.y
      visitor.pathIndex += 1
      if (visitor.pathIndex >= visitor.path.length) {
        visitor.path = []
        visitor.pathIndex = 0
        if (visitor.mode === 'walk') this.beginIdle(visitor)
      }
    }
  }

  private beginIdle(visitor: PlazaVisitor2D) {
    visitor.mode = 'idle'
    visitor.waitTimer = 1.5 + this.random() * 4.5
  }

  private beginWander(visitor: PlazaVisitor2D) {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const destination = randomWalkablePoint(this.grid, this.random)
      if (distanceBetween(visitor, destination) < 150) continue
      const path = findPath(this.grid, visitor, destination)
      if (path.length === 0) continue
      visitor.mode = 'walk'
      visitor.path = path
      visitor.pathIndex = 0
      return
    }
    visitor.waitTimer = 2
  }

  private tryStartConversation() {
    const eligible = this.visitors.filter((visitor) => (
      visitor.mode !== 'approach'
      && visitor.mode !== 'talk'
      && visitor.conversationCooldown <= 0
      && visitor.partnerId === null
    ))
    if (eligible.length < 2) return

    const first = eligible[Math.floor(this.random() * eligible.length)]
    const candidates = eligible
      .filter((visitor) => visitor !== first)
      .sort((left, right) => distanceBetween(first, left) - distanceBetween(first, right))
    const second = candidates[Math.floor(this.random() * Math.min(3, candidates.length))]
    if (!first || !second) return

    const midpoint = nearestWalkablePoint(this.grid, {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2,
    })
    const firstTarget = nearestWalkablePoint(this.grid, { x: midpoint.x - 22, y: midpoint.y })
    const secondTarget = nearestWalkablePoint(this.grid, { x: midpoint.x + 22, y: midpoint.y })
    const firstPath = findPath(this.grid, first, firstTarget)
    const secondPath = findPath(this.grid, second, secondTarget)
    if (firstPath.length === 0 || secondPath.length === 0) return

    first.mode = 'approach'
    second.mode = 'approach'
    first.path = firstPath
    second.path = secondPath
    first.pathIndex = 0
    second.pathIndex = 0
    first.partnerId = second.id
    second.partnerId = first.id

    this.conversations.push({
      firstId: first.id,
      secondId: second.id,
      state: 'approach',
      timer: 0,
      elapsed: 0,
      post: this.nextPost(),
      reply: ACKNOWLEDGEMENTS[Math.floor(this.random() * ACKNOWLEDGEMENTS.length)],
    })
  }

  private stepConversations(delta: number) {
    for (const conversation of [...this.conversations]) {
      const first = this.visitors.find((visitor) => visitor.id === conversation.firstId)
      const second = this.visitors.find((visitor) => visitor.id === conversation.secondId)
      if (!first || !second) {
        this.conversations = this.conversations.filter((item) => item !== conversation)
        continue
      }

      if (conversation.state === 'approach') {
        if (first.path.length === 0 && second.path.length === 0) {
          conversation.state = 'talk'
          conversation.timer = 8 + this.random() * 5
          first.mode = 'talk'
          second.mode = 'talk'
          first.facing = first.x <= second.x ? 1 : -1
          second.facing = second.x <= first.x ? 1 : -1
        }
        continue
      }

      conversation.timer -= delta
      conversation.elapsed += delta
      if (conversation.timer <= 0) this.endConversation(conversation, first, second)
    }
  }

  private endConversation(
    conversation: Conversation,
    first: PlazaVisitor2D,
    second: PlazaVisitor2D,
  ) {
    this.conversations = this.conversations.filter((item) => item !== conversation)
    for (const visitor of [first, second]) {
      visitor.partnerId = null
      visitor.conversationCooldown = 7 + this.random() * 8
      this.beginIdle(visitor)
    }
  }

  private nextPost() {
    const messages = this.posts.length > 0 ? this.posts : this.fallbackMessages
    if (messages.length === 0) return '今日はここで、ひと休みしています'
    const message = messages[this.postCursor % messages.length]
    this.postCursor += 1
    return message
  }
}
