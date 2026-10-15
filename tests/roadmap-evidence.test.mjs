import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function readJson(path) {
  return JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), 'utf8'));
}

test('canonical roadmap and observed PR evidence stay aligned', async () => {
  const [roadmap, evidence] = await Promise.all([
    readJson('registry/roadmap.json'),
    readJson('registry/prs.json'),
  ]);

  assert.equal(roadmap.repository, evidence.repository);
  assert.equal(roadmap.version, evidence.roadmapVersion);
  assert.equal(roadmap.plannedPrCount, evidence.plannedPrCount);
  assert.deepEqual(
    roadmap.milestones.map(({ id, title, pullRequests }) => ({ id, title, pullRequests })),
    evidence.units.map(({ id, title, prs }) => ({ id, title, pullRequests: prs })),
  );

  const mapped = roadmap.milestones.flatMap(({ id, pullRequests }) =>
    pullRequests.map((number) => ({ id, number })),
  );
  assert.equal(new Set(mapped.map(({ number }) => number)).size, mapped.length);
  const observed = new Map(evidence.pullRequests.map((pullRequest) => [pullRequest.number, pullRequest]));
  for (const { id, number } of mapped) {
    const pullRequest = observed.get(number);
    assert.ok(pullRequest, `${id} references unobserved PR #${number}`);
    assert.equal(pullRequest.state, 'closed', `${id} PR #${number} is not closed`);
    assert.ok(pullRequest.mergedAt, `${id} PR #${number} is not merged`);
  }
});
