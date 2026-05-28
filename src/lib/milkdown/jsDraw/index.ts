export { jsDrawRemark } from '@/lib/milkdown/jsDraw/jsDrawRemark'
export { jsDrawSchema } from '@/lib/milkdown/jsDraw/jsDrawSchema'
export { jsDrawView } from '@/lib/milkdown/jsDraw/jsDrawView'

import { jsDrawRemark } from '@/lib/milkdown/jsDraw/jsDrawRemark'
import { jsDrawSchema } from '@/lib/milkdown/jsDraw/jsDrawSchema'
import { jsDrawView } from '@/lib/milkdown/jsDraw/jsDrawView'

export const jsDrawPlugins = [jsDrawRemark, ...jsDrawSchema, jsDrawView] as const
