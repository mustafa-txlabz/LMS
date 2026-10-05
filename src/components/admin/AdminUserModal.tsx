import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Role, AdmissionType, Semester } from '../../types';
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
  ChevronDown,
  Check,
  Search,
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
  getFacultyHodBadge,
} from '../../utils/studentEmail';

export const AdminUserModal: React.FC<AdminUserModalProps> = ({
  userToEdit,
  roleToCreate,
  onClose,
}) => {
  const { users, currentUser, departments, semesters, adminAddUser, adminUpdateUser, adminResetPassword, adminDeleteUser } = useLms();

  const isEditing = !!userToEdit;
  const targetRole = userToEdit ? userToEdit.role : roleToCreate || 'student';
  const currentYear = new Date().getFullYear() || 2026;

  const sortedSemesters = useMemo(() => [...semesters].sort((a, b) => a.number - b.number), [semesters]);

  // Check if faculty member is HOD of any department
  const facultyHodBadge = useMemo(() => {
    if (targetRole !== 'teacher' || !userToEdit) return null;
    return getFacultyHodBadge(userToEdit.id, departments);
  }, [targetRole, userToEdit, departments]);

  // Extract university domain from the admin user or current user
  const adminUser = users.find((u) => u.role === 'admin') || (currentUser?.role === 'admin' ? currentUser : null);
  const adminEmail = adminUser?.email || currentUser?.email || 'registrar@nicore.edu.pk';
  const adminDomain = adminEmail.includes('@')
    ? adminEmail.split('@')[1].trim().toLowerCase()
    : 'nicore.edu.pk';

  // Multi-department state for faculty members
  const initialDepartments = useMemo(() => {
    if (userToEdit) {
      if (Array.isArray(userToEdit.departments) && userToEdit.departments.length > 0) {
        return userToEdit.departments;
      }
      if (userToEdit.department) {
        return [userToEdit.department];
      }
    }
    return departments.length > 0 ? [departments[0].name] : ['Computer Science'];
  }, [userToEdit, departments]);

  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(initialDepartments);

  // Multi-department dropdown UI state for Faculty
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [deptSearchQuery, setDeptSearchQuery] = useState('');
  const deptDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(e.target as Node)) {
        setIsDeptDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredModalDepts = useMemo(() => {
    if (!deptSearchQuery.trim()) return departments;
    const q = deptSearchQuery.toLowerCase();
    return departments.filter(
      (d) => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q)
    );
  }, [departments, deptSearchQuery]);

  // Common user fields
  const [name, setName] = useState(userToEdit?.name || '');
  const [password, setPassword] = useState(userToEdit?.password || 'password123');
  const [department, setDepartment] = useState(
    userToEdit?.department || (departments.length > 0 ? departments[0].name : 'Computer Science')
  );
  const [dob, setDob] = useState(userToEdit?.dob || '2003-01-01');
  const [phone, setPhone] = useState(userToEdit?.phone || '');
  const [address, setAddress] = useState(userToEdit?.address || '');
  const [bio, setBio] = useState(userToEdit?.bio || '');

  // Teacher specific
  const [designation, setDesignation] = useState(userToEdit?.designation || 'Assistant Professor');
  const [teacherEmail, setTeacherEmail] = useState(userToEdit?.email || '');

  // Student specific: session year, roll number, semester, admission type
  // Student Onboarding Rules:
  // - If Admission Type is "Fresh", automatically set current_semester = 1 and lock it.
  // - If Admission Type is "Transfer" (or Lateral Entry), allow manual starting semester selection.
  // - Default status set to "active".
  const [admissionType, setAdmissionType] = useState<AdmissionType>(
    userToEdit?.admissionType || 'fresh'
  );

  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [session, setSession] = useState<number>(() => {
    if (isEditing && (userToEdit?.session || userToEdit?.sessionYear)) {
      return Number(userToEdit.session || userToEdit.sessionYear);
    }
    return currentYear;
  });

  const [sessionDate, setSessionDate] = useState<string>(() => {
    if (isEditing && (userToEdit?.session || userToEdit?.sessionYear)) {
      const yr = Number(userToEdit.session || userToEdit.sessionYear);
      if (yr === currentYear) return todayDateStr;
      return `${yr}-01-01`;
    }
    return todayDateStr; // Current date is selected by default
  });

  // Dynamically derive available semesters from system
  const availableSemesters = useMemo<Semester[]>(() => {
    const sorted = [...semesters].sort((a, b) => a.number - b.number);
    // If editing a student whose assigned semester isn't in system list, keep it visible
    if (isEditing && userToEdit?.semester && !sorted.some((s: Semester) => s.number === userToEdit.semester)) {
      sorted.push({
        id: `sem-${userToEdit.semester}`,
        name: `Semester ${userToEdit.semester}`,
        number: userToEdit.semester,
        code: `S${userToEdit.semester}`,
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
  }, [semesters, isEditing, userToEdit]);

  const initialSemester = useMemo(() => {
    if (isEditing && userToEdit?.semester) {
      return userToEdit.semester;
    }
    if (!isEditing && admissionType === 'fresh') {
      const sem1 = availableSemesters.find((s: Semester) => s.number === 1);
      return sem1 ? 1 : availableSemesters[0]?.number || 1;
    }
    if (!isEditing && admissionType === 'transfer') {
      const higherSem = availableSemesters.find((s: Semester) => s.number > 1) || availableSemesters[0];
      return higherSem ? higherSem.number : 1;
    }
    return availableSemesters[0]?.number || 1;
  }, [isEditing, userToEdit, availableSemesters, admissionType]);

  const [semester, setSemester] = useState<number>(initialSemester);

  const handleSessionDateChange = (dateVal: string) => {
    setSessionDate(dateVal);
    if (dateVal) {
      const yr = parseInt(dateVal.split('-')[0], 10);
      if (!isNaN(yr) && yr >= 1990 && yr <= 2100) {
        setSession(yr);
      }
    }
  };

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

    if (targetRole === 'teacher' && selectedDepartments.length === 0) {
      setFormError('Please select at least one academic department for this faculty member.');
      return;
    }

    setIsSubmitting(true);

    const finalEmail = targetRole === 'student' ? generatedStudentEmail : teacherEmail.trim().toLowerCase();
    const finalRollNumber = targetRole === 'student' ? cleanRoll : undefined;
    const finalPrimaryDept = targetRole === 'teacher' ? selectedDepartments[0] : department;
    const finalDeptList = targetRole === 'teacher' ? selectedDepartments : [department];

    const finalSemester = targetRole === 'student'
      ? (admissionType === 'fresh' && !isEditing ? 1 : Number(semester))
      : undefined;

    if (isEditing && userToEdit) {
      await adminUpdateUser(userToEdit.id, {
        name,
        email: finalEmail,
        department: finalPrimaryDept,
        departments: finalDeptList,
        session: targetRole === 'student' ? Number(session) : undefined,
        sessionYear: targetRole === 'student' ? Number(session) : undefined,
        rollNumber: finalRollNumber,
        designation: targetRole === 'teacher' ? designation : undefined,
        semester: finalSemester,
        admissionType: targetRole === 'student' ? admissionType : undefined,
        academicStatus: targetRole === 'student' ? (userToEdit.academicStatus || 'active') : undefined,
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
        department: finalPrimaryDept,
        departments: finalDeptList,
        session: targetRole === 'student' ? Number(session) : undefined,
        sessionYear: targetRole === 'student' ? Number(session) : undefined,
        rollNumber: finalRollNumber,
        designation: targetRole === 'teacher' ? designation : undefined,
        semester: finalSemester,
        admissionType: targetRole === 'student' ? admissionType : undefined,
        academicStatus: 'active',
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
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  {isEditing
                    ? `Manage ${targetRole.toUpperCase()}: ${userToEdit?.name}`
                    : `Enroll New ${targetRole.toUpperCase()}`}
                </h3>
                {facultyHodBadge && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-slate-950 font-mono shadow-xs flex items-center gap-1">
                    👑 {facultyHodBadge}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                {targetRole === 'student'
                  ? isEditing
                    ? 'Manage student profile, session year, semester, or reset credentials'
                    : 'Admit 1st semester student with automated institutional email and unique roll'
                  : 'Manage faculty credentials, academic departments and designation'}
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
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Legal Name <span className="text-rose-500">*</span>
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

            {/* Department Selection: Multi-select Dropdown for Faculty, Single select for Student */}
            {targetRole === 'teacher' ? (
              <div className="space-y-1.5" ref={deptDropdownRef}>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Academic Department <span className="text-rose-500">*</span> (Select one or more)
                  </label>
                  <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-mono">
                    {selectedDepartments.length} {selectedDepartments.length === 1 ? 'Department' : 'Departments'} Selected
                  </span>
                </div>

                {/* Dropdown Trigger Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDeptDropdownOpen((prev) => !prev)}
                    className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-md text-left flex items-center justify-between transition-all cursor-pointer ${
                      isDeptDropdownOpen
                        ? 'border-indigo-500 bg-white ring-2 ring-indigo-500/20'
                        : 'border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <span className="truncate font-medium text-slate-800">
                      {selectedDepartments.length === 0
                        ? 'Choose academic departments...'
                        : selectedDepartments.length === 1
                        ? `1 Selected: ${selectedDepartments[0]}`
                        : `${selectedDepartments.length} Selected: ${selectedDepartments.slice(0, 2).join(', ')}${selectedDepartments.length > 2 ? '...' : ''}`}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ml-2 ${
                        isDeptDropdownOpen ? 'rotate-180 text-indigo-600' : ''
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu Popover with Search & Ticks */}
                  {isDeptDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 z-40 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                      {/* Search bar inside dropdown */}
                      <div className="p-2 border-b border-slate-100 bg-slate-50/80">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search among all departments..."
                            value={deptSearchQuery}
                            onChange={(e) => setDeptSearchQuery(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full pl-8 pr-2.5 py-1 text-xs bg-white border border-slate-200 rounded focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Department Items list */}
                      <div className="max-h-56 overflow-y-auto p-1 divide-y divide-slate-100">
                        {filteredModalDepts.length === 0 ? (
                          <div className="py-5 text-center text-xs text-slate-400">
                            No departments found matching "{deptSearchQuery}"
                          </div>
                        ) : (
                          filteredModalDepts.map((d) => {
                            const isSelected = selectedDepartments.includes(d.name);
                            const isHodOfDept = d.hodId === userToEdit?.id;

                            return (
                              <button
                                key={d.id}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    if (selectedDepartments.length > 1) {
                                      setSelectedDepartments((prev) => prev.filter((n) => n !== d.name));
                                    }
                                  } else {
                                    setSelectedDepartments((prev) => [...prev, d.name]);
                                  }
                                }}
                                className={`w-full px-3 py-2 text-xs flex items-center justify-between rounded-md transition-colors cursor-pointer text-left ${
                                  isSelected
                                    ? 'bg-indigo-50/80 text-indigo-950 font-semibold'
                                    : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {/* Tick / Checkbox indicator */}
                                  <div
                                    className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all ${
                                      isSelected
                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                                        : 'border-slate-300 bg-white'
                                    }`}
                                  >
                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                  <span className="truncate">{d.name}</span>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-slate-600 font-bold uppercase">
                                    {d.code}
                                  </span>
                                  {isHodOfDept && (
                                    <span className="text-[9px] font-bold uppercase text-amber-800 bg-amber-100 border border-amber-300 px-1 py-0.2 rounded font-mono">
                                      HOD
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>

                      {/* Dropdown footer summary and close */}
                      <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Click any department to toggle selection</span>
                        <button
                          type="button"
                          onClick={() => setIsDeptDropdownOpen(false)}
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Appointed To: Selected departments list with remove button */}
                {selectedDepartments.length > 0 && (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg mt-2">
                    <div className="text-[11px] font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <span>Appointed To:</span>
                        <strong className="text-indigo-700 font-bold">({selectedDepartments.length})</strong>
                      </span>
                      <span className="text-[10px] text-slate-400">Click × to remove</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {selectedDepartments.map((deptName) => {
                        const deptObj = departments.find((d) => d.name === deptName);
                        return (
                          <span
                            key={deptName}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white text-indigo-900 text-xs font-semibold border border-indigo-200 shadow-2xs group"
                          >
                            <span>{deptName}</span>
                            {deptObj && (
                              <span className="text-[9px] font-mono uppercase bg-indigo-100 text-indigo-800 px-1 py-0.2 rounded font-bold">
                                {deptObj.code}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedDepartments.length > 1) {
                                  setSelectedDepartments((prev) => prev.filter((n) => n !== deptName));
                                }
                              }}
                              disabled={selectedDepartments.length <= 1}
                              title={
                                selectedDepartments.length <= 1
                                  ? 'At least one department is required'
                                  : `Remove ${deptName}`
                              }
                              className={`p-0.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer ${
                                selectedDepartments.length <= 1 ? 'opacity-30 cursor-not-allowed' : ''
                              }`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Academic Department <span className="text-rose-500">*</span>
                </label>
                <select
                  value={department}
                  onChange={(e) => {
                    setDepartment(e.target.value);
                    setSelectedDepartments([e.target.value]);
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:ring-1 focus:ring-indigo-500 font-medium"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Student Specific: Admission Type, Session (Enrollment Year) & Semester */}
          {targetRole === 'student' && (
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Admission Category & Academic Progression</span>
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  admissionType === 'fresh'
                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  {admissionType === 'fresh' ? 'Fresh Entry (Sem 1 Locked)' : 'Transfer / Lateral Entry'}
                </span>
              </div>

              {/* 1. Admission Type Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                  Admission Type <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdmissionType('fresh');
                      if (!isEditing) {
                        const firstSem = availableSemesters.find((s: Semester) => s.number === 1) || availableSemesters[0];
                        setSemester(firstSem ? firstSem.number : 1);
                      }
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      admissionType === 'fresh'
                        ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full mt-0.5 flex items-center justify-center border shrink-0 ${
                      admissionType === 'fresh' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white'
                    }`}>
                      {admissionType === 'fresh' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                        <span>Fresh Admission</span>
                        <Lock className="w-3 h-3 text-slate-400" />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        Locks starting semester to <strong>Semester 1</strong> automatically.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdmissionType('transfer');
                      if (!isEditing) {
                        const higherSem = availableSemesters.find((s: Semester) => s.number > 1) || availableSemesters[0];
                        if (higherSem) setSemester(higherSem.number);
                      }
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      admissionType === 'transfer'
                        ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full mt-0.5 flex items-center justify-center border shrink-0 ${
                      admissionType === 'transfer' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white'
                    }`}>
                      {admissionType === 'transfer' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900">
                        Transfer / Lateral Entry
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        Select from available curriculum semesters.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Session (Enrollment Year) - Handled via Calendar Picker */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Session (Enrollment Year) <span className="text-rose-500">*</span></span>
                    </span>
                    <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                      Extracted Year: {session}
                    </span>
                  </label>

                  {/* Calendar Date Picker with Current Date Selected by default */}
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={sessionDate}
                      onChange={(e) => handleSessionDateChange(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 font-mono text-slate-800 font-semibold cursor-pointer shadow-2xs"
                      title="Pick date from calendar to extract enrollment year"
                    />
                  </div>

                  <p className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>Year <strong className="text-indigo-700 font-mono">{session}</strong> extracted from calendar.</span>
                    <span className="text-indigo-600 font-medium">Applied to Roll & Email</span>
                  </p>
                </div>

                {/* Starting / Current Semester */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>
                      {admissionType === 'fresh' && !isEditing ? 'Starting Semester (Locked)' : 'Starting / Current Semester'}
                    </span>
                    {admissionType === 'fresh' && !isEditing ? (
                      <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Sem 1 Required</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono">
                        {availableSemesters.length} Available
                      </span>
                    )}
                  </label>

                  {admissionType === 'fresh' && !isEditing ? (
                    /* Locked Semester 1 for Fresh Admission */
                    <div className="relative">
                      <div className="w-full px-3 py-1.5 text-xs bg-slate-100 border border-slate-300 rounded-md font-mono text-slate-700 flex items-center justify-between cursor-not-allowed select-none">
                        <span className="font-semibold text-indigo-900">
                          Semester {semester} ({availableSemesters.find((s: Semester) => s.number === semester)?.name || 'First Term'})
                        </span>
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <p className="text-[10px] text-indigo-600 mt-1 flex items-center gap-1 font-medium">
                        <Info className="w-3 h-3 shrink-0" />
                        <span>Fresh admissions are strictly locked to Semester {semester}.</span>
                      </p>
                    </div>
                  ) : (
                    /* Unlocked Semester Selector for Transfer or Editing - ONLY shows available semesters */
                    <div>
                      <select
                        value={semester}
                        onChange={(e) => setSemester(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 font-mono cursor-pointer font-medium shadow-2xs"
                      >
                        {availableSemesters.map((sem: Semester) => (
                          <option key={sem.id || sem.number} value={sem.number}>
                            Semester {sem.number} ({sem.name})
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 shrink-0" />
                        <span>Showing {availableSemesters.length} available semester{availableSemesters.length === 1 ? '' : 's'} in active system.</span>
                      </p>
                    </div>
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
