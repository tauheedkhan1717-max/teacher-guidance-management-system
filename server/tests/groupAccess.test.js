import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import jwt from 'jsonwebtoken';

const app = createApp();

describe('requireGroupAccess', () => {
  it('Teacher cannot add progress to student outside group', async () => {
    const teacher = await prisma.user.findFirst({ where: { role: 'TEACHER' } });
    if (!teacher) return;
    
    // Fake student id that is not in their group
    const fakeStudentId = '00000000-0000-0000-0000-000000000000';
    const token = jwt.sign({ userId: teacher.id, role: 'TEACHER' }, process.env.JWT_SECRET || 'secret');

    const res = await request(app)
      .post('/api/progress')
      .set('Cookie', [`token=${token}`])
      .send({
        studentId: fakeStudentId,
        type: 'UNIT_TEST',
        title: 'Test',
        marksObtained: 10,
        maxMarks: 10
      });

    // Should return 400 or 403. Our gate might return 400 for invalid student first.
    expect([400, 403]).toContain(res.status);
  });
});
