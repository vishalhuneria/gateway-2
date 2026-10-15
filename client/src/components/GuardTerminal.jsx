import { useState, useEffect, useRef } from "react";
import {
  UserCheck,
  Hourglass,
  AlertTriangle,
  Download,
  Search,
  Camera,
  LogIn,
  LogOut,
  Clock,
  X,
} from "lucide-react";

// Real Hardware Optical QR Scanner Modal
function CameraScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [errorMsg, setErrorMsg] = useState("");
  const callbackRef = useRef(onScanSuccess);
  useEffect(() => { callbackRef.current = onScanSuccess; }, [onScanSuccess]);

  useEffect(() => {
    if (!isOpen) return;

    let html5QrCode = null;
    setErrorMsg("");

    const timer = setTimeout(async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        html5QrCode = new Html5Qrcode("qr-scanner-box");

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
          },
          (decodedText) => {
            html5QrCode
              .stop()
              .then(() => {
                callbackRef.current(decodedText);
              })
              .catch(() => {
                callbackRef.current(decodedText);
              });
          },
          () => {
            // Frame parsing loop
          }
        );
      } catch (err) {
        console.error("Camera launch error:", err);
        setErrorMsg(
          "Camera access denied or device not found. Please click the lock/tune icon near your browser address bar, set Camera to 'Allow', and refresh."
        );
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      if (html5QrCode) {
        html5QrCode
          .stop()
          .then(() => html5QrCode.clear())
          .catch((e) => console.log(e));
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center text-white">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm">Hardware Optical QR Scanner</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col items-center">
          {errorMsg ? (
            <div className="p-6 text-center text-rose-400 text-xs bg-rose-950/30 border border-rose-800/40 rounded-2xl w-full">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-80" />
              <p className="font-semibold">{errorMsg}</p>
            </div>
          ) : (
            <div className="w-full bg-black rounded-2xl overflow-hidden border border-slate-800 aspect-square flex items-center justify-center relative">
              <div id="qr-scanner-box" className="w-full h-full" />
            </div>
          )}

          <p className="text-xs text-slate-400 mt-3 text-center">
            Point camera directly at visitor's physical or digital QR passcode.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function GuardTerminal({ visitors, onStatusChange, onVerifyAndTransition }) {
  const [query, setQuery] = useState("");
  const [isCamOpen, setIsCamOpen] = useState(false);

  // A visitor overstays only when they are still inside after the authorised exit date.
  const isOverstayed = (v) => {
    if (v.status !== "Inside Campus" || !v.exitDate) return false;
    const todayParts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const todayKey = `${todayParts.find((p) => p.type === "year").value}-${todayParts.find((p) => p.type === "month").value}-${todayParts.find((p) => p.type === "day").value}`;
    return String(v.exitDate).slice(0, 10) < todayKey;
  };

  const insideCount = visitors.filter((v) => v.status === "Inside Campus").length;
  const todayParts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const campusToday = `${todayParts.find((p) => p.type === "year").value}-${todayParts.find((p) => p.type === "month").value}-${todayParts.find((p) => p.type === "day").value}`;
  const pendingCount = visitors.filter((v) => v.status === "Pending" && v.approvalStatus === "Approved" && v.arrivalDate === campusToday).length;
  const overstayedCount = visitors.filter(isOverstayed).length;

  const filtered = visitors.filter(
    (v) =>
      v.passcode?.toLowerCase().includes(query.toLowerCase()) ||
      v.email?.toLowerCase().includes(query.toLowerCase()) ||
      v.name?.toLowerCase().includes(query.toLowerCase()) ||
      v.hostName?.toLowerCase().includes(query.toLowerCase())
  );

  // Real CSV Audit Log Export Function
  const handleExportCSV = () => {
    if (!visitors || visitors.length === 0) {
      alert("No visitor audit records found to export.");
      return;
    }

    const headers = [
      "Passcode",
      "Visitor Name",
      "Email",
      "Host Name",
      "Host Location",
      "Purpose",
      "Clearance",
      "Gate Status",
      "Check-In Time",
      "Check-Out Time",
      "Blacklisted",
    ];

    const csvCell = (value) => {
      let text = String(value ?? "").replace(/"/g, '""');
      // Prevent spreadsheet formula execution on user-supplied fields.
      if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
      return `"${text}"`;
    };
    const rows = visitors.map((v) => [
      v.passcode, v.name, v.email, v.hostName, v.hostAddress, v.purpose,
      v.approvalStatus, v.status, v.checkInTime, v.checkOutTime,
      v.blacklisted ? "YES" : "NO",
    ].map(csvCell));

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `IIT_Ropar_Gate_Audit_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // The decoded value is sent to the backend for authoritative verification and gate transition.
  const handleScanSuccess = async (decodedText) => {
    setIsCamOpen(false);
    try {
      if (!onVerifyAndTransition) throw new Error('Server-side QR verification is not configured.');
      const result = await onVerifyAndTransition(decodedText);
      const verb = result.action === 'checkin' ? 'Check-IN' : 'Check-OUT';
      alert(`Verified: ${result.item.name} (${result.item.passcode}) ${verb} recorded successfully!`);
    } catch (error) {
      alert(error?.response?.data?.message || error?.message || 'QR verification failed. Entry is denied.');
    }
  };

  const handleManualStatusChange = async (item, targetStatus) => {
    try {
      await onStatusChange(item.id, targetStatus);
      alert(`${targetStatus === 'Inside Campus' ? 'Check-IN' : 'Check-OUT'} recorded for ${item.name}.`);
    } catch (error) {
      alert(error?.response?.data?.message || error?.message || 'Gate action failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Summary Cards with Overstay Widget */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Currently Inside</p>
            <p className="text-2xl font-bold text-emerald-600 mt-0.5">{insideCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Feature 3: Overstay Alerts Metric */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-rose-500 font-semibold uppercase">Overstay Alerts</p>
            <p className="text-2xl font-bold text-rose-600 mt-0.5">{overstayedCount}</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-amber-500 font-semibold uppercase">Expected Today</p>
            <p className="text-2xl font-bold text-amber-600 mt-0.5">{pendingCount}</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Hourglass className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={handleExportCSV}
          className="bg-sky-600 p-4 rounded-2xl text-white shadow-sm flex items-center justify-between cursor-pointer hover:bg-sky-700 transition"
        >
          <div>
            <p className="text-xs text-sky-200 font-semibold uppercase">Security Audit</p>
            <p className="text-sm font-bold mt-1">Download CSV</p>
          </div>
          <div className="p-2.5 bg-white/10 rounded-xl">
            <Download className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Passcode Search & Optical Scanner Trigger */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Type 4-digit Passcode, Email ID, Host Name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-sm pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none"
          />
        </div>

        <button
          onClick={() => setIsCamOpen(true)}
          className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 flex items-center space-x-2 transition shadow-sm cursor-pointer"
        >
          <Camera className="w-4 h-4 text-emerald-400" />
          <span>Launch Camera Optical Scanner</span>
        </button>
      </div>

      {/* Gate Audit Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Passcode</th>
                <th className="py-3 px-3">Visitor Name</th>
                <th className="py-3 px-3">Host & Location</th>
                <th className="py-3 px-3">Clearance</th>
                <th className="py-3 px-3">Gate Status</th>
                <th className="py-3 px-3">Check-IN Time</th>
                <th className="py-3 px-3">Check-OUT Time</th>
                <th className="py-3 px-3 text-right">Gate Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => {
                const overstay = isOverstayed(item);
                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50 transition ${
                      overstay ? "bg-amber-50/70 border-l-4 border-amber-500" : ""
                    } ${item.blacklisted ? "bg-rose-50 border-l-4 border-rose-600" : ""}`}
                  >
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {item.passcode}
                      {item.blacklisted && (
                        <span className="block text-[10px] text-rose-600 font-sans font-bold">
                          BLACKLISTED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-800">{item.name}</span>
                      <div className="text-[11px] text-slate-500">{item.email}</div>
                    </td>
                    <td className="py-3 px-3 text-xs">
                      <div className="font-medium text-slate-800">
                        {item.hostName} ({item.hostAddress})
                      </div>
                      <div className="text-slate-500 text-[11px]">{item.hostIdDocType}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          item.approvalStatus === "Approved"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {item.approvalStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          item.status === "Inside Campus"
                            ? "bg-emerald-100 text-emerald-800"
                            : item.status === "Completed"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {item.status}
                      </span>
                      {overstay && (
                        <span className="ml-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                          OVERSTAY
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-700">
                      {item.checkInTime && item.checkInTime !== "—" ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          <Clock className="w-3 h-3" />
                          <span>{item.checkInTime}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-700">
                      {item.checkOutTime && item.checkOutTime !== "—" ? (
                        <span className="inline-flex items-center space-x-1 text-slate-700 font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          <Clock className="w-3 h-3" />
                          <span>{item.checkOutTime}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {item.blacklisted && item.status === "Inside Campus" ? (
                        <button onClick={() => handleManualStatusChange(item, "Completed")} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 px-2 py-1.5 cursor-pointer text-[11px] font-bold" title="Record safe exit"><LogOut className="w-3.5 h-3.5" />Check out</button>
                      ) : item.blacklisted ? (
                        <span className="text-[11px] font-bold text-rose-500">Blocked (entry)</span>
                      ) : item.approvalStatus !== "Approved" ? (
                        <span className="text-[11px] font-bold text-slate-400">Locked</span>
                      ) : item.status === "Pending" ? (
                        <button onClick={() => handleManualStatusChange(item, "Inside Campus")} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 px-2 py-1.5 cursor-pointer text-[11px] font-bold" title="Record Check-IN"><LogIn className="w-3.5 h-3.5" />Check in</button>
                      ) : item.status === "Inside Campus" ? (
                        <button onClick={() => handleManualStatusChange(item, "Completed")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 px-2 py-1.5 cursor-pointer text-[11px] font-bold" title="Record Check-OUT"><LogOut className="w-3.5 h-3.5" />Check out</button>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-400">Completed</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Optical Camera Modal */}
      <CameraScannerModal
        isOpen={isCamOpen}
        onClose={() => setIsCamOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
}