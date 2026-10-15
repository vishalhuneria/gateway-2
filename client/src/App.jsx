import { useCallback, useEffect, useRef, useState } from 'react';
import { LogOut, ShieldCheck } from 'lucide-react';
import api, { getApiError, setAccessToken, TOKEN_KEY } from './api';
import LoginModal from './components/LoginModal';
import ResidentPortal from './components/ResidentPortal';
import AdminDesk from './components/AdminDesk';
import GuardTerminal from './components/GuardTerminal';
import { LargeDocModal, QrGeneratedModal } from './components/Modals';

const routeForRole = (role) => ['student', 'faculty'].includes(role) ? 'resident' : role === 'admin' ? 'admin' : 'guard';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState('resident');
  const [visitors, setVisitors] = useState([]);
  const [stats, setStats] = useState(null);
  const [activePass, setActivePass] = useState(null);
  const [inspectDoc, setInspectDoc] = useState(null);
  const [approvedQrPass, setApprovedQrPass] = useState(null);
  const [busy, setBusy] = useState(false);
  const docUrlRef = useRef(null);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setCurrentUser(null);
    setVisitors([]);
    setStats(null);
    setActivePass(null);
    setActiveTab('resident');
  }, []);

  const loadData = useCallback(async (role, { quiet = false } = {}) => {
    try {
      const { data } = await api.get('/requests');
      const items = data.items || [];
      setVisitors(items);
      if (['admin', 'guard'].includes(role)) {
        try { setStats((await api.get('/requests/stats')).data); } catch { /* Keep the UI usable if metrics are temporarily unavailable. */ }
      } else {
        setStats(null);
      }
      setActivePass((current) => {
        if (current) return items.find((item) => item.id === current.id) || current;
        return ['student', 'faculty'].includes(role) ? (items[0] || null) : null;
      });
    } catch (error) {
      if (!quiet) window.alert(getApiError(error));
      if (error?.response?.status === 401) clearSession();
    }
  }, [clearSession]);

  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) { setAuthChecking(false); return; }
      try {
        const { data } = await api.get('/auth/me');
        if (cancelled) return;
        setCurrentUser(data.user);
        setActiveTab(routeForRole(data.user.role));
      } catch {
        setAccessToken(null);
      } finally {
        if (!cancelled) setAuthChecking(false);
      }
    };
    restore();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!currentUser) return undefined;
    loadData(currentUser.role, { quiet: true });
    // Periodic refresh keeps admin/guard screens in sync across separate browsers.
    const timer = window.setInterval(() => loadData(currentUser.role, { quiet: true }), 10000);
    return () => window.clearInterval(timer);
  }, [currentUser, loadData]);

  const handleLogin = async (credentials) => {
    setBusy(true);
    try {
      const { data } = await api.post('/auth/login', { email: credentials.email, password: credentials.password });
      setAccessToken(data.token);
      setCurrentUser(data.user);
      setActiveTab(routeForRole(data.user.role));
      return data.user;
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (details) => {
    setBusy(true);
    try {
      const { data } = await api.post('/auth/register', details);
      setAccessToken(data.token);
      setCurrentUser(data.user);
      setActiveTab(routeForRole(data.user.role));
      return data.user;
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    try { if (localStorage.getItem(TOKEN_KEY)) await api.post('/auth/logout'); } catch { /* Discard local token even if the network is down. */ }
    clearSession();
  };

  const handlePassCreated = async (newPass) => {
    const formData = new FormData();
    const fields = ['visitorName', 'visitorEmail', 'idType', 'idNumber', 'hostName', 'hostAddress', 'hostIdDocType', 'arrivalDate', 'exitDate', 'purpose'];
    fields.forEach((field) => formData.append(field, newPass[field] ?? ''));
    if (newPass.visitorFile) formData.append('visitorDocument', newPass.visitorFile);
    if (newPass.hostFile) formData.append('hostDocument', newPass.hostFile);
    const { data } = await api.post('/requests', formData);
    const created = data.item;
    setActivePass(created);
    await loadData(currentUser.role, { quiet: true });
    return created;
  };

  const handleApprove = async (id) => {
    const { data } = await api.patch(`/requests/${encodeURIComponent(id)}/decision`, { decision: 'approve' });
    setApprovedQrPass(data.item);
    await loadData(currentUser.role, { quiet: true });
  };

  const handleReject = async (id, reason) => {
    await api.patch(`/requests/${encodeURIComponent(id)}/decision`, { decision: 'reject', reason });
    await loadData(currentUser.role, { quiet: true });
  };

  const handleToggleBlacklist = async (id, blacklisted) => {
    await api.patch(`/requests/${encodeURIComponent(id)}/blacklist`, { blacklisted });
    await loadData(currentUser.role, { quiet: true });
  };

  const handleStatusChange = async (id, newStatus) => {
    const action = newStatus === 'Inside Campus' ? 'checkin' : 'checkout';
    const { data } = await api.post(`/gate/${encodeURIComponent(id)}/transition`, { action });
    setVisitors((previous) => previous.map((item) => item.id === id ? data.item : item));
    await loadData(currentUser.role, { quiet: true });
    return data.item;
  };

  const handleVerifyAndTransition = async (decodedText) => {
    const { data: verification } = await api.post('/gate/verify', { code: decodedText });
    if (verification.nextAction === 'completed') throw new Error('This visit is already completed.');
    const { data } = await api.post(`/gate/${encodeURIComponent(verification.item.id)}/transition`, { action: verification.nextAction });
    await loadData(currentUser.role, { quiet: true });
    return { item: data.item, action: verification.nextAction };
  };

  const handleOpenDocument = async (request, kind) => {
    try {
      const { data } = await api.get(`/requests/${encodeURIComponent(request.id)}/documents/${kind}`, { responseType: 'blob' });
      if (docUrlRef.current) URL.revokeObjectURL(docUrlRef.current);
      const fileUrl = URL.createObjectURL(data);
      docUrlRef.current = fileUrl;
      setInspectDoc({
        docType: kind === 'visitor' ? 'Visitor Identity' : 'Host Identity',
        fileName: kind === 'visitor' ? request.idDocName : request.hostDocName,
        entityName: kind === 'visitor' ? request.name : request.hostName,
        fileUrl
      });
    } catch (error) {
      window.alert(getApiError(error));
    }
  };

  const closeDocument = () => {
    setInspectDoc(null);
    if (docUrlRef.current) URL.revokeObjectURL(docUrlRef.current);
    docUrlRef.current = null;
  };

  if (authChecking) return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-600 text-sm">Connecting to GateWay…</div>;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      {!currentUser && <LoginModal onLogin={handleLogin} onRegister={handleRegister} busy={busy} />}
      {currentUser && <>
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="bg-sky-600 text-white p-2 rounded-xl shadow-sm"><ShieldCheck className="w-6 h-6" /></div>
              <div className="min-w-0"><h1 className="font-bold text-lg leading-tight text-slate-900">GateWay</h1><p className="text-xs text-slate-500 font-medium hidden sm:block">Smart Campus Access &amp; Pre-Approval System</p></div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-slate-500">Signed in as:</span><strong className="text-slate-800 font-mono">{currentUser.email} ({currentUser.role.toUpperCase()})</strong></div>
              <button onClick={handleSignOut} className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition"><LogOut className="w-3.5 h-3.5" /><span>Sign Out</span></button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full">
          {activeTab === 'resident' && <ResidentPortal activeUser={currentUser} onPassCreated={handlePassCreated} activePass={activePass} />}
          {activeTab === 'admin' && <AdminDesk visitors={visitors} stats={stats} onApprove={handleApprove} onReject={handleReject} onToggleBlacklist={handleToggleBlacklist} onOpenDocument={handleOpenDocument} />}
          {activeTab === 'guard' && <GuardTerminal visitors={visitors} onStatusChange={handleStatusChange} onVerifyAndTransition={handleVerifyAndTransition} />}
        </main>
      </>}
      <LargeDocModal isOpen={Boolean(inspectDoc)} onClose={closeDocument} docData={inspectDoc} />
      <QrGeneratedModal isOpen={Boolean(approvedQrPass)} onClose={() => setApprovedQrPass(null)} passData={approvedQrPass} />
    </div>
  );
}
