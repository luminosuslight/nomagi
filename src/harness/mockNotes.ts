const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Sample notes for the component harness: filepath, age in ms, and markdown content. */
const SAMPLES: [filepath: string, age: number, content: string][] = [
  [
    'Ideen/Test Whiteboard.md',
    1 * MINUTE,
    '# foo\nIdeen/Bauen/Werkstattkabine.md\n**Foo!**\n- nice\n- test',
  ],
  [
    'Ideen/Bauen/Werkstattkabine.md',
    7 * MINUTE,
    '# Aus Duschwänden bauen\n- 2x2=4m2 je Seite\n- 5 Seiten\n\n5\n- 4m2 = 20m2',
  ],
  [
    'Image Test.md',
    38 * MINUTE,
    '![0.50](pasted_images/a.png)\nNice! sdfsdf\n- sdf\n- ![x](b.png)',
  ],
  [
    '2026-11-14T08-12-00.md',
    5 * HOUR,
    'Streaming video discovery portal, type in mood, it generates a space with matching visuals',
  ],
  [
    'Ideen/Nähen.md',
    3 * DAY,
    [
      '# Ideen Nähen',
      '- Links',
      '  - [V-Neck Tutorial](https://www.itsalwaysautumn.com/v-neck) (guter Tipp zum V-Neck nähen)',
      '  - Bestes V-Neck (plus Neckband) Video: https://youtu.be/8wdX1U6_dfE',
      '  - Mein Beispiel: 53cm raw length -> 47cm+1cm binding length, 1.5cm Breite + 1cm Allowance x 2 = 8cm (falsch! 8cm ist falsch, 5cm ist richtig, V-Neck dadurch zu kurz)',
      '- Kaufen',
      '  - [ ] Stärkespray',
      '  - [x] Rollcutter',
      '  - [ ] Roll-Längenmesser?',
      '- Shortlist',
      '  - Chillhose kurz und lang',
      '  - Schal mit Reißverschluss',
    ].join('\n'),
  ],
  [
    '2026-09-12T15-43-10.md',
    1 * DAY,
    '- [ ] Spulen\n- [ ] Garn weiß\n- [ ] Schnittmuster T Shirt slim fit V Ausschnitt\n- [x] Jersey Nadeln',
  ],
  [
    'Projekte/Leuchten.md',
    9 * DAY,
    '# Leuchten Ideen\n<figure data-type="drawing"><svg></svg></figure>\n- 7-segment clock, but 3D and only from one direction, readable from the front',
  ],
  ['Software.md', 40 * DAY, ''],
  [
    'Gesundheit/Kopfschmerzen.md',
    400 * DAY,
    '- 2022 (?):\n  - 9.4. Ibu? Leichte KS\n  - 12.4. TeTatus 17 Uhr\n  - 13.4. Ibu 11 Uhr',
  ],
  ['notebooks/notebook - Diary 2023-08-06 to 2023-12-10.pdf', 500 * DAY, ''],
  [
    'boards/Plan.canvas',
    2 * DAY,
    JSON.stringify({
      nodes: [
        {
          id: 'a',
          type: 'text',
          text: 'Roadmap\n- Sync\n- Cards',
          x: 0,
          y: 0,
          width: 200,
          height: 100,
        },
      ],
      edges: [],
    }),
  ],
]

const now = Date.now()

export const mockContents: Record<string, string> = Object.fromEntries(
  SAMPLES.map(([filepath, , content]) => [filepath, content]),
)

export const mockDates: Record<string, number> = Object.fromEntries(
  SAMPLES.map(([filepath, age]) => [filepath, now - age]),
)

export const mockFiles = SAMPLES.map(([filepath]) => filepath)
