declare module '@isomorphic-git/lightning-fs' {
  export default class LightningFS {
    constructor(name: string, options?: { wipe?: boolean })
    promises: {
      readFile(path: string, encoding: 'utf8'): Promise<string>
      writeFile(path: string, data: string, encoding: 'utf8'): Promise<void>
      readdir(path: string): Promise<string[]>
      mkdir(path: string): Promise<void>
      stat(path: string): Promise<{ isFile(): boolean; isDirectory(): boolean }>
    }
  }
}
