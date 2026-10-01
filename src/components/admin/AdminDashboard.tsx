import React, { useState, useMemo } from 'react';
import { useLms } from '../../context/LmsContext';
import { Course, Semester, User, Department } from '../../types';
import { AdminUserModal } from './AdminUserModal';
import { AdminDepartmentModal } from './AdminDepartmentModal';
import { formatStudentRollNumber } from '../../utils/studentEmail';
import {
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Award,
  Layers,
  Edit2,
  Trash2,
  Building,
  Building2,
  KeyRound,
  UserPlus,
  ShieldAlert,
  UserCheck,
  Sparkles,
} from 'lucide-react';

interface AdminDashboardProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  activeTab: propActiveTab,
  setActiveTab: propSetActiveTab,
}) => {
  const {
    getSystemAnalytics,
    courses,
    semesters,
    currentSemester,
    users,
    currentUser,
    departments,
    deleteDepartment,
    addCourse,
    updateCourse,
    deleteCourse,
    adminDeleteUser,
    toggleSemesterRegistration,
    addSemester,
    setIsProfileModalOpen,
  } = useLms();

  const analytics = getSystemAnalytics();
  const teachers = users.filter((u) => u.role === 'teacher');
  const students = users.filter((u) => u.role === 'student');
  const adminUser = users.find((u) => u.role === 'admin') || (currentUser?.role === 'admin' ? currentUser : null);
  const adminEmail = adminUser?.email || currentUser?.email || 'registrar@nicore.edu.pk';

  // Delete User Confirmation State
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [deleteToast, setDeleteToast] = useState<string | null>(null);

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      await adminDeleteUser(userToDelete.id);
      setDeleteToast(`${userToDelete.role === 'student' ? 'Student' : 'Faculty'} "${userToDelete.name}" has been permanently deleted.`);
      setUserToDelete(null);
      setTimeout(() => setDeleteToast(null), 3500);
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Filter & Search states
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentSearchQuery, setDepartmentSearchQuery] = useState('');
  const [internalTab, setInternalTab] = useState<'analytics' | 'courses' | 'faculty' | 'students' | 'departments'>('analytics');

  const currentTab: 'analytics' | 'courses' | 'faculty' | 'students' | 'departments' =
    (propActiveTab && ['analytics', 'courses', 'faculty', 'students', 'departments'].includes(propActiveTab))
      ? (propActiveTab as 'analytics' | 'courses' | 'faculty' | 'students' | 'departments')
      : internalTab;

  const handleTabChange = (tab: 'analytics' | 'courses' | 'faculty' | 'students' | 'departments') => {
    setInternalTab(tab);
    if (propSetActiveTab) {
      propSetActiveTab(tab);
    }
  };

  // Department Management States
  const [departmentModalState, setDepartmentModalState] = useState<{
    isOpen: boolean;
    departmentToEdit: Department | null;
  }>({
    isOpen: false,
    departmentToEdit: null,
  });
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);
  const [isDeletingDepartment, setIsDeletingDepartment] = useState(false);

  const handleConfirmDeleteDepartment = async () => {
    if (!departmentToDelete) return;
    setIsDeletingDepartment(true);
    try {
      await deleteDepartment(departmentToDelete.id);
      setDeleteToast(`Department "${departmentToDelete.name}" has been removed.`);
      setDepartmentToDelete(null);
      setTimeout(() => setDeleteToast(null), 3500);
    } catch (err) {
      console.error('Delete department error:', err);
    } finally {
      setIsDeletingDepartment(false);
    }
  };

  const filteredDepartments = useMemo(() => {
    if (!departmentSearchQuery.trim()) return departments;
    const q = departmentSearchQuery.toLowerCase();
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        (d.hodName && d.hodName.toLowerCase().includes(q))
    );
  }, [departments, departmentSearchQuery]);

  // Modal states
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isAddSemesterOpen, setIsAddSemesterOpen] = useState(false);
  const [userModalState, setUserModalState] = useState<{
    isOpen: boolean;
    userToEdit: User | null;
    roleToCreate: 'student' | 'teacher' | null;
  }>({
    isOpen: false,
    userToEdit: null,
    roleToCreate: null,
  });

  // Form states for Add / Edit Course
  const [formCode, setFormCode] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formSemesterId, setFormSemesterId] = useState(currentSemester.id);
  const [formSemesterNumber, setFormSemesterNumber] = useState(5);
  const [formCreditHours, setFormCreditHours] = useState(3);
  const [formDepartment, setFormDepartment] = useState(departments[0]?.name || 'Computer Science');
  const [formTeacherId, setFormTeacherId] = useState(teachers[0]?.id || '');
  const [formSchedule, setFormSchedule] = useState('Mon & Wed · 10:00 AM – 11:30 AM');
  const [formRoom, setFormRoom] = useState('Hall 402 · Computing Wing');
  const [formCapacity, setFormCapacity] = useState(40);
  const [formDescription, setFormDescription] = useState('');

  // Form state for New Semester
  const [newSemName, setNewSemName] = useState('Spring 2027');
  const [newSemCode, setNewSemCode] = useState('SP27');
  const [newSemNumber, setNewSemNumber] = useState(6);
  const [newSemStart, setNewSemStart] = useState('2027-02-01');
  const [newSemEnd, setNewSemEnd] = useState('2027-06-30');

  const openAddCourse = () => {
    setEditingCourse(null);
    setFormCode('');
    setFormTitle('');
    setFormSemesterId(currentSemester.id);
    setFormSemesterNumber(currentSemester.number);
    setFormCreditHours(3);
    setFormDepartment(departments[0]?.name || 'Computer Science');
    setFormTeacherId(teachers[0]?.id || '');
    setFormSchedule('Mon & Wed · 10:00 AM – 11:30 AM');
    setFormRoom('Hall 402 · Computing Wing');
    setFormCapacity(40);
    setFormDescription('');
    setIsAddCourseOpen(true);
  };

  const openEditCourse = (course: Course) => {
    setEditingCourse(course);
    setFormCode(course.code);
    setFormTitle(course.title);
    setFormSemesterId(course.semesterId);
    setFormSemesterNumber(course.semesterNumber);
    setFormCreditHours(course.creditHours);
    setFormDepartment(course.department);
    setFormTeacherId(course.teacherId);
    setFormSchedule(course.schedule);
    setFormRoom(course.room);
    setFormCapacity(course.maxCapacity);
    setFormDescription(course.description);
    setIsAddCourseOpen(true);
  };

  const handleSaveCourse = (e: React.FormEvent) => {
    e.preventDefault();
    const assignedTeacher = teachers.find((t) => t.id === formTeacherId);
    const teacherName = assignedTeacher ? assignedTeacher.name : 'Faculty Staff';

    if (editingCourse) {
      updateCourse(editingCourse.id, {
        code: formCode,
        title: formTitle,
        semesterId: formSemesterId,
        semesterNumber: Number(formSemesterNumber),
        creditHours: Number(formCreditHours),
        department: formDepartment,
        teacherId: formTeacherId,
        teacherName,
        schedule: formSchedule,
        room: formRoom,
        maxCapacity: Number(formCapacity),
        description: formDescription,
      });
    } else {
      addCourse({
        code: formCode,
        title: formTitle,
        semesterId: formSemesterId,
        semesterNumber: Number(formSemesterNumber),
        creditHours: Number(formCreditHours),
        department: formDepartment,
        teacherId: formTeacherId,
        teacherName,
        schedule: formSchedule,
        room: formRoom,
        maxCapacity: Number(formCapacity),
        description: formDescription,
      });
    }
    setIsAddCourseOpen(false);
  };

  const handleCreateSemester = (e: React.FormEvent) => {
    e.preventDefault();
    addSemester({
      name: newSemName,
      code: newSemCode,
      number: Number(newSemNumber),
      startDate: newSemStart,
      endDate: newSemEnd,
      isRegistrationOpen: true,
      isCurrent: false,
    });
    setIsAddSemesterOpen(false);
  };

  // Filtered courses
  const filteredCourses = courses.filter((c) => {
    const matchesSemester =
      selectedSemesterFilter === 'all' ||
      c.semesterId === selectedSemesterFilter ||
      c.semesterNumber.toString() === selectedSemesterFilter;
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSemester && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header with Registrar Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            University Academic Administration
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Overall system analytics, semester course scheduling, faculty assignment, and registration control.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 transition-all duration-150 shadow-2xs hover:scale-[1.02] active:scale-95 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            title="Reset or change your Dean/Registrar password"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Reset My Password</span>
          </button>
          <button
            onClick={() => setIsAddSemesterOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-all duration-150 shadow-2xs hover:scale-[1.02] active:scale-95 whitespace-nowrap cursor-pointer"
          >
            + New Semester
          </button>
          <button
            onClick={openAddCourse}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-all duration-150 shadow-xs hover:scale-[1.02] active:scale-95 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Course</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards with rich hover lifts & icon rotations */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-2xs hover:-translate-y-1 hover:shadow-md hover:border-indigo-300 transition-all duration-200 cursor-default group">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Enrolled Students</span>
            <Users className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:scale-110 group-hover:rotate-6 transition-all duration-200" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums group-hover:text-indigo-900 transition-colors">
            {analytics.totalStudents}
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 font-medium">Active roster</div>
        </div>

        <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-2xs hover:-translate-y-1 hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-default group">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Faculty Members</span>
            <GraduationCap className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:scale-110 group-hover:rotate-6 transition-all duration-200" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums group-hover:text-blue-900 transition-colors">
            {analytics.totalTeachers}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Across 4 departments</div>
        </div>

        <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-2xs hover:-translate-y-1 hover:shadow-md hover:border-indigo-300 transition-all duration-200 cursor-default group">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Courses</span>
            <BookOpen className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:scale-110 group-hover:rotate-6 transition-all duration-200" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums group-hover:text-indigo-900 transition-colors">
            {analytics.totalCourses}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Active curriculum</div>
        </div>

        <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-2xs hover:-translate-y-1 hover:shadow-md hover:border-purple-300 transition-all duration-200 cursor-default group">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Registrations</span>
            <Layers className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 group-hover:scale-110 group-hover:rotate-6 transition-all duration-200" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums group-hover:text-purple-900 transition-colors">
            {analytics.totalEnrollments}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Course seatings</div>
        </div>

        <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-2xs hover:-translate-y-1 hover:shadow-md hover:border-emerald-300 transition-all duration-200 cursor-default group">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Avg Attendance</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:scale-110 group-hover:rotate-6 transition-all duration-200" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums group-hover:text-emerald-900 transition-colors">
            {analytics.averageAttendanceRate}%
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 font-medium">&gt; 75% threshold</div>
        </div>

        <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-2xs hover:-translate-y-1 hover:shadow-md hover:border-amber-300 transition-all duration-200 cursor-default group">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Avg Univ GPA</span>
            <Award className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 group-hover:scale-110 group-hover:rotate-6 transition-all duration-200" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums group-hover:text-amber-900 transition-colors">
            {analytics.averageGpa.toFixed(2)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Scale of 4.00</div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
          <button
            onClick={() => handleTabChange('analytics')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 active:scale-95 cursor-pointer ${
              currentTab === 'analytics'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            System Analytics & Metrics
          </button>
          <button
            onClick={() => handleTabChange('courses')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 active:scale-95 cursor-pointer ${
              currentTab === 'courses'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            Semester Courses ({courses.length})
          </button>
          <button
            onClick={() => handleTabChange('faculty')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 active:scale-95 cursor-pointer ${
              currentTab === 'faculty'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            Faculty Directory ({teachers.length})
          </button>
          <button
            onClick={() => handleTabChange('students')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 active:scale-95 cursor-pointer ${
              currentTab === 'students'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            Student Roster ({students.length})
          </button>
          <button
            onClick={() => handleTabChange('departments')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
              currentTab === 'departments'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Departments ({departments.length})</span>
          </button>
        </div>

        {/* Semester Registration Windows Quick Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 hidden sm:inline">Registration Window:</span>
          <button
            onClick={() => toggleSemesterRegistration(currentSemester.id)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all duration-150 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
              currentSemester.isRegistrationOpen
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
                : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100 hover:border-rose-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                currentSemester.isRegistrationOpen ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'
              }`}
            />
            <span>
              {currentSemester.name}: {currentSemester.isRegistrationOpen ? 'Open (Toggle)' : 'Closed (Toggle)'}
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: System Analytics */}
      {currentTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
          {/* Grade Distribution Bar Visualizer */}
          <div className="lg:col-span-2 p-5 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-4 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  University Academic Grade Distribution
                </h3>
                <p className="text-xs text-slate-500">
                  Continuous evaluation & midterm/final marks across all active semester courses.
                </p>
              </div>
              <div className="text-xs font-mono text-slate-400">Total Graded: {analytics.totalEnrollments}</div>
            </div>

            <div className="space-y-2.5 pt-2">
              {analytics.gradeDistribution.map((item) => {
                const max = Math.max(...analytics.gradeDistribution.map((g) => g.count), 1);
                const percent = Math.round((item.count / max) * 100);
                return (
                  <div key={item.grade} className="flex items-center gap-3 text-xs group cursor-default p-1 rounded hover:bg-slate-50 transition-colors">
                    <span className="w-8 font-bold text-slate-700 font-mono group-hover:text-slate-900 transition-colors">{item.grade}</span>
                    <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden relative">
                      <div
                        className={`h-full rounded transition-all duration-300 group-hover:brightness-110 ${
                          item.grade.startsWith('A')
                            ? 'bg-emerald-500'
                            : item.grade.startsWith('B')
                            ? 'bg-blue-500'
                            : item.grade.startsWith('C')
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.max(percent, item.count > 0 ? 8 : 0)}%` }}
                      />
                    </div>
                    <span className="w-12 text-right font-mono tabular-nums text-slate-600 font-semibold group-hover:text-slate-900 transition-colors">
                      {item.count} std
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Standard Grading Bell Curve</span>
              <span className="text-emerald-700 font-medium">82% in Good Academic Standing</span>
            </div>
          </div>

          {/* Department Breakdown & Attendance Compliance */}
          <div className="space-y-6">
            <div className="p-5 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-4 hover:border-slate-300 transition-colors">
              <h3 className="text-sm font-bold text-slate-900">
                Departmental Enrollments
              </h3>
              <div className="space-y-3">
                {analytics.departmentBreakdown.map((dept) => (
                  <div
                    key={dept.department}
                    className="p-2.5 bg-slate-50 rounded border border-slate-100 flex items-center justify-between text-xs hover:-translate-y-0.5 hover:shadow-2xs hover:border-slate-300 transition-all duration-200 cursor-default"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{dept.department}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {dept.courses} active semester courses
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono tabular-nums font-bold text-slate-800">
                        {dept.students}
                      </span>
                      <span className="text-[11px] text-slate-400 ml-1">students</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-3 hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Attendance Audit Health</h3>
                <span className="text-xs font-bold text-emerald-700">92% Met</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Mandatory minimum 75% physical class attendance enforced for Final Examination seatings.
                Automated email warnings are fired automatically when attendance falls below 75%.
              </p>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: '92%' }} />
                <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: '5%' }} />
                <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: '3%' }} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-mono">
                <span>Eligible: 92%</span>
                <span>Warning: 5%</span>
                <span>Debarred: 3%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Semester Courses Management */}
      {currentTab === 'courses' && (
        <div className="space-y-4 animate-fade-in-up">
          {/* Controls Bar: Semester Filter & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600">Filter Semester:</span>
              <select
                value={selectedSemesterFilter}
                onChange={(e) => setSelectedSemesterFilter(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 hover:border-slate-400 transition-colors"
              >
                <option value="all">All Semesters</option>
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Semester {s.number})
                  </option>
                ))}
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
                <option value="3">Semester 3</option>
                <option value="4">Semester 4</option>
                <option value="5">Semester 5</option>
                <option value="6">Semester 6</option>
                <option value="7">Semester 7</option>
                <option value="8">Semester 8</option>
              </select>
            </div>

            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search code, title, teacher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-indigo-500 hover:border-slate-400 transition-colors"
              />
            </div>
          </div>

          {/* High-Density Data Grid of Courses */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-4">Code</th>
                    <th className="py-2.5 px-4">Course Title</th>
                    <th className="py-2.5 px-4">Semester</th>
                    <th className="py-2.5 px-4 text-center">Credit Hours</th>
                    <th className="py-2.5 px-4">Assigned Teacher</th>
                    <th className="py-2.5 px-4">Schedule & Venue</th>
                    <th className="py-2.5 px-4 text-center">Enrolled / Cap</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCourses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No courses found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCourses.map((c) => {
                      const sem = semesters.find((s) => s.id === c.semesterId);
                      return (
                        <tr key={c.id} className="hover:bg-indigo-50/30 transition-colors duration-150 group">
                          <td className="py-3 px-4 font-bold text-slate-900 font-mono group-hover:text-indigo-600 transition-colors">
                            {c.code}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{c.title}</div>
                            <div className="text-[11px] text-slate-400 truncate max-w-xs">
                              {c.department}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            <div>Sem {c.semesterNumber}</div>
                            <div className="text-[11px] text-slate-400">{sem ? sem.name : 'Active'}</div>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-semibold text-slate-800">
                            {c.creditHours} Cr
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900">{c.teacherName}</div>
                            <div className="text-[11px] text-slate-400">Course In-Charge</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-slate-800">{c.schedule}</div>
                            <div className="text-[11px] text-slate-500">{c.room}</div>
                          </td>
                          <td className="py-3 px-4 text-center font-mono tabular-nums">
                            <span className="font-semibold text-slate-900">{c.enrolledCount}</span>
                            <span className="text-slate-400"> / {c.maxCapacity}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditCourse(c)}
                                className="p-1 text-slate-500 hover:text-indigo-600 rounded hover:bg-slate-100 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                                title="Edit course details & reassign teacher"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to remove ${c.code} ${c.title}?`)) {
                                    deleteCourse(c.id);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                                title="Delete course"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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

      {/* Tab 3: Faculty Directory */}
      {currentTab === 'faculty' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden animate-fade-in-up">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Appointed University Faculty
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {teachers.length} Active Instructors · Manage faculty profiles and reset credentials
              </p>
            </div>
            <button
              onClick={() =>
                setUserModalState({
                  isOpen: true,
                  userToEdit: null,
                  roleToCreate: 'teacher',
                })
              }
              className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-all duration-150 shadow-xs hover:scale-[1.02] active:scale-95 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Enroll New Faculty</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {teachers.map((t) => {
              const assigned = courses.filter((c) => c.teacherId === t.id);
              return (
                <div
                  key={t.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:-translate-y-1 hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col justify-between group"
                >
                  <div className="flex items-start gap-3.5">
                    <img
                      src={
                        t.avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          t.name
                        )}&background=0F172A&color=fff`
                      }
                      alt={t.name}
                      className="w-11 h-11 rounded-full object-cover border border-slate-300 shrink-0 group-hover:border-blue-500 transition-colors"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-900 transition-colors">{t.name}</h4>
                        <span className="text-[10px] font-semibold uppercase text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          {t.designation || 'Faculty'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{t.department}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{t.email}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        DOB: {t.dob || '1980-01-01'} · Phone: {t.phone || 'N/A'}
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-200/80">
                        <div className="text-[11px] font-semibold text-slate-700">
                          Assigned Semester Courses ({assigned.length}):
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {assigned.length === 0 ? (
                            <span className="text-[11px] text-slate-400 italic">No courses assigned</span>
                          ) : (
                            assigned.map((crs) => (
                              <span
                                key={crs.id}
                                className="text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded hover:border-slate-300 transition-colors"
                              >
                                {crs.code} · {crs.creditHours} Cr
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar for Faculty */}
                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-end gap-2 text-xs">
                    <button
                      onClick={() =>
                        setUserModalState({
                          isOpen: true,
                          userToEdit: t,
                          roleToCreate: null,
                        })
                      }
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 hover:text-slate-900 border border-slate-300 rounded shadow-2xs hover:scale-[1.02] active:scale-95 flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3 text-slate-500" />
                      <span>Manage & Reset</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserToDelete(t)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded shadow-2xs hover:scale-[1.02] active:scale-95 flex items-center gap-1 transition-all cursor-pointer"
                      title={`Permanently delete faculty member ${t.name}`}
                    >
                      <Trash2 className="w-3 h-3 text-rose-600" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 4: Student Directory */}
      {currentTab === 'students' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden animate-fade-in-up">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900">
                  Registered University Students Roster
                </h3>
                <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span>Domain:</span>
                  <strong className="font-mono">@{adminEmail.split('@')[1] || 'nicore.edu.pk'}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(true)}
                  className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer flex items-center gap-0.5"
                  title="Change university domain (auto-cascades to all user accounts)"
                >
                  Change Domain
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {students.length} Enrolled Candidates · Unique roll verified per session & semester · Add 1st sem candidates or Manage & Reset
              </p>
            </div>
            <button
              onClick={() =>
                setUserModalState({
                  isOpen: true,
                  userToEdit: null,
                  roleToCreate: 'student',
                })
              }
              className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-all duration-150 shadow-xs hover:scale-[1.02] active:scale-95 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Enroll New Student</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3">University Roll Number (year-dept-roll)</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Department & Degree</th>
                  <th className="py-2.5 px-2 text-center">Session</th>
                  <th className="py-2.5 px-2 text-center">Semester</th>
                  <th className="py-2.5 px-2 text-center">DOB</th>
                  <th className="py-2.5 px-2 text-center">CGPA</th>
                  <th className="py-2.5 px-3">Official Institutional Email</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-indigo-50/30 transition-colors duration-150 group">
                    <td className="py-3 px-3 font-mono">
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-bold text-slate-900 group-hover:bg-indigo-50 group-hover:border-indigo-300 group-hover:text-indigo-700 transition-colors">
                        {formatStudentRollNumber(s.session || s.sessionYear, s.department, s.rollNumber)}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={
                            s.avatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              s.name
                            )}&background=0F172A&color=fff`
                          }
                          alt={s.name}
                          className="w-6 h-6 rounded-full object-cover border border-slate-200"
                        />
                        <span className="font-semibold text-slate-900">{s.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-700">BS {s.department}</td>
                    <td className="py-3 px-2 text-center font-mono font-semibold text-indigo-700">
                      <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded text-[11px]">
                        {s.session || s.sessionYear || 2026}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center font-mono font-medium text-slate-800">
                      Sem {s.semester || 1}
                    </td>
                    <td className="py-3 px-2 text-center font-mono text-slate-500 text-[11px]">
                      {s.dob || '2003-01-01'}
                    </td>
                    <td className="py-3 px-2 text-center font-mono font-bold text-indigo-700">
                      {(s.cgpa || 3.75).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-semibold text-indigo-900">
                        {s.email}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() =>
                            setUserModalState({
                              isOpen: true,
                              userToEdit: s,
                              roleToCreate: null,
                            })
                          }
                          className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-2xs hover:scale-[1.02] active:scale-95 inline-flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3 text-slate-500" />
                          <span>Manage</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setUserToDelete(s)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                          title={`Permanently delete student ${s.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Academic Departments */}
      {currentTab === 'departments' && (
        <div className="space-y-4 animate-fade-in-up">
          {/* Top Control Bar */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900">
                  University Academic Departments & Leadership
                </h3>
                <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full font-mono">
                  {departments.length} Units Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage university departments, institutional code abbreviations (used in roll numbers & emails), and appointed Heads of Department (HODs).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search departments or HOD..."
                  value={departmentSearchQuery}
                  onChange={(e) => setDepartmentSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-indigo-500 w-48 sm:w-60"
                />
              </div>
              <button
                onClick={() => setDepartmentModalState({ isOpen: true, departmentToEdit: null })}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-all shadow-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Department</span>
              </button>
            </div>
          </div>

          {/* Department Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDepartments.map((dept) => {
              const deptFaculty = teachers.filter((t) => t.department === dept.name);
              const deptStudents = students.filter((s) => s.department === dept.name);
              const deptCourses = courses.filter((c) => c.department === dept.name);
              const hodTeacher = teachers.find((t) => t.id === dept.hodId);

              return (
                <div
                  key={dept.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all duration-200 p-4.5 flex flex-col justify-between group"
                >
                  <div>
                    {/* Header badge & title */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0 font-bold font-mono text-sm uppercase shadow-2xs">
                          {dept.code}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-900 transition-colors">
                            {dept.name}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-500">
                            Code: <strong className="text-indigo-600 font-bold">{dept.code}</strong>
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full uppercase font-mono">
                        {dept.code.toUpperCase()}
                      </span>
                    </div>

                    {dept.description && (
                      <p className="text-[11px] text-slate-500 mt-2.5 line-clamp-2 leading-relaxed">
                        {dept.description}
                      </p>
                    )}

                    {/* Formula Pill preview */}
                    <div className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded-md text-[10px] font-mono text-slate-600 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-indigo-500 shrink-0" />
                        <span>Roll: <strong className="text-indigo-700">2026-{dept.code}-01</strong></span>
                      </div>
                      <span className="text-slate-400">@{adminEmail.split('@')[1] || 'nicore.edu.pk'}</span>
                    </div>

                    {/* HOD Status Card */}
                    <div className="mt-3 p-2.5 rounded-lg border bg-slate-50/70 border-slate-200/80">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-indigo-600" />
                          <span>Head of Department (HOD)</span>
                        </span>
                        {dept.hodId ? (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Appointed
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Unassigned
                          </span>
                        )}
                      </div>

                      {hodTeacher ? (
                        <div className="flex items-center gap-2.5 pt-0.5">
                          <img
                            src={
                              hodTeacher.avatar ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                hodTeacher.name
                              )}&background=4F46E5&color=fff`
                            }
                            alt={hodTeacher.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-300 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {hodTeacher.name}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {hodTeacher.designation || 'Faculty'} · {hodTeacher.email}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between py-1">
                          <span className="text-[11px] text-slate-400 italic">No HOD appointed</span>
                          <button
                            type="button"
                            onClick={() =>
                              setDepartmentModalState({
                                isOpen: true,
                                departmentToEdit: dept,
                              })
                            }
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                          >
                            Appoint HOD
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Department Statistics Summary */}
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
                      <div className="p-1.5 bg-slate-50/80 rounded border border-slate-100">
                        <div className="text-xs font-bold text-slate-800 font-mono">
                          {deptFaculty.length}
                        </div>
                        <div className="text-[9px] text-slate-400 uppercase font-semibold">Faculty</div>
                      </div>
                      <div className="p-1.5 bg-slate-50/80 rounded border border-slate-100">
                        <div className="text-xs font-bold text-slate-800 font-mono">
                          {deptStudents.length}
                        </div>
                        <div className="text-[9px] text-slate-400 uppercase font-semibold">Students</div>
                      </div>
                      <div className="p-1.5 bg-slate-50/80 rounded border border-slate-100">
                        <div className="text-xs font-bold text-slate-800 font-mono">
                          {deptCourses.length}
                        </div>
                        <div className="text-[9px] text-slate-400 uppercase font-semibold">Courses</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setDepartmentModalState({
                          isOpen: true,
                          departmentToEdit: dept,
                        })
                      }
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-2xs hover:scale-[1.02] active:scale-95 flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3 text-slate-500" />
                      <span>Edit & Manage HOD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDepartmentToDelete(dept)}
                      className="px-2 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded shadow-2xs hover:scale-[1.02] active:scale-95 flex items-center gap-1 transition-all cursor-pointer"
                      title={`Permanently delete department ${dept.name}`}
                    >
                      <Trash2 className="w-3 h-3 text-rose-600" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Course */}
      {isAddCourseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
          <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider">
                {editingCourse ? 'Edit Semester Course' : 'Create & Assign Semester Course'}
              </h3>
              <button
                onClick={() => setIsAddCourseOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Course Code (e.g. CS-301)
                  </label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 font-mono"
                    placeholder="CS-301"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Credit Hours (1 - 5)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    required
                    value={formCreditHours}
                    onChange={(e) => setFormCreditHours(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Course Title
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500"
                  placeholder="Data Structures & Algorithms"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Academic Semester
                  </label>
                  <select
                    value={formSemesterId}
                    onChange={(e) => {
                      setFormSemesterId(e.target.value);
                      const matched = semesters.find((s) => s.id === e.target.value);
                      if (matched) setFormSemesterNumber(matched.number);
                    }}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500"
                  >
                    {semesters.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Semester {s.number})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Semester Number (1 to 8)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    required
                    value={formSemesterNumber}
                    onChange={(e) => setFormSemesterNumber(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assign Faculty Instructor
                  </label>
                  <select
                    value={formTeacherId}
                    onChange={(e) => setFormTeacherId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md font-medium text-slate-900"
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Academic Department
                  </label>
                  <select
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md font-medium"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Class Schedule
                  </label>
                  <input
                    type="text"
                    required
                    value={formSchedule}
                    onChange={(e) => setFormSchedule(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md"
                    placeholder="Mon & Wed · 10:00 AM – 11:30 AM"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Max Capacity
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={120}
                    required
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lecture Venue / Hall
                </label>
                <input
                  type="text"
                  required
                  value={formRoom}
                  onChange={(e) => setFormRoom(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md"
                  placeholder="Hall 402 · Computing Wing"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Course Description & Syllabus Highlights
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md"
                  placeholder="Enter topics, prerequisites, and learning outcomes..."
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCourseOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-xs"
                >
                  {editingCourse ? 'Save Changes' : 'Create & Assign Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Semester */}
      {isAddSemesterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Create New Academic Semester
              </h3>
              <button
                onClick={() => setIsAddSemesterOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateSemester} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Semester Term Name (e.g. Spring 2027)
                </label>
                <input
                  type="text"
                  required
                  value={newSemName}
                  onChange={(e) => setNewSemName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Semester Code
                  </label>
                  <input
                    type="text"
                    required
                    value={newSemCode}
                    onChange={(e) => setNewSemCode(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md font-mono"
                    placeholder="SP27"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Semester Number (1-8)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    required
                    value={newSemNumber}
                    onChange={(e) => setNewSemNumber(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Term Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newSemStart}
                    onChange={(e) => setNewSemStart(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Term End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newSemEnd}
                    onChange={(e) => setNewSemEnd(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddSemesterOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-xs"
                >
                  Create Semester
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {deleteToast && (
        <div className="fixed bottom-5 right-5 z-50 p-3.5 bg-emerald-900 text-white rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{deleteToast}</span>
        </div>
      )}

      {/* Confirmation Modal: Delete User */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in">
            <div className="p-5">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0 text-rose-600">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-900">
                    Permanently Delete {userToDelete.role === 'student' ? 'Student' : 'Faculty Member'}?
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    You are about to permanently delete <strong>{userToDelete.name}</strong> from the university records.
                  </p>
                  <div className="mt-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] font-mono text-slate-700 space-y-1">
                    <div>
                      <span className="text-slate-400">Email:</span> {userToDelete.email}
                    </div>
                    <div>
                      <span className="text-slate-400">Department:</span> {userToDelete.department}
                    </div>
                    {userToDelete.role === 'student' && (
                      <div>
                        <span className="text-slate-400">Roll:</span>{' '}
                        <span className="font-bold text-indigo-700">
                          {formatStudentRollNumber(userToDelete.session || userToDelete.sessionYear, userToDelete.department, userToDelete.rollNumber)}
                        </span> ·{' '}
                        <span className="text-slate-400">Session:</span> {userToDelete.session || 2026} ·{' '}
                        <span className="text-slate-400">Semester:</span> {userToDelete.semester || 1}
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-rose-600 font-medium mt-2.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>This will permanently delete this account and any associated registrations.</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={() => setUserToDelete(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={handleConfirmDeleteUser}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingUser ? (
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
        </div>
      )}

      {/* Modal: Admin Add / Edit Student or Teacher */}
      {userModalState.isOpen && (
        <AdminUserModal
          userToEdit={userModalState.userToEdit}
          roleToCreate={userModalState.roleToCreate}
          onClose={() =>
            setUserModalState({
              isOpen: false,
              userToEdit: null,
              roleToCreate: null,
            })
          }
        />
      )}

      {/* Confirmation Modal: Delete Department */}
      {departmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in">
            <div className="p-5">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0 text-rose-600">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-900">
                    Permanently Delete Department "{departmentToDelete.name}"?
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    You are about to remove this academic department entity (Abbreviation: <strong className="font-mono text-indigo-700">{departmentToDelete.code}</strong>).
                  </p>
                  <div className="mt-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] font-mono text-slate-700 space-y-1">
                    <div>
                      <span className="text-slate-400">Assigned Faculty:</span> {teachers.filter((t) => t.department === departmentToDelete.name).length}
                    </div>
                    <div>
                      <span className="text-slate-400">Enrolled Students:</span> {students.filter((s) => s.department === departmentToDelete.name).length}
                    </div>
                    <div>
                      <span className="text-slate-400">Offered Courses:</span> {courses.filter((c) => c.department === departmentToDelete.name).length}
                    </div>
                  </div>
                  <p className="text-[11px] text-rose-600 font-medium mt-2.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Please ensure any faculty members, students, and courses in this department are reassigned.</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeletingDepartment}
                onClick={() => setDepartmentToDelete(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingDepartment}
                onClick={handleConfirmDeleteDepartment}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingDepartment ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete Department</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Admin Add / Edit Department */}
      {departmentModalState.isOpen && (
        <AdminDepartmentModal
          departmentToEdit={departmentModalState.departmentToEdit}
          isOpen={departmentModalState.isOpen}
          onClose={() =>
            setDepartmentModalState({
              isOpen: false,
              departmentToEdit: null,
            })
          }
        />
      )}
    </div>
  );
};
