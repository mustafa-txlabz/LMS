import React, { useState, useMemo } from 'react';
import { User, Role } from '../../types';
import { useLms } from '../../context/LmsContext';
import {
  X,
  UserPlus,
  KeyRound,
  Calendar,
  Mail,
  Building,
  Trash2,
  CheckCircle2,
  Lock,
  AlertCircle,
  Hash,
  Sparkles,
  Info,
} from 'lucide-react';

interface AdminUserModalProps {
  userToEdit: User | null;
  roleToCreate: 'student' | 'teacher' | null;
  onClose: () => void;
}

import {
  formatStudentRollNumber,
  extractRollNumberDigits,
  formatStudentEmail,
  getDepartmentCode,
} from '../../utils/studentEmail';

export const AdminUserModal: React.FC<AdminUserModalProps> = ({
  userToEdit,
  roleToCreate,
  onClose,
}) => {
  const { users, currentUser, departments, adminAddUser, adminUpdateUser, adminResetPassword, adminDeleteUser } = useLms();

  const isEditing = !!userToEdit;
  const targetRole = userToEdit ? userToEdit.role : roleToCreate || 'student';
  const currentYear = new Date().getFullYear() || 2026;

  // Extract university domain from the admin user or current user
  const adminUser = users.find((u) => u.role === 'admin') || (currentUser?.role === 'admin' ? currentUser : null);
  const adminEmail = adminUser?.email || currentUser?.email || 'registrar@nicore.edu.pk';
  const adminDomain = adminEmail.includes('@')
    ? adminEmail.split('@')[1].trim().toLowerCase()
    : 'nicore.edu.pk';

  // Common user fields
  const [name, setName] = useState(userToEdit?.name || '');
  const [password, setPassword] = useState(userToEdit?.password || 'password123');
  const [department, setDepartment] = useState(userToEdit?.department || departments[0]?.name || 'Computer Science');
  const [dob, setDob] = useState(userToEdit?.dob || '2003-01-01');
  const [phone, setPhone] = useState(userToEdit?.phone || '');
  const [address, setAddress] = useState(userToEdit?.address || '');
  const [bio, setBio] = useState(userToEdit?.bio || '');

  // Teacher specific
  const [designation, setDesignation] = useState(userToEdit?.designation || 'Assistant Professor');
  const [teacherEmail, setTeacherEmail] = useState(userToEdit?.email || '');

  // Student specific: session year, roll number, semester
  // For new students: session year is fixed to currentYear and semester is fixed to 1
  // For existing students (Manage & Reset): session and semester can be freely modified
  const [session, setSession] = useState<number>(
    isEditing ? userToEdit?.session || userToEdit?.sessionYear || currentYear : currentYear
  );
  const [semester, setSemester] = useState<number>(
    isEditing ? userToEdit?.semester || 1 : 1
  );

  // Initial roll number extraction (numeric digits for number input)
  const initialRoll = useMemo(() => {
    if (!userToEdit?.rollNumber) return '';
    return extractRollNumberDigits(userToEdit.rollNumber);
  }, [userToEdit]);

  const [rollNumber, setRollNumber] = useState<string>(initialRoll || '');

  // Clean numeric roll number for formula computation
  const deptCode = getDepartmentCode(department, departments);
  const cleanDigits = extractRollNumberDigits(rollNumber);
  const cleanRoll = cleanDigits ? (cleanDigits.length === 1 ? '0' + cleanDigits : cleanDigits) : '';

  // Real-time generated student complete roll number: "year-department-rollnumber" (e.g. 2021-cs-01)
  const generatedCompleteRoll = useMemo(() => {
    return formatStudentRollNumber(session, department, cleanRoll || '01', departments);
  }, [session, department, cleanRoll, departments]);

  // Real-time generated student institutional email: "year-department-rollnumber@adminDomain"
  const generatedStudentEmail = useMemo(() => {
    return formatStudentEmail(session, department, cleanRoll || '01', adminDomain, departments);
  }, [session, department, cleanRoll, adminDomain, departments]);

  // Roll Number Uniqueness Validation:
  // "roll number must be unique like this same roll number does not exist on same session year and department and semester."
  const duplicateStudent = useMemo(() => {
    if (targetRole !== 'student' || !cleanDigits) return null;
    return users.find((u) => {
      if (u.role !== 'student') return false;
      if (isEditing && u.id === userToEdit?.id) return false;
      const uSession = Number(u.session || u.sessionYear || currentYear);
      const curSession = Number(session);
      const uDept = (u.department || '').trim().toLowerCase();
      const curDept = department.trim().toLowerCase();
      const uSemester = Number(u.semester || 1);
      const curSemester = Number(semester);

      const existingClean = extractRollNumberDigits(u.rollNumber);
      const existingPadded = existingClean.length === 1 ? '0' + existingClean : existingClean;

      return (
        uSession === curSession &&
        uDept === curDept &&
        uSemester === curSemester &&
        (existingPadded === cleanRoll || existingClean === cleanDigits)
      );
    });
  }, [users, targetRole, isEditing, userToEdit, session, department, semester, cleanDigits, cleanRoll, currentYear]);

  // Password Reset tab inside edit mode
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [newPasswordToReset, setNewPasswordToReset] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (targetRole === 'student') {
      if (!cleanRoll) {
        setFormError('University roll number is required for student enrollment.');
        return;
      }
      if (duplicateStudent) {
        setFormError(
          `Conflict: Roll Number "${cleanRoll}" already belongs to student ${duplicateStudent.name} for Session ${session}, Department "${department}", and Semester ${semester}. Roll number must be unique.`
        );
        return;
      }
    }

    setIsSubmitting(true);

    const finalEmail = targetRole === 'student' ? generatedStudentEmail : teacherEmail.trim().toLowerCase();
    const finalRollNumber = targetRole === 'student' ? cleanRoll : undefined;

    if (isEditing && userToEdit) {
      await adminUpdateUser(userToEdit.id, {
        name,
        email: finalEmail,
        department,
        session: targetRole === 'student' ? Number(session) : undefined,
        sessionYear: targetRole === 'student' ? Number(session) : undefined,
        rollNumber: finalRollNumber,
        designation: targetRole === 'teacher' ? designation : undefined,
        semester: targetRole === 'student' ? Number(semester) : undefined,
        dob,
        phone,
        address,
        bio,
      });
    } else {
      await adminAddUser({
        name,
        email: finalEmail,
        password,
        role: targetRole as Role,
        department,
        session: targetRole === 'student' ? Number(session) : undefined,
        sessionYear: targetRole === 'student' ? Number(session) : undefined,
        rollNumber: finalRollNumber,
        designation: targetRole === 'teacher' ? designation : undefined,
        semester: targetRole === 'student' ? Number(semester) : undefined,
        dob,
        phone,
        address,
        bio,
      });
    }

    setIsSubmitting(false);
    onClose();
  };

  const handleExecuteResetPassword = async () => {
    if (!userToEdit) return;
    if (!newPasswordToReset || newPasswordToReset.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }

    await adminResetPassword(userToEdit.id, newPasswordToReset);
    setToast(`Password for ${userToEdit.name} has been successfully reset!`);
    setNewPasswordToReset('');
    setIsResetPasswordOpen(false);
    setTimeout(() => setToast(null), 3500);
  };

  // Delete User Confirmation State
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExecuteDelete = async () => {
    if (!userToEdit) return;
    setIsDeleting(true);
    try {
      await adminDeleteUser(userToEdit.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete user:', err);
      setFormError('Failed to delete user. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-indigo-400" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider">
                {isEditing
                  ? `Manage ${targetRole.toUpperCase()}: ${userToEdit?.name}`
                  : `Enroll New ${targetRole.toUpperCase()}`}
              </h3>
              <p className="text-[10px] text-slate-400">
                {targetRole === 'student'
                  ? isEditing
                    ? 'Manage student profile, session year, semester, or reset credentials'
                    : 'Admit 1st semester student with automated institutional email and unique roll'
                  : 'Manage faculty credentials, academic department and designation'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-all hover:rotate-90 duration-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {toast && (
          <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{toast}</span>
          </div>
        )}

        {formError && (
          <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Full Name & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Johnson"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Academic Department <span className="text-rose-500">*</span>
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:ring-1 focus:ring-indigo-500 font-medium"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Student Specific: Session (Enrollment Year) & Semester */}
          {targetRole === 'student' && (
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Session Year & Academic Semester</span>
                </span>
                {!isEditing ? (
                  <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Lock className="w-3 h-3 text-indigo-500" />
                    <span>Fixed for Initial Enrollment</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Editable in Manage & Reset
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Session (Enrollment Year) */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Session (Enrollment Year)</span>
                    {!isEditing && <span className="text-[10px] text-slate-500">Current Year</span>}
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      required
                      min={2000}
                      max={2050}
                      value={session}
                      onChange={(e) => setSession(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  ) : (
                    <div className="relative">
                      <input
                        type="number"
                        readOnly
                        disabled
                        value={session}
                        className="w-full px-3 py-1.5 text-xs bg-slate-100 border border-slate-300 rounded-md font-mono text-slate-700 cursor-not-allowed select-none"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-500">
                        Current Year ({currentYear})
                      </span>
                    </div>
                  )}
                  {!isEditing && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      New admissions are permanently linked to the active admission year ({currentYear}).
                    </p>
                  )}
                </div>

                {/* Semester */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Current Semester</span>
                    {!isEditing && <span className="text-[10px] text-slate-500">1st Semester Only</span>}
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      required
                      min={1}
                      max={8}
                      value={semester}
                      onChange={(e) => setSemester(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  ) : (
                    <div className="relative">
                      <input
                        type="number"
                        readOnly
                        disabled
                        value={1}
                        className="w-full px-3 py-1.5 text-xs bg-slate-100 border border-slate-300 rounded-md font-mono text-slate-700 cursor-not-allowed select-none"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-500">
                        1st Semester Fixed
                      </span>
                    </div>
                  )}
                  {!isEditing && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      All new student candidates begin in 1st Semester. Editable anytime in Manage & Reset.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Roll Number & Institutional Email for Students */}
          {targetRole === 'student' ? (
            <div className="space-y-3">
              {/* Roll Number Input with Uniqueness check */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-indigo-600" />
                    <span>University Roll Number (Number) <span className="text-rose-500">*</span></span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Must be unique per session ({session}), dept ({deptCode}), & semester ({semester})
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="e.g. 1, 29, 42"
                    className={`w-full px-3 py-1.5 text-xs bg-slate-50 border rounded-md font-mono focus:bg-white focus:ring-1 ${
                      duplicateStudent
                        ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/40 text-rose-900'
                        : 'border-slate-300 focus:ring-indigo-500'
                    }`}
                  />
                  {cleanRoll && !duplicateStudent && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>Valid & Available</span>
                    </span>
                  )}
                </div>

                {/* Complete Formatted Roll Number Preview */}
                <div className="mt-1.5 p-2 bg-indigo-50/80 border border-indigo-200 rounded-md text-[11px] text-indigo-950 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Complete Official Roll:</span>
                    <code className="px-2 py-0.5 bg-white border border-indigo-300 rounded font-mono font-bold text-indigo-700 shadow-2xs">
                      {generatedCompleteRoll}
                    </code>
                  </div>
                  <span className="text-[10px] text-indigo-600 font-medium">Formula: {session}-{deptCode}-{cleanRoll || '01'}</span>
                </div>

                {/* Inline Uniqueness Error feedback */}
                {duplicateStudent && (
                  <div className="mt-1.5 p-2 bg-rose-50 border border-rose-200 rounded-md text-[11px] text-rose-800 flex items-start gap-1.5 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Roll Number Conflict:</strong> Roll #{cleanRoll} ({generatedCompleteRoll}) is already registered to{' '}
                      <strong>{duplicateStudent.name}</strong> for Session <strong>{session}</strong> in{' '}
                      <strong>{department}</strong> (Semester <strong>{semester}</strong>). Roll number must be unique
                      for the same session year, department, and semester.
                    </div>
                  </div>
                )}
              </div>

              {/* Read-Only Institutional Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Official Institutional Email (Read-Only)</span>
                  </span>
                  <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded font-mono">
                    @{adminDomain}
                  </span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={generatedStudentEmail}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-slate-100 border border-slate-300 rounded-md font-mono text-indigo-950 font-bold select-all cursor-not-allowed shadow-inner"
                  />
                </div>
                <div className="mt-1 p-2 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-600 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Info className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>
                      Formula:{' '}
                      <code className="text-indigo-700 font-bold">
                        {session}-{deptCode}-{cleanRoll || '01'}@{adminDomain}
                      </code>
                    </span>
                  </div>
                  <span className="text-slate-400 italic">Auto-updates with session, dept & roll</span>
                </div>
              </div>
            </div>
          ) : (
            /* Teacher Specific: Designation & Email */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Faculty Designation <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Associate Professor"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Faculty Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={teacherEmail}
                  onChange={(e) => setTeacherEmail(e.target.value)}
                  placeholder="faculty@unicore.edu"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* Initial Password (if creating new) */}
          {!isEditing && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Initial Account Password
              </label>
              <input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md font-mono"
              />
              <p className="text-[10px] text-slate-500 mt-1">Default initial password assigned for first-time sign in.</p>
            </div>
          )}

          {/* Date of Birth & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Date of Birth (DOB)</span>
              </label>
              <input
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md"
              />
            </div>
          </div>

          {/* Campus Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Campus Address / Residential Details
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Student Residence Hall C, Room 204"
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md"
            />
          </div>

          {/* Admin Reset Password Section for Existing User */}
          {isEditing && (
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Admin Password Reset Override</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsResetPasswordOpen(!isResetPasswordOpen)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  {isResetPasswordOpen ? 'Cancel' : 'Reset Password'}
                </button>
              </div>

              {isResetPasswordOpen && (
                <div className="pt-2 flex items-center gap-2">
                  <input
                    type="password"
                    placeholder="Enter new password (min 6 chars)"
                    value={newPasswordToReset}
                    onChange={(e) => setNewPasswordToReset(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={handleExecuteResetPassword}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md whitespace-nowrap cursor-pointer"
                  >
                    Confirm Reset
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Delete Confirmation Warning Box */}
          {isDeleteConfirmOpen && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-rose-900 space-y-2 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-rose-900">
                    Permanently delete {targetRole} "{userToEdit?.name}"?
                  </p>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    This action cannot be undone. All course enrollments, grade records, and credentials associated with this account will be permanently erased.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleExecuteDelete}
                  className="px-3 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Yes, Delete Permanently</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Form Actions Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            {isEditing ? (
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete {targetRole === 'student' ? 'Student' : 'Faculty'}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !!duplicateStudent}
                className={`px-4 py-1.5 text-xs font-semibold text-white rounded-md shadow-xs transition-all flex items-center gap-1.5 ${
                  duplicateStudent
                    ? 'bg-slate-400 cursor-not-allowed opacity-60'
                    : 'bg-slate-900 hover:bg-slate-800 hover:scale-[1.02] active:scale-95 cursor-pointer'
                }`}
              >
                {isSubmitting
                  ? 'Saving...'
                  : duplicateStudent
                  ? 'Duplicate Roll Conflict'
                  : isEditing
                  ? 'Save Changes'
                  : 'Enroll Student'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
