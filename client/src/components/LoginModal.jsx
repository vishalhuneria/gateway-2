import { useState } from 'react';
import { ShieldCheck, Mail, IdCard, ChevronDown, LogIn, LockKeyhole, UserRoundPlus } from 'lucide-react';
import { getApiError } from '../api';

export default function LoginModal({ onLogin, onRegister, busy = false }) {
  const [mode, setMode] = useState('login');
  const [roleSelect, setRoleSelect] = useState('resident');
  const [residentType, setResidentType] = useState('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [entryNumber, setEntryNumber] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    try {
      if (mode === 'register') {
        if (roleSelect !== 'resident') throw new Error('Only student and faculty accounts can self-register. Admin and guard accounts are provisioned by the system administrator.');
        await onRegister({ name: name.trim(), email: email.trim().toLowerCase(), password, role: residentType, entryNumber: residentType === 'student' ? entryNumber.trim().toUpperCase() : '' });
      } else {
        await onLogin({ email: email.trim().toLowerCase(), password });
      }
    } catch (error) {
      setErrorMsg(error?.response ? getApiError(error) : (error.message || getApiError(error)));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-8 relative my-4">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-sky-600 text-white p-3 rounded-2xl shadow-md"><ShieldCheck className="w-6 h-6" /></div>
          <div><h2 className="text-xl font-extrabold text-slate-900 tracking-tight">GateWay Portal</h2><p className="text-xs text-slate-500 font-medium">Secure campus visitor access management</p></div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-5 bg-slate-100 rounded-xl p-1">
          <button type="button" onClick={() => { setMode('login'); setErrorMsg(''); }} className={`py-2 rounded-lg text-xs font-bold transition ${mode === 'login' ? 'bg-white shadow text-sky-700' : 'text-slate-500'}`}>Sign in</button>
          <button type="button" onClick={() => { setMode('register'); setRoleSelect('resident'); setErrorMsg(''); }} className={`py-2 rounded-lg text-xs font-bold transition ${mode === 'register' ? 'bg-white shadow text-sky-700' : 'text-slate-500'}`}>Create resident account</button>
        </div>
        {errorMsg && <div role="alert" className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold leading-relaxed">{errorMsg}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
            <input required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none" />
          </div>}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">{mode === 'register' ? 'Account type *' : 'Portal *'}</label>
            <div className="relative">
              <select value={roleSelect} onChange={(e) => { setRoleSelect(e.target.value); setErrorMsg(''); }} disabled={mode === 'register'} className="w-full text-sm font-semibold px-4 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500 appearance-none shadow-sm cursor-pointer outline-none text-slate-800 disabled:bg-slate-50">
                <option value="resident">Resident: Student / Faculty</option>
                {mode === 'login' && <><option value="admin">Security Admin Desk</option><option value="guard">Guard Terminal Post</option></>}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-3.5 w-4 h-4 text-slate-500" />
            </div>
            {mode === 'login' && <p className="text-[10px] text-slate-400 mt-1">Your actual access level is determined by your registered account, not by this selection.</p>}
          </div>
          {(mode === 'register' || roleSelect === 'resident') && <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Resident Category *</label>
            <div className="grid grid-cols-2 gap-2">
              {['student', 'faculty'].map((role) => <label key={role} className={`flex items-center space-x-2 border rounded-xl p-2.5 cursor-pointer hover:bg-slate-50 ${residentType === role ? 'border-sky-400 bg-sky-50/40' : 'border-slate-200'}`}>
                <input type="radio" name="residentType" value={role} checked={residentType === role} onChange={() => setResidentType(role)} className="text-sky-600 focus:ring-sky-500" />
                <span className="text-xs font-bold text-slate-700">{role === 'student' ? 'Student' : 'Faculty'}</span>
              </label>)}
            </div>
          </div>}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Institutional Email Address *</label>
            <div className="relative"><Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" /><input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. user@iitrpr.ac.in" className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none" /></div>
          </div>
          {mode === 'register' && residentType === 'student' && <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Student Entry / Roll Number *</label>
            <div className="relative"><IdCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" /><input type="text" required value={entryNumber} onChange={(e) => setEntryNumber(e.target.value)} placeholder="Roll number from student ID" className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none font-mono uppercase" /></div>
          </div>}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
            <div className="relative"><LockKeyhole className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" /><input type="password" required minLength={mode === 'register' ? 8 : 1} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'register' ? 'At least 8 characters' : 'Enter your password'} className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none" /></div>
          </div>
          {mode === 'register' && <p className="text-[11px] text-slate-500 leading-relaxed">Only student and faculty accounts can be created here. Security Admin and Guard accounts must be provisioned by an administrator.</p>}
          <button type="submit" disabled={busy} className="w-full mt-3 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-bold py-3 px-4 rounded-xl text-sm transition shadow-md shadow-sky-600/20 flex items-center justify-center space-x-2">
            {mode === 'register' ? <UserRoundPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            <span>{busy ? 'Please wait…' : mode === 'register' ? 'Create Account' : 'Sign in securely'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
