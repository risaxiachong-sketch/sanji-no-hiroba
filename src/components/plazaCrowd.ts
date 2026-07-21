import type { ClusterId, TopicId } from '../types/plaza'
import { TOPICS } from '../types/plaza'

/**
 * Crowd behaviour for the plaza.
 *
 * Visitors are not parked on fixed pads any more. Each one carries a topic and
 * stands in that topic's conversation circle; every so often a single person
 * peels off, wanders, and settles back in. The plaza should read as a handful
 * of calm, spread-out conversations rather than a crowd in permanent motion,
 * so only a few people are ever walking at once. Everything here is plain 2D
 * math in the three.js ground plane (x / z); the renderer adds the height.
 */

export type CrowdVisitor = {
  topic: TopicId
  variant: number
  x: number
  z: number
  velocityX: number
  velocityZ: number
  facing: number
  /** Per-visitor phase so the walk bob is not synchronised across the crowd. */
  bobPhase: number
  mode: 'gather' | 'wander'
  modeTimer: number
  wanderX: number
  wanderZ: number
  /** Fixed place in the group's circle, so a settled visitor truly stops moving. */
  slotAngle: number
  slotRadius: number
}

type Hub = {
  x: number
  z: number
  anchorIndex: number
  timer: number
}

export type CrowdGathering = {
  topic: TopicId
  x: number
  z: number
  memberCount: number
}

const PLAZA_RADIUS = 14.8
const VISITOR_VARIANTS = 6
const VISITORS_PER_TOPIC = 6

/** Everyone in the plaza, excluding the user. */
export const PLAZA_VISITOR_COUNT = VISITORS_PER_TOPIC * TOPICS.length

const PERSONAL_SPACE = 1.02
const WALK_SPEED = 1.15

/** At most this many visitors are walking at any moment; the rest are talking. */
const MAX_WALKERS = 3

/**
 * Meeting spots, spread to the edge of the plaza so groups sit apart from each
 * other instead of bunching around the fountain. Every anchor clears the
 * fountain and the planted islands by 3.5m, and no two are closer than 5.6m.
 */
const HUB_ANCHORS: Array<[number, number]> = [
  [8.3, 10.3],
  [-5.5, -12.4],
  [-8.6, 10.6],
  [13.4, -2.1],
  [-13.4, -2.1],
  [5.5, -12.4],
  [0, 13.6],
  [0, -7.6],
  [-2.3, 7.2],
  [3.5, 6.8],
  [0, -13.6],
]

/** Hubs must stay this far apart, so a relocating group never lands on a neighbour. */
const MIN_HUB_SEPARATION = 5.5

/** Things visitors walk around: the fountain and the four planted islands. */
const OBSTACLES: Array<[number, number, number]> = [
  [0, 0, 2.9],
  [-9.6, 4.2, 2.6],
  [9.6, 4.1, 2.6],
  [-9.1, -7.1, 2.5],
  [9.1, -7, 2.5],
]

/** Small deterministic PRNG so the plaza looks the same on every reload. */
function createRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

function clampToPlaza(x: number, z: number): [number, number] {
  const distance = Math.hypot(x, z)
  if (distance <= PLAZA_RADIUS) return [x, z]
  const scale = PLAZA_RADIUS / distance
  return [x * scale, z * scale]
}

export class PlazaCrowd {
  readonly visitors: CrowdVisitor[] = []
  private readonly hubs = new Map<TopicId, Hub>()
  private readonly random: () => number
  private walkerCount = 0

  constructor(seed = 20260721) {
    this.random = createRandom(seed)

    const shuffledAnchors = HUB_ANCHORS.map((_, index) => index)
    for (let i = shuffledAnchors.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.random() * (i + 1))
      ;[shuffledAnchors[i], shuffledAnchors[j]] = [shuffledAnchors[j], shuffledAnchors[i]]
    }

