'use client';

import { useState } from 'react';
import { addTransaction, closeDay, setOpeningBalance } from '@/app/actions';
import { money } from '@/lib/money';

type Entry = { id: string; transactionNumber: number; transactionTime: string; description: string; amount: number; balance: number };

type Props = { recordId: string; date: string; year: number; month: string; day: string; opening: number; closing: number; status: 'OPEN' | 'CLOSED'; entries: Entry[] };

export default function LedgerTable({ recordId, date, year, month, day, opening, closing, status, entries }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [showOpening, setShowOpening] = useState(false);
  const filtered = entries.filter((entry) => {
    const matchesText = `${entry.description} ${entry.amount}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === 'all' || (filter === 'credit' && entry.amount > 0) || (filter === 'debit' && entry.amount < 0);
    return matchesText && matchesFilter;
  });
  const credits = entries.filter((entry) => entry.amount > 0).reduce((sum, entry) => sum + entry.amount, 0);
  const debits = entries.filter((entry) => entry.amount < 0).reduce((sum, entry) => sum + Math.abs(entry.amount), 0);
  const isLocked = status === 'CLOSED';
  const isFuture = date > new Date().toISOString().slice(0, 10);

  return <div className="ledger-shell">
    <div className="ledger-toolbar">
      <div className="toolbar-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search description or amount" /></div>
      <div className="filter-group">{[['all', 'All'], ['credit', 'Credits'], ['debit', 'Debits']].map(([value, label]) => <button key={value} className={filter === value ? 'filter active' : 'filter'} onClick={() => setFilter(value)}>{label}</button>)}</div>
      {!isLocked && !isFuture && <button className="primary-button" onClick={() => document.getElementById('description')?.focus()}>＋ Add entry</button>}
    </div>
    <div className="sheet-wrap"><table className="ledger-table"><thead><tr><th>No.</th><th>Time</th><th>Description</th><th className="amount-col">Amount</th><th className="amount-col">Running balance</th></tr></thead><tbody>
      {filtered.map((entry) => <tr key={entry.id}><td className="muted-cell">{entry.transactionNumber}</td><td className="muted-cell">{new Date(entry.transactionTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td><td>{entry.description}</td><td className={entry.amount >= 0 ? 'credit amount-col' : 'debit amount-col'}>{entry.amount >= 0 ? '+' : ''}{money(entry.amount)}</td><td className="amount-col balance-cell">{money(entry.balance)}</td></tr>)}
      {!filtered.length && <tr><td colSpan={5} className="empty-row">No entries match this view.</td></tr>}
      {!isLocked && !isFuture && <tr className="entry-row"><td className="muted-cell">{entries.length + 1}</td><td className="muted-cell">Now</td><td><form id="entry-form" action={addTransaction} className="inline-entry"><input type="hidden" name="recordId" value={recordId} /><input type="hidden" name="year" value={year} /><input type="hidden" name="month" value={month} /><input type="hidden" name="day" value={day} /><input id="description" name="description" placeholder="Add a description..." autoComplete="off" required /><input name="amount" type="text" inputMode="numeric" pattern="[+-]?[0-9]*" placeholder="+100000 or -5000" autoComplete="off" required /><button type="submit">Save row</button></form></td><td colSpan={2}></td></tr>}
    </tbody></table></div>
    <div className="ledger-footer"><span>{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span><span>Credits <strong className="credit">+{money(credits)}</strong></span><span>Debits <strong className="debit">-{money(debits)}</strong></span></div>
    {showOpening && !isLocked && <form action={setOpeningBalance} className="opening-form"><input type="hidden" name="recordId" value={recordId} /><input type="hidden" name="year" value={year} /><input type="hidden" name="month" value={month} /><input type="hidden" name="day" value={day} /><label>Opening balance <input name="opening" type="text" inputMode="numeric" pattern="[0-9]*" defaultValue={opening} autoComplete="off" /></label><button className="primary-button" type="submit">Update opening balance</button></form>}
    <div className="closing-row"><div><span className="summary-label">Closing balance</span><strong>{money(closing)}</strong></div>{!isLocked && !isFuture && <><button className="text-button" onClick={() => setShowOpening(!showOpening)}>Edit opening balance</button><form action={closeDay}><input type="hidden" name="recordId" value={recordId} /><input type="hidden" name="year" value={year} /><input type="hidden" name="month" value={month} /><input type="hidden" name="day" value={day} /><button className="close-button" type="submit">Close day</button></form></> }</div>
  </div>;
}
