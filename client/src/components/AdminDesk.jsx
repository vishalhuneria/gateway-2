import { useMemo, useState } from 'react';
import {
  Search, Users, Clock3, CheckCircle2, ShieldAlert, FileText, Eye,
  Check, X, Ban, Unlock, Filter, CalendarDays, Building2, UserRound,
  AlertCircle, RefreshCw
} from 'lucide-react';

const approvalTone = (status) => status === 'Approved'
  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
  : status === 'Rejected'
    ? 'bg-rose-50 text-rose-700 border-rose-200'
    : 'bg-amber-50 text-amber-800 border-amber-200';

function Metric({ label, value, icon: Icon, tone }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between gap-3">
      <div><p className="text-[11px] uppercase tracking-wider font-bold text-slate-500">{label}</p><p className={`text-2xl font-extrabold mt-1 ${tone}`}>{value ?? 0}</p></div>
      <div className="p-3 bg-slate-50 text-slate-600 rounded-xl"><Icon className="w-5 h-5" /></div>
    </div>
  );
}

export default function AdminDesk({ visitors = [], stats, onApprove, onReject, onToggleBlacklist, onOpenDocument }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [reason, setReason] = useState('');
  const [workingId, setWorkingId] = useState('');
  const [busyAction, setBusyAction] = useState('');

  const filteredVisitors = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return visitors.filter((item) => {
      const matchesQuery = !needle || [item.name, item.email, item.hostName, item.hostAddress, item.passcode, item.id]
        .some((value) => String(value || '').toLowerCase().includes(needle));
      const matchesFilter = filter === 'all'
        || (filter === 'pending' && item.approvalStatus === 'Pending Approval')
        || (filter === 'approved' && item.approvalStatus === 'Approved')
        || (filter === 'rejected' && item.approvalStatus === 'Rejected')
        || (filter === 'blacklisted' && item.blacklisted);
      return matchesQuery && matchesFilter;
    });
  }, [visitors, query, filter]);

  const runAction = async (id, action, task) => {
    setWorkingId(id);
    setBusyAction(action);
    try { await task(); }
    catch (error) { window.alert(error?.response?.data?.message || error?.message || 'The action could not be completed.'); }
    finally { setWorkingId(''); setBusyAction(''); }
  };

  const submitRejection = async (event) => {
    event.preventDefault();
    if (!rejectTarget || reason.trim().length < 3) return;
    await runAction(rejectTarget.id, 'reject', async () => {
      await onReject(rejectTarget.id, reason.trim());
      setRejectTarget(null);
      setReason('');
    });
  };

  const purposeRows = stats?.purposes || [];
  const hostRows = stats?.hostTypes || [];
  const purposeTotal = purposeRows.reduce((sum, item) => sum + item.count, 0) || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-sky-700 font-bold">Security administration</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-1">Admin Desk</h2>
          <p className="text-sm text-slate-500 mt-1">Review visitor requests, verify identity proofs, and control campus access.</p>
        </div>
        <button onClick={() => window.location.reload()} className="self-start md:self-auto inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh workspace
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Metric label="Total Requests" value={stats?.total ?? visitors.length} icon={Users} tone="text-slate-900" />
        <Metric label="Pending Review" value={stats?.pending ?? visitors.filter((v) => v.approvalStatus === 'Pending Approval').length} icon={Clock3} tone="text-amber-600" />
        <Metric label="Approved Passes" value={stats?.approved ?? visitors.filter((v) => v.approvalStatus === 'Approved').length} icon={CheckCircle2} tone="text-emerald-600" />
        <Metric label="Blacklisted" value={stats?.blacklisted ?? visitors.filter((v) => v.blacklisted).length} icon={ShieldAlert} tone="text-rose-600" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div><h3 className="font-bold text-slate-900">Visitor clearance queue</h3><p className="text-xs text-slate-500 mt-1">{filteredVisitors.length} matching record{filteredVisitors.length === 1 ? '' : 's'}</p></div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 bg-white sm:w-72">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input aria-label="Search visitor requests" value={query} onChange={(e) => setQuery(e.target.value)} className="w-full text-xs outline-none" placeholder="Search visitor, host, code…" />
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              {[['all', 'All requests'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['blacklisted', 'Blacklisted']].map(([value, label]) => (
                <button key={value} onClick={() => setFilter(value)} className={`rounded-lg px-3 py-1.5 text-[11px] font-bold border transition ${filter === value ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{label}</button>
              ))}
            </div>
          </div>
          {filteredVisitors.length === 0 ? (
            <div className="p-10 text-center"><FileText className="w-9 h-9 text-slate-300 mx-auto mb-2" /><p className="text-sm font-semibold text-slate-700">No requests found</p><p className="text-xs text-slate-500 mt-1">Try another search or filter.</p></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredVisitors.map((item) => {
                const pending = item.approvalStatus === 'Pending Approval';
                const busy = workingId === item.id;
                return (
                  <article key={item.id} className={`p-4 sm:p-5 ${item.blacklisted ? 'bg-rose-50/50' : ''}`}>
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 shrink-0 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center"><UserRound className="w-5 h-5" /></div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2"><h4 className="font-bold text-slate-900">{item.name}</h4><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${approvalTone(item.approvalStatus)}`}>{item.approvalStatus}</span>{item.blacklisted && <span className="rounded-full bg-rose-600 text-white px-2 py-0.5 text-[10px] font-bold">BLACKLISTED</span>}</div>
                            <p className="text-xs text-slate-500 mt-1 break-all">{item.email}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2 mt-3 text-xs">
                              <div><p className="text-slate-400 uppercase text-[10px] font-bold tracking-wide">Host</p><p className="font-semibold text-slate-700 mt-0.5">{item.hostName || '—'}</p><p className="text-slate-500">{item.hostAddress || '—'}</p></div>
                              <div><p className="text-slate-400 uppercase text-[10px] font-bold tracking-wide">Visit window</p><p className="font-semibold text-slate-700 mt-0.5 flex items-center gap-1"><CalendarDays className="w-3 h-3" />{item.arrivalDate} → {item.exitDate}</p><p className="text-slate-500">{item.durationDays} day{item.durationDays === 1 ? '' : 's'} · {item.purpose}</p></div>
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono mt-3">Request: {item.id} · Passcode: {item.passcode}</p>
                            {item.rejectionReason && <p className="text-xs text-rose-700 mt-2"><strong>Rejection reason:</strong> {item.rejectionReason}</p>}
                          </div>
                        </div>
                        <div className="ml-[52px] mt-3 flex flex-wrap gap-2">
                          <button disabled={!item.hasVisitorDocument} onClick={() => onOpenDocument(item, 'visitor')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"><Eye className="w-3.5 h-3.5" />Visitor ID {item.hasVisitorDocument ? `· ${item.idDocName}` : '· not uploaded'}</button>
                          <button disabled={!item.hasHostDocument} onClick={() => onOpenDocument(item, 'host')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"><Building2 className="w-3.5 h-3.5" />Host ID {item.hasHostDocument ? `· ${item.hostDocName}` : '· not uploaded'}</button>
                        </div>
                      </div>
                      <div className="flex lg:flex-col flex-wrap gap-2 lg:w-36 shrink-0">
                        {pending && <>
                          <button disabled={busy} onClick={() => runAction(item.id, 'approve', () => onApprove(item.id))} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 text-xs font-bold disabled:opacity-50"><Check className="w-3.5 h-3.5" />{busy && busyAction === 'approve' ? 'Approving…' : 'Approve'}</button>
                          <button disabled={busy} onClick={() => { setRejectTarget(item); setReason(''); }} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 px-3 py-2 text-xs font-bold disabled:opacity-50"><X className="w-3.5 h-3.5" />Reject</button>
                        </>}
                        <button disabled={busy} onClick={() => runAction(item.id, 'blacklist', () => onToggleBlacklist(item.id, !item.blacklisted))} className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50 ${item.blacklisted ? 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100' : 'border-rose-200 text-rose-700 bg-white hover:bg-rose-50'}`}>
                          {item.blacklisted ? <Unlock className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}{item.blacklisted ? 'Unblock' : 'Blacklist'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <h3 className="font-bold text-slate-900">Purpose distribution</h3><p className="text-xs text-slate-500 mt-1">Requests grouped by stated visit purpose.</p>
            <div className="mt-5 space-y-4">
              {purposeRows.length ? purposeRows.map((row) => <div key={row._id || 'unspecified'}>
                <div className="flex justify-between gap-3 text-xs mb-1.5"><span className="text-slate-600">{row._id || 'Unspecified'}</span><strong className="text-slate-800">{row.count}</strong></div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-sky-600" style={{ width: `${Math.min(100, (row.count / purposeTotal) * 100)}%` }} /></div>
              </div>) : <p className="text-xs text-slate-400">Metrics will appear after requests are submitted.</p>}
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <h3 className="font-bold text-slate-900">Host community</h3><p className="text-xs text-slate-500 mt-1">Distribution by account type.</p>
            <div className="mt-4 space-y-3">
              {hostRows.length ? hostRows.map((row) => <div key={row._id || 'unknown'} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="flex items-center gap-2 text-slate-600"><Users className="w-4 h-4" /><span className="text-xs font-semibold capitalize">{row._id || 'Unknown'}</span></div><span className="text-sm font-extrabold text-slate-900">{row.count}</span></div>) : <p className="text-xs text-slate-400">No host statistics available yet.</p>}
            </div>
          </section>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" /><p className="text-xs leading-relaxed text-amber-900"><strong>Review reminder:</strong> check both identity documents and the visit dates before approving a request. Blacklisted visitors are denied by the backend even if a QR is scanned.</p>
          </div>
        </aside>
      </div>

      {rejectTarget && <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
        <form onSubmit={submitRejection} className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100"><h3 className="font-extrabold text-slate-900">Reject visitor request</h3><p className="text-xs text-slate-500 mt-1">A reason will be saved in the request history.</p></div>
          <div className="p-5 space-y-2"><label className="text-xs font-bold text-slate-700">Reason for rejection *</label><textarea autoFocus required minLength={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} rows={4} placeholder="Explain why this request cannot be approved…" className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:ring-2 focus:ring-sky-500" /><p className="text-[10px] text-slate-400">Up to 500 characters.</p></div>
          <div className="p-5 pt-0 flex justify-end gap-2"><button type="button" onClick={() => { setRejectTarget(null); setReason(''); }} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Cancel</button><button type="submit" disabled={reason.trim().length < 3 || Boolean(workingId)} className="rounded-lg bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{busyAction === 'reject' ? 'Rejecting…' : 'Confirm rejection'}</button></div>
        </form>
      </div>}
    </div>
  );
}
