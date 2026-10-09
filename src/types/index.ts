export type Role = 'admin' | 'teacher' | 'student';
export type AdmissionType = 'fresh' | 'transfer';
export type AcademicStatus = 'active' | 'probation' | 'graduated' | 'detained' | 'repeat';

export interface BacklogCourse {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  creditHours: number;
  semesterOffered: number;
  reason: 'failed' | 'missed';
  status?: 'pending' | 'cleared';
  grade?: string;
  detectedAt?: string;
}

export interface BaseUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatar?: string;
  dob?: string;
  phone?: string;
  address?: string;
  bio?: string;
}

export interface AdminUser extends BaseUser {
  role: 'admin';
  department?: undefined;
  departments?: undefined;
  designation?: string;
  semester?: undefined;
  admissionType?: undefined;
  academicStatus?: undefined;
  cgpa?: undefined;
  creditsEarned?: undefined;
  backlogCourses?: undefined;
  rollNumber?: undefined;
  session?: undefined;
  sessionYear?: undefined;
}

export interface TeacherUser extends BaseUser {
  role: 'teacher';
  departments: string[]; // Teachers can belong to multiple departments (array)
  designation?: string;
  department?: undefined;
  semester?: undefined;
  admissionType?: undefined;
  academicStatus?: undefined;
  cgpa?: undefined;
  creditsEarned?: undefined;
  backlogCourses?: undefined;
  rollNumber?: undefined;
  session?: undefined;
  sessionYear?: undefined;
}

export interface StudentUser extends BaseUser {
  role: 'student';
  department: string; // Students belong to exactly one department (string)
  departments?: undefined;
  rollNumber?: string;
  session?: number;
  sessionYear?: number;
  semester: number;
  admissionType?: AdmissionType;
  academicStatus?: AcademicStatus;
  cgpa?: number;
  creditsEarned?: number;
  backlogCourses?: BacklogCourse[];
  designation?: undefined;
}

export type User = AdminUser | TeacherUser | StudentUser;

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
  decision: 'promoted' | 'promoted_probation' | 'repeat' | 'graduated' | 'pending_graduation' | 'detained';
  academicStatus: AcademicStatus;
  backlogsCount: number;
  backlogs: BacklogCourse[];
  passedCourses: Array<{ courseId: string; courseCode: string; credits: number; grade: string }>;
  reason: string;
}

export interface SemesterPromotionBatchSummary {
  totalEvaluated: number;
  promotedCount: number; // Promoted with active status (CGPA >= 2.0)
  probationCount: number; // Promoted with probation status (CGPA < 2.0)
  repeatCount?: number; // Students in repeat standing
  carryingBacklogsCount: number; // Students carrying 1+ uncleared backlogs
  graduatedCount: number;
  pendingGraduationCount: number;
  detainedCount: number;
  results: PromotionEvaluationResult[];
}

export type CourseType = 'Theory' | 'Lab';

export interface Course {
  id: string;
  code: string; // e.g. "CS-301"
  title: string; // e.g. "Data Structures & Algorithms"
  type?: CourseType; // 'Theory' | 'Lab'
  description: string;
  semesterNumber: number; // e.g. 5
  semesterId: string; // references Semester.id
  creditHours: number; // e.g. 3 for theory, 1 for lab
  department: string;
  teacherId: string; // Assigned teacher
  teacherName: string;
  schedule: string; // e.g. "Mon & Wed · 10:00 AM – 11:30 AM"
  scheduleSlots?: Record<string, string>; // e.g. { "Monday": "10:00 AM – 11:30 AM", "Wednesday": "10:00 AM – 11:30 AM" }
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
  assignment3?: number; // legacy optional max 10
  attendanceMarks?: number; // max 10 (Attendance weightage: 10 marks)
  mids: number; // max 30 (Midterm exam: 30 marks)
  finalExam: number; // max 40 (Final exam: 40 marks)
  total: number; // calculated 0-100 (Final 40 + Mids 30 + Assignments 20 + Attendance 10 = 100)
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
  attendanceHealth?: {
    eligibleRate: number;
    warningRate: number;
    debarredRate: number;
    eligibleCount: number;
    warningCount: number;
    debarredCount: number;
  };
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
