import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import jwt from 'jsonwebtoken';

const app = createApp();

describe('RBAC Notice Ownership', () => {
  it('Student should not be able to delete notice', async () => {
    const student = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
    if (!student) return;
    const notice = await prisma.notice.findFirst();
    if (!notice) return;
    const token = jwt.sign({ userId: student.id, role: 'STUDENT' }, process.env.JWT_SECRET || 'secret');

    const res = await request(app)
      .delete(`/api/notices/${notice.id}`)
      .set('Cookie', [`token=${token}`]);

    expect(res.status).toBe(403);
  });
});
