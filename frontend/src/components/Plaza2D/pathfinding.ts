export type MapPoint = {
  x: number
  y: number
}

export type WalkGrid = {
  cellSize: number
  columns: number
  rows: number
  cells: Uint8Array
  walkableIndices: number[]
}

const DIRECTIONS = [
  [-1, 0, 1],
  [1, 0, 1],
  [0, -1, 1],
  [0, 1, 1],
  [-1, -1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [1, 1, Math.SQRT2],
] as const

class MinHeap {
  private values: Array<{ index: number; score: number }> = []

  get size() {
    return this.values.length
  }

  push(value: { index: number; score: number }) {
    this.values.push(value)
    let index = this.values.length - 1
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2)
      if (this.values[parent].score <= value.score) break
      this.values[index] = this.values[parent]
      index = parent
    }
    this.values[index] = value
  }

  pop() {
    const first = this.values[0]
    const last = this.values.pop()
    if (!first || !last || this.values.length === 0) return first

    let index = 0
    while (true) {
      const left = index * 2 + 1
      const right = left + 1
      if (left >= this.values.length) break
      const child = right < this.values.length && this.values[right].score < this.values[left].score
        ? right
        : left
      if (this.values[child].score >= last.score) break
      this.values[index] = this.values[child]
      index = child
    }
    this.values[index] = last
    return first
  }
}

function isWalkablePixel(imageData: ImageData, x: number, y: number) {
  if (x < 0 || y < 0 || x >= imageData.width || y >= imageData.height) return false
  const offset = (Math.floor(y) * imageData.width + Math.floor(x)) * 4
  const luminance = (
    imageData.data[offset]
    + imageData.data[offset + 1]
    + imageData.data[offset + 2]
  ) / 3
  return luminance >= 190
}

export function buildWalkGrid(imageData: ImageData, cellSize = 14, clearance = 11): WalkGrid {
  const columns = Math.floor(imageData.width / cellSize)
  const rows = Math.floor(imageData.height / cellSize)
  const cells = new Uint8Array(columns * rows)
  const walkableIndices: number[] = []
  const samples = [-clearance, 0, clearance]

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const centerX = (column + 0.5) * cellSize
      const centerY = (row + 0.5) * cellSize
      const walkable = samples.every((offsetX) => samples.every((offsetY) => (
        isWalkablePixel(imageData, centerX + offsetX, centerY + offsetY)
      )))
      const index = row * columns + column
      if (walkable) {
        cells[index] = 1
        walkableIndices.push(index)
      }
    }
  }

  return { cellSize, columns, rows, cells, walkableIndices }
}

function pointToIndex(grid: WalkGrid, point: MapPoint) {
  const column = Math.max(0, Math.min(grid.columns - 1, Math.floor(point.x / grid.cellSize)))
  const row = Math.max(0, Math.min(grid.rows - 1, Math.floor(point.y / grid.cellSize)))
  return row * grid.columns + column
}

export function indexToPoint(grid: WalkGrid, index: number): MapPoint {
  return {
    x: (index % grid.columns + 0.5) * grid.cellSize,
    y: (Math.floor(index / grid.columns) + 0.5) * grid.cellSize,
  }
}

export function nearestWalkablePoint(grid: WalkGrid, point: MapPoint): MapPoint {
  const directIndex = pointToIndex(grid, point)
  if (grid.cells[directIndex]) return indexToPoint(grid, directIndex)

  let nearestIndex = grid.walkableIndices[0] ?? directIndex
  let nearestDistance = Infinity
  for (const index of grid.walkableIndices) {
    const candidate = indexToPoint(grid, index)
    const distance = (candidate.x - point.x) ** 2 + (candidate.y - point.y) ** 2
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestIndex = index
    }
  }
  return indexToPoint(grid, nearestIndex)
}

function heuristic(grid: WalkGrid, from: number, to: number) {
  const fromColumn = from % grid.columns
  const fromRow = Math.floor(from / grid.columns)
  const toColumn = to % grid.columns
  const toRow = Math.floor(to / grid.columns)
  const dx = Math.abs(fromColumn - toColumn)
  const dy = Math.abs(fromRow - toRow)
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy)
}

export function findPath(grid: WalkGrid, start: MapPoint, destination: MapPoint): MapPoint[] {
  const snappedStart = nearestWalkablePoint(grid, start)
  const snappedDestination = nearestWalkablePoint(grid, destination)
  const startIndex = pointToIndex(grid, snappedStart)
  const destinationIndex = pointToIndex(grid, snappedDestination)
  if (startIndex === destinationIndex) return [snappedDestination]

  const totalCells = grid.columns * grid.rows
  const scores = new Float64Array(totalCells)
  const previous = new Int32Array(totalCells)
  const closed = new Uint8Array(totalCells)
  scores.fill(Infinity)
  previous.fill(-1)
  scores[startIndex] = 0

  const open = new MinHeap()
  open.push({ index: startIndex, score: heuristic(grid, startIndex, destinationIndex) })

  while (open.size > 0) {
    const current = open.pop()
    if (!current || closed[current.index]) continue
    if (current.index === destinationIndex) {
      const path: MapPoint[] = []
      let index = destinationIndex
      while (index !== -1 && index !== startIndex) {
        path.push(indexToPoint(grid, index))
        index = previous[index]
      }
      path.reverse()
      return path
    }

    closed[current.index] = 1
    const column = current.index % grid.columns
    const row = Math.floor(current.index / grid.columns)

    for (const [columnOffset, rowOffset, cost] of DIRECTIONS) {
      const nextColumn = column + columnOffset
      const nextRow = row + rowOffset
      if (
        nextColumn < 0
        || nextRow < 0
        || nextColumn >= grid.columns
        || nextRow >= grid.rows
      ) continue

      const nextIndex = nextRow * grid.columns + nextColumn
      if (!grid.cells[nextIndex] || closed[nextIndex]) continue
      if (columnOffset !== 0 && rowOffset !== 0) {
        const horizontal = row * grid.columns + nextColumn
        const vertical = nextRow * grid.columns + column
        if (!grid.cells[horizontal] || !grid.cells[vertical]) continue
      }

      const nextScore = scores[current.index] + cost
      if (nextScore >= scores[nextIndex]) continue
      scores[nextIndex] = nextScore
      previous[nextIndex] = current.index
      open.push({
        index: nextIndex,
        score: nextScore + heuristic(grid, nextIndex, destinationIndex),
      })
    }
  }

  return []
}

export function randomWalkablePoint(grid: WalkGrid, random: () => number): MapPoint {
  const index = grid.walkableIndices[Math.floor(random() * grid.walkableIndices.length)]
  return indexToPoint(grid, index ?? 0)
}
