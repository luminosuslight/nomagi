export type FileTreeFolder = { kind: 'folder'; name: string; children: FileTreeNode[] }
export type FileTreeFile = { kind: 'file'; name: string; path: string }
export type FileTreeNode = FileTreeFolder | FileTreeFile

function compareNodes(a: FileTreeNode, b: FileTreeNode): number {
  if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1
  return a.name.localeCompare(b.name)
}

function sortTree(nodes: FileTreeNode[]): FileTreeNode[] {
  return nodes
    .map((node) => (node.kind === 'folder' ? { ...node, children: sortTree(node.children) } : node))
    .sort(compareNodes)
}

export function buildFileTree(files: string[]): FileTreeNode[] {
  const root: FileTreeFolder = { kind: 'folder', name: '', children: [] }

  for (const path of files) {
    const parts = path.split('/')
    const filename = parts.pop()
    if (!filename) continue

    let current = root
    for (const segment of parts) {
      let folder = current.children.find(
        (child): child is FileTreeFolder => child.kind === 'folder' && child.name === segment,
      )
      if (!folder) {
        folder = { kind: 'folder', name: segment, children: [] }
        current.children.push(folder)
      }
      current = folder
    }

    current.children.push({ kind: 'file', name: filename, path })
  }

  return sortTree(root.children)
}