    TOPICS.forEach((topic, topicIndex) => {
      const anchorIndex = shuffledAnchors[topicIndex % shuffledAnchors.length]
      const [hubX, hubZ] = HUB_ANCHORS[anchorIndex]
      this.hubs.set(topic.id, {
        x: hubX,
        z: hubZ,
        anchorIndex,
        timer: 60 + this.random() * 120,
      })

      for (let member = 0; member < VISITORS_PER_TOPIC; member += 1) {
        // Evenly spaced places in the circle, jittered so it never looks stamped out.
        const slotAngle =
          (member / VISITORS_PER_TOPIC) * Math.PI * 2 + this.random() * 0.35 - 0.175
        const slotRadius = 1.05 + this.random() * 0.4
        const startX = hubX + Math.cos(slotAngle) * slotRadius
        const startZ = hubZ + Math.sin(slotAngle) * slotRadius

        this.visitors.push({
          topic: topic.id,
          variant: (topicIndex * VISITORS_PER_TOPIC + member) % VISITOR_VARIANTS,
          x: startX,
          z: startZ,
          velocityX: 0,
          velocityZ: 0,
          facing: Math.atan2(hubX - startX, hubZ - startZ),
          bobPhase: this.random() * Math.PI * 2,
          mode: 'gather',
          modeTimer: 20 + this.random() * 160,
          wanderX: startX,
          wanderZ: startZ,
          slotAngle,
          slotRadius,
        })
      }
    })

