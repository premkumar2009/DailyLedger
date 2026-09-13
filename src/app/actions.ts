'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { clearSession, createSession, getCurrentUser, hashPassword, verifyPassword } from '@/lib/auth';

async function recalculateLedgerFrom(userId: string, startDate: string) {
  const records = await db.dailyRecord.findMany({
    where: { userId, recordDate: { gte: startDate } },
    include: { transactions: { orderBy: { transactionNumber: 'asc' } } },
    orderBy: { recordDate: 'asc' },
  });

  if (!records.length) return;

  const previous = await db.dailyRecord.findFirst({
    where: { userId, recordDate: { lt: startDate } },
    orderBy: { recordDate: 'desc' },
  });

  let carry = Number(previous?.closingBalance || 0);

  for (const record of records) {
    const opening = record.recordDate === startDate ? Number(record.openingBalance) : carry;
    const total = record.transactions.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const closing = opening + total;

    await db.dailyRecord.update({
      where: { id: record.id },
      data: {
        openingBalance: new Prisma.Decimal(opening.toFixed(2)),
        closingBalance: new Prisma.Decimal(closing.toFixed(2)),
      },
    });

    carry = closing;
  }
}

export async function login(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) redirect('/login?error=Invalid%20email%20or%20password');
  await createSession(user.id);
  redirect('/dashboard');
}

export async function register(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  if (!email || password.length < 8) redirect('/login?error=Use%20a%20valid%20email%20and%208%2B%20character%20password');

  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) redirect('/login?error=That%20email%20is%20already%20registered');

  try {
    const user = await db.user.create({ data: { email, passwordHash: hashPassword(password) } });
    await createSession(user.id);
    redirect('/dashboard');
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      redirect('/login?error=That%20email%20is%20already%20registered');
    }
    throw error;
  }
}

export async function logout() {
  await clearSession();
  redirect('/login');
}

export async function addTransaction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const recordId = String(formData.get('recordId'));
  const description = String(formData.get('description') || '').trim();
  const amountText = String(formData.get('amount') || '').replace(/,/g, '');
  const amount = Number(amountText);
  if (!description || !Number.isInteger(amount) || Math.abs(amount) > 999999999999 || amount === 0) throw new Error('Enter a description and a non-zero whole-rupee amount.');
  let recordDate = '';
  await db.$transaction(async (tx) => {
    const record = await tx.dailyRecord.findFirst({ where: { id: recordId, userId: user.id } });
    const today = new Date().toISOString().slice(0, 10);
    if (!record || record.status === 'CLOSED' || record.recordDate > today) throw new Error('This day is not editable.');
    recordDate = record.recordDate;
    const last = await tx.transaction.findFirst({ where: { dailyRecordId: record.id }, orderBy: { transactionNumber: 'desc' } });
    await tx.transaction.create({ data: { dailyRecordId: record.id, userId: user.id, transactionNumber: (last?.transactionNumber || 0) + 1, description, amount: new Prisma.Decimal(amount.toFixed(2)) } });
    const totals = await tx.transaction.aggregate({ where: { dailyRecordId: record.id }, _sum: { amount: true } });
    await tx.dailyRecord.update({ where: { id: record.id }, data: { closingBalance: new Prisma.Decimal(record.openingBalance.toString()).add(totals._sum.amount || 0) } });
  });

  await recalculateLedgerFrom(user.id, recordDate);
  revalidatePath('/dashboard');
  revalidatePath(`/year/${String(formData.get('year'))}/month/${String(formData.get('month'))}/date/${String(formData.get('day'))}`);
}

export async function closeDay(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const recordId = String(formData.get('recordId'));
  await db.$transaction(async (tx) => {
    const record = await tx.dailyRecord.findFirst({ where: { id: recordId, userId: user.id } });
    if (!record || record.status === 'CLOSED') throw new Error('Day is already closed or unavailable.');
    await tx.dailyRecord.update({ where: { id: record.id }, data: { status: 'CLOSED', closedAt: new Date() } });
  });
  revalidatePath('/dashboard');
  revalidatePath(`/year/${String(formData.get('year'))}/month/${String(formData.get('month'))}/date/${String(formData.get('day'))}`);
}

export async function setOpeningBalance(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const recordId = String(formData.get('recordId'));
  const opening = Number(String(formData.get('opening') || '').replace(/,/g, ''));
  if (!Number.isInteger(opening)) throw new Error('Opening balance must be a whole-rupee amount.');
  let recordDate = '';
  await db.$transaction(async (tx) => {
    const record = await tx.dailyRecord.findFirst({ where: { id: recordId, userId: user.id }, include: { transactions: true } });
    if (!record || record.status === 'CLOSED') throw new Error('This day is locked.');
    recordDate = record.recordDate;
    const total = record.transactions.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    await tx.dailyRecord.update({ where: { id: record.id }, data: { openingBalance: new Prisma.Decimal(opening.toFixed(2)), closingBalance: new Prisma.Decimal((opening + total).toFixed(2)) } });
  });

  await recalculateLedgerFrom(user.id, recordDate);
  revalidatePath(`/year/${String(formData.get('year'))}/month/${String(formData.get('month'))}/date/${String(formData.get('day'))}`);
}
