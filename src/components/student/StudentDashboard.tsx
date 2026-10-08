import React, { useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { Course, StudentMarks } from '../../types';
import {
  generateAcademicTranscriptPDF,
  generateAttendanceReportPDF,
  StudentGradeRow,
  StudentAttendanceRow,
} from '../../utils/pdfGenerator';
import { formatStudentRollNumber, getUserPrimaryDepartment } from '../../utils/studentEmail';
import {
  BookOpen,
  Award,
  CheckCircle2,
  Calendar,
  Download,
  AlertTriangle,
  AlertCircle,
  Search,
  Check,
  Plus,
  Trash2,
  Info,
  Clock,
  Mail,
  GraduationCap,
} from 'lucide-react';

interface StudentDashboardProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  initialTab?: string;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  activeTab: propActiveTab,
  setActiveTab: propSetActiveTab,
  initialTab,
}) => {
  const {
    currentUser,
    courses,
    semesters,
    currentSemester,
    enrollments,
    grades,
    registerCourse,
    dropCourse,
    getStudentCourses,
    getStudentCourseGrade,
    getStudentCourseAttendance,
    getStudentOverallStats,
    setSelectedEmailModal,
    notifications,
  } = useLms();

  if (!currentUser) return null;

  const [internalTab, setInternalTab] = useState<'registration' | 'my-courses' | 'attendance' | 'grades'>('registration');

  const incomingTab = propActiveTab || initialTab;
  const currentTab: 'registration' | 'my-courses' | 'attendance' | 'grades' =
    (incomingTab && ['registration', 'my-courses', 'attendance', 'grades'].includes(incomingTab))
      ? (incomingTab as any)
      : internalTab;

  const handleTabChange = (tab: 'registration' | 'my-courses' | 'attendance' | 'grades') => {
    setInternalTab(tab);
    if (propSetActiveTab) {
      propSetActiveTab(tab);
    }
  };

  // Semester registration filter
  const sortedSemesters = React.useMemo(() => [...semesters].sort((a, b) => a.number - b.number), [semesters]);
  const defaultSemNum: number =
    currentUser.semester && sortedSemesters.some((s) => s.number === currentUser.semester)
      ? currentUser.semester
      : currentSemester?.number || sortedSemesters[0]?.number || 0;
  const [selectedSemesterNumber, setSelectedSemesterNumber] = useState<number>(defaultSemNum);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const enrolledCourses = getStudentCourses(currentUser.id);
  const overallStats = getStudentOverallStats(currentUser.id);

  const pendingBacklogs = React.useMemo(() => {
    return (currentUser.backlogCourses || []).filter((b) => b.status !== 'cleared');
  }, [currentUser.backlogCourses]);

  // Compute all relevant semesters for the logged-in student (from 1 up to current semester)
  const currentSemNum = currentUser.semester || 1;
  const allSemNumbers = React.useMemo(() => {
    const studentCourseSemNumbers = enrolledCourses.map((c) => c.semesterNumber);
    const backlogSemNumbers = (currentUser.backlogCourses || []).map((b) => b.semesterOffered);
    return Array.from(
      new Set([
        ...Array.from({ length: currentSemNum }, (_, i) => i + 1),
        ...studentCourseSemNumbers,
        ...backlogSemNumbers,
      ])
    ).sort((a, b) => a - b);
  }, [currentSemNum, enrolledCourses, currentUser.backlogCourses]);

  // Overall Cumulative Academic Performance (CGPA & Credits)
  // Computes actual numeric SGPA for each semester using 0.00 grade points from missed/failed courses,
  // and aggregates into overall cumulative CGPA so it is never NaN or withheld.
  const { cumulativeCgpa, totalEarnedCredits } = React.useMemo(() => {
    let totalQualityPoints = 0;
    let totalEvaluatedCredits = 0;
    let earnedCreditsTotal = 0;

    allSemNumbers.forEach((semNum) => {
      const semCourses = enrolledCourses.filter((c) => c.semesterNumber === semNum);
      const semBacklogs = (currentUser.backlogCourses || []).filter(
        (b) => b.semesterOffered === semNum && b.status !== 'cleared'
      );
      const uncountedBacklogs = semBacklogs.filter(
        (b) => !semCourses.some((c) => c.id === b.courseId || c.code === b.courseCode)
      );

      semCourses.forEach((c) => {
        const m = getStudentCourseGrade(c.id, currentUser.id);
        if (m && m.gradePoints !== undefined) {
          totalQualityPoints += m.gradePoints * c.creditHours;
          totalEvaluatedCredits += c.creditHours;
          if (m.letterGrade !== 'F' && m.total >= 50) {
            earnedCreditsTotal += c.creditHours;
          }
        }
      });

      // Missed / unenrolled backlog courses have 0.00 grade points
      uncountedBacklogs.forEach((b) => {
        const cr = b.creditHours || 3;
        totalEvaluatedCredits += cr;
      });
    });

    let cgpaVal = totalEvaluatedCredits > 0
      ? totalQualityPoints / totalEvaluatedCredits
      : (typeof currentUser.cgpa === 'number' ? currentUser.cgpa : 3.75);

    if (isNaN(cgpaVal) || !isFinite(cgpaVal)) {
      cgpaVal = typeof currentUser.cgpa === 'number' ? currentUser.cgpa : 3.75;
    }

    return {
      cumulativeCgpa: Number(cgpaVal.toFixed(2)),
      totalEarnedCredits: earnedCreditsTotal || currentUser.creditsEarned || overallStats.totalCredits,
    };
  }, [allSemNumbers, enrolledCourses, currentUser, getStudentCourseGrade, overallStats.totalCredits]);

  const displayCgpa = (typeof cumulativeCgpa === 'number' && !isNaN(cumulativeCgpa) && isFinite(cumulativeCgpa))
    ? cumulativeCgpa.toFixed(2)
    : (currentUser.cgpa ? currentUser.cgpa.toFixed(2) : '3.75');

  // Filter available courses for registration
  const availableCourses = courses.filter((c) => {
    const matchesSem = selectedSemesterNumber === 0 || c.semesterNumber === selectedSemesterNumber;
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSem && matchesSearch;
  });

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleRegister = (courseId: string) => {
    const res = registerCourse(currentUser.id, courseId);
    if (res.success) {
      showToast('success', res.message);
    } else {
      showToast('error', res.message);
    }
  };

  const handleDrop = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    if (confirm(`Are you sure you want to drop ${course?.code || ''} ${course?.title || ''}?`)) {
      const res = dropCourse(currentUser.id, courseId);
      showToast('success', res.message);
    }
  };

  // PDF Download Handlers
  const handleDownloadTranscriptPDF = () => {
    const coursesWithMarks: StudentGradeRow[] = enrolledCourses.map((c) => ({
      course: c,
      marks: getStudentCourseGrade(c.id, currentUser.id),
    }));

    generateAcademicTranscriptPDF(currentUser, currentSemester.name, coursesWithMarks, {
      totalCredits: overallStats.totalCredits,
      semesterGpa: overallStats.calculatedSemesterGpa,
      cgpa: Number(displayCgpa),
    });
  };

  const handleDownloadAttendancePDF = () => {
    const attendanceRows: StudentAttendanceRow[] = enrolledCourses.map((c) => {
      const att = getStudentCourseAttendance(c.id, currentUser.id);
      return {
        course: c,
        totalLectures: att.totalLectures,
        attended: att.attended,
        absent: att.absent,
        late: att.late,
        percentage: att.percentage,
        isEligible: att.isEligible,
      };
    });

    generateAttendanceReportPDF(currentUser, currentSemester.name, attendanceRows);
  };

  // Recent student notifications
  const studentAlerts = notifications.filter(
    (n) => n.recipientId === currentUser.id || n.recipientId === 'all-students'
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div
          className={`p-3 rounded-lg border text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-500 hover:text-slate-800 ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Student Academic Profile Header Card */}
      <div className="p-5 bg-white rounded-lg border border-slate-200 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src={
                currentUser.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  currentUser.name
                )}&background=0F172A&color=fff`
              }
              alt={currentUser.name}
              className="w-12 h-12 rounded-full object-cover border border-slate-300"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  {currentUser.name}
                </h1>
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {formatStudentRollNumber(currentUser.session || currentUser.sessionYear, getUserPrimaryDepartment(currentUser), currentUser.rollNumber)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                <span>BS {getUserPrimaryDepartment(currentUser)}</span>
                <span aria-hidden="true">·</span>
                <span>Semester {currentUser.semester || 5}</span>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-slate-800">{currentSemester.name}</span>
              </div>
            </div>
          </div>

          {/* Quick Academic Metrics (Tabular Numbers per design rules) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-center hover:-translate-y-1 hover:shadow-md hover:border-indigo-300 transition-all duration-200 cursor-default group">
              <div className="text-[11px] text-slate-500 group-hover:text-slate-800 transition-colors">Registered Credits</div>
              <div className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5 group-hover:text-indigo-900 transition-colors">
                {overallStats.totalCredits} / 21
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-center hover:-translate-y-1 hover:shadow-md hover:border-indigo-300 transition-all duration-200 cursor-default group">
              <div className="text-[11px] text-slate-500 group-hover:text-slate-800 transition-colors">Semester GPA</div>
              <div className="text-base font-bold font-mono tabular-nums text-indigo-700 mt-0.5 group-hover:text-indigo-900 transition-colors">
                {overallStats.calculatedSemesterGpa.toFixed(2)}
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-center hover:-translate-y-1 hover:shadow-md hover:border-indigo-300 transition-all duration-200 cursor-default group">
              <div className="text-[11px] text-slate-500 group-hover:text-slate-800 transition-colors">Cumulative GPA</div>
              <div className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5 group-hover:text-slate-900 transition-colors">
                {displayCgpa}
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-center hover:-translate-y-1 hover:shadow-md hover:border-indigo-300 transition-all duration-200 cursor-default group">
              <div className="text-[11px] text-slate-500 group-hover:text-slate-800 transition-colors">Avg Attendance</div>
              <div
                className={`text-base font-bold font-mono tabular-nums mt-0.5 transition-colors ${
                  overallStats.overallAttendancePercentage >= 75
                    ? 'text-emerald-700 group-hover:text-emerald-800'
                    : 'text-rose-600 group-hover:text-rose-700'
                }`}
              >
                {overallStats.overallAttendancePercentage}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs & Export Action Shortcuts */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg overflow-x-auto scrollbar-none">
          <button
            onClick={() => handleTabChange('registration')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 active:scale-95 cursor-pointer whitespace-nowrap ${
              currentTab === 'registration'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            Course Registration ({enrolledCourses.length})
          </button>
          <button
            onClick={() => handleTabChange('my-courses')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 active:scale-95 cursor-pointer whitespace-nowrap ${
              currentTab === 'my-courses'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            My Enrolled Courses
          </button>
          <button
            onClick={() => handleTabChange('attendance')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 active:scale-95 cursor-pointer whitespace-nowrap ${
              currentTab === 'attendance'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            Attendance Audit
          </button>
          <button
            onClick={() => handleTabChange('grades')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 active:scale-95 cursor-pointer whitespace-nowrap ${
              currentTab === 'grades'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            Marks & Grade Reports
          </button>
        </div>

        {/* PDF Download Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadAttendancePDF}
            className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 hover:border-slate-400 hover:shadow-xs hover:scale-[1.02] active:scale-95 transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap cursor-pointer group"
            title="Download official PDF attendance audit report"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
            <span>Attendance PDF</span>
          </button>

          <button
            onClick={handleDownloadTranscriptPDF}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all duration-150 rounded-md flex items-center gap-1.5 whitespace-nowrap cursor-pointer group shadow-xs"
            title="Download official Semester Academic Transcript PDF"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span>Academic Transcript PDF</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Semester-Wise Course Registration */}
      {currentTab === 'registration' && (
        <div className="space-y-5">
          {/* Academic Probation Advisory Notice */}
          {currentUser.academicStatus === 'probation' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Academic Advisory: Current Standing is Academic Probation</span>
                <span className="font-mono text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                  CGPA: {displayCgpa} &lt; 2.00 Cutoff
                </span>
              </div>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                You have sequentially advanced to Semester {currentUser.semester || 1}. Under university progression regulations, students on probation must prioritize clearing backlog courses and raising cumulative GPA to retain good standing and fulfill degree conferral requirements.
              </p>
            </div>
          )}

          {/* Credit Hours Limit Gauge & Notice */}
          <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Semester Credit Load: {overallStats.totalCredits} of 21 Max Credit Hours
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Registration Window is currently{' '}
                  <span
                    className={
                      currentSemester.isRegistrationOpen
                        ? 'text-emerald-700 font-bold'
                        : 'text-rose-600 font-bold'
                    }
                  >
                    {currentSemester.isRegistrationOpen ? 'Open' : 'Closed'}
                  </span>
                  . Maximum allowable workload per university policy: 21 credit hours (Regular + Repeat Courses combined).
                </div>
              </div>

              <div className="w-full sm:w-48 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    overallStats.totalCredits > 18
                      ? 'bg-amber-500'
                      : overallStats.totalCredits > 0
                      ? 'bg-indigo-600'
                      : 'bg-slate-300'
                  }`}
                  style={{ width: `${Math.min(100, (overallStats.totalCredits / 21) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Section 1: Pending / Repeat Courses (Backlogs) */}
          {pendingBacklogs.length > 0 && (
            <div className="space-y-3 bg-amber-50/40 p-4 rounded-xl border border-amber-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-amber-200/80">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Pending / Repeat Courses (Backlogs)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-mono font-bold border border-rose-200 uppercase">
                    {pendingBacklogs.length} Retake Required
                  </span>
                </div>
                <span className="text-[11px] text-slate-600 font-medium">
                  University progression: Uncleared repeat courses must be resolved before graduation
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {pendingBacklogs.map((backlog) => {
                  const course = courses.find((c) => c.id === backlog.courseId || c.code === backlog.courseCode);
                  const courseId = course?.id || backlog.courseId;
                  const isEnrolled = enrolledCourses.some((c) => c.id === courseId || c.code === backlog.courseCode);
                  const courseSem = course ? (semesters.find((s) => s.id === course.semesterId || s.number === course.semesterNumber) || currentSemester) : currentSemester;
                  const isRegOpen = courseSem?.isRegistrationOpen ?? currentSemester?.isRegistrationOpen;

                  return (
                    <div
                      key={backlog.courseId || backlog.courseCode}
                      className={`p-4 rounded-xl border transition-all duration-200 ${
                        isEnrolled
                          ? 'bg-emerald-50/60 border-emerald-300 shadow-2xs'
                          : 'bg-white border-amber-300 hover:border-amber-400 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900">
                              {backlog.courseCode}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200">
                              Must Repeat / Retake
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 mt-1">
                            {backlog.courseTitle || course?.title || 'Curriculum Course'}
                          </h4>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Semester {backlog.semesterOffered} Requirement · {backlog.reason === 'failed' ? 'Failed in previous term (Grade: F / <50%)' : 'Missed / Unenrolled in curriculum'}
                          </div>
                        </div>
                        <span className="font-mono text-xs font-bold text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded border border-amber-300 shrink-0">
                          {backlog.creditHours} Cr
                        </span>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                        {isEnrolled ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                            <Check className="w-3.5 h-3.5" />
                            <span>Registered for Retake</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500">
                            {isRegOpen ? 'Registration Window Open' : 'Registration Window Closed'}
                          </span>
                        )}

                        {isEnrolled ? (
                          <button
                            type="button"
                            onClick={() => handleDrop(courseId)}
                            className="px-2.5 py-1 text-xs font-semibold text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded border border-rose-200 transition-colors cursor-pointer"
                          >
                            Drop Retake
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRegister(courseId)}
                            disabled={!isRegOpen || overallStats.totalCredits + backlog.creditHours > 21}
                            title={overallStats.totalCredits + backlog.creditHours > 21 ? 'Would exceed 21 credit hour limit' : undefined}
                            className={`px-3 py-1 text-xs font-bold rounded transition-all flex items-center gap-1 cursor-pointer ${
                              isRegOpen && overallStats.totalCredits + backlog.creditHours <= 21
                                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-2xs hover:scale-[1.02]'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                            <span>Register Repeat</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Regular Semester Offerings Header */}
          <div className="pt-1 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Regular Semester Offerings</span>
              <span className="text-[11px] font-normal text-slate-500">
                (Current Promoted Term: Semester {currentUser.semester || 1})
              </span>
            </h3>
          </div>

          {/* Filter Bar: Semester selector & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-600">Select Semester:</span>
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md overflow-x-auto max-w-full">
                {sortedSemesters.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSemesterNumber(s.number)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap ${
                      selectedSemesterNumber === s.number
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title={s.name}
                  >
                    Sem {s.number}
                  </button>
                ))}
                <button
                  onClick={() => setSelectedSemesterNumber(0)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap ${
                    selectedSemesterNumber === 0
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({courses.length})
                </button>
              </div>
            </div>

            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search course title or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Course Cards / Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableCourses.length === 0 ? (
              <div className="col-span-2 p-8 text-center bg-white rounded-lg border border-slate-200 text-slate-400 text-xs">
                No courses found for the selected semester filter.
              </div>
            ) : (
              availableCourses.map((course) => {
                const isEnrolled = enrolledCourses.some((c) => c.id === course.id);
                const isFull = course.enrolledCount >= course.maxCapacity;

                return (
                  <div
                    key={course.id}
                    className={`p-4 bg-white rounded-lg border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                      isEnrolled
                        ? 'border-indigo-200 bg-indigo-50/20 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {course.code}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide ${
                              (course.type || (course.title.toLowerCase().includes('lab') ? 'Lab' : 'Theory')) === 'Lab'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                            }`}
                          >
                            {course.type || (course.title.toLowerCase().includes('lab') ? 'Lab' : 'Theory')}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs font-semibold text-slate-700">
                            Semester {course.semesterNumber}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 mt-1">
                          {course.title}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                          {course.description}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {course.creditHours} Cr
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Instructor:</span>
                        <span className="font-medium text-slate-800">{course.teacherName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Schedule:</span>
                        <span>{course.schedule}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Room:</span>
                        <span>{course.room}</span>
                      </div>
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="text-slate-500 font-sans">Capacity:</span>
                        <span>
                          {course.enrolledCount} / {course.maxCapacity} seats filled
                        </span>
                      </div>
                    </div>

                    {/* Registration / Drop Action */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      {isEnrolled ? (
                        <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <Check className="w-3.5 h-3.5" />
                          <span>Registered</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {isFull ? 'Section Full' : 'Open for enrollment'}
                        </span>
                      )}

                      {isEnrolled ? (
                        <button
                          onClick={() => handleDrop(course.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded border border-rose-200 transition-colors"
                        >
                          Drop Course
                        </button>
                      ) : (() => {
                        const courseSem = semesters.find(
                          (s) => s.id === course.semesterId || s.number === course.semesterNumber
                        ) || currentSemester;
                        const isRegOpen = courseSem ? courseSem.isRegistrationOpen : true;

                        return (
                          <button
                            onClick={() => handleRegister(course.id)}
                            disabled={!isRegOpen || isFull}
                            title={!isRegOpen ? `${courseSem?.name || 'Semester'} registration is closed` : isFull ? 'Section is at capacity' : 'Register for course'}
                            className={`px-3 py-1 text-xs font-semibold rounded transition-colors flex items-center gap-1 ${
                              isRegOpen && !isFull
                                ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-2xs'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                            <span>Register</span>
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: My Enrolled Courses */}
      {currentTab === 'my-courses' && (
        <div className="space-y-4 animate-fade-in-up">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enrolledCourses.length === 0 ? (
              <div className="col-span-2 p-8 text-center bg-white rounded-lg border border-slate-200 text-slate-400 text-xs">
                No courses registered for this semester yet. Switch to the Course Registration tab to enroll.
              </div>
            ) : (
              enrolledCourses.map((c) => {
                const grade = getStudentCourseGrade(c.id, currentUser.id);
                const att = getStudentCourseAttendance(c.id, currentUser.id);

                return (
                  <div
                    key={c.id}
                    className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:-translate-y-1 hover:shadow-md hover:border-indigo-300 transition-all duration-200 flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {c.code}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide ${
                              (c.type || (c.title.toLowerCase().includes('lab') ? 'Lab' : 'Theory')) === 'Lab'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                            }`}
                          >
                            {c.type || (c.title.toLowerCase().includes('lab') ? 'Lab' : 'Theory')}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {c.creditHours} Credit Hours
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-1 group-hover:text-indigo-900 transition-colors">{c.title}</h3>
                      <p className="text-[11px] text-slate-500 mt-1">{c.department}</p>

                      <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Instructor:</span>
                          <span className="font-medium text-slate-800">{c.teacherName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Schedule:</span>
                          <span className="text-slate-800">{c.schedule}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Venue:</span>
                          <span className="text-slate-800">{c.room}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-slate-50 rounded-lg text-center group-hover:bg-slate-100/70 transition-colors">
                        <div className="text-[11px] text-slate-500">Attendance</div>
                        <div
                          className={`font-mono font-bold mt-0.5 ${
                            att.isEligible ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {att.percentage}% ({att.attended}/{att.totalLectures})
                        </div>
                      </div>

                      <div className="p-2 bg-slate-50 rounded-lg text-center group-hover:bg-slate-100/70 transition-colors">
                        <div className="text-[11px] text-slate-500">Grade / Total</div>
                        <div className="font-mono font-bold text-slate-900 mt-0.5">
                          {grade ? `${grade.letterGrade} (${grade.total.toFixed(1)}%)` : 'In Progress'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Detailed Attendance Audit */}
      {currentTab === 'attendance' && (
        <div className="space-y-4 animate-fade-in-up">
          <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Course Attendance Audit & Eligibility Status
              </h3>
              <p className="text-xs text-slate-500">
                Minimum 75% class attendance is mandatory for Final Semester Examination seating.
              </p>
            </div>

            <button
              onClick={handleDownloadAttendancePDF}
              className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md hover:scale-[1.02] active:scale-95 transition-all duration-150 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Download Official Attendance PDF</span>
            </button>
          </div>

          <div className="space-y-4">
            {enrolledCourses.map((course) => {
              const att = getStudentCourseAttendance(course.id, currentUser.id);

              return (
                <div
                  key={course.id}
                  className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 transition-all duration-200 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {course.code}
                        </span>
                        <span className="text-slate-300">|</span>
                        <span className="text-xs font-semibold text-slate-800">
                          {course.title}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Instructor: {course.teacherName} · {course.room}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[11px] text-slate-500">Attendance Rate</div>
                        <div
                          className={`text-lg font-bold font-mono tabular-nums ${
                            att.isEligible ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {att.percentage}%
                        </div>
                      </div>

                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded border ${
                          att.isEligible
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {att.isEligible ? 'ELIGIBLE' : 'DEBARRED (<75%)'}
                      </span>
                    </div>
                  </div>

                  {/* Attendance Progress Meter */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          att.percentage >= 75 ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, att.percentage)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                      <span>Attended: {att.attended} classes</span>
                      <span>Absent: {att.absent} classes</span>
                      <span>Late: {att.late} classes</span>
                      <span>Total Conducted: {att.totalLectures}</span>
                    </div>
                  </div>

                  {/* Lecture by lecture history log */}
                  {att.logs.length > 0 && (
                    <div className="pt-2">
                      <div className="text-xs font-semibold text-slate-700 mb-2">
                        Lecture Log & Topic History:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {att.logs.map((log) => (
                          <div
                            key={log.lectureNumber}
                            className="p-2.5 rounded bg-slate-50 border border-slate-100 text-xs flex items-center justify-between hover:bg-slate-100/70 transition-colors"
                          >
                            <div>
                              <div className="font-semibold text-slate-800">
                                Lec {log.lectureNumber}: {log.topic}
                              </div>
                              <div className="text-[11px] font-mono text-slate-400">
                                {log.date}
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                log.status === 'present'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : log.status === 'late'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {log.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 4: Comprehensive Marks Breakdown & Official Academic Transcript */}
      {currentTab === 'grades' && (() => {
        // Compute all relevant semesters for the logged-in student (from 1 up to current semester)
        const currentSemNum = currentUser.semester || 1;
        const studentCourseSemNumbers = Array.from(new Set(enrolledCourses.map((c) => c.semesterNumber)));
        const backlogSemNumbers = (currentUser.backlogCourses || []).map((b) => b.semesterOffered);
        const allSemNumbers = Array.from(
          new Set([
            ...Array.from({ length: currentSemNum }, (_, i) => i + 1),
            ...studentCourseSemNumbers,
            ...backlogSemNumbers,
          ])
        ).sort((a, b) => a - b);

        const hasPendingRepeat = pendingBacklogs.length > 0 || (currentUser.academicStatus && currentUser.academicStatus.toLowerCase() === 'repeat');

        return (
          <div className="space-y-6 animate-fade-in-up">
            {/* Header & Quick Action */}
            <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  <span>Official Academic Record & Examination Results</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Semester-wise curriculum evaluations, continuous assessments (Assignments 1-2), attendance, midterm, and final examinations.
                </p>
              </div>

              <button
                onClick={handleDownloadTranscriptPDF}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md hover:scale-[1.02] active:scale-95 transition-all duration-150 shadow-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>Download Academic Transcript PDF</span>
              </button>
            </div>

            {/* Academic Standing & Overall Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Cumulative CGPA</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold font-mono text-indigo-700">
                    {displayCgpa}
                  </span>
                  <span className="text-xs text-slate-400">/ 4.00</span>
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Earned Credits</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold font-mono text-slate-900">
                    {totalEarnedCredits}
                  </span>
                  <span className="text-xs text-slate-400">Cr Total</span>
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Current Semester</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold font-mono text-slate-900">
                    Sem {currentUser.semester || 1}
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Academic Standing</span>
                <div className="mt-1.5">
                  {hasPendingRepeat ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300">
                      <AlertCircle className="w-3 h-3 text-rose-600" />
                      <span>Repeat Required</span>
                    </span>
                  ) : currentUser.academicStatus === 'probation' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      <span>Probation</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Good Standing</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Repeat / Backlog Advisory Warning Banner */}
            {hasPendingRepeat && (
              <div className="p-4 bg-rose-50 border border-rose-300 rounded-lg flex items-start gap-3 text-xs text-rose-900 animate-in fade-in">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold text-rose-950 block text-sm">
                    Pending Repeat Course Warning ({pendingBacklogs.length} course(s))
                  </strong>
                  <p className="mt-1 text-rose-800 leading-relaxed">
                    Under university academic regulations, you have missed or failed {pendingBacklogs.length} curriculum course(s):{' '}
                    <span className="font-mono font-bold text-rose-900">
                      {pendingBacklogs.map((b) => `${b.courseCode} (${b.reason === 'missed' ? 'Unenrolled' : 'Failed'})`).join(', ')}
                    </span>
                    . In accordance with university academic policy, semester SGPA is evaluated provisionally (accounting for 0.00 grade points) until repeat courses are cleared.
                  </p>
                </div>
              </div>
            )}

            {/* Semester-by-Semester Tables */}
            <div className="space-y-6">
              {allSemNumbers.map((semNum) => {
                const semMeta = semesters.find((s) => s.number === semNum);
                const semName = semMeta?.name || `Semester ${semNum}`;
                const isCurrentSem = semNum === currentSemNum;

                // Courses for this semester
                const semCourses = enrolledCourses.filter((c) => c.semesterNumber === semNum);

                // Backlog/repeat courses for this semester
                const semBacklogs = (currentUser.backlogCourses || []).filter(
                  (b) => b.semesterOffered === semNum && b.status !== 'cleared'
                );

                // Backlogs from this semester not already present in semCourses (e.g. missed/unenrolled)
                const uncountedBacklogs = semBacklogs.filter(
                  (b) => !semCourses.some((c) => c.id === b.courseId || c.code === b.courseCode)
                );

                const hasFailedInEnrolled = semCourses.some((c) => {
                  const m = getStudentCourseGrade(c.id, currentUser.id);
                  return m && (m.letterGrade === 'F' || m.total < 50);
                });

                const hasRepeatInThisSem = semBacklogs.length > 0 || hasFailedInEnrolled;

                // Total Enrolled / Curriculum Credits for this Semester (Formula denominator)
                const totalSemRegisteredCredits =
                  semCourses.reduce((sum, c) => sum + c.creditHours, 0) +
                  uncountedBacklogs.reduce((sum, b) => sum + (b.creditHours || 3), 0);

                let totalQualityPoints = 0;
                let earnedSemCredits = 0;
                let gradedCredits = 0;

                semCourses.forEach((c) => {
                  const m = getStudentCourseGrade(c.id, currentUser.id);
                  if (m && m.gradePoints !== undefined) {
                    totalQualityPoints += m.gradePoints * c.creditHours;
                    gradedCredits += c.creditHours;
                    if (m.letterGrade !== 'F' && m.total >= 50) {
                      earnedSemCredits += c.creditHours;
                    }
                  } else {
                    gradedCredits += c.creditHours;
                  }
                });

                // Unenrolled/missed courses contribute 0.00 grade points
                uncountedBacklogs.forEach((b) => {
                  const cr = b.creditHours || 3;
                  gradedCredits += cr;
                  // 0.00 grade points contributes 0 to totalQualityPoints
                });

                // Compute actual numeric SGPA using 0.00 grade points from missed/failed courses:
                // Formula: Sum(Course Grade Points * Course Credits) / Total Enrolled Credits
                const numericSemSgpa = gradedCredits > 0
                  ? totalQualityPoints / gradedCredits
                  : 0;

                const semSgpa = gradedCredits > 0 ? numericSemSgpa.toFixed(2) : '-';

                return (
                  <div
                    key={`semester-section-${semNum}`}
                    className={`bg-white rounded-lg border shadow-2xs overflow-hidden transition-all ${
                      hasRepeatInThisSem
                        ? 'border-rose-300 ring-1 ring-rose-200'
                        : isCurrentSem
                        ? 'border-indigo-300 ring-1 ring-indigo-100'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Semester Header */}
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-sm ${
                            hasRepeatInThisSem
                              ? 'bg-rose-100 text-rose-800'
                              : isCurrentSem
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {semNum}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-slate-900">
                              Semester {semNum}
                            </h4>
                            <span className="text-xs text-slate-500 font-medium">· {semName}</span>
                            {isCurrentSem && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-100 text-indigo-700 border border-indigo-200">
                                Current Term
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {hasRepeatInThisSem ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700">
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                <span>Incomplete / Repeat Course Required</span>
                              </span>
                            ) : isCurrentSem ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600">
                                <Clock className="w-3 h-3 text-indigo-500" />
                                <span>Continuous Assessment in Progress</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Completed & Evaluated</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Semester Summary Badges */}
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <div className="px-3 py-1 bg-white border border-slate-200 rounded-md text-xs shadow-2xs">
                          <span className="text-slate-400 mr-1.5">Registered:</span>
                          <strong className="font-mono text-slate-900">{totalSemRegisteredCredits} Cr</strong>
                        </div>

                        <div className="px-3 py-1 bg-white border border-slate-200 rounded-md text-xs shadow-2xs">
                          <span className="text-slate-400 mr-1.5">Earned:</span>
                          <strong className="font-mono text-emerald-700">{earnedSemCredits} Cr</strong>
                        </div>

                        <div
                          className={`px-3 py-1 rounded-md text-xs font-mono font-bold border shadow-2xs ${
                            hasRepeatInThisSem
                              ? 'bg-rose-50 border-rose-300 text-rose-800'
                              : 'bg-indigo-50 border-indigo-200 text-indigo-800'
                          }`}
                        >
                          <span className="text-slate-500 mr-1">SGPA:</span>
                          <span className={hasRepeatInThisSem ? 'text-rose-800 font-bold' : 'text-indigo-900 font-bold'}>
                            {semSgpa}
                          </span>
                          {hasRepeatInThisSem && (
                            <span className="ml-1 text-[10px] text-rose-600 font-sans font-normal">
                              (Provisional)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Courses Table for this Semester */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold">
                            <th className="py-2.5 px-3">Course Code</th>
                            <th className="py-2.5 px-3">Course Title</th>
                            <th className="py-2.5 px-2 text-center">Credits</th>
                            <th className="py-2.5 px-2 text-center" title="Assignment 1 (Max 10)">A1 (10)</th>
                            <th className="py-2.5 px-2 text-center" title="Assignment 2 (Max 10)">A2 (10)</th>
                            <th className="py-2.5 px-2 text-center" title="Midterm Examination (Max 30)">Mids (30)</th>
                            <th className="py-2.5 px-2 text-center" title="Attendance Evaluation (Max 10)">Att (10)</th>
                            <th className="py-2.5 px-2 text-center" title="Final Semester Examination (Max 40)">Final (40)</th>
                            <th className="py-2.5 px-3 text-center" title="Total Marks Out of 100">Total (100)</th>
                            <th className="py-2.5 px-3 text-center">Grade</th>
                            <th className="py-2.5 px-3 text-center">GPA</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {semCourses.length === 0 && semBacklogs.length === 0 ? (
                            <tr>
                              <td colSpan={12} className="py-6 text-center text-slate-400">
                                No course registrations recorded for Semester {semNum}.
                              </td>
                            </tr>
                          ) : (
                            <>
                              {/* Regular Enrolled Courses */}
                              {semCourses.map((c) => {
                                const m = getStudentCourseGrade(c.id, currentUser.id);
                                const isPassed = m ? m.letterGrade !== 'F' && m.total >= 50 : false;
                                const isFailed = m ? m.letterGrade === 'F' || m.total < 50 : false;

                                return (
                                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                                      {c.code}
                                    </td>
                                    <td className="py-3 px-3">
                                      <div className="font-semibold text-slate-900">{c.title}</div>
                                      <div className="text-[11px] text-slate-400">
                                        Instructor: {c.teacherName}
                                      </div>
                                      {m?.feedback && (
                                        <div className="text-[11px] text-slate-600 italic mt-0.5">
                                          &ldquo;{m.feedback}&rdquo;
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-3 px-2 text-center font-mono text-slate-700">
                                      {c.creditHours} Cr
                                    </td>
                                    <td className="py-3 px-2 text-center font-mono tabular-nums text-slate-700">
                                      {m ? m.assignment1.toFixed(1) : '-'}
                                    </td>
                                    <td className="py-3 px-2 text-center font-mono tabular-nums text-slate-700">
                                      {m ? m.assignment2.toFixed(1) : '-'}
                                    </td>
                                    <td className="py-3 px-2 text-center font-mono tabular-nums font-semibold text-slate-800">
                                      {m ? m.mids.toFixed(1) : '-'}
                                    </td>
                                    <td className="py-3 px-2 text-center font-mono tabular-nums text-slate-700">
                                      {m ? (m.attendanceMarks !== undefined ? m.attendanceMarks.toFixed(1) : '10.0') : '-'}
                                    </td>
                                    <td className="py-3 px-2 text-center font-mono tabular-nums font-semibold text-slate-800">
                                      {m ? m.finalExam.toFixed(1) : '-'}
                                    </td>
                                    <td className="py-3 px-3 text-center font-mono tabular-nums font-bold text-slate-900">
                                      {m ? `${m.total.toFixed(1)}%` : 'In Progress'}
                                    </td>
                                    <td className="py-3 px-3 text-center font-mono font-bold">
                                      {m ? (
                                        <span
                                          className={`px-2 py-0.5 rounded text-[11px] ${
                                            m.letterGrade.startsWith('A')
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : m.letterGrade.startsWith('B')
                                              ? 'bg-blue-100 text-blue-800'
                                              : m.letterGrade.startsWith('C')
                                              ? 'bg-amber-100 text-amber-800'
                                              : 'bg-rose-100 text-rose-800'
                                          }`}
                                        >
                                          {m.letterGrade}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400">N/A</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3 text-center font-mono tabular-nums font-bold text-slate-800">
                                      {m ? m.gradePoints.toFixed(2) : '-'}
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                      {isFailed ? (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300">
                                          Failed (Repeat)
                                        </span>
                                      ) : isPassed ? (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                                          Passed
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                                          In Progress
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}

                              {/* Backlog / Repeat Courses for this semester (Missed or Failed) */}
                              {semBacklogs.map((b) => (
                                <tr
                                  key={`backlog-${b.courseId || b.courseCode}`}
                                  className="bg-rose-50/70 hover:bg-rose-50 border-t border-rose-200 text-rose-900 transition-colors"
                                >
                                  <td className="py-3 px-3 font-mono font-bold text-rose-800">
                                    {b.courseCode}
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="font-semibold text-rose-900 flex items-center gap-1.5">
                                      <span>{b.courseTitle || b.courseCode}</span>
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-rose-200 text-rose-800">
                                        Repeat Course
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-rose-700">
                                      {b.reason === 'missed'
                                        ? 'Offered in curriculum but student was unenrolled'
                                        : 'Course failed in previous examination'}
                                    </div>
                                  </td>
                                  <td className="py-3 px-2 text-center font-mono text-rose-800">
                                    {b.creditHours || 3} Cr
                                  </td>
                                  <td className="py-3 px-2 text-center font-mono text-rose-400">-</td>
                                  <td className="py-3 px-2 text-center font-mono text-rose-400">-</td>
                                  <td className="py-3 px-2 text-center font-mono text-rose-400">-</td>
                                  <td className="py-3 px-2 text-center font-mono text-rose-400">-</td>
                                  <td className="py-3 px-2 text-center font-mono text-rose-400">-</td>
                                  <td className="py-3 px-3 text-center font-mono font-bold text-rose-800">
                                    0.0%
                                  </td>
                                  <td className="py-3 px-3 text-center font-mono font-bold">
                                    <span className="px-2 py-0.5 rounded text-[11px] bg-rose-200 text-rose-900 border border-rose-300 font-bold">
                                      F
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-center font-mono font-bold text-rose-800">
                                    0.00
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-600 text-white shadow-2xs">
                                      Must Repeat
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Semester Summary Footer */}
                    <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-3 text-slate-500">
                        <span>
                          Enrolled: <strong className="text-slate-800">{semCourses.length}</strong>
                        </span>
                        {semBacklogs.length > 0 && (
                          <span className="text-rose-700 font-bold">
                            · Backlogs: {semBacklogs.length}
                          </span>
                        )}
                        <span>
                          · Total Credits: <strong className="text-slate-800">{totalSemRegisteredCredits} Cr</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-slate-500">Semester SGPA:</span>
                        <strong
                          className={`font-mono text-sm ${
                            hasRepeatInThisSem ? 'text-rose-700' : 'text-indigo-700'
                          }`}
                        >
                          {semSgpa}
                        </strong>
                        {hasRepeatInThisSem && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                            <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                            <span>(Provisional - Backlog Pending)</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          {/* Automated Notification & Lecture Reminders History for Student */}
          <div className="p-5 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600" />
                <span>Automated Email Notifications & Reminders</span>
              </h3>
              <span className="text-xs text-slate-400">Delivered to {currentUser.email}</span>
            </div>

            <div className="space-y-2">
              {studentAlerts.length === 0 ? (
                <p className="text-xs text-slate-400">No automated messages in your inbox.</p>
              ) : (
                studentAlerts.slice(0, 4).map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => setSelectedEmailModal(alert)}
                    className="p-3 rounded-lg border border-slate-100 hover:border-indigo-200 bg-slate-50/60 hover:bg-indigo-50/30 transition-all cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{alert.subject}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {alert.message}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-slate-400">{alert.timestamp}</span>
                      <span className="text-[11px] text-indigo-600 font-semibold hover:underline">
                        View Email
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ); })()}
    </div>
  );
};
