import express, { Request, Response } from 'express';
import mongoose from 'express';
import mongooseLib from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  INITIAL_USERS,
  INITIAL_SEMESTERS,
  INITIAL_COURSES,
  INITIAL_ENROLLMENTS,
  INITIAL_GRADES,
  INITIAL_LECTURES,
  INITIAL_NOTIFICATIONS,
  INITIAL_DEPARTMENTS,
} from './src/data/mockData.ts';

dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// MongoDB URI from environment
const rawMongoUri = process.env.MONGODB_URI || '';
// Format URI safely ensuring password with @ is encoded if needed
let mongoUri = rawMongoUri;
if (mongoUri && mongoUri.includes('@') && !mongoUri.includes('%40')) {
  // If the password specifically contains unescaped @ (like :g@jdSv6bkXm5pYD@)
  const atCount = (mongoUri.match(/@/g) || []).length;
  if (atCount > 1) {
    const lastAtIndex = mongoUri.lastIndexOf('@');
    const firstPart = mongoUri.substring(0, lastAtIndex);
    const hostPart = mongoUri.substring(lastAtIndex);
    const colonIndex = firstPart.indexOf(':', firstPart.indexOf('://') + 3);
    if (colonIndex !== -1) {
      const user = firstPart.substring(0, colonIndex);
      const pass = firstPart.substring(colonIndex + 1);
      mongoUri = `${user}:${encodeURIComponent(pass)}${hostPart}`;
    }
  }
}

// -------------------------------------------------------------
// MongoDB Schemas & Models
// -------------------------------------------------------------
const UserSchema = new mongooseLib.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, default: 'password123' },
    role: { type: String, enum: ['admin', 'teacher', 'student'], required: true },
    avatar: { type: String },
    departments: { type: [String], default: ['Computer Science'] },
    rollNumber: { type: String },
    session: { type: Number, default: 2026 },
    designation: { type: String },
    semester: { type: Number, default: 1 },
    cgpa: { type: Number, default: 3.5 },
    creditsEarned: { type: Number, default: 0 },
    dob: { type: String, default: '2000-01-01' },
    phone: { type: String },
    address: { type: String },
    bio: { type: String },
  },
  { timestamps: true }
);

const SemesterSchema = new mongooseLib.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    number: { type: Number, required: true },
    isRegistrationOpen: { type: Boolean, default: true },
    startDate: { type: String },
    endDate: { type: String },
    isCurrent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const CourseSchema = new mongooseLib.Schema(
  {
    id: { type: String, required: true, unique: true },
    code: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    semesterNumber: { type: Number, required: true },
    semesterId: { type: String, required: true },
    creditHours: { type: Number, required: true, default: 3 },
    department: { type: String, required: true },
    teacherId: { type: String, required: true },
    teacherName: { type: String, required: true },
    schedule: { type: String, default: '' },
    room: { type: String, default: '' },
    maxCapacity: { type: Number, default: 40 },
    enrolledCount: { type: Number, default: 0 },
    prerequisites: [{ type: String }],
  },
  { timestamps: true }
);

const EnrollmentSchema = new mongooseLib.Schema(
  {
    id: { type: String, required: true, unique: true },
    courseId: { type: String, required: true },
    studentId: { type: String, required: true },
    semesterId: { type: String, required: true },
    registeredAt: { type: String },
    status: { type: String, enum: ['registered', 'dropped'], default: 'registered' },
  },
  { timestamps: true }
);

const GradeSchema = new mongooseLib.Schema(
  {
    courseId: { type: String, required: true },
    studentId: { type: String, required: true },
    marks: {
      assignment1: { type: Number, default: 0 },
      assignment2: { type: Number, default: 0 },
      assignment3: { type: Number, default: 0 },
      mids: { type: Number, default: 0 },
      finalExam: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      letterGrade: { type: String, default: 'F' },
      gradePoints: { type: Number, default: 0.0 },
      feedback: { type: String, default: '' },
      lastUpdated: { type: String },
    },
  },
  { timestamps: true }
);

const LectureSchema = new mongooseLib.Schema(
  {
    id: { type: String, required: true, unique: true },
    courseId: { type: String, required: true },
    lectureNumber: { type: Number, required: true },
    date: { type: String, required: true },
    topic: { type: String, required: true },
    attendance: [
      {
        studentId: { type: String, required: true },
        status: { type: String, enum: ['present', 'absent', 'late', 'excused'], default: 'present' },
      },
    ],
  },
  { timestamps: true }
);

