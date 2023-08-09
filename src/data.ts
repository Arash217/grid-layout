export const testLayout = [
  {
    x: 0,
    y: 0,
    w: 8,
    h: 3,
    minW: 8,
    minH: 3,
    i: crypto.randomUUID(),
  },
  {
    x: 8,
    y: 0,
    w: 12,
    h: 6,
    minW: 8,
    minH: 6,
    i: crypto.randomUUID(),
  },
  {
    x: 20,
    y: 0,
    w: 8,
    h: 6,
    minW: 8,
    minH: 6,
    i: crypto.randomUUID(),
    minAspectRatio: 0.5,
    maxAspectRatio: 2,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resizeHandles: ['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne'] as any,
  },
]

export type DataType = typeof testLayout