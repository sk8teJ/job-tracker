import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from './tmdb.js';

function makeContext(url, { method = 'POST', token = 'test-token' } = {}) {
  return {
    request: new Request('https://mora.example/api/tmdb', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: method === 'GET' ? undefined : JSON.stringify({ url })
    }),
    env: { TMDB_READ_ACCESS_TOKEN: token }
  };
}

const invalidUrls = [
  ['rejects insecure HTTP links', 'http://www.themoviedb.org/movie/550-fight-club'],
  ['rejects malformed TMDB IDs', 'https://www.themoviedb.org/movie/550abc'],
  ['rejects unsupported TMDB paths', 'https://www.themoviedb.org/person/550'],
  ['does not treat IMDb paths as TMDB IDs', 'https://www.imdb.com/movie/550'],
  ['rejects malformed IMDb IDs', 'https://www.imdb.com/title/tt123abc'],
  ['rejects lookalike domains', 'https://themoviedb.org.example.com/movie/550'],
  ['rejects URLs with credentials', 'https://user:pass@www.themoviedb.org/movie/550'],
  ['rejects non-standard ports', 'https://www.themoviedb.org:8443/movie/550']
];

for (const [name, url] of invalidUrls) {
  test(name, async t => {
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => {
      throw new Error('TMDB must not be called for an invalid source URL');
    });
    const response = await onRequest(makeContext(url));
    assert.equal(response.status, 400);
    assert.ok((await response.json()).error);
    assert.equal(fetchMock.mock.callCount(), 0);
  });
}

test('accepts a valid TMDB URL with a slug and fetches the canonical API resource', async t => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async (input, init) => {
    assert.equal(String(input), 'https://api.themoviedb.org/3/movie/550?append_to_response=credits&language=ru-RU');
    assert.equal(init.headers.Authorization, 'Bearer test-token');
    return Response.json({ id: 550, title: 'Fight Club' });
  });

  const response = await onRequest(makeContext('https://www.themoviedb.org/movie/550-fight-club'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal((await response.json()).id, 550);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test('resolves a valid IMDb title through TMDB before loading details', async t => {
  const requestedUrls = [];
  t.mock.method(globalThis, 'fetch', async input => {
    requestedUrls.push(String(input));
    if (requestedUrls.length === 1) return Response.json({ movie_results: [{ id: 603 }] });
    return Response.json({ id: 603, title: 'The Matrix' });
  });

  const response = await onRequest(makeContext('https://www.imdb.com/title/tt0133093/'));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).id, 603);
  assert.match(requestedUrls[0], /\/find\/tt0133093\?/);
  assert.match(requestedUrls[1], /\/movie\/603\?/);
});

test('returns 405 for non-POST requests', async () => {
  const response = await onRequest(makeContext('', { method: 'GET' }));
  assert.equal(response.status, 405);
});

test('returns 503 when the TMDB token is missing', async () => {
  const response = await onRequest(makeContext('https://www.themoviedb.org/movie/550', { token: '' }));
  assert.equal(response.status, 503);
});
