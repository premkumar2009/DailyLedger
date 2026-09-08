import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { money } from '@/lib/money';
import { logout } from '@/app/actions';

const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export default async function YearPage({ params }: { params: Promise<{ year: string }> }) {
  const user = await getCurrentUser(); if (!user) redirect('/login');
  const { year: rawYear } = await params; const year = Number(rawYear); if (!year || year < 2000 || year > 2200) notFound();
  const records = await db.dailyRecord.findMany({ where: { userId: user.id, recordDate: { gte: `${year}-01-01`, lte: `${year}-12-31` } }, include: { transactions: true } });
  return <main className="app-page"><nav className="topbar"><Link href="/dashboard" className="wordmark"><span className="brand-mark small">DL</span><span>Daily Ledger</span></Link><form action={logout}><button className="logout-button">Sign out</button></form></nav><div className="content-wrap"><Link className="back-link" href="/dashboard">← All years</Link><header className="page-heading compact"><div><p className="eyebrow">LEDGER YEAR</p><h1>{year}</h1><p className="subheading">A month-by-month view of your records.</p></div><div className="year-total"><span>Year credits</span><strong>{money(records.flatMap((record) => record.transactions).filter((transaction) => Number(transaction.amount) > 0).reduce((sum, transaction) => sum + Number(transaction.amount), 0))}</strong></div></header><div className="month-grid">{months.map((month, index) => { const monthRecords = records.filter((record) => Number(record.recordDate.slice(5, 7)) === index + 1); const credits = monthRecords.flatMap((record) => record.transactions).filter((transaction) => Number(transaction.amount) > 0).reduce((sum, transaction) => sum + Number(transaction.amount), 0); const debits = monthRecords.flatMap((record) => record.transactions).filter((transaction) => Number(transaction.amount) < 0).reduce((sum, transaction) => sum + Math.abs(Number(transaction.amount)), 0); return <Link className="month-card" href={`/year/${year}/month/${index + 1}`} key={month}><span className="month-number">{String(index + 1).padStart(2, '0')}</span><h2>{month}</h2><div className="month-stats"><span>Credits <b className="credit">+{money(credits)}</b></span><span>Debits <b className="debit">-{money(debits)}</b></span></div><span className="card-arrow">↗</span></Link>})}</div></div></main>;
}
