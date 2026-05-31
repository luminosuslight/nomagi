import { mockGitRepoUrl, startMockGitServer, stopMockGitServer } from './mock-git-server'

export async function setup() {
  await startMockGitServer()
  process.env.MOCK_GIT_REPO_URL = mockGitRepoUrl()
}

export async function teardown() {
  stopMockGitServer()
}