const NotificationSchema = new mongooseLib.Schema(
  {
    id: { type: String, required: true, unique: true },
    recipientId: { type: String, required: true },
    recipientEmail: { type: String, required: true },
    recipientName: { type: String, required: true },
    senderName: { type: String, required: true },
    type: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    courseCode: { type: String },
    courseTitle: { type: String },
    timestamp: { type: String },
    read: { type: Boolean, default: false },
    emailDispatched: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const UserModel = mongooseLib.model('User', UserSchema);
const SemesterModel = mongooseLib.model('Semester', SemesterSchema);
const CourseModel = mongooseLib.model('Course', CourseSchema);
const EnrollmentModel = mongooseLib.model('Enrollment', EnrollmentSchema);
const GradeModel = mongooseLib.model('Grade', GradeSchema);
const LectureModel = mongooseLib.model('Lecture', LectureSchema);
const NotificationModel = mongooseLib.model('Notification', NotificationSchema);

const DepartmentSchema = new mongooseLib.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    hodId: { type: String, default: '' },
    hodName: { type: String, default: '' },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

const DepartmentModel = mongooseLib.model('Department', DepartmentSchema);

// In-Memory store fallback if MongoDB Atlas is disconnected or network blocked
let isMongoConnected = false;
let memoryUsers = INITIAL_USERS.map((u: any) => {
  const depts = Array.isArray(u.departments) && u.departments.length > 0
    ? u.departments
    : (u.department ? [u.department] : ['Computer Science']);
  const copy = { ...u, departments: depts };
  delete copy.department;
  return copy;
});
let memorySemesters = [...INITIAL_SEMESTERS];
let memoryCourses = [...INITIAL_COURSES];
let memoryEnrollments = [...INITIAL_ENROLLMENTS];
let memoryGrades = [...INITIAL_GRADES];
let memoryLectures = [...INITIAL_LECTURES];
let memoryNotifications = [...INITIAL_NOTIFICATIONS];
let memoryDepartments = [...INITIAL_DEPARTMENTS];

async function initMongoDB() {
  if (!mongoUri) {
    console.warn('[MongoDB] No MONGODB_URI found in environment, running with in-memory persistence.');
    return;
  }
  try {
    console.log('[MongoDB] Connecting to MongoDB Atlas (database: unicore_lms)...');
    await mongooseLib.connect(mongoUri, {
      dbName: 'unicore_lms',
      serverSelectionTimeoutMS: 8000,
    });
    isMongoConnected = true;
    console.log('[MongoDB] Successfully connected to database:', mongooseLib.connection.name);

    // Seed database if empty
    const userCount = await UserModel.countDocuments();
    if (userCount === 0) {
      console.log('[MongoDB] Seeding initial university users, courses, and records...');
      await UserModel.insertMany(INITIAL_USERS);
      await SemesterModel.insertMany(INITIAL_SEMESTERS);
      await CourseModel.insertMany(INITIAL_COURSES);
      await EnrollmentModel.insertMany(INITIAL_ENROLLMENTS);
      await GradeModel.insertMany(INITIAL_GRADES);
      await LectureModel.insertMany(INITIAL_LECTURES);
      await NotificationModel.insertMany(INITIAL_NOTIFICATIONS);
      console.log('[MongoDB] Seeding completed successfully!');
    }

    // Ensure departments are seeded
    const deptCount = await DepartmentModel.countDocuments();
    if (deptCount === 0) {
      console.log('[MongoDB] Seeding initial university departments...');
      await DepartmentModel.insertMany(INITIAL_DEPARTMENTS);
      console.log('[MongoDB] Departments seeded successfully!');
    }

    // Raw collection migration: Export legacy 'department' string to 'departments' array, then unset 'department'
    try {
      const col = UserModel.collection;
      const legacyCursor = col.find({ department: { $exists: true } });
      while (await legacyCursor.hasNext()) {
        const doc: any = await legacyCursor.next();
        const currentDepts = Array.isArray(doc.departments) ? doc.departments : [];
        if (doc.department && !currentDepts.includes(doc.department)) {
          currentDepts.push(doc.department);
        }
        await col.updateOne(
          { _id: doc._id },
          {
            $set: { departments: currentDepts.length > 0 ? currentDepts : ['Computer Science'] },
            $unset: { department: '' },
          }
        );
      }
      console.log('[Migration] Successfully exported legacy department data and removed department field from raw database!');
    } catch (migErr: any) {
      console.error('[Migration Notice]', migErr.message);
    }
  } catch (err: any) {
    console.error('[MongoDB] Connection error (using in-memory fallback):', err.message);
    isMongoConnected = false;
  }
}

// -------------------------------------------------------------
// REST API Routes
// -------------------------------------------------------------

// Bootstrap data
app.get('/api/bootstrap', async (_req: Request, res: Response) => {
  try {
    if (isMongoConnected) {
      const [users, semesters, courses, enrollments, grades, lectures, notifications, departments] = await Promise.all([
        UserModel.find().lean(),
        SemesterModel.find().lean(),
        CourseModel.find().lean(),
        EnrollmentModel.find().lean(),
        GradeModel.find().lean(),
        LectureModel.find().lean(),
        NotificationModel.find().lean(),
        DepartmentModel.find().lean(),
      ]);

      const sanitizedUsers = users.map((u: any) => {
        const depts = Array.isArray(u.departments) && u.departments.length > 0
          ? u.departments
          : (u.department ? [u.department] : ['Computer Science']);
        const copy = { ...u, departments: depts };
        delete copy.department;
        return copy;
      });

      return res.json({
        dbConnected: true,
        users: sanitizedUsers,
        semesters,
        courses,
        enrollments,
        grades,
        lectures,
        notifications,
        departments: departments && departments.length > 0 ? departments : memoryDepartments,
      });
    }

    const sanitizedUsers = memoryUsers.map((u: any) => {
      const depts = Array.isArray(u.departments) && u.departments.length > 0
        ? u.departments
        : (u.department ? [u.department] : ['Computer Science']);
      const copy = { ...u, departments: depts };
      delete copy.department;
      return copy;
    });

    return res.json({
      dbConnected: false,
      users: sanitizedUsers,
      semesters: memorySemesters,
      courses: memoryCourses,
      enrollments: memoryEnrollments,
      grades: memoryGrades,
      lectures: memoryLectures,
      notifications: memoryNotifications,
      departments: memoryDepartments,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// User Login
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    let user: any = null;
    if (isMongoConnected) {
      user = await UserModel.findOne({ email: email.trim().toLowerCase() }).lean();
    } else {
      user = memoryUsers.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    }

    if (!user) {
      return res.status(401).json({ error: 'No account found with this email address' });
    }

    // Check password
    if (user.password && user.password !== password) {
      return res.status(401).json({ error: 'Incorrect password entered' });
    }

    // Return sanitized user
    const { password: _, ...sanitized } = user;
    return res.json({ user: sanitized, token: `mock-token-${user.id}-${Date.now()}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update Profile Info (name, dob, phone, address, bio, avatar, email)
app.put('/api/users/:id/profile', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, dob, phone, address, bio, avatar, email } = req.body;

  try {
    let domainChanged = false;
    let oldDomain = '';
    let newDomain = '';

    if (email && typeof email === 'string' && email.includes('@')) {
      newDomain = email.split('@')[1].trim().toLowerCase();
    }

    if (isMongoConnected) {
      const existingUser = await UserModel.findOne({ id });
      if (!existingUser) return res.status(404).json({ error: 'User not found' });

      if (existingUser.role === 'admin' && newDomain) {
        oldDomain = existingUser.email.split('@')[1]?.trim().toLowerCase() || '';
        if (oldDomain && oldDomain !== newDomain) {
          domainChanged = true;
        }
      }

      const updated = await UserModel.findOneAndUpdate(
        { id },
        { $set: { name, dob, phone, address, bio, avatar, ...(email ? { email: email.trim().toLowerCase() } : {}) } },
        { new: true }
      ).lean();

      let cascadedCount = 0;
      if (domainChanged) {
        console.log(`[Domain Cascade] Admin changed domain from @${oldDomain} to @${newDomain}. Updating all students and domain users...`);
        // Update all students to the new domain
        const students = await UserModel.find({ role: 'student' });
        for (const s of students) {
          const localPart = s.email.split('@')[0];
          s.email = `${localPart}@${newDomain}`;
          await s.save();
          cascadedCount++;
        }

        // Update any other faculty/staff users who shared the previous domain
        if (oldDomain) {
          const otherUsers = await UserModel.find({ role: { $ne: 'student' }, id: { $ne: id } });
          for (const u of otherUsers) {
            if (u.email.endsWith(`@${oldDomain}`)) {
              u.email = `${u.email.split('@')[0]}@${newDomain}`;
              await u.save();
              cascadedCount++;
            }
          }
        }
      }

      const { password: _, ...sanitized } = updated || {};
      return res.json({ user: sanitized, domainChanged, cascadedCount, newDomain });
    }

    const idx = memoryUsers.findIndex((u) => u.id === id);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });

    const existingUser = memoryUsers[idx];
    if (existingUser.role === 'admin' && newDomain) {
      oldDomain = existingUser.email.split('@')[1]?.trim().toLowerCase() || '';
      if (oldDomain && oldDomain !== newDomain) {
        domainChanged = true;
      }
    }

    memoryUsers[idx] = {
      ...memoryUsers[idx],
      name: name ?? memoryUsers[idx].name,
      dob: dob ?? memoryUsers[idx].dob,
      phone: phone ?? memoryUsers[idx].phone,
      address: address ?? memoryUsers[idx].address,
      bio: bio ?? memoryUsers[idx].bio,
      avatar: avatar ?? memoryUsers[idx].avatar,
      email: email ? email.trim().toLowerCase() : memoryUsers[idx].email,
    };

    let cascadedCount = 0;
    if (domainChanged) {
      memoryUsers = memoryUsers.map((u) => {
        if (u.id === id) return u;
        if (u.role === 'student' || (oldDomain && u.email.endsWith(`@${oldDomain}`))) {
          const localPart = u.email.split('@')[0];
          cascadedCount++;
          return { ...u, email: `${localPart}@${newDomain}` };
        }
        return u;
      });
    }

    const { password: _, ...sanitized } = memoryUsers[idx];
    return res.json({ user: sanitized, domainChanged, cascadedCount, newDomain });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Dedicated Endpoint: Update University Email Domain Master (cascades to all students and admin)
app.post('/api/admin/update-domain', async (req: Request, res: Response) => {
  const { newDomain } = req.body;
  if (!newDomain || typeof newDomain !== 'string') {
    return res.status(400).json({ error: 'Valid domain string is required' });
  }

  const cleanDomain = newDomain.replace(/^@/, '').trim().toLowerCase();
  if (!cleanDomain || !cleanDomain.includes('.')) {
    return res.status(400).json({ error: 'Please provide a valid domain with extension (e.g. nicore.edu.pk)' });
  }

  try {
    let updatedCount = 0;
    if (isMongoConnected) {
      const allUsers = await UserModel.find({});
      for (const u of allUsers) {
        if (u.role === 'admin' || u.role === 'student' || u.email.includes('@')) {
          const localPart = u.email.split('@')[0];
          u.email = `${localPart}@${cleanDomain}`;
          await u.save();
          updatedCount++;
        }
      }
      return res.json({ success: true, updatedCount, newDomain: cleanDomain });
    }

    memoryUsers = memoryUsers.map((u) => {
      if (u.role === 'admin' || u.role === 'student' || u.email.includes('@')) {
        const localPart = u.email.split('@')[0];
        updatedCount++;
        return { ...u, email: `${localPart}@${cleanDomain}` };
      }
      return u;
    });

    return res.json({ success: true, updatedCount, newDomain: cleanDomain });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update Password (by user with current password validation)
app.put('/api/users/:id/password', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }

  try {
    let user: any = null;
    if (isMongoConnected) {
      user = await UserModel.findOne({ id });
      if (!user) return res.status(404).json({ error: 'User not found' });

      if (user.password && user.password !== currentPassword) {
        return res.status(400).json({ error: 'Current password does not match' });
      }

      user.password = newPassword;
      await user.save();
    } else {
      const idx = memoryUsers.findIndex((u) => u.id === id);
      if (idx === -1) return res.status(404).json({ error: 'User not found' });

      if (memoryUsers[idx].password && memoryUsers[idx].password !== currentPassword) {
        return res.status(400).json({ error: 'Current password does not match' });
      }

      memoryUsers[idx].password = newPassword;
    }

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin Add Student or Teacher
app.post('/api/admin/users', async (req: Request, res: Response) => {
  const {
    name,
    email,
    password,
    role,
    department,
    departments,
    rollNumber,
    session,
    designation,
    semester,
    dob,
    phone,
    address,
    bio,
  } = req.body;

  if (!name || !email || !role) {
    return res.status(400).json({ error: 'Name, email, and role are required' });
  }

  const assignedDepts: string[] = Array.isArray(departments) && departments.length > 0
    ? departments
    : department ? [department] : ['Computer Science'];

  const newUser: any = {
    id: `usr-${role}-${Date.now()}`,
    name,
    email: email.trim().toLowerCase(),
    password: password || 'password123',
    role,
    departments: assignedDepts,
    rollNumber: role === 'student' ? rollNumber || '1' : undefined,
    session: role === 'student' ? Number(session) || 2026 : undefined,
    designation: role === 'teacher' ? designation || 'Assistant Professor' : undefined,
    semester: role === 'student' ? Number(semester) || 1 : undefined,
    cgpa: role === 'student' ? 3.5 : undefined,
    creditsEarned: 0,
    dob: dob || '2002-01-01',
    phone: phone || '',
    address: address || '',
    bio: bio || '',
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0F172A&color=fff`,
  };

  try {
    if (isMongoConnected) {
      await UserModel.create(newUser);
    } else {
      memoryUsers.push(newUser);
    }

    const { password: _, ...sanitized } = newUser;
    return res.json({ user: sanitized, success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin Update Student or Teacher
app.put('/api/admin/users/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = { ...req.body };

  if (updates.department && !updates.departments) {
    updates.departments = [updates.department];
  }
  delete updates.department;

  try {
    if (isMongoConnected) {
      const updated = await UserModel.findOneAndUpdate(
        { id },
        { $set: updates, $unset: { department: '' } },
        { new: true }
      ).lean();
      if (!updated) return res.status(404).json({ error: 'User not found' });
      const { password: _, ...sanitized } = updated;
      return res.json({ user: sanitized, success: true });
    }

    const idx = memoryUsers.findIndex((u) => u.id === id);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });

    memoryUsers[idx] = { ...memoryUsers[idx], ...updates };
    delete memoryUsers[idx].department;
    const { password: _, ...sanitized } = memoryUsers[idx];
    return res.json({ user: sanitized, success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin Delete Student or Teacher
app.delete('/api/admin/users/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    if (isMongoConnected) {
      const deleteCondition = mongooseLib.isValidObjectId(id)
        ? { $or: [{ id }, { _id: id }] }
        : { id };

      const deleted = await UserModel.findOneAndDelete(deleteCondition);
      console.log(`[Delete User] Deleted user:`, id, deleted ? deleted.name : 'Not found in DB');

      await EnrollmentModel.deleteMany({ studentId: id });
      await GradeModel.deleteMany({ studentId: id });
      await CourseModel.updateMany(
        { teacherId: id },
        { $set: { teacherId: '', teacherName: 'Unassigned Faculty' } }
      );
    } else {
      memoryUsers = memoryUsers.filter((u) => u.id !== id);
      memoryEnrollments = memoryEnrollments.filter((e) => e.studentId !== id);
      memoryGrades = memoryGrades.filter((g) => g.studentId !== id);
      memoryCourses = memoryCourses.map((c) =>
        c.teacherId === id ? { ...c, teacherId: '', teacherName: 'Unassigned Faculty' } : c
      );
    }

    return res.json({ success: true, message: 'User deleted successfully' });
  } catch (err: any) {
    console.error('[Delete User Error]', err);
    return res.status(500).json({ error: err.message });
  }
});

// Admin Reset Password (for any user or self)
app.post('/api/admin/users/:id/reset-password', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }

  try {
    if (isMongoConnected) {
      const user = await UserModel.findOne({ id });
      if (!user) return res.status(404).json({ error: 'User not found' });
      user.password = newPassword;
      await user.save();
    } else {
      const idx = memoryUsers.findIndex((u) => u.id === id);
      if (idx === -1) return res.status(404).json({ error: 'User not found' });
      memoryUsers[idx].password = newPassword;
    }

    return res.json({ success: true, message: 'Password has been successfully reset' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Department Management Routes
// -------------------------------------------------------------

// List all departments
app.get('/api/departments', async (_req: Request, res: Response) => {
  try {
    if (isMongoConnected) {
      const depts = await DepartmentModel.find().lean();
      return res.json({ departments: depts && depts.length > 0 ? depts : memoryDepartments });
    }
    return res.json({ departments: memoryDepartments });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin Add Department
app.post('/api/admin/departments', async (req: Request, res: Response) => {
  const { name, code, hodId, hodName, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Department name is required' });
  }
  if (!code || !code.trim()) {
    return res.status(400).json({ error: 'Department abbreviation code is required' });
  }

  const cleanName = name.trim();
  const cleanCode = code.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  try {
    if (isMongoConnected) {
      // Check duplicate name
      const existingName = await DepartmentModel.findOne({
        name: { $regex: new RegExp(`^${cleanName}$`, 'i') },
      });
      if (existingName) {
        return res.status(400).json({ error: `Department "${cleanName}" already exists` });
      }

      // Check duplicate code
      const existingCode = await DepartmentModel.findOne({
        code: cleanCode,
      });
      if (existingCode) {
        return res.status(400).json({
          error: `Abbreviation "${cleanCode}" is already in use by department "${existingCode.name}"`,
        });
      }

      // Check HOD uniqueness if assigned
      if (hodId && hodId.trim()) {
        const existingHodDept = await DepartmentModel.findOne({ hodId: hodId.trim() });
        if (existingHodDept) {
          return res.status(400).json({
            error: `Selected faculty member is already the appointed HOD for "${existingHodDept.name}". A faculty member can only head one department.`,
          });
        }
      }

      const newDept = new DepartmentModel({
        id: `dept-${Date.now()}`,
        name: cleanName,
        code: cleanCode,
        hodId: hodId ? hodId.trim() : '',
        hodName: hodName ? hodName.trim() : '',
        description: description ? description.trim() : '',
      });

      await newDept.save();
      const saved = newDept.toObject();
      return res.status(201).json({ department: saved, success: true });
    } else {
      const duplicateName = memoryDepartments.find(
        (d) => d.name.trim().toLowerCase() === cleanName.toLowerCase()
      );
      if (duplicateName) {
        return res.status(400).json({ error: `Department "${cleanName}" already exists` });
      }

      const duplicateCode = memoryDepartments.find(
        (d) => d.code.trim().toLowerCase() === cleanCode
      );
      if (duplicateCode) {
        return res.status(400).json({
          error: `Abbreviation "${cleanCode}" is already in use by department "${duplicateCode.name}"`,
        });
      }

      if (hodId && hodId.trim()) {
        const existingHod = memoryDepartments.find((d) => d.hodId === hodId.trim());
        if (existingHod) {
          return res.status(400).json({
            error: `Selected faculty member is already the appointed HOD for "${existingHod.name}". A faculty member can only head one department.`,
          });
        }
      }

      const newDept = {
        id: `dept-${Date.now()}`,
        name: cleanName,
        code: cleanCode,
        hodId: hodId ? hodId.trim() : '',
        hodName: hodName ? hodName.trim() : '',
        description: description ? description.trim() : '',
      };
      memoryDepartments.push(newDept);
      return res.status(201).json({ department: newDept, success: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin Update Department
app.put('/api/admin/departments/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, code, hodId, hodName, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Department name is required' });
  }
  if (!code || !code.trim()) {
    return res.status(400).json({ error: 'Department abbreviation code is required' });
  }

  const cleanName = name.trim();
  const cleanCode = code.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  try {
    if (isMongoConnected) {
      // Check duplicate name on other depts
      const existingName = await DepartmentModel.findOne({
        id: { $ne: id },
        name: { $regex: new RegExp(`^${cleanName}$`, 'i') },
      });
      if (existingName) {
        return res.status(400).json({ error: `Department "${cleanName}" already exists` });
      }

      // Check duplicate code on other depts
      const existingCode = await DepartmentModel.findOne({
        id: { $ne: id },
        code: cleanCode,
      });
      if (existingCode) {
        return res.status(400).json({
          error: `Abbreviation "${cleanCode}" is already in use by department "${existingCode.name}"`,
        });
      }

      // Check HOD uniqueness on other depts
      if (hodId && hodId.trim()) {
        const existingHodDept = await DepartmentModel.findOne({
          id: { $ne: id },
          hodId: hodId.trim(),
        });
        if (existingHodDept) {
          return res.status(400).json({
            error: `Selected faculty member is already the appointed HOD for "${existingHodDept.name}". A faculty member can only head one department.`,
          });
        }
      }

      const existingDept = await DepartmentModel.findOne({ id });
      if (!existingDept) {
        return res.status(404).json({ error: 'Department not found' });
      }

      const oldName = existingDept.name;
      existingDept.name = cleanName;
      existingDept.code = cleanCode;
      existingDept.hodId = hodId ? hodId.trim() : '';
      existingDept.hodName = hodName ? hodName.trim() : '';
      if (description !== undefined) existingDept.description = description.trim();

      await existingDept.save();

      // If department was renamed, cascade update to users and courses
      if (oldName !== cleanName) {
        await UserModel.updateMany({ departments: oldName }, { $set: { 'departments.$': cleanName } });
        await CourseModel.updateMany({ department: oldName }, { $set: { department: cleanName } });
      }

      return res.json({ department: existingDept.toObject(), success: true });
    } else {
      const idx = memoryDepartments.findIndex((d) => d.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Department not found' });

      const duplicateName = memoryDepartments.find(
        (d) => d.id !== id && d.name.trim().toLowerCase() === cleanName.toLowerCase()
      );
      if (duplicateName) {
        return res.status(400).json({ error: `Department "${cleanName}" already exists` });
      }

      const duplicateCode = memoryDepartments.find(
        (d) => d.id !== id && d.code.trim().toLowerCase() === cleanCode
      );
      if (duplicateCode) {
        return res.status(400).json({
          error: `Abbreviation "${cleanCode}" is already in use by department "${duplicateCode.name}"`,
        });
      }

      if (hodId && hodId.trim()) {
        const existingHod = memoryDepartments.find((d) => d.id !== id && d.hodId === hodId.trim());
        if (existingHod) {
          return res.status(400).json({
            error: `Selected faculty member is already the appointed HOD for "${existingHod.name}". A faculty member can only head one department.`,
          });
        }
      }

      const oldName = memoryDepartments[idx].name;
      memoryDepartments[idx] = {
        ...memoryDepartments[idx],
        name: cleanName,
        code: cleanCode,
        hodId: hodId ? hodId.trim() : '',
        hodName: hodName ? hodName.trim() : '',
        description: description !== undefined ? description.trim() : memoryDepartments[idx].description,
      };

      if (oldName !== cleanName) {
        memoryUsers = memoryUsers.map((u) => {
          const depts = (u.departments || []).map((d: string) => (d === oldName ? cleanName : d));
          return { ...u, departments: depts };
        });
        memoryCourses = memoryCourses.map((c) => (c.department === oldName ? { ...c, department: cleanName } : c));
      }

      return res.json({ department: memoryDepartments[idx], success: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin Delete Department
app.delete('/api/admin/departments/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    if (isMongoConnected) {
      await DepartmentModel.deleteOne({ id });
    } else {
      memoryDepartments = memoryDepartments.filter((d) => d.id !== id);
    }
    return res.json({ success: true, message: 'Department deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin Add Course
app.post('/api/courses', async (req: Request, res: Response) => {
  const courseData = req.body;
  const newCourse = {
    ...courseData,
    id: `crs-${Date.now()}`,
    enrolledCount: 0,
  };

  try {
    if (isMongoConnected) {
      await CourseModel.create(newCourse);
    } else {
      memoryCourses.unshift(newCourse);
    }
    return res.json({ course: newCourse });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin Update Course
app.put('/api/courses/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    if (isMongoConnected) {
      const updated = await CourseModel.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
      return res.json({ course: updated });
    }
    const idx = memoryCourses.findIndex((c) => c.id === id);
    if (idx !== -1) {
      memoryCourses[idx] = { ...memoryCourses[idx], ...updates };
      return res.json({ course: memoryCourses[idx] });
    }
    return res.status(404).json({ error: 'Course not found' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin Delete Course
app.delete('/api/courses/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    if (isMongoConnected) {
      await CourseModel.deleteOne({ id });
      await EnrollmentModel.deleteMany({ courseId: id });
    } else {
      memoryCourses = memoryCourses.filter((c) => c.id !== id);
      memoryEnrollments = memoryEnrollments.filter((e) => e.courseId !== id);
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin Toggle Semester Registration
app.put('/api/semesters/:id/toggle-reg', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    if (isMongoConnected) {
      const sem = await SemesterModel.findOne({ id });
      if (sem) {
        sem.isRegistrationOpen = !sem.isRegistrationOpen;
        await sem.save();
        return res.json({ semester: sem });
      }
    } else {
      const idx = memorySemesters.findIndex((s) => s.id === id);
      if (idx !== -1) {
        memorySemesters[idx].isRegistrationOpen = !memorySemesters[idx].isRegistrationOpen;
        return res.json({ semester: memorySemesters[idx] });
      }
    }
    return res.status(404).json({ error: 'Semester not found' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin Add Semester
app.post('/api/admin/semesters', async (req: Request, res: Response) => {
  const { name, code, number, startDate, endDate, isRegistrationOpen, isCurrent } = req.body;

  if (!name || !code || number === undefined || number === null) {
    return res.status(400).json({ error: 'Name, code, and semester number are required' });
  }

  const semNum = Number(number);
  if (isNaN(semNum) || semNum < 1 || semNum > 8) {
    return res.status(400).json({ error: 'Semester number must be between 1 and 8' });
  }

  try {
    if (isMongoConnected) {
      const count = await SemesterModel.countDocuments();
      if (count >= 8) {
        return res.status(400).json({ error: 'Maximum limit of 8 semesters reached. No more semesters can be created.' });
      }
      const existing = await SemesterModel.findOne({ number: semNum });
      if (existing) {
        return res.status(400).json({ error: `Semester number ${semNum} already exists (${existing.name}).` });
      }

      if (isCurrent) {
        await SemesterModel.updateMany({}, { $set: { isCurrent: false } });
      }

      const newSem = {
        id: `sem-${Date.now()}`,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        number: semNum,
        startDate: startDate || new Date().toISOString().slice(0, 10),
        endDate: endDate || new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10),
        isRegistrationOpen: isRegistrationOpen !== undefined ? Boolean(isRegistrationOpen) : true,
        isCurrent: Boolean(isCurrent),
      };

      await SemesterModel.create(newSem);
      return res.json({ semester: newSem, success: true });
    }

    if (memorySemesters.length >= 8) {
      return res.status(400).json({ error: 'Maximum limit of 8 semesters reached. No more semesters can be created.' });
    }
    const existing = memorySemesters.find((s) => s.number === semNum);
    if (existing) {
      return res.status(400).json({ error: `Semester number ${semNum} already exists (${existing.name}).` });
    }

    if (isCurrent) {
      memorySemesters = memorySemesters.map((s) => ({ ...s, isCurrent: false }));
    }

    const newSem = {
      id: `sem-${Date.now()}`,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      number: semNum,
      startDate: startDate || new Date().toISOString().slice(0, 10),
      endDate: endDate || new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10),
      isRegistrationOpen: isRegistrationOpen !== undefined ? Boolean(isRegistrationOpen) : true,
      isCurrent: Boolean(isCurrent),
    };

    memorySemesters.unshift(newSem);
    return res.json({ semester: newSem, success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin Update Semester
app.put('/api/admin/semesters/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    if (updates.number !== undefined && updates.number !== null) {
      const num = Number(updates.number);
      if (isNaN(num) || num < 1 || num > 8) {
        return res.status(400).json({ error: 'Semester number must be between 1 and 8' });
      }
      updates.number = num;

      if (isMongoConnected) {
        const conflict = await SemesterModel.findOne({ id: { $ne: id }, number: num });
        if (conflict) {
          return res.status(400).json({ error: `Semester number ${num} is already used by ${conflict.name}.` });
        }
      } else {
        const conflict = memorySemesters.find((s) => s.id !== id && s.number === num);
        if (conflict) {
          return res.status(400).json({ error: `Semester number ${num} is already used by ${conflict.name}.` });
        }
      }
    }

    if (updates.isCurrent) {
      if (isMongoConnected) {
        await SemesterModel.updateMany({ id: { $ne: id } }, { $set: { isCurrent: false } });
      } else {
        memorySemesters = memorySemesters.map((s) => (s.id === id ? s : { ...s, isCurrent: false }));
      }
    }

    if (isMongoConnected) {
      const updated = await SemesterModel.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
      if (!updated) return res.status(404).json({ error: 'Semester not found' });
      return res.json({ semester: updated, success: true });
    }

    const idx = memorySemesters.findIndex((s) => s.id === id);
    if (idx !== -1) {
      memorySemesters[idx] = { ...memorySemesters[idx], ...updates };
      return res.json({ semester: memorySemesters[idx], success: true });
    }
    return res.status(404).json({ error: 'Semester not found' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin Delete Semester
app.delete('/api/admin/semesters/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    if (isMongoConnected) {
      await SemesterModel.deleteOne({ id });
      await CourseModel.updateMany({ semesterId: id }, { $set: { semesterId: '' } });
    } else {
      memorySemesters = memorySemesters.filter((s) => s.id !== id);
      memoryCourses = memoryCourses.map((c) => (c.semesterId === id ? { ...c, semesterId: '' } : c));
    }
    return res.json({ success: true, message: 'Semester deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Start Server & Mount Vite in Dev
// -------------------------------------------------------------
async function startServer() {
  await initMongoDB();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[Server] UniCore LMS Server running at http://localhost:${PORT}`);
  });
}

startServer();
