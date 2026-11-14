// Builds a bare git repo with dummy notes for README screenshots.
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const MIN = 60
const HOUR = 60 * MIN
const DAY = 24 * HOUR

const stroke = (id, d, color = '#3a3a3a', size = 3) =>
  `<path id="id-${id}" d="${d}" stroke="${color}" stroke-width="${size}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`

const figure = (paths) =>
  `<figure data-type="drawing" class="sketch">\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 250">${paths.join('')}</svg>\n</figure>`

const PURPLE = '#6b2d8f'

const shelfSketch = figure([
  // wall
  stroke('wall', 'M38 24 C37 80 40 150 38 226', '#8a8a8a', 3),
  // board
  stroke('board-top', 'M38 112 C140 109 300 114 428 111'),
  stroke('board-bottom', 'M38 130 C150 132 300 128 428 131'),
  stroke('board-end', 'M428 111 C431 118 430 125 428 131'),
  // brackets
  stroke('bracket-1', 'M110 131 C109 150 111 165 110 176 M110 176 C125 160 138 146 148 132'),
  stroke('bracket-2', 'M330 131 C329 150 331 165 330 176 M330 176 C345 160 358 146 368 132'),
  // plant
  stroke(
    'pot',
    'M262 111 C264 98 266 92 268 86 C282 87 296 86 308 87 C310 94 312 102 314 110',
    PURPLE,
    3,
  ),
  stroke('stem-1', 'M288 86 C287 66 289 50 296 36', PURPLE, 3),
  stroke('leaf-1', 'M296 36 C312 40 322 52 318 66 C306 64 296 52 296 36', PURPLE, 3),
  stroke('stem-2', 'M284 86 C278 70 268 58 254 52', PURPLE, 3),
  stroke('leaf-2', 'M254 52 C246 64 248 76 258 84 C266 76 266 62 254 52', PURPLE, 3),
  // books
  stroke(
    'book-1',
    'M150 112 C150 92 151 80 150 66 C160 65 168 66 176 66 C177 80 176 98 176 111',
    PURPLE,
    3,
  ),
  stroke(
    'book-2',
    'M180 112 C181 96 180 86 181 74 C190 73 198 74 206 74 C207 88 206 100 206 111',
    PURPLE,
    3,
  ),
  // dimension line
  stroke('dim', 'M40 204 C150 203 300 205 426 204', '#3a3a3a', 2),
  stroke('dim-l', 'M52 196 C46 200 42 202 40 204 C43 207 47 209 52 212', '#3a3a3a', 2),
  stroke('dim-r', 'M414 196 C420 200 424 202 426 204 C423 207 419 209 414 212', '#3a3a3a', 2),
  // "80 cm"
  stroke(
    't8',
    'M198 226 C186 222 188 212 198 213 C208 214 208 223 198 226 C188 230 188 238 198 239 C208 239 210 230 198 226',
    '#3a3a3a',
    2.5,
  ),
  stroke('t0', 'M224 213 C214 214 214 238 224 238 C234 238 234 213 224 213', '#3a3a3a', 2.5),
  stroke('tc', 'M268 218 C258 212 252 222 254 230 C256 238 264 240 270 234', '#3a3a3a', 2.5),
  stroke(
    'tm',
    'M280 240 C280 230 280 222 281 216 C282 214 287 214 288 220 C288 228 288 234 289 240 C289 230 289 222 292 216 C296 214 298 220 298 240',
    '#3a3a3a',
    2.5,
  ),
])

const bedSketch = figure([
  stroke(
    'bed',
    'M80 70 C180 64 320 72 420 68 C424 110 422 150 418 190 C320 196 180 188 82 194 C78 150 80 110 80 70',
    '#8a5a2b',
    3,
  ),
  stroke('mid', 'M250 70 C251 110 249 150 250 192', '#8a5a2b', 2),
  stroke('t1', 'M130 100 C128 120 132 140 130 160 M112 122 C124 118 140 124 148 120', PURPLE, 3),
  stroke('t2', 'M180 110 C178 130 182 150 180 168 M164 128 C174 124 190 130 198 126', PURPLE, 3),
  stroke('b1', 'M310 100 C330 96 346 106 344 122 C330 128 312 120 310 100', '#2f7d4f', 3),
  stroke('b2', 'M360 130 C380 126 396 136 394 152 C380 158 362 150 360 130', '#2f7d4f', 3),
  stroke('b3', 'M305 150 C322 146 336 154 334 168 C322 174 306 166 305 150', '#2f7d4f', 3),
])

