import React, { useState, useEffect, useMemo } from 'react';
import { useLms } from '../../context/LmsContext';
import { Department, User } from '../../types';
import { suggestDepartmentCode, getFacultyHodBadge } from '../../utils/studentEmail';
import {
  Building2,
  X,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  ShieldCheck,
  Mail,
  Hash,
  Info,
} from 'lucide-react';

interface AdminDepartmentModalProps {
  departmentToEdit: Department | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AdminDepartmentModal: React.FC<AdminDepartmentModalProps> = ({
  departmentToEdit,
  isOpen,
  onClose,
}) => {
  const { departments, users, addDepartment, updateDepartment } = useLms();
  const isEditing = !!departmentToEdit;

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isCustomCode, setIsCustomCode] = useState(false);
  const [hodId, setHodId] = useState('');
  const [description, setDescription] = useState('');
  const [showOnlyUnassigned, setShowOnlyUnassigned] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or reset form when modal opens or departmentToEdit changes
  useEffect(() => {
    if (departmentToEdit) {
      setName(departmentToEdit.name);
      setCode(departmentToEdit.code);
      setIsCustomCode(true); // Don't auto-overwrite existing code
      setHodId(departmentToEdit.hodId || '');
      setDescription(departmentToEdit.description || '');
    } else {
      setName('');
      setCode('');
      setIsCustomCode(false);
      setHodId('');
      setDescription('');
    }
    setFormError(null);
  }, [departmentToEdit, isOpen]);

