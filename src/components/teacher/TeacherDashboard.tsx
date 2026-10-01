import React, { useState } from 'react';
import { useLms, calculateGradeDetails } from '../../context/LmsContext';
import { Course, User, AttendanceStatus, StudentMarks } from '../../types';
import { formatStudentRollNumber } from '../../utils/studentEmail';
import {
  BookOpen,
  Award,
  CheckCircle2,
  Calendar,
  Send,
  Mail,
  UserCheck,
  Search,
  BellRing,
  Info,
  Clock,
  Sparkles,
  Building,
} from 'lucide-react';

interface TeacherDashboardProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  activeTab: propActiveTab,
  setActiveTab: propSetActiveTab,
}) => {
  const {
    currentUser,
    getTeacherCourses,
    getCourseStudents,
    getCourseGradesMap,
    getStudentCourseGrade,
    updateStudentGrade,
    lectures,
    markLectureAttendance,
    sendLectureReminderNotification,
    setSelectedEmailModal,
    notifications,
  } = useLms();

  if (!currentUser) return null;

  const assignedCourses = getTeacherCourses(currentUser.id);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    assignedCourses[0]?.id || ''
  );

  const selectedCourse = assignedCourses.find((c) => c.id === selectedCourseId) || assignedCourses[0];
  const enrolledStudents = selectedCourse ? getCourseStudents(selectedCourse.id) : [];
  const gradesMap = selectedCourse ? getCourseGradesMap(selectedCourse.id) : {};

  // Tabs for Teacher: 'grading' | 'attendance' | 'reminders' | 'roster' | 'courses'
  const [internalTab, setInternalTab] = useState<'grading' | 'attendance' | 'reminders' | 'roster' | 'courses'>('grading');

  const currentTab: 'grading' | 'attendance' | 'reminders' | 'roster' | 'courses' =
    (propActiveTab && ['grading', 'attendance', 'reminders', 'roster', 'courses'].includes(propActiveTab))
      ? (propActiveTab as any)
      : internalTab;

  const handleTabChange = (tab: 'grading' | 'attendance' | 'reminders' | 'roster' | 'courses') => {
    setInternalTab(tab);
    if (propSetActiveTab) {
      propSetActiveTab(tab);
    }
  };

  // Search filter for students
  const [studentSearch, setStudentSearch] = useState('');

  // Local editing states for grades
  const [editingMarks, setEditingMarks] = useState<Record<string, Partial<StudentMarks>>>({});
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  // Attendance marking state
  const courseLectures = selectedCourse ? lectures.filter((l) => l.courseId === selectedCourse.id) : [];
  const nextLectureNumber = courseLectures.length + 1;
  const [newLectureDate, setNewLectureDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [newLectureTopic, setNewLectureTopic] = useState('');
  const [attendanceSheet, setAttendanceSheet] = useState<Record<string, AttendanceStatus>>({});

  // Lecture reminder state
  const [reminderDate, setReminderDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );
  const [reminderTime, setReminderTime] = useState<string>('10:00 AM');
  const [reminderTopic, setReminderTopic] = useState('');
  const [reminderNote, setReminderNote] = useState('');

  // Handle inline mark input change
  const handleMarkChange = (studentId: string, field: keyof StudentMarks, value: number | string) => {
    setEditingMarks((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [field]: value,
      },
    }));
  };

  // Save / Publish single student grade with email dispatch
  const handleSaveStudentGrade = (student: User) => {
    if (!selectedCourse) return;
    const pending = editingMarks[student.id];
    if (!pending) return;

    updateStudentGrade(selectedCourse.id, student.id, pending, true);

    // Clear pending for that student
    setEditingMarks((prev) => {
      const copy = { ...prev };
      delete copy[student.id];
      return copy;
    });

    setNotificationToast(`Grade update and automated email notification dispatched to ${student.name}!`);
    setTimeout(() => setNotificationToast(null), 4000);
  };

  // Publish all modified student grades
  const handlePublishAllGrades = () => {
    if (!selectedCourse) return;
    const studentIds = Object.keys(editingMarks);
    if (studentIds.length === 0) {
      alert('No unsaved grade modifications found.');
      return;
    }

    studentIds.forEach((id) => {
      const student = enrolledStudents.find((s) => s.id === id);
      if (student && editingMarks[id]) {
        updateStudentGrade(selectedCourse.id, id, editingMarks[id], true);
      }
    });

    setEditingMarks({});
    setNotificationToast(
      `All grades saved. Automated email notifications sent to ${studentIds.length} student(s)!`
    );
    setTimeout(() => setNotificationToast(null), 4000);
  };

  // Mark all present in attendance sheet
  const handleMarkAllPresent = () => {
    const allPresent: Record<string, AttendanceStatus> = {};
    enrolledStudents.forEach((s) => {
      allPresent[s.id] = 'present';
    });
    setAttendanceSheet(allPresent);
  };

  // Submit lecture attendance
  const handleSubmitAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;

    if (!newLectureTopic.trim()) {
      alert('Please enter a lecture topic.');
      return;
    }

    const attendanceEntries = enrolledStudents.map((s) => ({
      studentId: s.id,
      status: attendanceSheet[s.id] || 'present',
    }));

    markLectureAttendance(
      selectedCourse.id,
      nextLectureNumber,
      newLectureTopic,
      newLectureDate,
      attendanceEntries
    );

    setNewLectureTopic('');
    setAttendanceSheet({});
    setNotificationToast(
      `Attendance for Lecture ${nextLectureNumber} recorded. Automated warnings sent if students dropped below 75%.`
    );
    setTimeout(() => setNotificationToast(null), 4000);
  };

  // Send lecture reminder notification
  const handleSendReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    if (!reminderTopic.trim()) {
      alert('Please specify the upcoming lecture topic.');
      return;
    }

    sendLectureReminderNotification(
      selectedCourse.id,
      reminderTopic,
      reminderDate,
      reminderTime,
      reminderNote
    );

    setReminderTopic('');
    setReminderNote('');
    setNotificationToast(
      `Automated lecture reminder email successfully queued and sent to all ${enrolledStudents.length} enrolled students!`
    );
    setTimeout(() => setNotificationToast(null), 4000);
  };

  const filteredStudents = enrolledStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.rollNumber && s.rollNumber.toLowerCase().includes(studentSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification Alert Banner */}
      {notificationToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center justify-between text-xs text-emerald-900 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{notificationToast}</span>
          </div>
          <button
            onClick={() => setNotificationToast(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Faculty Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Faculty Teaching Portal · {currentUser.department}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
            {currentUser.name}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Conduct evaluations, record assignments & midterm/final marks, manage attendance, and broadcast automated lecture notifications.
          </p>
        </div>

        {/* Course Switcher Dropdown */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
          <BookOpen className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-600">Course:</span>
          <select
            value={selectedCourseId}
            onChange={(e) => {
              setSelectedCourseId(e.target.value);
              setEditingMarks({});
              setAttendanceSheet({});
            }}
            className="text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          >
            {assignedCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} · {c.title} ({c.creditHours} Cr)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Course Metadata Banner */}
      {selectedCourse ? (
        <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-slate-900">
                  {selectedCourse.code}
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-sm font-semibold text-slate-800">
                  {selectedCourse.title}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                <span>{selectedCourse.schedule}</span>
                <span aria-hidden="true">·</span>
                <span>{selectedCourse.room}</span>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-slate-700">
                  {selectedCourse.creditHours} Credit Hours
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
              <div className="text-right">
                <div className="text-[11px] text-slate-400 font-sans">Enrolled Students</div>
                <div className="text-base font-bold text-slate-900">
                  {enrolledStudents.length} / {selectedCourse.maxCapacity}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-400 font-sans">Lectures Recorded</div>
                <div className="text-base font-bold text-indigo-700">
                  {courseLectures.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-white rounded-lg border border-slate-200">
          <p className="text-xs text-slate-500">No courses assigned to this faculty profile.</p>
        </div>
      )}

      {/* Module Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg overflow-x-auto scrollbar-none">
          <button
            onClick={() => handleTabChange('grading')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 active:scale-95 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              currentTab === 'grading'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-indigo-600" />
            <span>Gradebook & Marks Breakdown</span>
          </button>
          <button
            onClick={() => handleTabChange('attendance')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 active:scale-95 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              currentTab === 'attendance'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Mark Lecture Attendance</span>
          </button>
          <button
            onClick={() => handleTabChange('courses')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 active:scale-95 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              currentTab === 'courses'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            <span>Assigned Courses ({assignedCourses.length})</span>
          </button>
          <button
            onClick={() => handleTabChange('reminders')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 active:scale-95 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              currentTab === 'reminders'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <BellRing className="w-3.5 h-3.5 text-blue-600" />
            <span>Broadcast Lecture Reminder</span>
          </button>
          <button
            onClick={() => handleTabChange('roster')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 active:scale-95 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              currentTab === 'roster'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Class Roster ({enrolledStudents.length})</span>
          </button>
        </div>

        {/* Global Save Action */}
        {currentTab === 'grading' && Object.keys(editingMarks).length > 0 && (
          <button
            onClick={handlePublishAllGrades}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-all duration-150 shadow-md hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer animate-pulse"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publish All & Notify ({Object.keys(editingMarks).length})</span>
          </button>
        )}
      </div>

      {/* Tab: Assigned Courses Overview */}
      {currentTab === 'courses' && (
        <div className="space-y-4 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                My Assigned Semester Courses ({assignedCourses.length})
              </h3>
              <p className="text-xs text-slate-500">
                Curriculum courses assigned to your faculty profile for teaching and assessment.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignedCourses.map((crs) => {
              const studentsInCourse = getCourseStudents(crs.id);
              const isSelected = crs.id === selectedCourseId;
              return (
                <div
                  key={crs.id}
                  className={`p-5 rounded-xl border transition-all duration-200 flex flex-col justify-between group hover:-translate-y-1 hover:shadow-md ${
                    isSelected
                      ? 'border-indigo-500 bg-white ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-indigo-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {crs.code}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {crs.creditHours} Credits
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-900 transition-colors line-clamp-1">
                      {crs.title}
                    </h4>

                    <p className="text-xs text-slate-500 line-clamp-2">
                      {crs.description || 'Academic course curriculum and syllabus modules.'}
                    </p>

                    <div className="pt-2 text-xs text-slate-600 space-y-1 font-sans">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{crs.schedule}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span>{crs.room}</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                        <span>Enrollment: {studentsInCourse.length}/{crs.maxCapacity}</span>
                        <span>{Math.round((studentsInCourse.length / crs.maxCapacity) * 100)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.round((studentsInCourse.length / crs.maxCapacity) * 100))}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setSelectedCourseId(crs.id);
                        handleTabChange('grading');
                      }}
                      className="flex-1 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-all duration-150 hover:scale-[1.02] active:scale-95 text-center cursor-pointer shadow-xs"
                    >
                      Gradebook
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCourseId(crs.id);
                        handleTabChange('attendance');
                      }}
                      className="flex-1 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-all duration-150 hover:scale-[1.02] active:scale-95 text-center cursor-pointer"
                    >
                      Attendance
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 1: Comprehensive Gradebook & Assessment Marks */}
      {currentTab === 'grading' && (
        <div className="space-y-4">
          {/* Assessment Scheme Guide */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-500 shrink-0" />
              <span>
                <strong>Evaluation Weights:</strong> Assignment 1 (10) + Assignment 2 (10) + Assignment 3 (10) + Midterm (30) + Final Exam (40) = <strong>100 Marks</strong>.
              </span>
            </div>
            <div className="text-[11px] text-indigo-700 font-medium whitespace-nowrap">
              Automated student email triggers upon saving
            </div>
          </div>

          {/* Search bar */}
          <div className="flex items-center justify-between">
            <div className="relative w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search enrolled student..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="text-xs text-slate-500">
              Showing {filteredStudents.length} candidate(s)
            </div>
          </div>

          {/* Grading Spreadsheet / Data Grid */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">Roll No</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-2 text-center w-20">A1 (10)</th>
                    <th className="py-2.5 px-2 text-center w-20">A2 (10)</th>
                    <th className="py-2.5 px-2 text-center w-20">A3 (10)</th>
                    <th className="py-2.5 px-2 text-center w-22">Mids (30)</th>
                    <th className="py-2.5 px-2 text-center w-22">Final (40)</th>
                    <th className="py-2.5 px-3 text-center">Total</th>
                    <th className="py-2.5 px-3 text-center">Grade</th>
                    <th className="py-2.5 px-3 text-center">GPA</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400">
                        No students enrolled in this course yet.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => {
                      const savedMarks = gradesMap[student.id] || {
                        assignment1: 0,
                        assignment2: 0,
                        assignment3: 0,
                        mids: 0,
                        finalExam: 0,
                        total: 0,
                        letterGrade: 'F',
                        gradePoints: 0.0,
                      };

                      const pending = editingMarks[student.id] || {};
                      const a1 = pending.assignment1 !== undefined ? Number(pending.assignment1) : savedMarks.assignment1;
                      const a2 = pending.assignment2 !== undefined ? Number(pending.assignment2) : savedMarks.assignment2;
                      const a3 = pending.assignment3 !== undefined ? Number(pending.assignment3) : savedMarks.assignment3;
                      const mids = pending.mids !== undefined ? Number(pending.mids) : savedMarks.mids;
                      const finals = pending.finalExam !== undefined ? Number(pending.finalExam) : savedMarks.finalExam;

                      const calculated = calculateGradeDetails(a1, a2, a3, mids, finals);
                      const hasPendingChanges = Object.keys(pending).length > 0;

                      return (
                        <tr
                          key={student.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            hasPendingChanges ? 'bg-amber-50/30' : ''
                          }`}
                        >
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">
                            {formatStudentRollNumber(student.session || student.sessionYear, student.department, student.rollNumber)}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900">{student.name}</div>
                            <div className="text-[11px] text-slate-400">{student.email}</div>
                          </td>

                          {/* Assignment 1 (max 10) */}
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              min={0}
                              max={10}
                              step={0.5}
                              value={a1}
                              onChange={(e) =>
                                handleMarkChange(student.id, 'assignment1', parseFloat(e.target.value) || 0)
                              }
                              className="w-16 px-1.5 py-1 text-center font-mono text-xs border border-slate-300 rounded bg-slate-50/80 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>

                          {/* Assignment 2 (max 10) */}
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              min={0}
                              max={10}
                              step={0.5}
                              value={a2}
                              onChange={(e) =>
                                handleMarkChange(student.id, 'assignment2', parseFloat(e.target.value) || 0)
                              }
                              className="w-16 px-1.5 py-1 text-center font-mono text-xs border border-slate-300 rounded bg-slate-50/80 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>

                          {/* Assignment 3 (max 10) */}
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              min={0}
                              max={10}
                              step={0.5}
                              value={a3}
                              onChange={(e) =>
                                handleMarkChange(student.id, 'assignment3', parseFloat(e.target.value) || 0)
                              }
                              className="w-16 px-1.5 py-1 text-center font-mono text-xs border border-slate-300 rounded bg-slate-50/80 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>

                          {/* Mids (max 30) */}
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              min={0}
                              max={30}
                              step={0.5}
                              value={mids}
                              onChange={(e) =>
                                handleMarkChange(student.id, 'mids', parseFloat(e.target.value) || 0)
                              }
                              className="w-18 px-1.5 py-1 text-center font-mono text-xs font-semibold text-slate-800 border border-slate-300 rounded bg-slate-50/80 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>

                          {/* Final Exam (max 40) */}
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              min={0}
                              max={40}
                              step={0.5}
                              value={finals}
                              onChange={(e) =>
                                handleMarkChange(student.id, 'finalExam', parseFloat(e.target.value) || 0)
                              }
                              className="w-18 px-1.5 py-1 text-center font-mono text-xs font-semibold text-slate-800 border border-slate-300 rounded bg-slate-50/80 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>

                          {/* Total Score */}
                          <td className="py-3 px-3 text-center font-mono tabular-nums font-bold text-slate-900">
                            {calculated.total.toFixed(1)}%
                          </td>

                          {/* Letter Grade */}
                          <td className="py-3 px-3 text-center font-mono font-bold">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] ${
                                calculated.letterGrade.startsWith('A')
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : calculated.letterGrade.startsWith('B')
                                  ? 'bg-blue-100 text-blue-800'
                                  : calculated.letterGrade.startsWith('C')
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {calculated.letterGrade}
                            </span>
                          </td>

                          {/* Grade Points */}
                          <td className="py-3 px-3 text-center font-mono tabular-nums text-slate-700">
                            {calculated.gradePoints.toFixed(2)}
                          </td>

                          {/* Action button */}
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleSaveStudentGrade(student)}
                              disabled={!hasPendingChanges}
                              className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors flex items-center gap-1 ml-auto ${
                                hasPendingChanges
                                  ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-2xs'
                                  : 'text-slate-400 bg-slate-100 cursor-not-allowed'
                              }`}
                              title="Publish grade & send automated email alert to student"
                            >
                              <Mail className="w-3 h-3" />
                              <span>Notify</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Mark Lecture Attendance */}
      {currentTab === 'attendance' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
          {/* New Attendance Entry Form */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-5 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Record Attendance · Lecture {nextLectureNumber}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mark physical class participation. Drops below 75% trigger automated student warnings.
                  </p>
                </div>

                <button
                  onClick={handleMarkAllPresent}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 hover:scale-105 active:scale-95 transition-all duration-150 whitespace-nowrap cursor-pointer"
                >
                  ✓ Mark All Present
                </button>
              </div>

              <form onSubmit={handleSubmitAttendance} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Lecture Date
                    </label>
                    <input
                      type="date"
                      required
                      value={newLectureDate}
                      onChange={(e) => setNewLectureDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:ring-1 focus:ring-indigo-500 hover:border-slate-400 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Lecture Topic / Syllabus Unit
                    </label>
                    <input
                      type="text"
                      required
                      value={newLectureTopic}
                      onChange={(e) => setNewLectureTopic(e.target.value)}
                      placeholder="e.g. Dynamic Programming & Bellman-Ford Shortest Paths"
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:ring-1 focus:ring-indigo-500 hover:border-slate-400 transition-colors"
                    />
                  </div>
                </div>

                {/* Student Attendance List */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span>Student Candidate</span>
                    <span>Attendance Status</span>
                  </div>

                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {enrolledStudents.map((s) => {
                      const status = attendanceSheet[s.id] || 'present';
                      return (
                        <div
                          key={s.id}
                          className="px-3 py-2.5 flex items-center justify-between hover:bg-slate-50/80 text-xs transition-colors"
                        >
                          <div>
                            <div className="font-semibold text-slate-900">{s.name}</div>
                            <div className="text-[11px] font-mono text-slate-500 font-semibold">
                              {formatStudentRollNumber(s.session || s.sessionYear, s.department, s.rollNumber)}
                            </div>
                          </div>

                          {/* Status Segmented Buttons with spring active & hover effects */}
                          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md">
                            {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() =>
                                  setAttendanceSheet((prev) => ({
                                    ...prev,
                                    [s.id]: st,
                                  }))
                                }
                                className={`px-2 py-1 text-[11px] font-semibold capitalize rounded transition-all duration-150 cursor-pointer ${
                                  status === st
                                    ? st === 'present'
                                      ? 'bg-emerald-600 text-white shadow-2xs scale-105'
                                      : st === 'absent'
                                      ? 'bg-rose-600 text-white shadow-2xs scale-105'
                                      : st === 'late'
                                      ? 'bg-amber-600 text-white shadow-2xs scale-105'
                                      : 'bg-indigo-600 text-white shadow-2xs scale-105'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 active:scale-90'
                                }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-400">
                    Submission updates individual attendance rates immediately.
                  </span>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-all duration-150 shadow-xs hover:scale-[1.02] active:scale-95 cursor-pointer"
                  >
                    Commit Lecture Attendance
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Past Conducted Lectures Log */}
          <div className="p-5 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Lecture History</h3>
              <span className="text-xs font-mono text-slate-400">{courseLectures.length} logged</span>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {courseLectures.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  No lecture sessions recorded yet.
                </p>
              ) : (
                courseLectures
                  .slice()
                  .sort((a, b) => b.lectureNumber - a.lectureNumber)
                  .map((lec) => {
                    const presentCount = lec.attendance.filter(
                      (a) => a.status === 'present' || a.status === 'late' || a.status === 'excused'
                    ).length;
                    const rate = Math.round((presentCount / lec.attendance.length) * 100);

                    return (
                      <div
                        key={lec.id}
                        className="p-3 rounded-lg border border-slate-100 bg-slate-50 text-xs space-y-1.5 hover:-translate-y-0.5 hover:shadow-2xs hover:border-slate-300 transition-all duration-150 cursor-default"
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span className="text-slate-900">Lecture {lec.lectureNumber}</span>
                          <span className="font-mono text-[11px] text-slate-500">{lec.date}</span>
                        </div>
                        <div className="text-slate-700 leading-snug">{lec.topic}</div>
                        <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                          <span>
                            Attendance: {presentCount} / {lec.attendance.length}
                          </span>
                          <span className={rate >= 75 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                            {rate}% Turnout
                          </span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Broadcast Lecture Reminders */}
      {currentTab === 'reminders' && (
        <div className="max-w-2xl bg-white p-6 rounded-lg border border-slate-200 shadow-2xs space-y-5 animate-fade-in-up">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BellRing className="w-4 h-4 text-indigo-600" />
              <span>Send Automated Lecture Reminder to Enrolled Students</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Broadcasts a lecture reminder to all {enrolledStudents.length} registered students in {selectedCourse?.code} via in-app alerts and official university automated email notifications.
            </p>
          </div>

          <form onSubmit={handleSendReminder} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Scheduled Date
                </label>
                <input
                  type="date"
                  required
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:ring-1 focus:ring-indigo-500 hover:border-slate-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lecture Time
                </label>
                <input
                  type="text"
                  required
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  placeholder="e.g. 10:00 AM – 11:30 AM"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:ring-1 focus:ring-indigo-500 hover:border-slate-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Upcoming Lecture Topic
              </label>
              <input
                type="text"
                required
                value={reminderTopic}
                onChange={(e) => setReminderTopic(e.target.value)}
                placeholder="e.g. Tree Traversal Algorithms (AVL Rotations & Heuristics)"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:ring-1 focus:ring-indigo-500 hover:border-slate-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Preparation Notes / Reading Material (Optional)
              </label>
              <textarea
                rows={3}
                value={reminderNote}
                onChange={(e) => setReminderNote(e.target.value)}
                placeholder="e.g. Please bring your laptops for the live coding lab on B-Tree index balancing..."
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:ring-1 focus:ring-indigo-500 hover:border-slate-400 transition-colors"
              />
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-slate-800">Automated Dispatch Overview:</div>
              <div>• Target: All {enrolledStudents.length} registered candidates</div>
              <div>• Classroom Venue: {selectedCourse?.room}</div>
              <div>• Sender: {currentUser.name} &lt;{currentUser.email}&gt;</div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-all duration-150 shadow-xs hover:scale-[1.02] active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Lecture Reminder Emails</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 4: Class Roster */}
      {currentTab === 'roster' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden animate-fade-in-up">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Course Enrolled Students Roster
              </h3>
              <p className="text-xs text-slate-500">
                {selectedCourse?.code} · {selectedCourse?.title}
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-700">
              {enrolledStudents.length} Students
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Roll Number</th>
                  <th className="py-2.5 px-4">Student Name</th>
                  <th className="py-2.5 px-4">Official Email</th>
                  <th className="py-2.5 px-4 text-center">Semester</th>
                  <th className="py-2.5 px-4 text-center">Current Total %</th>
                  <th className="py-2.5 px-4 text-center">Letter Grade</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enrolledStudents.map((s) => {
                  const m = gradesMap[s.id];
                  return (
                    <tr key={s.id} className="hover:bg-indigo-50/30 transition-colors duration-150 group">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {formatStudentRollNumber(s.session || s.sessionYear, s.department, s.rollNumber)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{s.name}</div>
                        <div className="text-[11px] text-slate-400">{s.department}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {s.email}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-700">
                        Sem {s.semester || 5}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                        {m ? `${m.total.toFixed(1)}%` : 'Pending'}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
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
                          'N/A'
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            handleTabChange('grading');
                          }}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline hover:scale-105 active:scale-95 transition-all inline-block cursor-pointer"
                        >
                          Open in Gradebook
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
