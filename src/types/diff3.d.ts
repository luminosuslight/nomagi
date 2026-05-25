declare module 'diff3' {
  type Diff3Ok = { ok: string[] }
  type Diff3Conflict = {
    conflict: {
      a: string[]
      b: string[]
      o: string[]
      aIndex: number
      oIndex: number
      bIndex: number
    }
  }

  export default function diff3Merge(
    a: string[],
    o: string[],
    b: string[],
  ): Array<Diff3Ok | Diff3Conflict>
}
