import React, { useState } from 'react';
import { useLms } from '../../context/LmsContext';
import {
  Bell,
  Mail,
  GraduationCap,
  Calendar,
  LogOut,
  User as UserIcon,
  ChevronDown,
  BarChart3,
  BookOpen,
  Users,
  Award,
  UserCheck,
  FileSpreadsheet,
  CheckCircle2,
  Building2,
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenNotifications: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenNotifications,
}) => {
  const {
    currentUser,
    logout,
    currentSemester,
    notifications,
    setSelectedEmailModal,
    setIsProfileModalOpen,
  } = useLms();

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  if (!currentUser) return null;

  const unreadCount = notifications.filter(
    (n) =>
      !n.read &&
      (n.recipientId === currentUser.id ||
        n.recipientId === 'all-students' ||
        currentUser.role === 'admin')
  ).length;

  const recentEmail = notifications.find(
    (n) =>
      n.emailDispatched &&
      (n.recipientId === currentUser.id ||
        n.recipientId === 'all-students' ||
        currentUser.role === 'admin')
  );

  // Nav links based on current role with icons and responsive labels
  const getNavLinks = () => {
    if (currentUser.role === 'admin') {
      return [
        { id: 'analytics', label: 'Analytics', fullLabel: 'System Analytics', icon: BarChart3 },
        { id: 'courses', label: 'Courses', fullLabel: 'Courses & Semesters', icon: BookOpen },
        { id: 'faculty', label: 'Faculty', fullLabel: 'Faculty Directory', icon: Users },
        { id: 'students', label: 'Students', fullLabel: 'Student Directory', icon: GraduationCap },
        { id: 'departments', label: 'Departments', fullLabel: 'Academic Departments', icon: Building2 },
      ];
    } else if (currentUser.role === 'teacher') {
      return [
        { id: 'grading', label: 'Gradebook', fullLabel: 'Gradebook & Exams', icon: Award },
        { id: 'attendance', label: 'Attendance', fullLabel: 'Attendance & Reminders', icon: Calendar },
        { id: 'courses', label: 'Courses', fullLabel: 'Assigned Courses', icon: BookOpen },
        { id: 'roster', label: 'Rosters', fullLabel: 'Student Rosters', icon: UserCheck },
      ];
    } else {
      return [
        { id: 'registration', label: 'Registration', fullLabel: 'Course Registration', icon: BookOpen },
        { id: 'my-courses', label: 'My Courses', fullLabel: 'My Courses', icon: FileSpreadsheet },
        { id: 'attendance', label: 'Attendance', fullLabel: 'Attendance Audit', icon: Calendar },
        { id: 'grades', label: 'Grades', fullLabel: 'Marks & Reports', icon: Award },
      ];
    }
  };

  const navLinks = getNavLinks();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs transition-colors w-full overflow-x-clip">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          {/* Zone 1: Brand Wordmark (Single horizontal row, zero vertical wrapping, hover lift) */}
          <button
            onClick={() => setActiveTab(navLinks[0].id)}
            className="flex items-center gap-2 shrink-0 group py-1 text-left cursor-pointer focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs border border-slate-800 group-hover:scale-105 group-hover:bg-indigo-950 transition-all duration-200">
              <GraduationCap className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
            </div>
            <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors whitespace-nowrap">
              UniCore <span className="text-indigo-600 font-extrabold">LMS</span>
            </span>
          </button>

          {/* Zone 2: Navigation Links (Responsive, never overflows, smooth hover & active animations) */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-1.5 flex-1 justify-center max-w-2xl px-1 overflow-x-auto scrollbar-none">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => setActiveTab(link.id)}
                  title={link.fullLabel}
                  className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 whitespace-nowrap cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs scale-[1.02]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:scale-[1.02] active:scale-95'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 transition-transform duration-150 ${isActive ? 'text-indigo-300' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  <span className="hidden xl:inline">{link.fullLabel}</span>
                  <span className="xl:hidden">{link.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Actions & Account (Clean, ZERO role badge on navbar, perfectly responsive) */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Active Semester Badge (Only on wide screens to prevent overflow) */}
            <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 whitespace-nowrap hover:bg-slate-100/80 transition-colors">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-semibold">{currentSemester.name}</span>
              <span className="text-slate-300">·</span>
              <span
                className={`font-semibold ${
                  currentSemester.isRegistrationOpen
                    ? 'text-emerald-700'
                    : 'text-rose-600'
                }`}
              >
                {currentSemester.isRegistrationOpen ? 'Open' : 'Closed'}
              </span>
            </div>

            {/* Email Logs Trigger (Compact & animated) */}
            {recentEmail && (
              <button
                onClick={() => setSelectedEmailModal(recentEmail)}
                title="View Latest University Automated Email Notice"
                className="flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-all duration-150 shadow-2xs hover:scale-105 active:scale-95 cursor-pointer group"
              >
                <Mail className="w-3.5 h-3.5 text-indigo-600 group-hover:rotate-12 transition-transform duration-200" />
                <span className="hidden lg:inline whitespace-nowrap">Email Logs</span>
              </button>
            )}

            {/* Notification Center Trigger */}
            <button
              onClick={onOpenNotifications}
              title="Notifications & Alerts"
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-150 border border-transparent hover:border-slate-200 hover:scale-105 active:scale-95 cursor-pointer group"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200 text-slate-600 group-hover:text-indigo-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full ring-2 ring-white animate-pulse" />
              )}
            </button>

            {/* User Account Dropdown (NO ROLE BADGE on navbar per user request) */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-1.5 sm:gap-2 p-1 sm:px-2 sm:py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-indigo-300 transition-all duration-150 text-left hover:scale-[1.02] active:scale-[0.98] cursor-pointer group shadow-2xs"
              >
                <div className="relative shrink-0">
                  <img
                    src={
                      currentUser.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        currentUser.name
                      )}&background=0F172A&color=fff`
                    }
                    alt={currentUser.name}
                    className="w-7 h-7 rounded-full object-cover border border-slate-200 group-hover:border-indigo-500 transition-colors"
                  />
                  <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full ring-1 ring-white" />
                </div>
                <span className="hidden lg:inline text-xs font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors max-w-[100px] truncate">
                  {currentUser.name.split(' ')[0]}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-transform duration-200 shrink-0 ${
                    userDropdownOpen ? 'rotate-180 text-indigo-600' : ''
                  }`}
                />
              </button>

              {userDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-scale-in origin-top-right">
                    <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
                      <div className="text-xs font-bold text-slate-900">{currentUser.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono truncate">{currentUser.email}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {currentUser.department}
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          setIsProfileModalOpen(true);
                        }}
                        className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 transition-colors cursor-pointer group"
                      >
                        <UserIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                        <span>Profile & Password Settings</span>
                      </button>
                    </div>

                    <div className="border-t border-slate-100 pt-1">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                        }}
                        className="w-full px-4 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer group"
                      >
                        <LogOut className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                        <span>Sign Out of Portal</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Row (Smooth scrollable, zero overflow) */}
        <div className="md:hidden flex items-center gap-1 py-2 border-t border-slate-100 overflow-x-auto scrollbar-none">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => setActiveTab(link.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-all duration-150 shrink-0 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs scale-[1.02]'
                    : 'text-slate-600 hover:bg-slate-100 active:scale-95'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-300' : 'text-slate-400'}`} />
                <span>{link.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
