import { Errors } from 'isomorphic-git'
import { describe, expect, it } from 'vitest'
import { isMissingGitObjectError } from '@/lib/gitRecovery'

describe('isMissingGitObjectError', () => {
  it('matches NotFoundError for a 40-char object id', () => {
    const err = new Errors.NotFoundError('b64d717fe0974104039276485918df6eb1f3add3')
    expect(isMissingGitObjectError(err)).toBe(true)
  })

  it('ignores NotFoundError for refs and paths', () => {
    expect(isMissingGitObjectError(new Errors.NotFoundError('HEAD'))).toBe(false)
    expect(isMissingGitObjectError(new Errors.NotFoundError('note.md'))).toBe(false)
  })
})
