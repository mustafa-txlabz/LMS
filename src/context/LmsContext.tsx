import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Role,
  User,
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
} from '../data/mockData';
import { formatStudentEmail, getDepartmentCode } from '../utils/studentEmail';

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
  addSemester: (semData: Omit<Semester, 'id'>) => void;

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
  getSystemAnalytics: () => SystemAnalytics;
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
  a3: number = 0,
  mids: number = 0,
  finals: number = 0
): { total: number; letterGrade: string; gradePoints: number } {
  const total = Math.min(100, Math.max(0, Number((a1 + a2 + a3 + mids + finals).toFixed(1))));

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

  return { total, letterGrade, gradePoints };
}

export const LmsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'auth_user');
    if (saved) {
      try {
        return JSON.parse(saved);
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

  const [selectedEmailModal, setSelectedEmailModal] = useState<AutomatedNotification | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Sync with MongoDB backend on initial load
  useEffect(() => {
    fetch('/api/bootstrap')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.users && data.users.length > 0) {
          setUsers(data.users);
          setSemesters(data.semesters);
          setCourses(data.courses);
          setEnrollments(data.enrollments);
          setGrades(data.grades);
          setLectures(data.lectures);
          setNotifications(data.notifications);
          if (data.departments && data.departments.length > 0) {
            setDepartments(data.departments);
          }

          // Update current user reference if logged in
          if (currentUser) {
            const matched = data.users.find((u: User) => u.id === currentUser.id);
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
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        return { success: true };
      }
    } catch {
      // Fallback to local users validation
    }

    // Local authentication fallback
    const matchedUser = users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );

    if (!matchedUser) {
      return { success: false, error: 'No user account found with this email address.' };
    }

    if (matchedUser.password && matchedUser.password !== password) {
      return { success: false, error: 'Incorrect password entered.' };
    }

    const { password: _, ...sanitized } = matchedUser;
    setCurrentUser(sanitized);
    return { success: true };
  };

  // Auth: Logout
  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'auth_user');
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
            return { ...u, ...data, email: data.email!.trim().toLowerCase() };
          }
          if (u.role === 'student') {
            cascadedCount++;
            const updatedStudentEmail = formatStudentEmail(
              u.session || u.sessionYear,
              u.department,
              u.rollNumber,
              newDomain
            );
            return { ...u, email: updatedStudentEmail };
          }
          if (oldDomain && u.email && u.email.endsWith(`@${oldDomain}`)) {
            cascadedCount++;
            const localPart = u.email.split('@')[0];
            return { ...u, email: `${localPart}@${newDomain}` };
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
        prev.map((u) => (u.id === userId ? { ...u, ...data } : u))
      );
    }

    if (currentUser && currentUser.id === userId) {
      setCurrentUser((prev) => (prev ? { ...prev, ...data } : null));
    }

    return { success: true, domainChanged, cascadedCount };
  };

  // Dedicated: Update University Email Domain Master (cascades to all users: students and admin)
  const updateUniversityDomain = async (
    newDomain: string
  ): Promise<{ success: boolean; error?: string; count?: number }> => {
    const cleanDomain = newDomain.replace(/^@/, '').trim().toLowerCase();
    if (!cleanDomain || !cleanDomain.includes('.')) {
      return { success: false, error: 'Please enter a valid domain format (e.g. nicore.edu.pk or campus.edu)' };
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

    if (user.password && user.password !== currentPassword) {
      return { success: false, error: 'Current password does not match.' };
    }

    try {
      await fetch(`/api/users/${userId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
    } catch {
      // Continue locally
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, password: newPassword } : u))
    );

    return { success: true };
  };

  // Admin: Add Student or Teacher
  const adminAddUser = async (userData: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    const newUser: User = {
      id: `usr-${userData.role || 'user'}-${Date.now()}`,
      name: userData.name || '',
      email: userData.email || '',
      password: userData.password || 'password123',
      role: userData.role || 'student',
      department: userData.department || 'Computer Science',
      rollNumber: userData.role === 'student' ? userData.rollNumber || '1' : undefined,
      session: userData.role === 'student' ? Number(userData.session) || 2026 : undefined,
      sessionYear: userData.role === 'student' ? Number(userData.session) || 2026 : undefined,
      designation: userData.role === 'teacher' ? userData.designation || 'Assistant Professor' : undefined,
      semester: userData.role === 'student' ? Number(userData.semester) || 1 : undefined,
      cgpa: userData.role === 'student' ? 3.5 : undefined,
      creditsEarned: 0,
      dob: userData.dob || '2002-01-01',
      phone: userData.phone || '',
      address: userData.address || '',
      bio: userData.bio || '',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'User')}&background=0F172A&color=fff`,
    };

    try {
      await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
    } catch {
      // Continue locally
    }

    setUsers((prev) => [newUser, ...prev]);
    return { success: true };
  };

  // Admin: Update Student or Teacher
  const adminUpdateUser = async (userId: string, userData: Partial<User>): Promise<{ success: boolean; error?: string }> => {
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
      prev.map((u) => (u.id === userId ? { ...u, ...userData } : u))
    );

    if (currentUser && currentUser.id === userId) {
      setCurrentUser((prev) => (prev ? { ...prev, ...userData } : null));
    }

    return { success: true };
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

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, password: newPassword } : u))
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
            prev.map((u) => (u.department === oldDept.name ? { ...u, department: updates.name! } : u))
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
  const addSemester = (semData: Omit<Semester, 'id'>) => {
    const newSem: Semester = {
      ...semData,
      id: `sem-${Date.now()}`,
    };
    setSemesters((prev) => [newSem, ...prev]);
  };

  // Register Course
  const registerCourse = (studentId: string, courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    const student = users.find((u) => u.id === studentId);

    if (!course || !student) {
      return { success: false, message: 'Course or student record not found.' };
    }

    if (!currentSemester.isRegistrationOpen) {
      return { success: false, message: 'Semester registration is currently closed.' };
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
      const calculated = calculateGradeDetails(
        mergedMarks.assignment1,
        mergedMarks.assignment2,
        mergedMarks.assignment3,
        mergedMarks.mids,
        mergedMarks.finalExam
      );

      const finalRecord: CourseGradeRecord = {
        courseId,
        studentId,
        marks: {
          ...mergedMarks,
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
      const calculated = calculateGradeDetails(
        marksUpdate.assignment1,
        marksUpdate.assignment2,
        marksUpdate.assignment3,
        marksUpdate.mids,
        marksUpdate.finalExam
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

  const getSystemAnalytics = (): SystemAnalytics => {
    const students = users.filter((u) => u.role === 'student');
    const teachers = users.filter((u) => u.role === 'teacher');
    const activeEnrollments = enrollments.filter((e) => e.status === 'registered');

    let totalAttended = 0;
    let totalEntries = 0;
    lectures.forEach((lec) => {
      lec.attendance.forEach((att) => {
        totalEntries++;
        if (att.status === 'present' || att.status === 'late' || att.status === 'excused') {
          totalAttended++;
        }
      });
    });
    const averageAttendanceRate =
      totalEntries > 0 ? Math.round((totalAttended / totalEntries) * 100) : 89;

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

    grades.forEach((g) => {
      if (gradeCounts[g.marks.letterGrade] !== undefined) {
        gradeCounts[g.marks.letterGrade]++;
      }
    });

    const gradeDistribution = Object.entries(gradeCounts).map(([grade, count]) => ({
      grade,
      count,
    }));

    const deptMap: Record<string, { students: number; courses: number }> = {};
    students.forEach((s) => {
      if (!deptMap[s.department]) deptMap[s.department] = { students: 0, courses: 0 };
      deptMap[s.department].students++;
    });
    courses.forEach((c) => {
      if (!deptMap[c.department]) deptMap[c.department] = { students: 0, courses: 0 };
      deptMap[c.department].courses++;
    });

    const departmentBreakdown = Object.entries(deptMap).map(([department, data]) => ({
      department,
      students: data.students,
      courses: data.courses,
    }));

    return {
      totalStudents: students.length,
      totalTeachers: teachers.length,
      totalCourses: courses.length,
      totalEnrollments: activeEnrollments.length,
      averageAttendanceRate,
      averageGpa: 3.68,
      gradeDistribution,
      departmentBreakdown,
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
        departments,
        addDepartment,
        updateDepartment,
        deleteDepartment,
        addCourse,
        updateCourse,
        deleteCourse,
        toggleSemesterRegistration,
        addSemester,
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