const shelfBoard = JSON.stringify({
  nodes: [
    {
      id: 'g-now',
      type: 'group',
      label: 'This weekend',
      x: -40,
      y: -80,
      width: 780,
      height: 720,
      color: '3',
    },
    {
      id: 'g-later',
      type: 'group',
      label: 'Later',
      x: 800,
      y: -80,
      width: 360,
      height: 720,
      color: '5',
    },
    {
      id: 'title',
      type: 'text',
      text: '# Hallway shelf\nFloating oak shelf, 80 cm wide',
      x: 0,
      y: -10,
      width: 300,
      height: 110,
      color: '4',
    },
    {
      id: 'shopping',
      type: 'text',
      text: '## Shopping\n- Oak board, 80 cm\n- 2 brackets\n- Hard wax oil',
      x: 0,
      y: 160,
      width: 300,
      height: 190,
      color: '2',
    },
    {
      id: 'steps',
      type: 'text',
      text: '## Steps\n1. Measure the wall\n2. Sand the board\n3. Oil and let dry\n4. Mount brackets',
      x: 0,
      y: 400,
      width: 300,
      height: 220,
      color: '6',
    },
    {
      id: 'note',
      type: 'file',
      file: 'Weekend shelf build.md',
      x: 380,
      y: -10,
      width: 320,
      height: 490,
    },
    {
      id: 'ref',
      type: 'text',
      text: 'Reference: https://www.woodworking-basics.com/floating-shelves',
      x: 380,
      y: 510,
      width: 320,
      height: 110,
    },
    {
      id: 'garden',
      type: 'text',
      text: '## Garden beds\nTulips left, herbs right',
      x: 840,
      y: -10,
      width: 280,
      height: 130,
    },
    {
      id: 'trip',
      type: 'text',
      text: '## Lisbon trip\nBook flights by end of March',
      x: 840,
      y: 160,
      width: 280,
      height: 130,
    },
    {
      id: 'gift',
      type: 'text',
      text: '## Gift ideas\nPour-over set, harbour map print',
      x: 840,
      y: 330,
      width: 280,
      height: 130,
    },
  ],
  edges: [],
})

// [path, age in seconds, content]
const NOTES = [
  [
    'Weekend shelf build.md',
    12 * MIN,
    `# Weekend shelf build

Floating shelf for the hallway. Rough layout below.

## Plan

- [x] Measure the wall
- [ ] Buy oak board (80 cm)
- [ ] Sand and oil

${shelfSketch}

Inspiration: https://www.woodworking-basics.com/floating-shelves
`,
  ],
  ['Boards/Shelf project.canvas', 25 * MIN, shelfBoard + '\n'],
  [
    'Groceries.md',
    1 * HOUR + 20 * MIN,
    `# Groceries

- [x] Oat milk
- [ ] Eggs
- [ ] Sourdough bread
- [ ] Tomatoes
- [ ] Coffee beans
`,
  ],
  [
    'Travel/Lisbon trip.md',
    3 * HOUR,
    `# Lisbon, May

- Flights: book by end of March
- Stay near Alfama, ideally with a balcony
- [ ] Reserve tickets for the Belém tower
- [ ] Find a good pastel de nata place
`,
  ],
  [
    '2026-11-14T09-12-00.md',
    5 * HOUR,
    `Idea for a tiny weekly review: three wins, one thing to drop, one thing to try next week.`,
  ],
  [
    'Work/Product sync.md',
    1 * DAY + 2 * HOUR,
    `# Product sync

- Ship the onboarding revamp by Friday
- Design review moved to Tuesday
- Pricing page copy needs another pass
- [ ] Send recap to the team
`,
  ],
  [
    'Reading list.md',
    2 * DAY,
    `# Reading list

- **The Pragmatic Programmer**, re-read chapter 3
- Essays on slow software
- [x] Designing Data-Intensive Applications
`,
  ],
  [
    'Recipes/Shakshuka.md',
    4 * DAY,
    `# Shakshuka

Serves 2

- 1 onion, 2 garlic cloves
- 400 g canned tomatoes
- 4 eggs
- Cumin, paprika, feta to finish
`,
  ],
  [
    'Home/Garden beds.md',
    6 * DAY,
    `# Garden beds

Two raised beds along the south fence.

${bedSketch}

- Tulips on the left, herbs on the right
`,
  ],
  [
    'Packing list.md',
    9 * DAY,
    `# Packing list

- [x] Passport
- [x] Charger
- [ ] Rain jacket
- [ ] Sunglasses
`,
  ],
  [
    'Birthday gift ideas.md',
    16 * DAY,
    `# Birthday gift ideas

- A good pour-over set
- Print of the old harbour map
- Concert tickets
`,
  ],
]

const run = (args, cwd, env = {}) =>
  execFileSync('git', args, { cwd, stdio: 'pipe', env: { ...process.env, ...env } })

/**
 * Creates `<root>/repos/notes.git` (served by git-http-mock-server) with the dummy notes.
 * Commits are backdated relative to now so the "recent" list shows natural dates.
 */
export function buildDummyRepo(root) {
  const BARE = join(root, 'repos', 'notes.git')
  const WORK = join(root, 'work')
  rmSync(join(root, 'repos'), { recursive: true, force: true })
  rmSync(WORK, { recursive: true, force: true })
  mkdirSync(join(root, 'repos'), { recursive: true })
  mkdirSync(WORK, { recursive: true })

  run(['init', '--bare', BARE], root)
  run(['init', '-b', 'main'], WORK)
  run(['config', 'user.name', 'Alex Example'], WORK)
  run(['config', 'user.email', 'alex@example.com'], WORK)

  const now = Math.floor(Date.now() / 1000)
  for (const [filepath, age, content] of [...NOTES].sort((a, b) => b[1] - a[1])) {
    const abs = join(WORK, filepath)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content)
    run(['add', filepath], WORK)
    const date = `${now - age} +0000`
    run(['commit', '-m', `Add ${filepath}`], WORK, {
      GIT_AUTHOR_DATE: date,
      GIT_COMMITTER_DATE: date,
    })
  }

  run(['remote', 'add', 'origin', BARE], WORK)
  run(['push', 'origin', 'main'], WORK)
  console.log(`built ${NOTES.length} notes in ${BARE}`)
}
