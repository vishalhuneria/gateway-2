import { useState } from "react";
import { TicketPlus, Send, QrCode, Lock, MailCheck, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function ResidentPortal({ activeUser, onPassCreated, activePass }) {
  const [visitorName, setVisitorName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [idType, setIdType] = useState("Aadhaar Card");
  const [idNumber, setIdNumber] = useState("");
  const [visitorFile, setVisitorFile] = useState(null);

  const [hostName, setHostName] = useState(
    activeUser.name || (activeUser.role === "student" ? `Student ${activeUser.entryNumber || "Resident"}` : `Prof. ${activeUser.email.split('@')[0]}`)
  );
  const [hostAddress, setHostAddress] = useState(
    activeUser.role === "student" ? "Campus Student Hostel" : "Faculty Residential Enclave"
  );
  const [hostIdDocType, setHostIdDocType] = useState(
    activeUser.role === "student" ? "Student College ID Card" : "Faculty Official ID"
  );
  const [hostFile, setHostFile] = useState(null);

  const todayParts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const today = `${todayParts.find((part) => part.type === "year").value}-${todayParts.find((part) => part.type === "month").value}-${todayParts.find((part) => part.type === "day").value}`;
  const [arrivalDate, setArrivalDate] = useState(today);
  const [exitDate, setExitDate] = useState(today);
  const [purpose, setPurpose] = useState("Personal / Guest");

  const handleVisitorFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['jpg', 'jpeg', 'pdf'].includes(ext)) {
        alert("Invalid file format! Please upload ONLY .jpg, .jpeg, or .pdf files.");
        e.target.value = "";
        return;
      }
      setVisitorFile(file);
    }
  };

  const handleHostFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['jpg', 'jpeg', 'pdf'].includes(ext)) {
        alert("Invalid file format! Please upload ONLY .jpg, .jpeg, or .pdf files.");
        e.target.value = "";
        return;
      }
      setHostFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (idType === "Aadhaar Card" && !/^\d{12}$/.test(idNumber.trim())) {
      alert("Invalid Aadhaar Number: Must be exactly 12 numeric digits.");
      return;
    }
    if (idType === "Passport" && !/^[A-Za-z]\d{7}$/.test(idNumber.trim())) {
      alert("Invalid Passport Number: Must be exactly 8 characters (1 letter followed by 7 digits).");
      return;
    }
    if (exitDate < arrivalDate) {
      alert("Departure Date cannot be earlier than Arrival Date!");
      return;
    }

    const d1 = new Date(arrivalDate);
    const d2 = new Date(exitDate);
    const durationDays = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
    const newRecord = {
      visitorName: visitorName.trim(),
      visitorEmail: visitorEmail.trim(),
      idType,
      idNumber: idNumber.trim().toUpperCase(),
      visitorFile,
      hostName: hostName.trim(),
      hostAddress: hostAddress.trim(),
      hostIdDocType,
      hostFile,
      purpose,
      arrivalDate,
      exitDate,
      durationDays,
    };

    try {
      await onPassCreated(newRecord);
      setVisitorName("");
      setVisitorEmail("");
      setIdNumber("");
      setVisitorFile(null);
      setHostFile(null);
      const fileInputs = e.currentTarget.querySelectorAll('input[type="file"]');
      fileInputs.forEach((input) => { input.value = ''; });
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Could not submit the visitor request.';
      alert(message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <TicketPlus className="w-5 h-5 text-brand-600" />
            <h2 className="font-bold text-slate-800 text-base">Visitor Pre-Registration</h2>
          </div>
          <span className="text-xs text-brand-700 font-semibold bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200">
            {activeUser.role.toUpperCase()} PORTAL ACTIVE
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">1. Visitor Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Visitor Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Visitor Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. rahul.sharma@example.com"
                  value={visitorEmail}
                  onChange={(e) => setVisitorEmail(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Govt. ID Document *</label>
                  <select
                    value={idType}
                    onChange={(e) => setIdType(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="Aadhaar Card">Aadhaar Card</option>
                    <option value="Passport">Passport</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {idType === "Aadhaar Card" ? "Aadhaar Number *" : "Passport Number *"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={idType === "Aadhaar Card" ? "Enter 12-digit number" : "e.g. A1234567"}
                    maxLength={idType === "Aadhaar Card" ? 12 : 8}
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    {idType === "Aadhaar Card" ? "Exactly 12 numeric digits required." : "1 letter followed by 7 digits."}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Upload Visitor ID Proof (JPG / PDF only) *</span>
                  <span className="text-[10px] text-slate-400 font-normal">Formats: .jpg, .jpeg, .pdf</span>
                </label>
                <input
                  type="file"
                  required
                  accept=".jpg,.jpeg,.pdf,image/jpeg,application/pdf"
                  onChange={handleVisitorFile}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">2. Host Verification (Resident Details)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Host Name *</label>
                <input
                  type="text"
                  required
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Host Address / Hostel *</label>
                <input
                  type="text"
                  required
                  value={hostAddress}
                  onChange={(e) => setHostAddress(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>

            <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">Host ID Document *</label>
                <select
                  value={hostIdDocType}
                  onChange={(e) => setHostIdDocType(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                >
                  <option value="Student College ID Card">Student College ID Card</option>
                  <option value="Faculty Official ID">Faculty Official ID</option>
                  <option value="Staff / Official Employee Card">Staff / Official Employee Card</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span>Upload Host ID Proof (JPG / PDF only) *</span>
                  <span className="text-[10px] text-slate-400 font-normal">Formats: .jpg, .jpeg, .pdf</span>
                </label>
                <input
                  type="file"
                  required
                  accept=".jpg,.jpeg,.pdf,image/jpeg,application/pdf"
                  onChange={handleHostFile}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">3. Visit Window & Purpose</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-brand-50/50 p-3.5 rounded-xl border border-brand-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Arrival Date *</label>
                <input
                  type="date"
                  required
                  value={arrivalDate}
                  onChange={(e) => setArrivalDate(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Departure Date *</label>
                <input
                  type="date"
                  required
                  value={exitDate}
                  onChange={(e) => setExitDate(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Purpose of Visit</label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
              >
                <option value="Personal / Guest">Personal / Guest</option>
                <option value="Academic Collaboration">Academic Collaboration</option>
                <option value="Courier / Delivery">Courier / Delivery</option>
                <option value="Facility Maintenance">Facility Maintenance</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition shadow-sm flex items-center justify-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Submit for Security Approval</span>
          </button>
        </form>
      </div>

      <div className="lg:col-span-5 flex flex-col items-center justify-center">
        {activePass ? (
          <div className="w-full max-w-sm bg-gradient-to-b from-brand-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-700 relative overflow-hidden">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-300">CAMPUS VISITOR PASS</span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                activePass.approvalStatus === "Approved" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              }`}>
                {activePass.approvalStatus.toUpperCase()}
              </span>
            </div>

            <div className="my-4 text-center">
              {activePass.approvalStatus === "Approved" ? (
                <div className="qr-container bg-white p-3 rounded-2xl inline-block shadow-inner">
                  <QRCodeSVG value={activePass.passcode} size={130} level="H" />
                </div>
              ) : (
                <div className="bg-slate-800/90 p-5 rounded-2xl border border-dashed border-slate-600 text-center">
                  <Lock className="w-8 h-8 mx-auto text-amber-400 mb-1" />
                  <p className="text-xs font-semibold text-slate-300">QR Code Locked</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Activated only when Security Admin grants clearance.</p>
                </div>
              )}
              <p className="text-xs text-slate-300 mt-2 font-mono">
                PASSCODE: <span className="font-bold text-emerald-400 text-base">{activePass.passcode}</span>
              </p>
            </div>

            <div className="bg-slate-800/80 rounded-xl p-3.5 space-y-1.5 text-xs border border-slate-700">
              <div className="flex justify-between"><span className="text-slate-400">Visitor:</span> <span className="font-semibold text-slate-200">{activePass.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Email:</span> <span className="font-semibold text-slate-200 truncate max-w-[180px]">{activePass.email}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Visitor ID:</span> <span className="font-mono text-emerald-400 font-semibold">{activePass.idType}: {activePass.idNumber}</span></div>
              <div className="border-t border-slate-700/60 my-1 pt-1"></div>
              <div className="flex justify-between"><span className="text-slate-400">Host Name:</span> <span className="font-semibold text-slate-200">{activePass.hostName}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Host Address:</span> <span className="font-semibold text-slate-300">{activePass.hostAddress}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Host ID Proof:</span> <span className="font-semibold text-amber-300">{activePass.hostIdDocType}</span></div>
              <div className="border-t border-slate-700/60 my-1 pt-1"></div>
              <div className="flex justify-between"><span className="text-slate-400">Stay Window:</span> <span className="font-semibold text-amber-300">{activePass.arrivalDate} to {activePass.exitDate}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Duration:</span> <span className="font-semibold text-slate-200">{activePass.durationDays} Days</span></div>
            </div>

            <div className="flex items-center space-x-2 mt-4">
              <button onClick={() => alert("Simulation email sent to " + activePass.email)} className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-medium py-2 rounded-lg transition flex items-center justify-center space-x-1.5">
                <MailCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simulate Email</span>
              </button>
              <button onClick={() => window.print()} className="px-3 bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-medium py-2 rounded-lg transition flex items-center justify-center">
                <Printer className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm h-full min-h-[380px] border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <QrCode className="w-12 h-12 mb-3 text-slate-300" />
            <p className="font-medium text-slate-600 text-sm">No Active Pass Created Yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[230px]">Pre-register a visitor with host verification details to preview their pass card.</p>
          </div>
        )}
      </div>
    </div>
  );
}