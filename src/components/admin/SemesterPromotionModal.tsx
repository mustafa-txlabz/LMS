import React, { useState } from 'react';
import { Semester, PromotionEvaluationResult } from '../../types';
import { useLms } from '../../context/LmsContext';
import {
  Sparkles,
  X,
  AlertTriangle,
  CheckCircle2,
  Users,
  Award,
  AlertOctagon,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  ShieldCheck,
  Search,
} from 'lucide-react';

interface SemesterPromotionModalProps {
  semester: Semester;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SemesterPromotionModal: React.FC<SemesterPromotionModalProps> = ({
  semester,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { publishSemesterResultsAndPromote, users, courses, enrollments } = useLms();

  const [minGpa, setMinGpa] = useState<number>(2.0);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batchSummary, setBatchSummary] = useState<{
    totalEvaluated: number;
    promotedCount: number;
    detainedCount: number;
    graduatedCount: number;
    results: PromotionEvaluationResult[];
  } | null>(null);

  const [searchFilter, setSearchFilter] = useState('');
  const [decisionFilter, setDecisionFilter] = useState<'all' | 'promoted' | 'detained' | 'graduated'>('all');

  if (!isOpen) return null;

  // Cohort estimation
  const semCourses = courses.filter((c) => c.semesterId === semester.id || c.semesterNumber === semester.number);
  const semCourseIds = new Set(semCourses.map((c) => c.id));
  const estimatedStudents = users.filter(
    (u) => u.role === 'student' && (u.semester === semester.number || enrollments.some((e) => e.studentId === u.id && semCourseIds.has(e.courseId)))
  );

  const handleExecuteBatchPromotion = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const res = await publishSemesterResultsAndPromote(semester.id, minGpa);
      if (res.success && res.summary) {
        setBatchSummary(res.summary);
        if (onSuccess) onSuccess();
      } else {
        setError(res.error || 'Failed to execute batch promotion.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during batch processing.');
    } finally {
      setIsRunning(false);
    }
  };

  const filteredResults = batchSummary?.results.filter((r) => {
    const matchesSearch =
      !searchFilter.trim() ||
      r.studentName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (r.rollNumber ? r.rollNumber.toLowerCase().includes(searchFilter.toLowerCase()) : false) ||
      r.department.toLowerCase().includes(searchFilter.toLowerCase());

    const matchesDecision = decisionFilter === 'all' || r.decision === decisionFilter;
    return matchesSearch && matchesDecision;
  }) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Automated Semester Promotion Engine
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                  {semester.name} (Semester {semester.number})
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Batch processing term final results, academic detention policy, and degree progression.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Promotion & Detention Policy Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>HEC Academic Progression & Detention Policy</span>
              </span>
              <span className="text-[10px] font-mono font-semibold text-slate-500">
                Cohorts: ~{estimatedStudents.length} Students in Term
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-1">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Promotion Criteria (Pass)</span>
                </div>
                <p className="text-emerald-800 text-[11px] leading-relaxed">
                  Students meeting or exceeding the minimum CGPA cutoff and passing required credit hours earn an increment in semester:
                  <code className="block mt-1 font-mono font-bold text-emerald-900 bg-white/80 px-2 py-0.5 rounded border border-emerald-300">
                    current_semester += 1 (Status: Active / Graduated)
                  </code>
                </p>
              </div>

              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-lg space-y-1">
                <div className="font-bold text-rose-900 flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                  <span>Detention Policy (Semester Repeat)</span>
                </div>
                <p className="text-rose-800 text-[11px] leading-relaxed">
                  Students below the academic cutoff do NOT increment semester. Semester value remains unchanged and status is set to detained:
                  <code className="block mt-1 font-mono font-bold text-rose-900 bg-white/80 px-2 py-0.5 rounded border border-rose-300">
                    current_semester unchanged (Status: Detained)
                  </code>
                </p>
              </div>
            </div>

