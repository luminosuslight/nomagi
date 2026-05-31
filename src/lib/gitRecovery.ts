import { Errors } from 'isomorphic-git'

const OID_PATTERN = /^[0-9a-f]{40}$/i

/** True when isomorphic-git could not read a commit/tree/blob by OID (often shallow history). */
export function isMissingGitObjectError(
  err: unknown,
): err is InstanceType<typeof Errors.NotFoundError> {
  return err instanceof Errors.NotFoundError && OID_PATTERN.test(err.data.what)
}
