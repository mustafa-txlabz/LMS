export type Role = 'admin' | 'teacher' | 'student';
export type AdmissionType = 'fresh' | 'transfer';
export type AcademicStatus = 'active' | 'detained' | 'repeat' | 'graduated';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  departments: string[]; // Unified departments array
  department?: string; // Optional legacy compatibility field
  rollNumber?: string; // For students, e.g. 29 or CS-2023-042
  session?: number; // Enrollment session year, e.g. 2026 or 2021
  sessionYear?: number; // Alias for session
  designation?: string; // For teachers, e.g. Associate Professor
  semester?: number; // Current semester for student, e.g. 5
  admissionType?: AdmissionType; // 'fresh' or 'transfer'
  academicStatus?: AcademicStatus; // 'active' | 'detained' | 'repeat' | 'graduated'
  cgpa?: number;
  creditsEarned?: number;
  password?: string;
  dob?: string; // Date of birth YYYY-MM-DD
  phone?: string;
  address?: string;
  bio?: string;
}

export interface Semester {
  id: string;
  name: string; // e.g. "Fall 2026"
  code: string; // e.g. "FA26"
  number: number; // e.g. 5
  isRegistrationOpen: boolean;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isFinalResultsPublished?: boolean;
  finalResultsPublishedAt?: string;
}

export interface SemesterProgressionAuditLog {
  id: string;
  studentId: string;
  studentName: string;
  studentRollNumber?: string;
  adminId: string;
  adminName: string;
  previousSemester: number;
  newSemester: number;
  previousStatus?: AcademicStatus;
  newStatus?: AcademicStatus;
  reason: string;
  timestamp: string;
}

export interface PromotionEvaluationResult {
  studentId: string;
  studentName: string;
  rollNumber?: string;
  department: string;
  currentSemester: number;
  nextSemester: number;
  gpa: number;
  creditsAttempted: number;
  creditsPassed: number;
  passed: boolean;
  decision: 'promoted' | 'detained' | 'graduated';
  reason: string;
}

export interface Course {
  id: string;
  code: string; // e.g. "CS-301"
  title: string; // e.g. "Data Structures & Algorithms"
  description: string;
  semesterNumber: number; // e.g. 5
  semesterId: string; // references Semester.id
  creditHours: number; // e.g. 3 or 4
  department: string;
  teacherId: string; // Assigned teacher
  teacherName: string;
  schedule: string; // e.g. "Mon & Wed 10:00 - 11:30 AM"
  room: string; // e.g. "Room 402, Tech Block"
  maxCapacity: number;
  enrolledCount: number;
  prerequisites?: string[];
}

export interface Enrollment {
  id: string;
  courseId: string;
  studentId: string;
  semesterId: string;
  registeredAt: string;
  status: 'registered' | 'dropped';
}

export interface StudentMarks {
  assignment1: number; // max 10
  assignment2: number; // max 10
  assignment3: number; // max 10
  mids: number; // max 30
  finalExam: number; // max 40
  total: number; // calculated 0-100
  letterGrade: string; // 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F'
  gradePoints: number; // 4.0, 3.7, etc.
  feedback?: string;
  lastUpdated?: string;
}

export interface CourseGradeRecord {
  courseId: string;
  studentId: string;
  marks: StudentMarks;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface LectureAttendanceEntry {
  studentId: string;
  status: AttendanceStatus;
}

export interface LectureSession {
  id: string;
  courseId: string;
  lectureNumber: number;
  date: string;
  topic: string;
  attendance: LectureAttendanceEntry[];
}

export interface AutomatedNotification {
  id: string;
  recipientId: string; // User ID or 'all-students'
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  type: 'grade_update' | 'lecture_reminder' | 'course_registration' | 'attendance_warning' | 'announcement';
  subject: string;
  message: string;
  courseCode?: string;
  courseTitle?: string;
  timestamp: string;
  read: boolean;
  emailDispatched: boolean;
}

export interface SystemAnalytics {
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  totalEnrollments: number;
  averageAttendanceRate: number;
  averageGpa: number;
  gradeDistribution: {
    grade: string;
    count: number;
  }[];
  departmentBreakdown: {
    department: string;
    students: number;
    courses: number;
  }[];
}

export interface Department {
  id: string;
  name: string;
  code: string; // Abbreviation e.g. "cs", "eng", "se"
  hodId?: string; // Faculty user ID
  hodName?: string; // Faculty member's display name
  description?: string;
  createdAt?: string;
}