            {/* Threshold Configurator */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-700">
                  Minimum Cumulative GPA Passing Cutoff:
                </label>
                <select
                  value={minGpa}
                  onChange={(e) => setMinGpa(Number(e.target.value))}
                  disabled={isRunning || Boolean(batchSummary)}
                  className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-white border border-slate-300 rounded font-mono"
                >
                  <option value={1.7}>1.70 CGPA</option>
                  <option value={2.0}>2.00 CGPA (HEC Standard)</option>
                  <option value={2.25}>2.25 CGPA</option>
                  <option value={2.5}>2.50 CGPA (Honors)</option>
                </select>
              </div>

              {!batchSummary && (
                <button
                  type="button"
                  disabled={isRunning}
                  onClick={handleExecuteBatchPromotion}
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
                >
                  {isRunning ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Evaluating Cohorts...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Declare Final Results & Run Batch Promotion</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Results Summary Dashboard */}
          {batchSummary && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Term Batch Processing Complete</span>
                </h4>
                <span className="text-xs font-mono text-slate-500">
                  Cutoff Applied: CGPA &ge; {minGpa.toFixed(2)}
                </span>
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Evaluated</span>
                  <span className="text-xl font-bold font-mono text-slate-900">
                    {batchSummary.totalEvaluated}
                  </span>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Promoted</span>
                  <span className="text-xl font-bold font-mono text-emerald-800">
                    {batchSummary.promotedCount}
                  </span>
                </div>

                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-center">
                  <span className="text-[10px] uppercase font-bold text-rose-700 block">Detained (Repeat)</span>
                  <span className="text-xl font-bold font-mono text-rose-800">
                    {batchSummary.detainedCount}
                  </span>
                </div>

                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-center">
                  <span className="text-[10px] uppercase font-bold text-purple-700 block">Graduated</span>
                  <span className="text-xl font-bold font-mono text-purple-800">
                    {batchSummary.graduatedCount}
                  </span>
                </div>
              </div>

              {/* Table Filter Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['all', 'promoted', 'detained', 'graduated'] as const).map((filterKey) => (
                    <button
                      key={filterKey}
                      type="button"
                      onClick={() => setDecisionFilter(filterKey)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        decisionFilter === filterKey
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {filterKey.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search candidate name / roll..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white w-56 font-sans"
                  />
                </div>
              </div>

              {/* Students Evaluation Breakdown Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2.5 px-3">Student Candidate</th>
                      <th className="py-2.5 px-2 text-center">CGPA</th>
                      <th className="py-2.5 px-3 text-center">Credits</th>
                      <th className="py-2.5 px-3 text-center">Progression Transition</th>
                      <th className="py-2.5 px-3 text-center">Decision</th>
                      <th className="py-2.5 px-3">Evaluation Justification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredResults.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400">
                          No student records found matching selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredResults.map((r) => (
                        <tr key={r.studentId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">{r.studentName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {r.rollNumber || 'N/A'} · BS {r.department}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-800">
                            {r.gpa.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-600 text-[11px]">
                            {r.creditsPassed} / {r.creditsAttempted || 18} Cr
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-800">
                              <span>Sem {r.currentSemester}</span>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span className={r.passed ? 'text-indigo-700 font-bold' : 'text-rose-700 font-bold'}>
                                Sem {r.nextSemester}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {r.decision === 'promoted' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Promoted
                              </span>
                            ) : r.decision === 'graduated' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-100 text-purple-800 border border-purple-200">
                                Graduated
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200">
                                Detained (Repeat)
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-600 max-w-xs truncate" title={r.reason}>
                            {r.reason}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {batchSummary
              ? `Batch processed ${batchSummary.totalEvaluated} student progression profiles.`
              : 'Evaluations automatically dispatch official notices to all candidates.'}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 cursor-pointer"
          >
            {batchSummary ? 'Done & Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};
