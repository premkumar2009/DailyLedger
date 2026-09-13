const { PrismaClient, Prisma } = require('@prisma/client');

const db = new PrismaClient();

async function recalc(userId, startDate) {
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
    const total = record.transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
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

(async () => {
  const email = 'cascade-verify-' + Date.now() + '@example.com';
  const user = await db.user.create({ data: { email, passwordHash: 'demo' } });

  const d1 = '2026-09-12';
  const d2 = '2026-09-13';

  const r1 = await db.dailyRecord.create({ data: { userId: user.id, recordDate: d1, openingBalance: 0, closingBalance: 0 } });
  const r2 = await db.dailyRecord.create({ data: { userId: user.id, recordDate: d2, openingBalance: 0, closingBalance: 0 } });

  await db.transaction.create({ data: { dailyRecordId: r1.id, userId: user.id, transactionNumber: 1, description: 'yesterday add', amount: new Prisma.Decimal('10000') } });
  await db.dailyRecord.update({ where: { id: r1.id }, data: { openingBalance: new Prisma.Decimal('0'), closingBalance: new Prisma.Decimal('10000') } });

  await db.transaction.create({ data: { dailyRecordId: r2.id, userId: user.id, transactionNumber: 1, description: 'today add', amount: new Prisma.Decimal('10000') } });
  await db.dailyRecord.update({ where: { id: r2.id }, data: { openingBalance: new Prisma.Decimal('10000'), closingBalance: new Prisma.Decimal('20000') } });

  await db.transaction.create({ data: { dailyRecordId: r1.id, userId: user.id, transactionNumber: 2, description: 'yesterday extra', amount: new Prisma.Decimal('10000') } });
  await db.dailyRecord.update({ where: { id: r1.id }, data: { closingBalance: new Prisma.Decimal('20000') } });

  await recalc(user.id, d1);

  const y = await db.dailyRecord.findUnique({ where: { userId_recordDate: { userId: user.id, recordDate: d1 } } });
  const t = await db.dailyRecord.findUnique({ where: { userId_recordDate: { userId: user.id, recordDate: d2 } } });

  console.log('YESTERDAY', Number(y.openingBalance), Number(y.closingBalance));
  console.log('TODAY', Number(t.openingBalance), Number(t.closingBalance));

  await db.user.delete({ where: { id: user.id } });
  await db.$disconnect();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
