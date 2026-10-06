import React, { useState } from 'react';
import { Semester, PromotionEvaluationResult, SemesterPromotionBatchSummary } from '../../types';
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
  BookOpen,
  GraduationCap,
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
  const [batchSummary, setBatchSummary] = useState<SemesterPromotionBatchSummary | null>(null);

  const [searchFilter, setSearchFilter] = useState('');
  const [decisionFilter, setDecisionFilter] = useState<'all' | 'active' | 'probation' | 'backlogs' | 'graduated'>('all');

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

    let matchesDecision = true;
    if (decisionFilter === 'active') matchesDecision = r.academicStatus === 'active';
    else if (decisionFilter === 'probation') matchesDecision = r.academicStatus === 'probation' || r.decision === 'promoted_probation';
    else if (decisionFilter === 'backlogs') matchesDecision = (r.backlogsCount || (r.backlogs && r.backlogs.length)) > 0;
    else if (decisionFilter === 'graduated') matchesDecision = r.academicStatus === 'graduated' || r.decision === 'graduated';

    return matchesSearch && matchesDecision;
  }) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in">
      <div className="w-full max-w-5xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Automated Credit-Hour Progression & Promotion Engine
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                  {semester.name} (Semester {semester.number})
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Standard university progression: Sequential semester promotion with course-level backlog tagging (No whole-year detention).
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

          {/* Promotion & Backlog Policy Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Credit-Hour Progression & Backlog Policy Rules</span>
              </span>
              <span className="text-[10px] font-mono font-semibold text-slate-500">
                Cohorts: ~{estimatedStudents.length} Students in Term
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-1">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sequential Progression (`current_semester += 1`)</span>
                </div>
                <p className="text-emerald-800 text-[11px] leading-relaxed">
                  Students advance to the next semester sequentially without full-term year detention.
                  <span className="block mt-1 font-mono font-bold text-emerald-900 bg-white/80 px-2 py-0.5 rounded border border-emerald-300">
                    CGPA &ge; {minGpa.toFixed(2)} &rarr; Active Standing · CGPA &lt; {minGpa.toFixed(2)} &rarr; Academic Probation
                  </span>
                </p>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1">
                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                  <span>Course-Level Backlogs & Repeat Courses</span>
                </div>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  Failed (Grade F / &lt;50%) or missed curriculum courses are tagged as repeat courses in student records.
                  <span className="block mt-1 font-mono font-bold text-amber-900 bg-white/80 px-2 py-0.5 rounded border border-amber-300">
                    Students retake backlogs alongside regular courses (max 21 Cr)
                  </span>
                </p>
              </div>
            </div>

            {/* Threshold Configurator */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-700">
                  Academic Good Standing Minimum CGPA Cutoff:
                </label>
                <select
                  value={minGpa}
                  onChange={(e) => setMinGpa(Number(e.target.value))}
                  disabled={isRunning || Boolean(batchSummary)}
                  className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-white border border-slate-300 rounded font-mono"
                >
                  <option value={1.7}>1.70 CGPA</option>
                  <option value={2.0}>2.00 CGPA (HEC / University Standard)</option>
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
                      <span>Auditing Courses & Progressing Cohorts...</span>
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
                  <span>Term Batch Progression Complete</span>
                </h4>
                <span className="text-xs font-mono text-slate-500">
                  Active Cutoff: CGPA &ge; {minGpa.toFixed(2)}
                </span>
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Evaluated</span>
                  <span className="text-xl font-bold font-mono text-slate-900">
                    {batchSummary.totalEvaluated}
                  </span>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Promoted (Active)</span>
                  <span className="text-xl font-bold font-mono text-emerald-800">
                    {batchSummary.promotedCount}
                  </span>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                  <span className="text-[10px] uppercase font-bold text-amber-700 block">On Probation</span>
                  <span className="text-xl font-bold font-mono text-amber-800">
                    {batchSummary.probationCount}
                  </span>
                </div>

                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-center">
                  <span className="text-[10px] uppercase font-bold text-rose-700 block">Carrying Backlogs</span>
                  <span className="text-xl font-bold font-mono text-rose-800">
                    {batchSummary.carryingBacklogsCount}
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
                  {[
                    { key: 'all', label: 'All Candidates' },
                    { key: 'active', label: `Active (${batchSummary.promotedCount})` },
                    { key: 'probation', label: `Probation (${batchSummary.probationCount})` },
                    { key: 'backlogs', label: `Backlogs (${batchSummary.carryingBacklogsCount})` },
                    { key: 'graduated', label: `Graduated (${batchSummary.graduatedCount})` },
                  ].map((filterItem) => (
                    <button
                      key={filterItem.key}
                      type="button"
                      onClick={() => setDecisionFilter(filterItem.key as any)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        decisionFilter === filterItem.key
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {filterItem.label.toUpperCase()}
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
                      <th className="py-2.5 px-3 text-center">Term Credits</th>
                      <th className="py-2.5 px-3 text-center">Progression</th>
                      <th className="py-2.5 px-3 text-center">Standing</th>
                      <th className="py-2.5 px-3">Backlog / Repeat Courses</th>
                      <th className="py-2.5 px-3">Evaluation Justification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredResults.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400">
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
                            {r.creditsPassed} / {r.creditsAttempted || 15} Cr
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-800">
                              <span>Sem {r.currentSemester}</span>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span className="text-indigo-700 font-bold">
                                Sem {r.nextSemester}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {r.decision === 'graduated' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-100 text-purple-800 border border-purple-200 inline-flex items-center gap-1">
                                <GraduationCap className="w-3 h-3" />
                                <span>Graduated</span>
                              </span>
                            ) : r.academicStatus === 'probation' || r.decision === 'promoted_probation' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                <span>Probation</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>Active</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {r.backlogs && r.backlogs.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {r.backlogs.map((b) => (
                                  <span
                                    key={b.courseId || b.courseCode}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                                      b.reason === 'failed'
                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}
                                    title={`${b.courseTitle || b.courseCode} (${b.reason === 'failed' ? 'Failed' : 'Missed'} in Sem ${b.semesterOffered})`}
                                  >
                                    {b.courseCode} ({b.reason === 'failed' ? 'F' : 'Missed'})
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-emerald-600 font-medium">None (All Cleared)</span>
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
              ? `Batch processed ${batchSummary.totalEvaluated} student progression profiles under Credit-Hour System.`
              : 'Evaluations automatically dispatch electronic notifications to all candidates.'}
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
