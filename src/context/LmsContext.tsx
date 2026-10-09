import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Role,
  User,
  AdminUser,
  TeacherUser,
  StudentUser,
  Semester,
  Course,
  Enrollment,
  CourseGradeRecord,
  LectureSession,
  AutomatedNotification,
  StudentMarks,
  SystemAnalytics,
  AttendanceStatus,
  Department,
  SemesterProgressionAuditLog,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_SEMESTERS,
  INITIAL_COURSES,
  INITIAL_ENROLLMENTS,
  INITIAL_GRADES,
  INITIAL_LECTURES,
  INITIAL_NOTIFICATIONS,
  INITIAL_DEPARTMENTS,
  INITIAL_AUDIT_LOGS,
} from '../data/mockData';
import {
  formatStudentEmail,
  getDepartmentCode,
  getUserDepartments,
  getUserPrimaryDepartment,
} from '../utils/studentEmail';
import { hashPassword, verifyPassword } from '../utils/passwordHash';

interface LmsContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  users: User[];
  courses: Course[];
  semesters: Semester[];
  currentSemester: Semester;
  enrollments: Enrollment[];
  grades: CourseGradeRecord[];
  lectures: LectureSession[];
  notifications: AutomatedNotification[];
  selectedEmailModal: AutomatedNotification | null;
  setSelectedEmailModal: (notif: AutomatedNotification | null) => void;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;

  // Profile, Domain, and Password updates
  updateUserProfile: (userId: string, data: Partial<User>) => Promise<{ success: boolean; error?: string; domainChanged?: boolean; cascadedCount?: number }>;
  updateUniversityDomain: (newDomain: string) => Promise<{ success: boolean; error?: string; count?: number }>;
  changePassword: (userId: string, currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;

  // Admin User Management
  adminAddUser: (userData: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  adminUpdateUser: (userId: string, userData: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  adminDeleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  adminResetPassword: (userId: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;

  // Student Semester Progression & Audit (Admin)
  auditLogs: SemesterProgressionAuditLog[];
  overrideStudentSemester: (
    studentId: string,
    newSemester: number,
    reason: string,
    newSession?: number,
    newRollNumber?: string,
    newEmail?: string
  ) => Promise<{ success: boolean; error?: string; auditLog?: SemesterProgressionAuditLog }>;
  publishSemesterResultsAndPromote: (
    semesterId: string,
    minGpa?: number
  ) => Promise<{ success: boolean; error?: string; summary?: any }>;

  // Department Management (Admin)
  departments: Department[];
  addDepartment: (dept: Omit<Department, 'id'>) => Promise<{ success: boolean; department?: Department; error?: string }>;
  updateDepartment: (id: string, updates: Partial<Department>) => Promise<{ success: boolean; department?: Department; error?: string }>;
  deleteDepartment: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Course & Semester Management (Admin)
  addCourse: (courseData: Omit<Course, 'id' | 'enrolledCount'>) => void;
  updateCourse: (courseId: string, updates: Partial<Course>) => void;
  deleteCourse: (courseId: string) => void;
  toggleSemesterRegistration: (semesterId: string) => void;
  addSemester: (semData: Omit<Semester, 'id'>) => Promise<{ success: boolean; error?: string; semester?: Semester }>;
  updateSemester: (semesterId: string, updates: Partial<Semester>) => Promise<{ success: boolean; error?: string; semester?: Semester }>;
  deleteSemester: (semesterId: string) => Promise<{ success: boolean; error?: string }>;

  // Registration (Student / Admin)
  registerCourse: (studentId: string, courseId: string) => { success: boolean; message: string };
  dropCourse: (studentId: string, courseId: string) => { success: boolean; message: string };

  // Grading (Teacher)
  updateStudentGrade: (
    courseId: string,
    studentId: string,
    marks: Partial<StudentMarks>,
    notifyStudent?: boolean
  ) => void;

  // Attendance & Lecture Reminders (Teacher)
  markLectureAttendance: (
    courseId: string,
    lectureNumber: number,
    topic: string,
    date: string,
    attendance: { studentId: string; status: AttendanceStatus }[]
  ) => void;
  sendLectureReminderNotification: (
    courseId: string,
    topic: string,
    date: string,
    time: string,
    customNote?: string
  ) => void;

  // Notifications
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (notificationId: string) => void;

  // Helper getters
  getSystemAnalytics: (department?: string, semesterId?: string) => SystemAnalytics;
  getStudentCourses: (studentId: string) => Course[];
  getTeacherCourses: (teacherId: string) => Course[];
  getCourseStudents: (courseId: string) => User[];
  getCourseGradesMap: (courseId: string) => Record<string, StudentMarks>;
  getStudentCourseGrade: (courseId: string, studentId: string) => StudentMarks | null;
  getStudentCourseAttendance: (
    courseId: string,
    studentId: string
  ) => {
    totalLectures: number;
    attended: number;
    absent: number;
    late: number;
    percentage: number;
    isEligible: boolean;
    logs: { date: string; topic: string; lectureNumber: number; status: AttendanceStatus }[];
  };
  getStudentOverallStats: (studentId: string) => {
    enrolledCoursesCount: number;
    totalCredits: number;
    overallAttendancePercentage: number;
    calculatedSemesterGpa: number;
  };
}

const LmsContext = createContext<LmsContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'unicore_lms_v2_';

export function calculateGradeDetails(
  a1: number = 0,
  a2: number = 0,
  a3OrAtt: number = 0,
  mids: number = 0,
  finals: number = 0,
  attendanceScore: number = 10
): { total: number; letterGrade: string; gradePoints: number; attendanceMarks: number } {
  // Support either 5-param legacy (a1, a2, a3, mids, finals) or 6-param / structured:
  // User rubric:
  // Final exam: total 40 marks
  // Mid exam: total 30 marks
  // Both assignments: 20 marks (10 marks each)
  // Attendance: 10 marks
  // Total = 100 marks
  const assign1 = Math.min(10, Math.max(0, Number(a1) || 0));
  const assign2 = Math.min(10, Math.max(0, Number(a2) || 0));
  const midExam = Math.min(30, Math.max(0, Number(mids) || 0));
  const finalMarks = Math.min(40, Math.max(0, Number(finals) || 0));
  
  // Attendance marks: max 10
  const attMarks = Math.min(10, Math.max(0, Number(attendanceScore !== undefined ? attendanceScore : (a3OrAtt || 10))));

  const total = Math.min(100, Math.max(0, Number((assign1 + assign2 + midExam + finalMarks + attMarks).toFixed(1))));

  let letterGrade = 'F';
  let gradePoints = 0.0;

  if (total >= 93) {
    letterGrade = 'A+';
    gradePoints = 4.0;
  } else if (total >= 86) {
    letterGrade = 'A';
    gradePoints = 4.0;
  } else if (total >= 82) {
    letterGrade = 'A-';
    gradePoints = 3.7;
  } else if (total >= 78) {
    letterGrade = 'B+';
    gradePoints = 3.3;
  } else if (total >= 73) {
    letterGrade = 'B';
    gradePoints = 3.0;
  } else if (total >= 68) {
    letterGrade = 'B-';
    gradePoints = 2.7;
  } else if (total >= 63) {
    letterGrade = 'C+';
    gradePoints = 2.3;
  } else if (total >= 58) {
    letterGrade = 'C';
    gradePoints = 2.0;
  } else if (total >= 50) {
    letterGrade = 'D';
    gradePoints = 1.0;
  } else {
    letterGrade = 'F';
    gradePoints = 0.0;
  }

  return { total, letterGrade, gradePoints, attendanceMarks: attMarks };
}

export const sanitizeUser = (u: any): User => {
  if (!u) return u;
  const role: Role = u.role || 'student';
  const email = typeof u.email === 'string' ? u.email.replace(/@nicore\.edu\.pk$/i, '@uet.edu.pk') : '';
  const avatar = u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'User')}&background=0F172A&color=fff`;

  if (role === 'admin') {
    const admin: AdminUser = {
      id: u.id,
      name: u.name || '',
      email,
      password: u.password,
      role: 'admin',
      avatar,
      designation: u.designation,
      dob: u.dob,
      phone: u.phone,
      address: u.address,
      bio: u.bio,
    };
    return admin;
  }

  if (role === 'teacher') {
    const depts = Array.isArray(u.departments) && u.departments.length > 0
      ? u.departments
      : (u.department ? [u.department] : ['Computer Science']);
    const teacher: TeacherUser = {
      id: u.id,
      name: u.name || '',
      email,
      password: u.password,
      role: 'teacher',
      departments: depts,
      designation: u.designation || 'Assistant Professor',
      avatar,
      dob: u.dob,
      phone: u.phone,
      address: u.address,
      bio: u.bio,
    };
    return teacher;
  }

  // Student
  const singleDept = typeof u.department === 'string' && u.department.trim()
    ? u.department.trim()
    : (Array.isArray(u.departments) && u.departments.length > 0 ? u.departments[0] : 'Computer Science');
  const student: StudentUser = {
    id: u.id,
    name: u.name || '',
    email,
    password: u.password,
    role: 'student',
    avatar,
    department: singleDept,
    rollNumber: u.rollNumber || '1',
    session: Number(u.session) || 2026,
    sessionYear: Number(u.sessionYear || u.session) || 2026,
    semester: Number(u.semester) || 1,
    admissionType: u.admissionType || 'fresh',
    academicStatus: u.academicStatus || 'active',
    cgpa: typeof u.cgpa === 'number' ? u.cgpa : 0,
    creditsEarned: typeof u.creditsEarned === 'number' ? u.creditsEarned : 0,
    backlogCourses: Array.isArray(u.backlogCourses) ? u.backlogCourses : [],
    dob: u.dob,
    phone: u.phone,
    address: u.address,
    bio: u.bio,
  };
  return student;
};

export const LmsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'users');
    let raw = saved ? JSON.parse(saved) : INITIAL_USERS;

    // If local cache contains outdated legacy email domain or missing students, purge obsolete cache
    const hasLegacyDomain = Array.isArray(raw) && raw.some((u: any) => u.email && u.email.includes('@nicore.edu.pk'));
    const hasOutdatedRoll = Array.isArray(raw) && raw.some((u: any) => u.name === 'Alex Johnson' && u.rollNumber === '29');
    if (hasLegacyDomain || hasOutdatedRoll) {
      raw = INITIAL_USERS;
    }

    return raw.map((u: any) => sanitizeUser(u));
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'auth_user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        return sanitizeUser(u);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [semesters, setSemesters] = useState<Semester[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'semesters');
    return saved ? JSON.parse(saved) : INITIAL_SEMESTERS;
  });

  const [courses, setCourses] = useState<Course[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'courses');
    return saved ? JSON.parse(saved) : INITIAL_COURSES;
  });

  const [enrollments, setEnrollments] = useState<Enrollment[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'enrollments');
    return saved ? JSON.parse(saved) : INITIAL_ENROLLMENTS;
  });

  const [grades, setGrades] = useState<CourseGradeRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'grades');
    return saved ? JSON.parse(saved) : INITIAL_GRADES;
  });

  const [lectures, setLectures] = useState<LectureSession[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'lectures');
    return saved ? JSON.parse(saved) : INITIAL_LECTURES;
  });

  const [notifications, setNotifications] = useState<AutomatedNotification[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'notifications');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [departments, setDepartments] = useState<Department[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'departments');
    return saved ? JSON.parse(saved) : INITIAL_DEPARTMENTS;
  });

  const [auditLogs, setAuditLogs] = useState<SemesterProgressionAuditLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  const [selectedEmailModal, setSelectedEmailModal] = useState<AutomatedNotification | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Sync with MongoDB backend on initial load
  useEffect(() => {
    fetch('/api/bootstrap')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.users && data.users.length > 0) {
          const sanitizedUsers: User[] = data.users.map((u: any) => sanitizeUser(u));
          setUsers(sanitizedUsers);
          setSemesters(data.semesters);
          setCourses(data.courses);
          setEnrollments(data.enrollments);
          setGrades(data.grades);
          setLectures(data.lectures);
          setNotifications(data.notifications);
          if (data.departments && data.departments.length > 0) {
            setDepartments(data.departments);
          }
          if (data.auditLogs && data.auditLogs.length > 0) {
            setAuditLogs(data.auditLogs);
          }

          // Update current user reference if logged in
          if (currentUser) {
            const matched = sanitizedUsers.find((u: User) => u.id === currentUser.id);
            if (matched) {
              setCurrentUser(matched);
            }
          }
        }
      })
      .catch((err) => {
        console.warn('API Bootstrap notice:', err.message);
      });
  }, []);

  // Save to local storage for quick responsive cache
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'departments', JSON.stringify(departments));
  }, [departments]);

  // Save to local storage for quick responsive cache
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEY_PREFIX + 'auth_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEY_PREFIX + 'auth_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'semesters', JSON.stringify(semesters));
  }, [semesters]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'courses', JSON.stringify(courses));
  }, [courses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'enrollments', JSON.stringify(enrollments));
  }, [enrollments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'grades', JSON.stringify(grades));
  }, [grades]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'lectures', JSON.stringify(lectures));
  }, [lectures]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Current active semester
  const currentSemester = useMemo(() => {
    return semesters.find((s) => s.isCurrent) || semesters[0];
  }, [semesters]);

  // Auth: Login
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPass }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          localStorage.setItem(STORAGE_KEY_PREFIX + 'jwt_token', data.token);
        }
        setCurrentUser(data.user);
        return { success: true };
      }

      // If backend responded with an error (e.g. 401 incorrect password or user not found)
      const errData = await res.json().catch(() => null);
      if (errData && errData.error) {
        return { success: false, error: errData.error };
      }
    } catch {
      // Fallback to local users validation in case backend is unreachable
    }

    // Local authentication fallback
    const matchedUser = users.find(
      (u) =>
        u.email.toLowerCase() === cleanEmail ||
        (u.rollNumber && String(u.rollNumber).toLowerCase() === cleanEmail) ||
        u.email.toLowerCase().startsWith(`${cleanEmail}@`)
    );

    if (!matchedUser) {
      return { success: false, error: 'No user account found with this email address or roll number.' };
    }

    const userPass = String(matchedUser.password || '').trim();
    if (userPass && !verifyPassword(cleanPass, userPass)) {
      return { success: false, error: 'Incorrect password entered.' };
    }

    const { password: _, ...sanitized } = matchedUser;
    // Generate fallback offline JWT representation
    try {
      const fallbackToken = btoa(JSON.stringify({ id: sanitized.id, email: sanitized.email, role: sanitized.role, iat: Date.now() }));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'jwt_token', fallbackToken);
    } catch {
      // ignore
    }
    setCurrentUser(sanitized);
    return { success: true };
  };

  // Auth: Logout
  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'auth_user');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'jwt_token');
  };

  // Profile Update (Name, DOB, Phone, Address, Bio, Avatar, Email)
  const updateUserProfile = async (
    userId: string,
    data: Partial<User>
  ): Promise<{ success: boolean; error?: string; domainChanged?: boolean; cascadedCount?: number }> => {
    const targetUser = users.find((u) => u.id === userId);
    const isAdmin = targetUser?.role === 'admin' || (currentUser?.role === 'admin' && currentUser?.id === userId);

    let domainChanged = false;
    let oldDomain = '';
    let newDomain = '';

    if (data.email && typeof data.email === 'string' && data.email.includes('@')) {
      newDomain = data.email.split('@')[1].trim().toLowerCase();
      oldDomain = (targetUser?.email || currentUser?.email || '').split('@')[1]?.trim().toLowerCase() || '';
      if (isAdmin && newDomain && oldDomain && newDomain !== oldDomain) {
        domainChanged = true;
      }
    }

    try {
      await fetch(`/api/users/${userId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch {
      // Continue locally
    }

    let cascadedCount = 0;

    if (domainChanged) {
      // Automatic Domain Cascade:
      // Update the admin user and all student accounts (and any other users sharing the previous domain)
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === userId) {
            return sanitizeUser({ ...u, ...data, email: data.email!.trim().toLowerCase() });
          }
          if (u.role === 'student') {
            cascadedCount++;
            const updatedStudentEmail = formatStudentEmail(
              u.session || u.sessionYear,
              u.department,
              u.rollNumber,
              newDomain
            );
            return sanitizeUser({ ...u, email: updatedStudentEmail });
          }
          if (oldDomain && u.email && u.email.endsWith(`@${oldDomain}`)) {
            cascadedCount++;
            const localPart = u.email.split('@')[0];
            return sanitizeUser({ ...u, email: `${localPart}@${newDomain}` });
          }
          return u;
        })
      );

      // Cascade domain update to notifications
      if (oldDomain) {
        setNotifications((prev) =>
          prev.map((n) => {
            if (n.recipientEmail && n.recipientEmail.endsWith(`@${oldDomain}`)) {
              const localPart = n.recipientEmail.split('@')[0];
              return { ...n, recipientEmail: `${localPart}@${newDomain}` };
            }
            return n;
          })
        );
      }
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? sanitizeUser({ ...u, ...data }) : u))
      );
    }

    if (currentUser && currentUser.id === userId) {
      setCurrentUser((prev) => (prev ? sanitizeUser({ ...prev, ...data }) : null));
    }

    return { success: true, domainChanged, cascadedCount };
  };

  // Dedicated: Update University Email Domain Master (cascades to all users: students and admin)
  const updateUniversityDomain = async (
    newDomain: string
  ): Promise<{ success: boolean; error?: string; count?: number }> => {
    const cleanDomain = newDomain.replace(/^@/, '').trim().toLowerCase();
    if (!cleanDomain || !cleanDomain.includes('.')) {
      return { success: false, error: 'Please enter a valid domain format (e.g. uet.edu.pk or campus.edu)' };
    }

    try {
      await fetch('/api/admin/update-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newDomain: cleanDomain }),
      });
    } catch {
      // Continue locally
    }

    let updatedCount = 0;
    setUsers((prev) =>
      prev.map((u) => {
        if (u.role === 'admin') {
          updatedCount++;
          const localPart = u.email.split('@')[0] || 'registrar';
          return { ...u, email: `${localPart}@${cleanDomain}` };
        }
        if (u.role === 'student') {
          updatedCount++;
          const updatedStudentEmail = formatStudentEmail(
            u.session || u.sessionYear,
            u.department,
            u.rollNumber,
            cleanDomain
          );
          return { ...u, email: updatedStudentEmail };
        }
        if (u.role === 'teacher') {
          updatedCount++;
          const localPart = u.email.split('@')[0];
          return { ...u, email: `${localPart}@${cleanDomain}` };
        }
        return u;
      })
    );

    if (currentUser) {
      const localPart = currentUser.email.split('@')[0];
      setCurrentUser((prev) => (prev ? { ...prev, email: `${localPart}@${cleanDomain}` } : null));
    }

    setNotifications((prev) =>
      prev.map((n) => {
        if (n.recipientEmail && n.recipientEmail.includes('@')) {
          const localPart = n.recipientEmail.split('@')[0];
          return { ...n, recipientEmail: `${localPart}@${cleanDomain}` };
        }
        return n;
      })
    );

    return { success: true, count: updatedCount };
  };

  // Password Change
  const changePassword = async (
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    const user = users.find((u) => u.id === userId);
    if (!user) return { success: false, error: 'User not found.' };

    if (user.password && !verifyPassword(currentPassword, user.password)) {
      return { success: false, error: 'Current password does not match.' };
    }

    try {
      const token = localStorage.getItem('lms_jwt_token') || sessionStorage.getItem('lms_jwt_token');
      await fetch(`/api/users/${userId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
    } catch {
      // Continue locally
    }

    const hashedPassword = hashPassword(newPassword);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, password: hashedPassword } : u))
    );

    return { success: true };
  };

  // Admin: Add Student or Teacher
  const adminAddUser = async (userData: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    const rawPassword = userData.password || 'password123';
    const hashedPassword = hashPassword(rawPassword);
    const role: Role = (userData.role as Role) || 'student';

    let newUser: User;
    if (role === 'student') {
      const admissionType = userData.admissionType === 'transfer' ? 'transfer' : 'fresh';
      const assignedSemester = admissionType === 'fresh' ? 1 : (Number(userData.semester) || 1);
      const studentDept = typeof userData.department === 'string' && userData.department.trim()
        ? userData.department.trim()
        : (Array.isArray((userData as any).departments) && (userData as any).departments.length > 0
            ? (userData as any).departments[0]
            : 'Computer Science');
      newUser = {
        id: `usr-student-${Date.now()}`,
        name: userData.name || '',
        email: userData.email || '',
        password: hashedPassword,
        role: 'student',
        department: studentDept,
        rollNumber: userData.rollNumber || '1',
        session: Number(userData.session) || 2026,
        sessionYear: Number(userData.session) || 2026,
        semester: assignedSemester,
        admissionType,
        academicStatus: 'active',
        cgpa: 0, // NEW STUDENT CGPA IS 0 (OR NOT SET)!
        creditsEarned: 0,
        backlogCourses: [],
        dob: userData.dob || '2002-01-01',
        phone: userData.phone || '',
        address: userData.address || '',
        bio: userData.bio || '',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'Student')}&background=0F172A&color=fff`,
      };
    } else if (role === 'teacher') {
      const assignedDepts: string[] = Array.isArray((userData as any).departments) && (userData as any).departments.length > 0
        ? (userData as any).departments
        : (userData.department ? [userData.department] : ['Computer Science']);
      newUser = {
        id: `usr-teacher-${Date.now()}`,
        name: userData.name || '',
        email: userData.email || '',
        password: hashedPassword,
        role: 'teacher',
        departments: assignedDepts,
        designation: (userData as any).designation || 'Assistant Professor',
        dob: userData.dob || '1985-01-01',
        phone: userData.phone || '',
        address: userData.address || '',
        bio: userData.bio || '',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'Teacher')}&background=0F172A&color=fff`,
      };
    } else {
      newUser = {
        id: `usr-admin-${Date.now()}`,
        name: userData.name || '',
        email: userData.email || '',
        password: hashedPassword,
        role: 'admin',
        designation: (userData as any).designation || 'Administrator',
        dob: userData.dob || '1980-01-01',
        phone: userData.phone || '',
        address: userData.address || '',
        bio: userData.bio || '',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'Admin')}&background=0F172A&color=fff`,
      };
    }

    try {
      await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
    } catch {
      // Continue locally
    }

    setUsers((prev) => [newUser, ...prev]);
    return { success: true };
  };

  // Admin: Update Student or Teacher
  const adminUpdateUser = async (userId: string, userData: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    const userUpdates = { ...userData };
    if (userUpdates.password) {
      userUpdates.password = hashPassword(userUpdates.password);
    }

    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
    } catch {
      // Continue locally
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? sanitizeUser({ ...u, ...userUpdates }) : u))
    );

    if (currentUser && currentUser.id === userId) {
      setCurrentUser((prev) => (prev ? sanitizeUser({ ...prev, ...userUpdates }) : null));
    }

    return { success: true };
  };

  // Super Admin: Manual Semester Override with Mandatory Audit Trail
  const overrideStudentSemester = async (
    studentId: string,
    newSemester: number,
    reason: string,
    newSession?: number,
    newRollNumber?: string,
    newEmail?: string
  ): Promise<{ success: boolean; error?: string; auditLog?: SemesterProgressionAuditLog }> => {
    if (!reason || !reason.trim()) {
      return {
        success: false,
        error: 'Mandatory audit reason is required for manual semester override. Request rejected.',
      };
    }

    const adminId = currentUser?.id || 'usr-admin-1';
    const adminName = currentUser?.name || 'Super Admin';

    try {
      const response = await fetch(`/api/admin/students/${studentId}/override-semester`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newSemester,
          reason: reason.trim(),
          adminId,
          adminName,
          newSession,
          newRollNumber,
          newEmail,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to override student semester.' };
      }

      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === studentId && u.role === 'student') {
            return sanitizeUser({
              ...u,
              semester: newSemester,
              academicStatus: (u.academicStatus === 'detained' || u.academicStatus === 'repeat') ? 'active' : (u.academicStatus || 'active'),
              ...(newSession ? { session: Number(newSession), sessionYear: Number(newSession) } : {}),
              ...(newRollNumber ? { rollNumber: newRollNumber } : {}),
              ...(newEmail ? { email: newEmail } : {}),
            });
          }
          return u;
        })
      );

      if (data.auditLog) {
        setAuditLogs((prev) => [data.auditLog, ...prev]);
      }

      return { success: true, auditLog: data.auditLog };
    } catch {
      // Offline / in-memory fallback
      const student = users.find((u) => u.id === studentId);
      if (!student || student.role !== 'student') return { success: false, error: 'Student not found.' };

      const prevSem = student.semester || 1;
      const prevStatus = student.academicStatus || 'active';
      const newStatus = (student.academicStatus === 'detained' || student.academicStatus === 'repeat') ? 'active' : (student.academicStatus || 'active');

      const newAudit: SemesterProgressionAuditLog = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        studentId: student.id,
        studentName: student.name,
        studentRollNumber: newRollNumber || student.rollNumber || '',
        adminId,
        adminName,
        previousSemester: prevSem,
        newSemester,
        previousStatus: prevStatus,
        newStatus,
        reason: reason.trim(),
        timestamp: new Date().toISOString(),
      };

      setUsers((prev) =>
        prev.map((u) =>
          u.id === studentId && u.role === 'student'
            ? sanitizeUser({
                ...u,
                semester: newSemester,
                academicStatus: newStatus,
                ...(newSession ? { session: Number(newSession), sessionYear: Number(newSession) } : {}),
                ...(newRollNumber ? { rollNumber: newRollNumber } : {}),
                ...(newEmail ? { email: newEmail } : {}),
              })
            : u
        )
      );

      setAuditLogs((prev) => [newAudit, ...prev]);

      return { success: true, auditLog: newAudit };
    }
  };

  // Automated Semester Promotion Engine (Batch Processing)
  const publishSemesterResultsAndPromote = async (
    semesterId: string,
    minGpa: number = 2.0
  ): Promise<{ success: boolean; error?: string; summary?: any }> => {
    const adminId = currentUser?.id || 'usr-admin-1';
    const adminName = currentUser?.name || 'Academic Controller';

    try {
      const response = await fetch(`/api/admin/semesters/${semesterId}/publish-results-and-promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minGpa,
          adminId,
          adminName,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to run semester promotion engine.' };
      }

      // Update semester status in state
      setSemesters((prev) =>
        prev.map((s) =>
          s.id === semesterId
            ? { ...s, isFinalResultsPublished: true, finalResultsPublishedAt: new Date().toISOString() }
            : s
        )
      );

      // Refresh users from evaluated batch results
      if (data.summary && Array.isArray(data.summary.results)) {
        setUsers((prev) =>
          prev.map((u) => {
            const res = data.summary.results.find((r: any) => r.studentId === u.id);
            if (res) {
              return {
                ...u,
                semester: res.nextSemester,
                academicStatus: res.academicStatus || (res.decision === 'graduated' ? 'graduated' : res.decision === 'promoted_probation' ? 'probation' : 'active'),
                cgpa: res.gpa,
                creditsEarned: (u.creditsEarned || 0) + (res.creditsPassed || 0),
                backlogCourses: res.backlogs || [],
              };
            }
            return u;
          })
        );

        // Also update currentUser if currently logged in student was evaluated
        if (currentUser && currentUser.role === 'student') {
          const res = data.summary.results.find((r: any) => r.studentId === currentUser.id);
          if (res) {
            setCurrentUser((prev: any) => ({
              ...prev,
              semester: res.nextSemester,
              academicStatus: res.academicStatus || (res.decision === 'graduated' ? 'graduated' : res.decision === 'promoted_probation' ? 'probation' : 'active'),
              cgpa: res.gpa,
              creditsEarned: (prev?.creditsEarned || 0) + (res.creditsPassed || 0),
              backlogCourses: res.backlogs || [],
            }));
          }
        }
      }

      return { success: true, summary: data.summary };
    } catch {
      // Local fallback evaluation (Credit-Hour Progression & Backlog Tagging Model)
      const sem = semesters.find((s) => s.id === semesterId);
      if (!sem) return { success: false, error: 'Semester not found.' };

      const semCourses = courses.filter((c) => c.semesterId === sem.id || c.semesterNumber === sem.number);
      const semCourseIds = new Set(semCourses.map((c) => c.id));

      const semStudents = users.filter((u) => u.role === 'student' && (u.semester === sem.number || enrollments.some((e) => e.studentId === u.id && semCourseIds.has(e.courseId))));

      const evaluatedResults: any[] = [];
      let promotedCount = 0;
      let probationCount = 0;
      let carryingBacklogsCount = 0;
      let graduatedCount = 0;
      let pendingGraduationCount = 0;

      const updatedUsers = users.map((u) => {
        if (!semStudents.some((s) => s.id === u.id)) return u;

        const currentSem = u.semester || sem.number;
        const studentDepts = getUserDepartments(u);

        // Curriculum courses for student's department in this semester
        let termCurriculum = semCourses.filter((c) =>
          studentDepts.some((d) => d.trim().toLowerCase() === (c.department || '').trim().toLowerCase()) ||
          c.department === 'All' || c.department === 'General'
        );
        if (termCurriculum.length === 0) termCurriculum = semCourses;

        const passedCourses: Array<{ courseId: string; courseCode: string; credits: number; grade: string }> = [];
        const termBacklogs: any[] = [];
        let termQualityPoints = 0;
        let termAttemptedCredits = 0;
        let termEarnedCredits = 0;

        termCurriculum.forEach((course) => {
          const cr = course.creditHours || 3;
          termAttemptedCredits += cr;

          const isEnrolled = enrollments.some(
            (e) => e.studentId === u.id && e.courseId === course.id && e.status === 'registered'
          );

          if (!isEnrolled) {
            termBacklogs.push({
              courseId: course.id,
              courseCode: course.code,
              courseTitle: course.title,
              creditHours: cr,
              semesterOffered: sem.number,
              reason: 'missed' as const,
              status: 'pending' as const,
              detectedAt: new Date().toISOString().slice(0, 10),
            });
          } else {
            const gradeRec = grades.find((g) => g.courseId === course.id && g.studentId === u.id);
            const m = gradeRec?.marks;

            // Standard Rubric Calculation:
            // Final: max 40, Mids: max 30, Assignments 1 & 2: max 20 (10 each), Attendance: max 10 => Total 100
            const a1 = Math.min(10, Math.max(0, Number(m?.assignment1) || 0));
            const a2 = Math.min(10, Math.max(0, Number(m?.assignment2) || 0));
            const mids = Math.min(30, Math.max(0, Number(m?.mids) || 0));
            const finals = Math.min(40, Math.max(0, Number(m?.finalExam) || 0));
            const att = Math.min(10, Math.max(0, Number(m?.attendanceMarks !== undefined ? m.attendanceMarks : 10)));
            const totalMarks = Math.min(100, Math.max(0, Number((a1 + a2 + mids + finals + att).toFixed(1))));

            let letterGrade = 'F';
            let gradePoints = 0.0;
            if (totalMarks >= 90) { letterGrade = 'A+'; gradePoints = 4.0; }
            else if (totalMarks >= 85) { letterGrade = 'A'; gradePoints = 4.0; }
            else if (totalMarks >= 80) { letterGrade = 'A-'; gradePoints = 3.7; }
            else if (totalMarks >= 75) { letterGrade = 'B+'; gradePoints = 3.3; }
            else if (totalMarks >= 70) { letterGrade = 'B'; gradePoints = 3.0; }
            else if (totalMarks >= 65) { letterGrade = 'B-'; gradePoints = 2.7; }
            else if (totalMarks >= 60) { letterGrade = 'C+'; gradePoints = 2.3; }
            else if (totalMarks >= 55) { letterGrade = 'C'; gradePoints = 2.0; }
            else if (totalMarks >= 50) { letterGrade = 'D'; gradePoints = 1.0; }
            else { letterGrade = 'F'; gradePoints = 0.0; }

            const isFailed = totalMarks < 50 || letterGrade === 'F';

            if (isFailed) {
              termBacklogs.push({
                courseId: course.id,
                courseCode: course.code,
                courseTitle: course.title,
                creditHours: cr,
                semesterOffered: sem.number,
                reason: 'failed' as const,
                grade: letterGrade,
                status: 'pending' as const,
                detectedAt: new Date().toISOString().slice(0, 10),
              });
            } else {
              termEarnedCredits += cr;
              termQualityPoints += gradePoints * cr;
              passedCourses.push({
                courseId: course.id,
                courseCode: course.code,
                credits: cr,
                grade: letterGrade,
              });
            }
          }
        });

        // Retain uncleared prior backlogs
        const priorBacklogs: any[] = Array.isArray(u.backlogCourses) ? u.backlogCourses : [];
        const updatedPriorBacklogs = priorBacklogs.filter(
          (b) => !passedCourses.some((p) => p.courseId === b.courseId || p.courseCode === b.courseCode) && b.status !== 'cleared'
        );

        const allActiveBacklogs = [...updatedPriorBacklogs];
        termBacklogs.forEach((tb) => {
          if (!allActiveBacklogs.some((b) => b.courseId === tb.courseId || b.courseCode === tb.courseCode)) {
            allActiveBacklogs.push(tb);
          }
        });

        const prevCredits = typeof u.creditsEarned === 'number' ? u.creditsEarned : (currentSem > 1 ? (currentSem - 1) * 16 : 0);
        const updatedCreditsEarned = prevCredits + termEarnedCredits;

        const hasUnclearedBacklogs = allActiveBacklogs.length > 0;

        let nextSem = currentSem;
        let decision: 'promoted' | 'promoted_probation' | 'graduated' | 'pending_graduation' | 'repeat' = 'promoted';
        let academicStatus: 'active' | 'probation' | 'graduated' | 'repeat' = 'active';
        let effectiveGpa = u.cgpa || 3.0;
        let reasonStr = '';

        if (hasUnclearedBacklogs) {
          // Unenrolled or failed courses exist:
          // In accordance with academic policy, final GPA is withheld until repeat course is cleared.
          academicStatus = 'repeat';
          decision = 'repeat';
          carryingBacklogsCount++;
          reasonStr = `Repeat Required: Student missed or failed ${allActiveBacklogs.length} course(s) (${allActiveBacklogs.map((b) => `${b.courseCode} [${b.reason === 'missed' ? 'Unenrolled' : 'Failed'}]`).join(', ')}). In accordance with university academic regulations, final semester GPA is withheld until repeat courses are cleared.`;
        } else {
          const termGpa = termAttemptedCredits > 0
            ? Number((termQualityPoints / termAttemptedCredits).toFixed(2))
            : (u.cgpa ?? 0);

          const totalEarnedCr = updatedCreditsEarned > 0 ? updatedCreditsEarned : termEarnedCredits;
          effectiveGpa = u.cgpa
            ? Number((((u.cgpa * prevCredits) + termQualityPoints) / totalEarnedCr).toFixed(2))
            : termGpa;

          if (currentSem < 8) {
            nextSem = currentSem + 1;
            if (effectiveGpa >= minGpa) {
              academicStatus = 'active';
              decision = 'promoted';
              promotedCount++;
              reasonStr = `Satisfactory academic progress (All ${termCurriculum.length} courses passed, SGPA ${termGpa}, CGPA ${effectiveGpa}). Promoted to Semester ${nextSem}.`;
            } else {
              academicStatus = 'probation';
              decision = 'promoted_probation';
              probationCount++;
              reasonStr = `Academic Probation advisory: CGPA ${effectiveGpa} < ${minGpa}. Promoted to Semester ${nextSem} under observation.`;
            }
          } else {
            nextSem = 8;
            academicStatus = 'graduated';
            decision = 'graduated';
            graduatedCount++;
            reasonStr = `Graduation requirements conferred: Completed final semester with CGPA ${effectiveGpa}, earned ${updatedCreditsEarned} credits, 0 pending backlogs.`;
          }
        }

        if (allActiveBacklogs.length > 0 && !hasUnclearedBacklogs) {
          carryingBacklogsCount++;
        }

        evaluatedResults.push({
          studentId: u.id,
          studentName: u.name,
          rollNumber: u.rollNumber,
          department: (u as StudentUser).department || studentDepts[0] || 'Computer Science',
          currentSemester: currentSem,
          nextSemester: nextSem,
          gpa: effectiveGpa,
          creditsAttempted: termAttemptedCredits,
          creditsPassed: termEarnedCredits,
          passed: decision === 'promoted' || decision === 'graduated',
          decision,
          academicStatus,
          backlogsCount: allActiveBacklogs.length,
          backlogs: allActiveBacklogs,
          passedCourses,
          reason: reasonStr,
        });

        return sanitizeUser({
          ...u,
          semester: nextSem,
          academicStatus,
          cgpa: effectiveGpa,
          creditsEarned: updatedCreditsEarned,
          backlogCourses: allActiveBacklogs,
        });
      });

      setUsers(updatedUsers);
      setSemesters((prev) =>
        prev.map((s) =>
          s.id === semesterId
            ? { ...s, isFinalResultsPublished: true, finalResultsPublishedAt: new Date().toISOString() }
            : s
        )
      );

      return {
        success: true,
        summary: {
          totalEvaluated: evaluatedResults.length,
          promotedCount,
          probationCount,
          carryingBacklogsCount,
          graduatedCount,
          pendingGraduationCount,
          detainedCount: 0,
          results: evaluatedResults,
        },
      };
    }
  };

  // Admin: Delete Student or Teacher
  const adminDeleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
    } catch {
      // Continue locally
    }

    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setEnrollments((prev) => prev.filter((e) => e.studentId !== userId));
    setGrades((prev) => prev.filter((g) => g.studentId !== userId));
    setCourses((prev) =>
      prev.map((c) =>
        c.teacherId === userId ? { ...c, teacherId: '', teacherName: 'Unassigned Faculty' } : c
      )
    );
    return { success: true };
  };

  // Admin: Reset Password for any user or self
  const adminResetPassword = async (userId: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
    } catch {
      // Continue locally
    }

    const hashedPassword = hashPassword(newPassword);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, password: hashedPassword } : u))
    );

    return { success: true };
  };

  // Admin: Add Department
  const addDepartment = async (
    deptData: Omit<Department, 'id'>
  ): Promise<{ success: boolean; department?: Department; error?: string }> => {
    try {
      const res = await fetch('/api/admin/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deptData),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to add department' };
      }
      setDepartments((prev) => [...prev, data.department]);
      return { success: true, department: data.department };
    } catch {
      // Offline / fallback creation
      const newDept: Department = {
        id: `dept-${Date.now()}`,
        name: deptData.name.trim(),
        code: deptData.code.trim().toLowerCase(),
        hodId: deptData.hodId || '',
        hodName: deptData.hodName || '',
        description: deptData.description || '',
        createdAt: new Date().toISOString(),
      };
      setDepartments((prev) => [...prev, newDept]);
      return { success: true, department: newDept };
    }
  };

  // Admin: Update Department
  const updateDepartment = async (
    id: string,
    updates: Partial<Department>
  ): Promise<{ success: boolean; department?: Department; error?: string }> => {
    try {
      const res = await fetch(`/api/admin/departments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to update department' };
      }
      setDepartments((prev) => prev.map((d) => (d.id === id ? data.department : d)));
      if (updates.name) {
        const oldDept = departments.find((d) => d.id === id);
        if (oldDept && oldDept.name !== updates.name) {
          setUsers((prev) =>
            prev.map((u) => {
              if (u.role === 'student') {
                if (u.department === oldDept.name) {
                  return { ...u, department: updates.name! } as StudentUser;
                }
                return u;
              }
              if (u.role === 'teacher') {
                const depts = (u.departments || []).map((d) =>
                  d === oldDept.name ? updates.name! : d
                );
                return { ...u, departments: depts } as TeacherUser;
              }
              return u;
            })
          );
          setCourses((prev) =>
            prev.map((c) => (c.department === oldDept.name ? { ...c, department: updates.name! } : c))
          );
        }
      }
      return { success: true, department: data.department };
    } catch {
      setDepartments((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
      return { success: true };
    }
  };

  // Admin: Delete Department
  const deleteDepartment = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/admin/departments/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to delete department' };
      }
    } catch {
      // Local fallback
    }
    setDepartments((prev) => prev.filter((d) => d.id !== id));
    return { success: true };
  };

  // Admin Add Course
  const addCourse = (courseData: Omit<Course, 'id' | 'enrolledCount'>) => {
    const newCourse: Course = {
      ...courseData,
      id: `crs-${Date.now()}`,
      enrolledCount: 0,
    };

    try {
      fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCourse),
      });
    } catch {}

    setCourses((prev) => [newCourse, ...prev]);

    const teacher = users.find((u) => u.id === courseData.teacherId);
    if (teacher) {
      const newNotif: AutomatedNotification = {
        id: `notif-${Date.now()}`,
        recipientId: teacher.id,
        recipientEmail: teacher.email,
        recipientName: teacher.name,
        senderName: 'Academic Registrar Office',
        type: 'course_registration',
        subject: `New Course Assigned: ${newCourse.code} (${newCourse.title})`,
        message: `You have been officially assigned as instructor for ${newCourse.code} (${newCourse.creditHours} Cr) for ${currentSemester.name}. Class schedule: ${newCourse.schedule}, ${newCourse.room}.`,
        courseCode: newCourse.code,
        courseTitle: newCourse.title,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        read: false,
        emailDispatched: true,
      };
      setNotifications((prev) => [newNotif, ...prev]);
    }
  };

  // Admin Update Course
  const updateCourse = (courseId: string, updates: Partial<Course>) => {
    try {
      fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch {}

    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, ...updates } : c))
    );
  };

  // Admin Delete Course
  const deleteCourse = (courseId: string) => {
    try {
      fetch(`/api/courses/${courseId}`, { method: 'DELETE' });
    } catch {}

    setCourses((prev) => prev.filter((c) => c.id !== courseId));
    setEnrollments((prev) => prev.filter((e) => e.courseId !== courseId));
  };

  // Toggle Semester Registration
  const toggleSemesterRegistration = (semesterId: string) => {
    try {
      fetch(`/api/semesters/${semesterId}/toggle-reg`, { method: 'PUT' });
    } catch {}

    setSemesters((prev) =>
      prev.map((s) =>
        s.id === semesterId ? { ...s, isRegistrationOpen: !s.isRegistrationOpen } : s
      )
    );
  };

  // Add Semester
  const addSemester = async (
    semData: Omit<Semester, 'id'>
  ): Promise<{ success: boolean; error?: string; semester?: Semester }> => {
    if (semesters.length >= 8) {
      return { success: false, error: 'Maximum limit of 8 semesters reached.' };
    }
    const num = Number(semData.number);
    if (semesters.some((s) => s.number === num)) {
      return { success: false, error: `Semester ${num} already exists in the system.` };
    }

    try {
      const res = await fetch('/api/admin/semesters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(semData),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to create semester' };
      }
      const created = data.semester;
      setSemesters((prev) => {
        const updated = semData.isCurrent ? prev.map((s) => ({ ...s, isCurrent: false })) : [...prev];
        return [created, ...updated];
      });
      return { success: true, semester: created };
    } catch {
      // Local fallback
      const newSem: Semester = {
        ...semData,
        number: num,
        id: `sem-${Date.now()}`,
      };
      setSemesters((prev) => {
        const updated = semData.isCurrent ? prev.map((s) => ({ ...s, isCurrent: false })) : [...prev];
        return [newSem, ...updated];
      });
      return { success: true, semester: newSem };
    }
  };

  // Update Semester
  const updateSemester = async (
    semesterId: string,
    updates: Partial<Semester>
  ): Promise<{ success: boolean; error?: string; semester?: Semester }> => {
    if (updates.number !== undefined) {
      const num = Number(updates.number);
      if (semesters.some((s) => s.id !== semesterId && s.number === num)) {
        return { success: false, error: `Semester ${num} is already taken by another semester.` };
      }
    }

    try {
      const res = await fetch(`/api/admin/semesters/${semesterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to update semester' };
      }
      const updated = data.semester;
      setSemesters((prev) =>
        prev.map((s) => {
          if (s.id === semesterId) return updated;
          if (updates.isCurrent) return { ...s, isCurrent: false };
          return s;
        })
      );
      return { success: true, semester: updated };
    } catch {
      setSemesters((prev) =>
        prev.map((s) => {
          if (s.id === semesterId) return { ...s, ...updates };
          if (updates.isCurrent) return { ...s, isCurrent: false };
          return s;
        })
      );
      return { success: true };
    }
  };

  // Delete Semester
  const deleteSemester = async (semesterId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/admin/semesters/${semesterId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to delete semester' };
      }
    } catch {}

    setSemesters((prev) => prev.filter((s) => s.id !== semesterId));
    setCourses((prev) => prev.map((c) => (c.semesterId === semesterId ? { ...c, semesterId: '' } : c)));
    return { success: true };
  };

  // Register Course
  const registerCourse = (studentId: string, courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    const student = users.find((u) => u.id === studentId);

    if (!course || !student) {
      return { success: false, message: 'Course or student record not found.' };
    }

    const courseSem = semesters.find(
      (s) => s.id === course.semesterId || s.number === course.semesterNumber
    ) || currentSemester;

    if (courseSem && !courseSem.isRegistrationOpen) {
      return { success: false, message: `Registration for ${courseSem.name} is currently closed.` };
    }

    const existing = enrollments.find(
      (e) => e.studentId === studentId && e.courseId === courseId && e.status === 'registered'
    );
    if (existing) {
      return { success: false, message: 'Already enrolled in this course.' };
    }

    if (course.enrolledCount >= course.maxCapacity) {
      return { success: false, message: 'Course has reached maximum capacity.' };
    }

    const currentRegisteredCourses = enrollments
      .filter((e) => e.studentId === studentId && e.status === 'registered')
      .map((e) => courses.find((c) => c.id === e.courseId))
      .filter((c): c is Course => Boolean(c));

    const totalCredits = currentRegisteredCourses.reduce((sum, c) => sum + c.creditHours, 0);

    if (totalCredits + course.creditHours > 21) {
      return {
        success: false,
        message: `Exceeds maximum limit of 21 credit hours (Current: ${totalCredits} + ${course.creditHours} = ${totalCredits + course.creditHours}).`,
      };
    }

    const newEnrollment: Enrollment = {
      id: `enr-${Date.now()}`,
      courseId,
      studentId,
      semesterId: course.semesterId,
      registeredAt: new Date().toISOString().slice(0, 10),
      status: 'registered',
    };

    setEnrollments((prev) => [...prev, newEnrollment]);

    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, enrolledCount: c.enrolledCount + 1 } : c))
    );

    const hasGrade = grades.some((g) => g.courseId === courseId && g.studentId === studentId);
    if (!hasGrade) {
      const initGrades: CourseGradeRecord = {
        courseId,
        studentId,
        marks: {
          assignment1: 0,
          assignment2: 0,
          assignment3: 0,
          mids: 0,
          finalExam: 0,
          total: 0,
          letterGrade: 'N/A',
          gradePoints: 0.0,
          feedback: 'Enrolled. Continuous assessment ongoing.',
          lastUpdated: new Date().toISOString().slice(0, 10),
        },
      };
      setGrades((prev) => [...prev, initGrades]);
    }

    const regNotification: AutomatedNotification = {
      id: `notif-${Date.now()}`,
      recipientId: student.id,
      recipientEmail: student.email,
      recipientName: student.name,
      senderName: 'Academic Registrar Office',
      type: 'course_registration',
      subject: `Registration Confirmed: ${course.code} ${course.title}`,
      message: `You have successfully enrolled in ${course.code} (${course.creditHours} Credit Hours) taught by ${course.teacherName}. Classes will be held ${course.schedule} in ${course.room}.`,
      courseCode: course.code,
      courseTitle: course.title,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      read: false,
      emailDispatched: true,
    };
    setNotifications((prev) => [regNotification, ...prev]);

    return { success: true, message: `Successfully registered for ${course.code}!` };
  };

  // Drop Course
  const dropCourse = (studentId: string, courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    const student = users.find((u) => u.id === studentId);

    setEnrollments((prev) =>
      prev.filter((e) => !(e.studentId === studentId && e.courseId === courseId))
    );

    setCourses((prev) =>
      prev.map((c) =>
        c.id === courseId ? { ...c, enrolledCount: Math.max(0, c.enrolledCount - 1) } : c
      )
    );

    if (course && student) {
      const dropNotif: AutomatedNotification = {
        id: `notif-${Date.now()}`,
        recipientId: student.id,
        recipientEmail: student.email,
        recipientName: student.name,
        senderName: 'Academic Registrar Office',
        type: 'course_registration',
        subject: `Course Dropped: ${course.code} ${course.title}`,
        message: `Your request to drop ${course.code} (${course.creditHours} Credit Hours) has been processed. Your transcript will reflect this updated load.`,
        courseCode: course.code,
        courseTitle: course.title,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        read: false,
        emailDispatched: true,
      };
      setNotifications((prev) => [dropNotif, ...prev]);
    }

    return { success: true, message: `Course ${course?.code || ''} dropped successfully.` };
  };

  // Grading Update
  const updateStudentGrade = (
    courseId: string,
    studentId: string,
    marksUpdate: Partial<StudentMarks>,
    notifyStudent: boolean = true
  ) => {
    const course = courses.find((c) => c.id === courseId);
    const student = users.find((u) => u.id === studentId);

    setGrades((prev) => {
      const existingIndex = prev.findIndex(
        (g) => g.courseId === courseId && g.studentId === studentId
      );

      let currentMarks: StudentMarks = {
        assignment1: 0,
        assignment2: 0,
        assignment3: 0,
        mids: 0,
        finalExam: 0,
        total: 0,
        letterGrade: 'F',
        gradePoints: 0.0,
      };

      if (existingIndex >= 0) {
        currentMarks = { ...prev[existingIndex].marks };
      }

      const mergedMarks = { ...currentMarks, ...marksUpdate };
      const attRate = getStudentCourseAttendance(courseId, studentId);
      const attendanceScore = mergedMarks.attendanceMarks !== undefined
        ? mergedMarks.attendanceMarks
        : (attRate.totalLectures > 0 ? Number(((attRate.percentage / 100) * 10).toFixed(1)) : 10);

      const calculated = calculateGradeDetails(
        mergedMarks.assignment1,
        mergedMarks.assignment2,
        mergedMarks.assignment3,
        mergedMarks.mids,
        mergedMarks.finalExam,
        attendanceScore
      );

      const finalRecord: CourseGradeRecord = {
        courseId,
        studentId,
        marks: {
          ...mergedMarks,
          attendanceMarks: calculated.attendanceMarks,
          total: calculated.total,
          letterGrade: calculated.letterGrade,
          gradePoints: calculated.gradePoints,
          lastUpdated: new Date().toISOString().slice(0, 10),
        },
      };

      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex] = finalRecord;
        return copy;
      } else {
        return [...prev, finalRecord];
      }
    });

    if (notifyStudent && student && course) {
      const attRate = getStudentCourseAttendance(courseId, studentId);
      const calculated = calculateGradeDetails(
        marksUpdate.assignment1,
        marksUpdate.assignment2,
        marksUpdate.assignment3,
        marksUpdate.mids,
        marksUpdate.finalExam,
        marksUpdate.attendanceMarks !== undefined ? marksUpdate.attendanceMarks : (attRate.totalLectures > 0 ? Number(((attRate.percentage / 100) * 10).toFixed(1)) : 10)
      );

      const gradeNotif: AutomatedNotification = {
        id: `notif-${Date.now()}`,
        recipientId: student.id,
        recipientEmail: student.email,
        recipientName: student.name,
        senderName: course.teacherName,
        type: 'grade_update',
        subject: `Grade Published: ${course.code} Assessments & Results Updated`,
        message: `Your instructor ${course.teacherName} has published updated scores for ${course.code} (${course.title}). Current Total: ${calculated.total}/100 | Grade: ${calculated.letterGrade}. Check the LMS gradebook for detailed evaluation feedback.`,
        courseCode: course.code,
        courseTitle: course.title,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        read: false,
        emailDispatched: true,
      };

      setNotifications((prev) => [gradeNotif, ...prev]);
    }
  };

  // Mark Lecture Attendance
  const markLectureAttendance = (
    courseId: string,
    lectureNumber: number,
    topic: string,
    date: string,
    attendanceList: { studentId: string; status: AttendanceStatus }[]
  ) => {
    const course = courses.find((c) => c.id === courseId);
    const newSession: LectureSession = {
      id: `lec-${Date.now()}`,
      courseId,
      lectureNumber,
      topic,
      date,
      attendance: attendanceList,
    };

    setLectures((prev) => [newSession, ...prev]);

    if (course) {
      attendanceList.forEach((att) => {
        if (att.status === 'absent') {
          const student = users.find((u) => u.id === att.studentId);
          if (student) {
            const allCourseLectures = [...lectures, newSession].filter((l) => l.courseId === courseId);
            const total = allCourseLectures.length;
            const attendedCount = allCourseLectures.filter((l) =>
              l.attendance.some(
                (entry) =>
                  entry.studentId === student.id &&
                  (entry.status === 'present' || entry.status === 'late' || entry.status === 'excused')
              )
            ).length;

            const percentage = total > 0 ? (attendedCount / total) * 100 : 100;

            if (percentage < 75) {
              const warningNotif: AutomatedNotification = {
                id: `notif-${Date.now()}-${student.id}`,
                recipientId: student.id,
                recipientEmail: student.email,
                recipientName: student.name,
                senderName: 'Academic Attendance Office',
                type: 'attendance_warning',
                subject: `Attendance Warning: Critical Status in ${course.code} (${percentage.toFixed(0)}%)`,
                message: `Notice: Your attendance in ${course.code} (${course.title}) has fallen to ${percentage.toFixed(1)}%, which is below the mandatory 75% university eligibility requirement. Failure to regularize may result in debarment from the final examination.`,
                courseCode: course.code,
                courseTitle: course.title,
                timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
                read: false,
                emailDispatched: true,
              };
              setNotifications((prev) => [warningNotif, ...prev]);
            }
          }
        }
      });
    }
  };

  // Send Lecture Reminder Notification
  const sendLectureReminderNotification = (
    courseId: string,
    topic: string,
    date: string,
    time: string,
    customNote?: string
  ) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    const enrolledStudents = enrollments
      .filter((e) => e.courseId === courseId && e.status === 'registered')
      .map((e) => users.find((u) => u.id === e.studentId))
      .filter((u): u is User => Boolean(u));

    const reminderTimestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);

    const newNotifications: AutomatedNotification[] = enrolledStudents.map((student) => ({
      id: `notif-${Date.now()}-${student.id}`,
      recipientId: student.id,
      recipientEmail: student.email,
      recipientName: student.name,
      senderName: course.teacherName,
      type: 'lecture_reminder',
      subject: `Lecture Reminder: ${course.code} - ${date} at ${time}`,
      message: `Upcoming class reminder for ${course.code} (${course.title}):\nTopic: ${topic}\nDate & Time: ${date} at ${time}\nVenue: ${course.room}\n${customNote ? `\nInstructor Note: ${customNote}` : ''}`,
      courseCode: course.code,
      courseTitle: course.title,
      timestamp: reminderTimestamp,
      read: false,
      emailDispatched: true,
    }));

    setNotifications((prev) => [...newNotifications, ...prev]);
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getStudentCourses = (studentId: string): Course[] => {
    const studentEnrollments = enrollments.filter(
      (e) => e.studentId === studentId && e.status === 'registered'
    );
    return studentEnrollments
      .map((e) => courses.find((c) => c.id === e.courseId))
      .filter((c): c is Course => Boolean(c));
  };

  const getTeacherCourses = (teacherId: string): Course[] => {
    return courses.filter((c) => c.teacherId === teacherId);
  };

  const getCourseStudents = (courseId: string): User[] => {
    const enrolledIds = enrollments
      .filter((e) => e.courseId === courseId && e.status === 'registered')
      .map((e) => e.studentId);
    return users.filter((u) => enrolledIds.includes(u.id));
  };

  const getCourseGradesMap = (courseId: string): Record<string, StudentMarks> => {
    const map: Record<string, StudentMarks> = {};
    grades
      .filter((g) => g.courseId === courseId)
      .forEach((g) => {
        map[g.studentId] = g.marks;
      });
    return map;
  };

  const getStudentCourseGrade = (courseId: string, studentId: string): StudentMarks | null => {
    const found = grades.find((g) => g.courseId === courseId && g.studentId === studentId);
    return found ? found.marks : null;
  };

  const getStudentCourseAttendance = (courseId: string, studentId: string) => {
    const courseLectures = lectures.filter((l) => l.courseId === courseId);
    let attended = 0;
    let absent = 0;
    let late = 0;

    const logs: { date: string; topic: string; lectureNumber: number; status: AttendanceStatus }[] = [];

    courseLectures.forEach((lec) => {
      const entry = lec.attendance.find((a) => a.studentId === studentId);
      const status: AttendanceStatus = entry ? entry.status : 'absent';
      if (status === 'present' || status === 'excused') {
        attended++;
      } else if (status === 'late') {
        late++;
        attended += 0.8;
      } else {
        absent++;
      }

      logs.push({
        date: lec.date,
        topic: lec.topic,
        lectureNumber: lec.lectureNumber,
        status,
      });
    });

    const totalLectures = courseLectures.length;
    const percentage = totalLectures > 0 ? Math.min(100, Math.round((attended / totalLectures) * 100)) : 100;
    const isEligible = percentage >= 75;

    return {
      totalLectures,
      attended: Math.round(attended),
      absent,
      late,
      percentage,
      isEligible,
      logs: logs.sort((a, b) => b.lectureNumber - a.lectureNumber),
    };
  };

  const getStudentOverallStats = (studentId: string) => {
    const enrolled = getStudentCourses(studentId);
    const totalCredits = enrolled.reduce((sum, c) => sum + c.creditHours, 0);

    let totalAttendanceScore = 0;
    let coursesWithAttendance = 0;

    enrolled.forEach((course) => {
      const att = getStudentCourseAttendance(course.id, studentId);
      if (att.totalLectures > 0) {
        totalAttendanceScore += att.percentage;
        coursesWithAttendance++;
      }
    });

    const overallAttendancePercentage =
      coursesWithAttendance > 0 ? Math.round(totalAttendanceScore / coursesWithAttendance) : 100;

    let totalGradePointsCredits = 0;
    let gradedCredits = 0;

    enrolled.forEach((course) => {
      const grade = getStudentCourseGrade(course.id, studentId);
      if (grade && grade.gradePoints !== undefined) {
        totalGradePointsCredits += grade.gradePoints * course.creditHours;
        gradedCredits += course.creditHours;
      }
    });

    const calculatedSemesterGpa =
      gradedCredits > 0 ? Number((totalGradePointsCredits / gradedCredits).toFixed(2)) : 3.75;

    return {
      enrolledCoursesCount: enrolled.length,
      totalCredits,
      overallAttendancePercentage,
      calculatedSemesterGpa,
    };
  };

  const getSystemAnalytics = (
    department: string = 'ALL',
    semesterId: string = 'ALL'
  ): SystemAnalytics => {
    const students = users.filter((u) => u.role === 'student');
    const teachers = users.filter((u) => u.role === 'teacher');
    const activeEnrollments = enrollments.filter((e) => e.status === 'registered');

    const targetSem =
      semesterId === 'ALL'
        ? null
        : semesters.find(
            (s) => s.id === semesterId || String(s.number) === semesterId
          );

    // 1. Filter Students (Dept + Semester)
    const filteredStudents = students.filter((s) => {
      const studentDept = getUserPrimaryDepartment(s);
      const matchesDept =
        department === 'ALL' ||
        studentDept.trim().toLowerCase() === department.trim().toLowerCase();
      const matchesSem =
        !targetSem ||
        Number(s.semester) === targetSem.number ||
        (s.semester === undefined && targetSem.number === 1);
      return matchesDept && matchesSem;
    });

    // 2. Filter Teachers (CRITICAL RULE: Depends on Department ONLY, semester filter is IGNORED!)
    const filteredTeachers =
      department === 'ALL'
        ? teachers
        : teachers.filter((t) => {
            const depts = getUserDepartments(t);
            return depts.some((d) => d.trim().toLowerCase() === department.trim().toLowerCase());
          });

    // 3. Filter Courses (Dept + Semester)
    const filteredCourses = courses.filter((c) => {
      const matchesDept =
        department === 'ALL' ||
        c.department?.trim().toLowerCase() === department.trim().toLowerCase();
      const matchesSem =
        !targetSem ||
        c.semesterId === targetSem.id ||
        c.semesterNumber === targetSem.number;
      return matchesDept && matchesSem;
    });

    const filteredCourseIds = new Set(filteredCourses.map((c) => c.id));
    const filteredStudentIds = new Set(filteredStudents.map((s) => s.id));

    // 4. Filter Enrollments (Course seatings of filtered cohort)
    const filteredEnrollments =
      department === 'ALL' && semesterId === 'ALL'
        ? activeEnrollments
        : filteredStudents.length > 0
        ? activeEnrollments.filter((e) => filteredStudentIds.has(e.studentId))
        : [];

    // 5. Attendance Calculation
    let totalAttended = 0;
    let totalEntries = 0;
    if (filteredStudents.length > 0) {
      lectures.forEach((lec) => {
        lec.attendance.forEach((att) => {
          if (filteredStudentIds.has(att.studentId)) {
            totalEntries++;
            if (att.status === 'present' || att.status === 'late' || att.status === 'excused') {
              totalAttended++;
            }
          }
        });
      });
    }
    const averageAttendanceRate =
      totalEntries > 0 ? Math.round((totalAttended / totalEntries) * 100) : 0;

    // 6. Average GPA Calculation
    let averageGpa = 0.0;
    if (filteredStudents.length > 0) {
      const validGpas = filteredStudents
        .map((s) => s.cgpa)
        .filter((g): g is number => typeof g === 'number' && !isNaN(g) && g > 0);
      if (validGpas.length > 0) {
        averageGpa = Number(
          (validGpas.reduce((a, b) => a + b, 0) / validGpas.length).toFixed(2)
        );
      }
    }

    // 7. Grade Distribution
    const filteredGrades =
      department === 'ALL' && semesterId === 'ALL'
        ? grades
        : filteredStudents.length > 0
        ? grades.filter((g) => filteredStudentIds.has(g.studentId))
        : [];

    const gradeCounts: Record<string, number> = {
      'A+': 0,
      A: 0,
      'A-': 0,
      'B+': 0,
      B: 0,
      'B-': 0,
      'C+': 0,
      C: 0,
      D: 0,
      F: 0,
    };

    filteredGrades.forEach((g) => {
      if (gradeCounts[g.marks.letterGrade] !== undefined) {
        gradeCounts[g.marks.letterGrade]++;
      }
    });

    const gradeDistribution = Object.entries(gradeCounts).map(([grade, count]) => ({
      grade,
      count,
    }));

    // 8. Department Breakdown
    const deptMap: Record<string, { students: number; courses: number }> = {};
    if (department === 'ALL') {
      filteredStudents.forEach((s) => {
        const sDept = getUserPrimaryDepartment(s);
        if (!deptMap[sDept]) deptMap[sDept] = { students: 0, courses: 0 };
        deptMap[sDept].students++;
      });
      filteredCourses.forEach((c) => {
        if (!deptMap[c.department]) deptMap[c.department] = { students: 0, courses: 0 };
        deptMap[c.department].courses++;
      });
    } else {
      // Specific Department: show breakdown across semesters
      semesters.forEach((sem) => {
        const semStudents = filteredStudents.filter(
          (s) => Number(s.semester) === sem.number || (s.semester === undefined && sem.number === 1)
        );
        const semCourses = filteredCourses.filter(
          (c) => c.semesterId === sem.id || c.semesterNumber === sem.number
        );
        deptMap[sem.name] = {
          students: semStudents.length,
          courses: semCourses.length,
        };
      });
    }

    const departmentBreakdown = Object.entries(deptMap).map(([dept, data]) => ({
      department: dept,
      students: data.students,
      courses: data.courses,
    }));

    // 9. Attendance Audit Health per student
    let eligibleCount = 0;
    let warningCount = 0;
    let debarredCount = 0;

    if (filteredStudents.length > 0) {
      filteredStudents.forEach((std) => {
        let stdEntries = 0;
        let stdAttended = 0;
        lectures.forEach((lec) => {
          lec.attendance.forEach((att) => {
            if (att.studentId === std.id) {
              stdEntries++;
              if (att.status === 'present' || att.status === 'late' || att.status === 'excused') {
                stdAttended++;
              }
            }
          });
        });
        const rate = stdEntries > 0 ? (stdAttended / stdEntries) * 100 : 0;
        if (rate >= 75) {
          eligibleCount++;
        } else if (rate >= 60) {
          warningCount++;
        } else {
          debarredCount++;
        }
      });
    }

    const totalStudentsForAtt = filteredStudents.length;
    const eligibleRate = totalStudentsForAtt > 0 ? Math.round((eligibleCount / totalStudentsForAtt) * 100) : 0;
    const warningRate = totalStudentsForAtt > 0 ? Math.round((warningCount / totalStudentsForAtt) * 100) : 0;
    const debarredRate = totalStudentsForAtt > 0 ? Math.max(0, 100 - eligibleRate - warningRate) : 0;

    return {
      totalStudents: filteredStudents.length,
      totalTeachers: filteredTeachers.length,
      totalCourses: filteredCourses.length,
      totalEnrollments: filteredEnrollments.length,
      averageAttendanceRate,
      averageGpa,
      gradeDistribution,
      departmentBreakdown,
      attendanceHealth: {
        eligibleRate,
        warningRate,
        debarredRate,
        eligibleCount,
        warningCount,
        debarredCount,
      },
    };
  };

  return (
    <LmsContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        login,
        logout,
        users,
        courses,
        semesters,
        currentSemester,
        enrollments,
        grades,
        lectures,
        notifications,
        selectedEmailModal,
        setSelectedEmailModal,
        isProfileModalOpen,
        setIsProfileModalOpen,
        updateUserProfile,
        updateUniversityDomain,
        changePassword,
        adminAddUser,
        adminUpdateUser,
        adminDeleteUser,
        adminResetPassword,
        auditLogs,
        overrideStudentSemester,
        publishSemesterResultsAndPromote,
        departments,
        addDepartment,
        updateDepartment,
        deleteDepartment,
        addCourse,
        updateCourse,
        deleteCourse,
        toggleSemesterRegistration,
        addSemester,
        updateSemester,
        deleteSemester,
        registerCourse,
        dropCourse,
        updateStudentGrade,
        markLectureAttendance,
        sendLectureReminderNotification,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        getSystemAnalytics,
        getStudentCourses,
        getTeacherCourses,
        getCourseStudents,
        getCourseGradesMap,
        getStudentCourseGrade,
        getStudentCourseAttendance,
        getStudentOverallStats,
      }}
    >
      {children}
    </LmsContext.Provider>
  );
};

export const useLms = () => {
  const context = useContext(LmsContext);
  if (!context) {
    throw new Error('useLms must be used within an LmsProvider');
  }
  return context;
};
