import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { money } from '@/lib/money';
import { logout } from '@/app/actions';

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const records = await db.dailyRecord.findMany({ where: { userId: user.id }, include: { transactions: true }, orderBy: { recordDate: 'desc' } });
  const years = Array.from(new Set(records.map((record) => Number(record.recordDate.slice(0, 4))))).sort((a, b) => b - a);
  const year = new Date().getFullYear();
  if (!years.includes(year)) years.unshift(year);
  const current = records.find((record) => record.recordDate === new Date().toISOString().slice(0, 10));
  return <main className="app-page"><nav className="topbar"><Link href="/dashboard" className="wordmark"><span className="brand-mark small">DL</span><span>Daily Ledger</span></Link><div className="topbar-right"><span className="user-pill">{user.email}</span><form action={logout}><button className="logout-button">Sign out</button></form></div></nav><div className="content-wrap"><header className="page-heading"><div><p className="eyebrow">YOUR MONEY, ORGANIZED</p><h1>Good morning.</h1><p className="subheading">Choose a year to review your daily records.</p></div><div className="current-balance"><span>Current balance</span><strong>{money(current?.closingBalance || 0)}</strong></div></header><section className="today-strip"><div><span className="section-kicker">TODAY · {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span><strong>{current ? money(current.closingBalance) : 'No entries yet'}</strong></div><span className="today-note">{current?.status === 'CLOSED' ? 'Day closed' : 'Open for entries'}</span></section><div className="section-head"><h2>Ledger years</h2><span>{years.length} years available</span></div><div className="year-grid">{years.map((item) => <Link className="year-card" href={`/year/${item}`} key={item}><span className="year-label">YEAR</span><strong>{item}</strong><span className="card-arrow">↗</span><span className="card-caption">{records.filter((record) => record.recordDate.startsWith(String(item))).length} recorded days</span></Link>)}</div></div></main>;
}