    // Without this, every visitor starts settled and the plaza reads as a still
    // image for up to three minutes before the first walker's timer runs out.
    // Starting a few people already mid-walk makes the square feel alive right
    // from the first frame.
    for (let index = 0; index < MAX_WALKERS && index < this.visitors.length; index += 1) {
      const visitor = this.visitors[Math.floor(this.random() * this.visitors.length)]
      if (visitor.mode === 'wander') continue
      this.beginWander(visitor)
      // Partway through its walk already, not just setting off.
      visitor.modeTimer *= this.random()
    }
  }

  /** Where a topic is currently meeting, so the user avatar can walk to the same spot. */
  gatheringPoint(cluster: ClusterId): { x: number; z: number } | null {
    if (cluster === 'quiet') return null
    const hub = this.hubs.get(cluster)
    return hub ? { x: hub.x, z: hub.z } : null
  }

  /** Live snapshot for the topic labels: who is meeting where, biggest group first. */
  gatherings(): CrowdGathering[] {
    const counts = new Map<TopicId, number>()
    for (const visitor of this.visitors) {
      if (visitor.mode !== 'gather') continue
      const hub = this.hubs.get(visitor.topic)
      if (!hub) continue
      if (Math.hypot(visitor.x - hub.x, visitor.z - hub.z) > 2.6) continue
      counts.set(visitor.topic, (counts.get(visitor.topic) ?? 0) + 1)
    }

    return TOPICS.map((topic) => {
      const hub = this.hubs.get(topic.id)
      return {
        topic: topic.id,
        x: hub?.x ?? 0,
        z: hub?.z ?? 0,
        memberCount: counts.get(topic.id) ?? 0,
      }
    }).sort((a, b) => b.memberCount - a.memberCount)
  }

  private relocateHub(topic: TopicId, hub: Hub): void {
    const others = [...this.hubs.entries()]
      .filter(([otherTopic]) => otherTopic !== topic)
      .map(([, otherHub]) => otherHub)
    const taken = new Set(others.map((otherHub) => otherHub.anchorIndex))

    const candidates = HUB_ANCHORS.map((anchor, index) => ({ anchor, index })).filter(
      ({ anchor, index }) =>
        index !== hub.anchorIndex &&
        !taken.has(index) &&
        others.every(
          (otherHub) =>
            Math.hypot(anchor[0] - otherHub.x, anchor[1] - otherHub.z) >= MIN_HUB_SEPARATION,
        ),
    )

    hub.timer = 70 + this.random() * 130
    if (candidates.length === 0) return

    const next = candidates[Math.floor(this.random() * candidates.length)]
    hub.anchorIndex = next.index
    hub.x = next.anchor[0]
    hub.z = next.anchor[1]
  }

  private beginWander(visitor: CrowdVisitor): void {
    visitor.mode = 'wander'
    visitor.modeTimer = 6 + this.random() * 9
    this.walkerCount += 1

    const angle = this.random() * Math.PI * 2
    const radius = 4 + this.random() * (PLAZA_RADIUS - 5)
    ;[visitor.wanderX, visitor.wanderZ] = clampToPlaza(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
    )
  }

  private endWander(visitor: CrowdVisitor): void {
    visitor.mode = 'gather'
    // Long settled stretches, so the plaza stays calm between departures.
    visitor.modeTimer = 45 + this.random() * 150
    this.walkerCount -= 1
    // Take a fresh place in the circle, so the group reshuffles as people return.
    visitor.slotAngle = this.random() * Math.PI * 2
    visitor.slotRadius = 1.05 + this.random() * 0.4
  }

  step(delta: number): void {
    const dt = Math.min(delta, 0.1)

    for (const [topic, hub] of this.hubs) {
      hub.timer -= dt
      if (hub.timer <= 0) this.relocateHub(topic, hub)
    }

    for (const visitor of this.visitors) {
      visitor.modeTimer -= dt
      if (visitor.modeTimer <= 0) {
        if (visitor.mode === 'wander') {
          this.endWander(visitor)
        } else if (this.walkerCount < MAX_WALKERS) {
          this.beginWander(visitor)
        } else {
          // Someone else is already out walking; stay in the conversation for now.
          visitor.modeTimer = 15 + this.random() * 45
        }
      }

      const hub = this.hubs.get(visitor.topic)
      let targetX: number
      let targetZ: number
      if (visitor.mode === 'gather' && hub) {
        targetX = hub.x + Math.cos(visitor.slotAngle) * visitor.slotRadius
        targetZ = hub.z + Math.sin(visitor.slotAngle) * visitor.slotRadius
      } else {
        targetX = visitor.wanderX
        targetZ = visitor.wanderZ
      }

      const toTargetX = targetX - visitor.x
      const toTargetZ = targetZ - visitor.z
      const distance = Math.hypot(toTargetX, toTargetZ) || 1

      // Ease off on arrival, then stop dead so a settled circle holds still.
      const speed = distance < 0.08 ? 0 : WALK_SPEED * Math.min(1, distance / 0.9)
      let desiredX = (toTargetX / distance) * speed
      let desiredZ = (toTargetZ / distance) * speed

      for (const other of this.visitors) {
        if (other === visitor) continue
        const dx = visitor.x - other.x
        const dz = visitor.z - other.z
        const gap = Math.hypot(dx, dz)
        if (gap > PERSONAL_SPACE || gap === 0) continue
        const push = (PERSONAL_SPACE - gap) / PERSONAL_SPACE
        desiredX += (dx / gap) * push * WALK_SPEED * 1.2
        desiredZ += (dz / gap) * push * WALK_SPEED * 1.2
      }

      for (const [ox, oz, radius] of OBSTACLES) {
        const dx = visitor.x - ox
        const dz = visitor.z - oz
        const gap = Math.hypot(dx, dz)
        if (gap > radius || gap === 0) continue
        const push = (radius - gap) / radius
        desiredX += (dx / gap) * push * WALK_SPEED * 2.4
        desiredZ += (dz / gap) * push * WALK_SPEED * 2.4
      }

      const smoothing = 1 - Math.exp(-dt * 3.2)
      visitor.velocityX += (desiredX - visitor.velocityX) * smoothing
      visitor.velocityZ += (desiredZ - visitor.velocityZ) * smoothing

      visitor.x += visitor.velocityX * dt
      visitor.z += visitor.velocityZ * dt
      ;[visitor.x, visitor.z] = clampToPlaza(visitor.x, visitor.z)

      const moving = Math.hypot(visitor.velocityX, visitor.velocityZ)
      if (moving > 0.12) {
        visitor.facing = Math.atan2(visitor.velocityX, visitor.velocityZ)
        visitor.bobPhase += dt * 9
      } else if (visitor.mode === 'gather' && hub) {
        // Settled members turn toward the middle, so the circle reads as a conversation.
        const inward = Math.atan2(hub.x - visitor.x, hub.z - visitor.z)
        let difference = inward - visitor.facing
        while (difference > Math.PI) difference -= Math.PI * 2
        while (difference < -Math.PI) difference += Math.PI * 2
        visitor.facing += difference * (1 - Math.exp(-dt * 2))
      }
    }
  }
}
