process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-do-not-use-in-production';
process.env.ALLOWED_EMAIL_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN || 'dtu.ac.in';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { connect, clearDatabase, closeDatabase } = require('./testDb');
const User = require('../models/User');
const { COOKIE_NAME } = require('../utils/authCookie');

let app;

beforeAll(async () => {
  await connect();
  // Required after connect(): app.js itself has no DB dependency at import
  // time, but requiring it after the DB is up keeps this file self-
  // contained and avoids any accidental ordering issues with route modules
  // that touch models at require-time.
  app = require('../app');
});
afterEach(async () => clearDatabase());
afterAll(async () => closeDatabase());

function authCookie(user) {
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return `${COOKIE_NAME}=${token}`;
}

async function makeUser(overrides = {}) {
  return User.create({
    name: 'Test User',
    email: `${Date.now()}-${Math.random()}@dtu.ac.in`,
    password: 'password123',
    role: 'student',
    isVerified: true,
    ...overrides,
  });
}

describe('RBAC boundary (middleware/auth.js + middleware/rbac.js)', () => {
  it('rejects a completely unauthenticated request to a protected route', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects a request with a malformed/tampered token', async () => {
    const res = await request(app).get('/api/tasks').set('Cookie', `${COOKIE_NAME}=not.a.valid.jwt`);
    expect(res.status).toBe(401);
  });

  it("rejects a token belonging to a deactivated account, even though the token itself is valid", async () => {
    const user = await makeUser({ isActive: false });
    const res = await request(app).get('/api/tasks').set('Cookie', authCookie(user));
    expect(res.status).toBe(401);
  });

  it('blocks a student from hitting an admin-only route (create task)', async () => {
    const student = await makeUser({ role: 'student' });
    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', authCookie(student))
      .send({ title: 'Should be blocked', description: 'x', deadline: new Date(Date.now() + 86400000) });

    expect(res.status).toBe(403);
  });

  it('blocks a student from hitting an admin-only route (list all students)', async () => {
    const student = await makeUser({ role: 'student' });
    const res = await request(app).get('/api/users').set('Cookie', authCookie(student));
    expect(res.status).toBe(403);
  });

  it('allows an admin to create a task', async () => {
    const admin = await makeUser({ role: 'admin' });
    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', authCookie(admin))
      .send({ title: 'Plantation drive', description: 'Plant trees', deadline: new Date(Date.now() + 86400000) });

    expect(res.status).toBe(201);
    expect(res.body.task.title).toBe('Plantation drive');
  });

  it('allows a verified student to read the task list', async () => {
    const student = await makeUser({ role: 'student' });
    const res = await request(app).get('/api/tasks').set('Cookie', authCookie(student));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('blocks an admin token from a student-only route (submitting task proof)', async () => {
    const admin = await makeUser({ role: 'admin' });
    const fakeTaskId = '507f1f77bcf86cd799439011';
    const res = await request(app)
      .post(`/api/submissions/tasks/${fakeTaskId}`)
      .set('Cookie', authCookie(admin))
      .send({ remarks: 'test' });

    expect(res.status).toBe(403);
  });

  it('never trusts a role claimed in the request body over the one in the token', async () => {
    // A student cannot escalate by simply sending role: 'admin' in the
    // payload — the middleware only ever reads role from req.user, which
    // comes from the DB record the token's id points to, never from
    // anything the client sent in the request body.
    const student = await makeUser({ role: 'student' });
    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', authCookie(student))
      .send({ title: 'Escalation attempt', description: 'x', deadline: new Date(), role: 'admin' });

    expect(res.status).toBe(403);
  });
});