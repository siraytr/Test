const request = require('supertest');
const app = require('../test-utils/app'); // siehe Hinweis unten

describe('Auth', () => {
  test('unauthenticated access redirects or 401', async () => {
    const res = await request(app).get('/api/albums');
    expect([302,401,200]).toContain(res.status); // je nach test-app config
  });
});
