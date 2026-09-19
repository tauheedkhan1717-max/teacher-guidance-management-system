import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import jwt from 'jsonwebtoken';

const app = createApp();

describe('Invite Lifecycle', () => {
  it('Admin should be able to create an invite', async () => {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!admin) return;
    const token = jwt.sign({ userId: admin.id, role: 'ADMIN' }, process.env.JWT_SECRET || 'secret');

    const res = await request(app)
      .post('/api/admin/invites')
      .set('Cookie', [`token=${token}`])
      .send({ department: 'Test Dept' });

    expect(res.status).toBe(201);
    expect(res.body.invite).toBeDefined();
  });
});