  // Handle department name change with auto abbreviation suggestion
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isCustomCode) {
      const suggested = suggestDepartmentCode(val);
      setCode(suggested);
    }
  };

  // Handle manual code override
  const handleCodeChange = (val: string) => {
    setIsCustomCode(true);
    setCode(val.toLowerCase().replace(/[^a-z0-9]/g, ''));
  };

  // Reset abbreviation to suggested
  const handleResetToSuggested = () => {
    const suggested = suggestDepartmentCode(name);
    setCode(suggested);
    setIsCustomCode(false);
  };

  // All faculty members
  const teachers = useMemo(() => {
    return users.filter((u) => u.role === 'teacher');
  }, [users]);

  // Check if a faculty member is already HOD of another department
  const getTeacherHodStatus = (teacherId: string): string | null => {
    const existing = departments.find(
      (d) => d.hodId === teacherId && (!isEditing || d.id !== departmentToEdit?.id)
    );
    return existing ? existing.name : null;
  };

  // Selected teacher
  const selectedTeacher = useMemo(() => {
    return teachers.find((t) => t.id === hodId);
  }, [teachers, hodId]);

  // Conflict if selected teacher is already HOD elsewhere
  const selectedHodConflict = useMemo(() => {
    if (!hodId) return null;
    return getTeacherHodStatus(hodId);
  }, [hodId, departments, isEditing, departmentToEdit]);

  // Check for duplicate department name
  const duplicateName = useMemo(() => {
    if (!name.trim()) return null;
    const clean = name.trim().toLowerCase();
    return departments.find(
      (d) => (!isEditing || d.id !== departmentToEdit?.id) && d.name.trim().toLowerCase() === clean
    );
  }, [name, departments, isEditing, departmentToEdit]);

  // Check for duplicate abbreviation code
  const duplicateCode = useMemo(() => {
    if (!code.trim()) return null;
    const clean = code.trim().toLowerCase();
    return departments.find(
      (d) => (!isEditing || d.id !== departmentToEdit?.id) && d.code.trim().toLowerCase() === clean
    );
  }, [code, departments, isEditing, departmentToEdit]);

  // Filtered teachers list for dropdown
  const displayedTeachers = useMemo(() => {
    if (!showOnlyUnassigned) return teachers;
    return teachers.filter((t) => {
      if (t.id === hodId) return true; // keep currently selected
      const isHodElsewhere = !!getTeacherHodStatus(t.id);
      return !isHodElsewhere;
    });
  }, [teachers, showOnlyUnassigned, hodId, departments, isEditing, departmentToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Department name is required.');
      return;
    }

    if (!code.trim()) {
      setFormError('Department abbreviation code is required.');
      return;
    }

    if (duplicateName) {
      setFormError(`Department "${duplicateName.name}" already exists.`);
      return;
    }

    if (duplicateCode) {
      setFormError(`Abbreviation code "${code}" is already used by "${duplicateCode.name}".`);
      return;
    }

    if (selectedHodConflict) {
      setFormError(
        `Selected faculty member "${selectedTeacher?.name}" is already Head of Department for "${selectedHodConflict}". A faculty member cannot head multiple departments.`
      );
      return;
    }

    setIsSubmitting(true);
    const assignedHodName = selectedTeacher ? selectedTeacher.name : '';

    try {
      if (isEditing && departmentToEdit) {
        const res = await updateDepartment(departmentToEdit.id, {
          name: name.trim(),
          code: code.trim().toLowerCase(),
          hodId: hodId ? hodId : '',
          hodName: assignedHodName,
          description: description.trim(),
        });

        if (!res.success) {
          setFormError(res.error || 'Failed to update department.');
          setIsSubmitting(false);
          return;
        }
      } else {
        const res = await addDepartment({
          name: name.trim(),
          code: code.trim().toLowerCase(),
          hodId: hodId ? hodId : '',
          hodName: assignedHodName,
          description: description.trim(),
        });

        if (!res.success) {
          setFormError(res.error || 'Failed to create department.');
          setIsSubmitting(false);
          return;
        }
      }

      setIsSubmitting(false);
      resetFormFields();
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while saving the department.');
      setIsSubmitting(false);
    }
  };

  const resetFormFields = () => {
    setName('');
    setCode('');
    setHodId('');
    setDescription('');
    setFormError(null);
  };

  const handleClose = () => {
    resetFormFields();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider">
              {isEditing ? `Edit Department: ${departmentToEdit.name}` : 'Add Academic Department'}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">{formError}</div>
            </div>
          )}

          {/* Department Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Department Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. English, Computer Science, Economics"
              className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-md focus:bg-white focus:ring-1 ${
                duplicateName
                  ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/40 text-rose-900'
                  : 'border-slate-300 focus:ring-indigo-500'
              }`}
            />
            {duplicateName && (
              <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>Department with this name already exists in the system.</span>
              </p>
            )}
          </div>

          {/* Abbreviation / Code Field with suggestion pill */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Department Abbreviation / Code <span className="text-rose-500">*</span>
              </label>
              {isCustomCode && name && (
                <button
                  type="button"
                  onClick={handleResetToSuggested}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Reset to Suggested ({suggestDepartmentCode(name)})</span>
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                required
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="e.g. cs, eng, se, math"
                className={`w-full pl-3 pr-20 py-2 text-xs bg-slate-50 border rounded-md font-mono font-bold focus:bg-white focus:ring-1 ${
                  duplicateCode
                    ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/40 text-rose-900'
                    : 'border-slate-300 focus:ring-indigo-500 text-indigo-950'
                }`}
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                {code ? code.toUpperCase() : 'CODE'}
              </div>
            </div>

            {duplicateCode ? (
              <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>Abbreviation "{code}" is already in use by {duplicateCode.name}.</span>
              </p>
            ) : (
              <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                <span>Used in official student roll numbers & institutional emails</span>
                <span className="text-indigo-600 font-semibold">
                  {!isCustomCode ? '✨ System suggested' : '✏️ Custom abbreviation'}
                </span>
              </div>
            )}
          </div>

          {/* Live Preview Box */}
          <div className="p-3 bg-gradient-to-br from-indigo-50/70 to-slate-50 border border-indigo-100 rounded-lg space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Institutional Format Preview</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono pt-1">
              <div className="bg-white p-2 rounded border border-indigo-200/80 shadow-2xs">
                <span className="text-slate-400 text-[10px] block font-sans font-medium">Student Roll Format:</span>
                <span className="font-bold text-indigo-900">
                  2026-<strong className="text-indigo-600">{code || 'code'}</strong>-01
                </span>
              </div>
              <div className="bg-white p-2 rounded border border-indigo-200/80 shadow-2xs">
                <span className="text-slate-400 text-[10px] block font-sans font-medium">Student Email Format:</span>
                <span className="font-bold text-indigo-900 truncate block">
                  2026-<strong className="text-indigo-600">{code || 'code'}</strong>-01@domain
                </span>
              </div>
            </div>
          </div>

          {/* Head of Department (HOD) Assignment */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Head of Department (HOD)</span>
              </label>
              <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showOnlyUnassigned}
                  onChange={(e) => setShowOnlyUnassigned(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                />
                <span>Show only unassigned faculty</span>
              </label>
            </div>

            <select
              value={hodId}
              onChange={(e) => setHodId(e.target.value)}
              className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-md focus:bg-white focus:ring-1 ${
                selectedHodConflict
                  ? 'border-amber-400 bg-amber-50/50 text-amber-950 focus:ring-amber-500'
                  : 'border-slate-300 focus:ring-indigo-500'
              }`}
            >
              <option value="">-- No HOD Assigned (Unassigned) --</option>
              {displayedTeachers.map((t) => {
                const isHodOfOther = getTeacherHodStatus(t.id);
                const hodBadge = getFacultyHodBadge(t.id, departments);
                return (
                  <option
                    key={t.id}
                    value={t.id}
                    disabled={false}
                    className={isHodOfOther ? 'text-amber-800' : 'text-slate-900'}
                  >
                    {t.name} {hodBadge ? `[👑 ${hodBadge}]` : ''} ({t.designation || 'Faculty'} · {t.department})
                    {isHodOfOther ? ` [⚠️ Already HOD of ${isHodOfOther}]` : ' [Available]'}
                  </option>
                );
              })}
            </select>

            {/* Error / Warning if Selected Faculty is Already HOD Elsewhere */}
            {selectedHodConflict ? (
              <div className="mt-2 p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-950">Faculty Already Appointed as HOD</div>
                  <div className="text-[11px] mt-0.5">
                    <strong>{selectedTeacher?.name}</strong> is currently the appointed Head of Department for{' '}
                    <strong>"{selectedHodConflict}"</strong>. A faculty member cannot head multiple departments.
                    Please select another available faculty member or leave unassigned.
                  </div>
                </div>
              </div>
            ) : selectedTeacher ? (
              <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-md text-[11px] text-emerald-900 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Appointed HOD: <strong>{selectedTeacher.name}</strong> ({selectedTeacher.designation || 'Faculty'})
                  </span>
                </div>
                <span className="text-[10px] text-emerald-700 font-mono">{selectedTeacher.email}</span>
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 mt-1">
                You can assign an available faculty member now or appoint an HOD later.
              </p>
            )}
          </div>

          {/* Department Description (Optional) */}
          <div className="pt-2 border-t border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Department Overview / Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of department scope, research disciplines, or academic focus..."
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !!duplicateName || !!duplicateCode || !!selectedHodConflict}
              className={`px-4 py-1.5 text-xs font-semibold text-white rounded-md shadow-xs transition-all flex items-center gap-1.5 ${
                duplicateName || duplicateCode || selectedHodConflict
                  ? 'bg-slate-400 cursor-not-allowed opacity-60'
                  : 'bg-slate-900 hover:bg-slate-800 hover:scale-[1.02] active:scale-95 cursor-pointer'
              }`}
            >
              {isSubmitting
                ? 'Saving...'
                : duplicateName
                ? 'Name Conflict'
                : duplicateCode
                ? 'Code Conflict'
                : selectedHodConflict
                ? 'HOD Conflict'
                : isEditing
                ? 'Save Department'
                : 'Create Department'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
