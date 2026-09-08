import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

const csv = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
export async function GET(request: NextRequest, { params }: { params: Promise<{ scope: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const { scope } = await params;
  const year = request.nextUrl.searchParams.get('year');
  const month = request.nextUrl.searchParams.get('month');
  const day = request.nextUrl.searchParams.get('day');
  if (!year || !/^\d{4}$/.test(year)) return new Response('Invalid year', { status: 400 });
  const start = scope === 'year' ? `${year}-01-01` : `${year}-${String(Number(month)).padStart(2, '0')}-01`;
  const end = scope === 'year' ? `${year}-12-31` : scope === 'month' ? `${year}-${String(Number(month)).padStart(2, '0')}-${new Date(Number(year), Number(month), 0).getDate()}` : `${year}-${String(Number(month)).padStart(2, '0')}-${String(Number(day)).padStart(2, '0')}`;
  const records = await db.dailyRecord.findMany({ where: { userId: user.id, recordDate: { gte: start, lte: end } }, include: { transactions: { orderBy: { transactionNumber: 'asc' } } }, orderBy: { recordDate: 'asc' } });
  const rows = ['Date,Day,Transaction No,Time,Name/Description,Amount,Running Balance'];
  for (const record of records) {
    let balance = Number(record.openingBalance);
    for (const transaction of record.transactions) {
      balance += Number(transaction.amount);
      rows.push([record.recordDate, new Date(`${record.recordDate}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' }), transaction.transactionNumber, transaction.transactionTime.toISOString(), transaction.description, Number(transaction.amount).toFixed(2), balance.toFixed(2)].map(csv).join(','));
    }
  }
  return new Response(rows.join('\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="daily-ledger-${scope}-${year}.csv"` } });
}
