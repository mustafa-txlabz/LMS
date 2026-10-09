import React, { useState, useMemo } from 'react';
import { User, SemesterProgressionAuditLog, Semester } from '../../types';
import { useLms } from '../../context/LmsContext';
import {
  ShieldAlert,
  X,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  Info,
  Clock,
  UserCheck,
} from 'lucide-react';
import {
  formatStudentRollNumber,
  formatStudentEmail,
  extractRollNumberDigits,
  getUserPrimaryDepartment,
} from '../../utils/studentEmail';

interface StudentSemesterOverrideModalProps {
  student: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (auditLog?: SemesterProgressionAuditLog) => void;
}

export const StudentSemesterOverrideModal: React.FC<StudentSemesterOverrideModalProps> = ({
  student,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser, overrideStudentSemester, semesters } = useLms();

  const currentSem = student.semester || 1;
  const isDetained = student.academicStatus === 'detained' || student.academicStatus === 'repeat';

  // Available semesters strictly from curriculum (avoids hardcoding 8 semesters if only 3 exist)
  const availableSemesters = useMemo<Semester[]>(() => {
    const sorted = [...semesters].sort((a, b) => a.number - b.number);
    if (currentSem && !sorted.some((s: Semester) => s.number === currentSem)) {
      sorted.push({
        id: `sem-${currentSem}`,
        name: `Semester ${currentSem}`,
        number: currentSem,
        code: `S${currentSem}`,
        isRegistrationOpen: false,
        isCurrent: false,
        startDate: '2026-01-01',
        endDate: '2026-06-30',
      });
      sorted.sort((a, b) => a.number - b.number);
    }
    return sorted.length > 0
      ? sorted
      : [{ id: 'sem-1', name: 'Semester 1', number: 1, code: 'S1', isRegistrationOpen: true, isCurrent: true, startDate: '2026-01-01', endDate: '2026-06-30' }];
  }, [semesters, currentSem]);

  const [targetSemester, setTargetSemester] = useState<number>(() => {
    const next = availableSemesters.find((s: Semester) => s.number > currentSem);
    return next ? next.number : (availableSemesters[0]?.number || currentSem);
  });

  // Session (Enrollment Year) - Writable + Calendar Picker with Current Date Selected by default
  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const initialSession = Number(student.session || student.sessionYear || new Date().getFullYear());
  const [session, setSession] = useState<number>(initialSession);

  const [sessionDate, setSessionDate] = useState<string>(() => {
    if (student.session || student.sessionYear) {
      const yr = Number(student.session || student.sessionYear);
      if (yr === new Date().getFullYear()) return todayDateStr;
      return `${yr}-01-01`;
    }
    return todayDateStr; // Current date is selected by default
  });

  const handleSessionDateChange = (dateVal: string) => {
    setSessionDate(dateVal);
    if (dateVal) {
      const yr = parseInt(dateVal.split('-')[0], 10);
      if (!isNaN(yr) && yr >= 1990 && yr <= 2100) {
        setSession(yr);
      }
    }
  };

  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // University domain for student email
  const adminEmail = currentUser?.email || 'registrar@uet.edu.pk';
  const adminDomain = adminEmail.includes('@') ? adminEmail.split('@')[1] : 'uet.edu.pk';

  const studentDept = getUserPrimaryDepartment(student);
  const cleanDigits = extractRollNumberDigits(student.rollNumber || '01');
  const cleanRoll = cleanDigits ? (cleanDigits.length === 1 ? '0' + cleanDigits : cleanDigits) : '01';

  // Synchronized roll number and email extracted from session year
  const updatedRollNumber = useMemo(() => {
    return formatStudentRollNumber(session, studentDept, cleanRoll);
  }, [session, studentDept, cleanRoll]);

  const updatedEmail = useMemo(() => {
    return formatStudentEmail(session, studentDept, cleanRoll, adminDomain);
  }, [session, studentDept, cleanRoll, adminDomain]);

  if (!isOpen) return null;

  // Strict Role Check: Super Admin or Academic Controller only
  const isAuthorized = currentUser?.role === 'admin';

  const quickReasonPresets = [
    'Credit transfer evaluation approved by Department Board',
    'Grade rechecking correction: semester requirement satisfied',
    'Official academic council exemption granted',
    'Special Board of Studies dispensation for degree progression',
    'Administrative appeal approved by Vice Chancellor Office',
    'Lateral entry credit reconciliation and session adjustment',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isAuthorized) {
      setError('Permission denied: Manual semester override is strictly restricted to Super Admin or Academic Controller roles.');
      return;
    }

    if (!reason || !reason.trim()) {
      setError('Mandatory audit reason is required. Manual override cannot be approved without a non-empty official justification.');
      return;
    }

    const sessionChanged = session !== (student.session || student.sessionYear);
    if (targetSemester === currentSem && !isDetained && !sessionChanged) {
      setError(`Student is already registered in Semester ${currentSem} (Session ${session}). Select a different target semester, change session, or provide update rationale.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await overrideStudentSemester(
        student.id,
        targetSemester,
        reason.trim(),
        session,
        cleanRoll,
        updatedEmail
      );
      if (result.success) {
        if (onSuccess) onSuccess(result.auditLog);
        handleClose();
      } else {
        setError(result.error || 'Failed to execute manual semester override.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected server error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFormFields = () => {
    setReason('');
    setError(null);
  };

  const handleClose = () => {
    resetFormFields();
    onClose();
  };

  const formattedRoll = formatStudentRollNumber(
    student.session || student.sessionYear,
    studentDept,
    student.rollNumber
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Super Admin Manual Semester Override
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                  Strict Audit Logging
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Official academic controller override with mandatory justification and audit trail.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-medium">{error}</div>
            </div>
          )}

          {/* Target Student Identity Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Target Student Profile
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                isDetained
                  ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                  : student.academicStatus === 'probation'
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : student.academicStatus === 'graduated'
                  ? 'bg-purple-100 text-purple-800 border-purple-300'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}>
                Status: {student.academicStatus?.toUpperCase() || 'ACTIVE'}
              </span>
            </div>

            <div className="flex items-start gap-3">
              <img
                src={student.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=0F172A&color=fff`}
                alt={student.name}
                className="w-10 h-10 rounded-full border border-slate-300 object-cover shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-slate-900">{student.name}</h4>
                  <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                    {formattedRoll}
                  </span>
                </div>
                <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>BS {studentDept}</span>
                  <span>·</span>
                  <span>Session: <strong className="font-mono text-slate-800">{student.session || 2026}</strong></span>
                  <span>·</span>
                  <span>CGPA: <strong className="font-mono text-indigo-700">{(student.cgpa !== undefined ? student.cgpa : 0).toFixed(2)}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Status Synchronization Notice if Detained */}
          {isDetained && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Automatic Status Synchronization</strong>
                <span>
                  This student is currently on <strong>{student.academicStatus?.toUpperCase()}</strong> status.
                  Applying this manual override will automatically reset their academic status back to{' '}
                  <strong className="text-emerald-700">ACTIVE</strong> and clear the detention restriction.
                </span>
              </div>
            </div>
          )}

          {/* Session (Enrollment Year) & Roll / Email Synchronization */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Session (Enrollment Year)</span>
              </label>
              <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                Extracted Year: {session}
              </span>
            </div>

            {/* Calendar Date Picker with Current Date Selected by default */}
            <div className="relative">
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => handleSessionDateChange(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 font-mono text-slate-800 font-semibold cursor-pointer shadow-2xs"
                title="Pick enrollment date from calendar to extract session year"
              />
            </div>

            {/* Real-time roll number and email extracted from session year */}
            <div className="p-2 bg-indigo-50/70 border border-indigo-200 rounded-md text-[11px] text-slate-700 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Synchronized Roll Number:</span>
                <code className="font-mono font-bold text-indigo-800 bg-white px-1.5 py-0.2 rounded border border-indigo-300 shadow-2xs">
                  {updatedRollNumber}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Synchronized Email:</span>
                <code className="font-mono font-bold text-indigo-800 bg-white px-1.5 py-0.2 rounded border border-indigo-300 shadow-2xs">
                  {updatedEmail}
                </code>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 flex items-center justify-between">
              <span>Year <strong className="text-indigo-700 font-mono">{session}</strong> extracted from calendar.</span>
              <span className="text-indigo-600 font-medium">Auto-syncs Roll & Institutional Email</span>
            </p>
          </div>

          {/* Semester Transition Visualizer & Selector */}
          <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">
                Select Target Semester
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                {availableSemesters.length} Available in System
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Current Semester Box */}
              <div className="flex-1 p-2.5 bg-white border border-slate-200 rounded-lg text-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Current Semester</span>
                <span className="text-lg font-bold text-slate-700 font-mono">
                  Semester {currentSem}
                </span>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 shrink-0">
                <ArrowRight className="w-4 h-4" />
              </div>

              {/* Target Semester Selector */}
              <div className="flex-1 p-2.5 bg-white border-2 border-indigo-500 rounded-lg shadow-2xs">
                <span className="text-[10px] text-indigo-600 uppercase font-bold block">New Target Semester</span>
                <select
                  value={targetSemester}
                  onChange={(e) => setTargetSemester(Number(e.target.value))}
                  className="w-full mt-0.5 text-base font-bold text-indigo-900 bg-transparent border-0 focus:ring-0 cursor-pointer font-mono"
                >
                  {availableSemesters.map((sem: Semester) => (
                    <option key={sem.id || sem.number} value={sem.number}>
                      Semester {sem.number} ({sem.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>
                {targetSemester > currentSem
                  ? `Promoting student forward by ${targetSemester - currentSem} semester(s).`
                  : targetSemester === currentSem
                  ? 'Re-affirming current semester placement (clears detention).'
                  : `Adjusting student to earlier Semester ${targetSemester}.`}
              </span>
            </p>
          </div>

          {/* Mandatory Audit Reason Input (Non-Empty Validation Required) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>Mandatory Official Audit Reason</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className={`text-[10px] font-mono font-semibold ${
                reason.trim().length === 0 ? 'text-rose-500' : 'text-emerald-600'
              }`}>
                {reason.trim().length === 0 ? 'Reason Required' : `${reason.trim().length} chars`}
              </span>
            </div>

            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State official justification (e.g. 'Credit transfer evaluation from accredited university', 'Grade rechecking correction approved by Academic Council', 'Official medical exemption')..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-sans"
            />

            {/* Quick Reason Presets */}
            <div>
              <span className="text-[10px] font-semibold text-slate-500 block mb-1">
                Quick Preset Justifications:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickReasonPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setReason(preset)}
                    className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded border border-slate-200 transition-colors text-left cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Performing Admin Signature Box */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="text-slate-400 block text-[10px]">Performing Controller:</span>
                <span className="font-bold text-slate-800">{currentUser?.name || 'Dr. Robert Vance'}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[10px]">Timestamp:</span>
              <span className="font-mono text-slate-700 text-[11px] flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                Live UTC
              </span>
            </div>
          </div>

          {/* Actions Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleClose}
              className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className={`px-4 py-2 text-xs font-bold text-white rounded-lg shadow-sm transition-all flex items-center gap-2 ${
                !reason.trim() || isSubmitting
                  ? 'bg-slate-400 cursor-not-allowed opacity-60'
                  : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 cursor-pointer shadow-indigo-200'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing Override...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Apply Override</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
