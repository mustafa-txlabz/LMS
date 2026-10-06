# UniCore Enterprise LMS (Learning & Academic Management System)

A high-performance, full-stack University Academic Management & Learning Platform built with React 19, TypeScript, Tailwind CSS, Express, and MongoDB.

---

## 📖 Table of Contents

- [System Architecture & Roles](#system-architecture--roles)
- [Key Features](#key-features)
- [Semester & Course Registration Architecture](#semester--course-registration-architecture)
  - [Registration Window Toggle](#1-registration-window-toggle)
  - [Current Term Switcher](#2-current-term-switcher)
  - [Active Term Master Shortcut](#3-active-term-master-shortcut)
- [Course Filtering System](#course-filtering-system)
- [Technical Stack & Development](#technical-stack--development)
- [User Manual](#user-manual)

---

## 🏛️ System Architecture & Roles

UniCore LMS provides unified role-based workflows for three core academic personas:

1. **Administrator (Registrar & Dean Office)**
   - Governance over up to 8 Academic Semesters (terms, date windows, registration permissions).
   - University Course Directory (scheduling, credit hours, venues, capacities, faculty assignments).
   - Academic Departments & Degree Programs (codes, titles, HOD assignments).
   - Student Candidate Directory with automated Roll Number generation (`<Year>-<Dept>-<Roll>`) and official university email creation.
   - Faculty Directory, department affiliations, and password resets.
   - Institutional domain cascade management (e.g. `@nicore.edu.pk`).

2. **Faculty (Professors & Instructors)**
   - Course section selector and real-time student roster.
   - Continuous evaluations (Quizzes 15%, Assignments 25%, Midterm 25%, Final Exam 35%).
   - Dynamic letter grades (A, B+, B, C, F) and GPA calculation.
   - Attendance marking and automated low-attendance warnings (<75%).
   - Class broadcasts and automated rescheduling notifications.

3. **Student**
   - Semester course registration with seat capacity checks and credit limits.
   - Real-time transcript, component-wise grade breakdown, and Cumulative GPA (CGPA) monitoring.
   - Attendance percentage tracking and automated email alerts.

---

## 🔄 Semester & Course Registration Architecture

The application implements a robust, tamper-proof academic term system centered around three interconnected controls:

### 1. "Registration Window" Toggle
- **Location:** Inside each row of the *Academic Semesters Directory* table.
- **States:** 
  - 🟢 **Open (Toggle):** Students are actively permitted to register, add, and drop courses in this term.
  - 🔴 **Closed (Toggle):** Course enrollment is strictly locked. Students cannot modify their schedules once the deadline has passed.
- **Workflow:** Administrators open the window during registration/add-drop week and close it to freeze enrollments before final fee clearances.

### 2. "Current Term" Switcher
- **Location:** In the *Current Term* column of the Semesters Directory table.
- **Function:** Designates the university's primary active term (`isCurrent: true`).
- **Enforcement:** Enforces single-active-term discipline—selecting any semester automatically unsets the flag on all other terms.
- **Impact:** New courses automatically pre-fill with this semester, student views prioritize this semester's schedule, and system announcements anchor to this term.

### 3. Active Term Master Shortcut
- **Location:** Positioned in the *Academic Courses Directory* filter bar (e.g., `Fall 2026: Registration Open`).
- **Function:** Provides a 1-click global toggle for the active Current Term's registration window directly while managing courses, eliminating the need to navigate back up to the semester directory.
- **Bidirectional Sync:** Clicking this shortcut instantly updates the semester row badge above and synchronizes the student portal in real time.

---

## 🔍 Course & Faculty Filtering Systems

### Courses Directory Filtering
- **Filter Semester:** Dropdown strictly populated with active configured terms from the Semesters Directory (e.g., `All Configured Semesters`, `Fall 2026 (Semester 5)`, `Spring 2026 (Semester 4)`).
- **Filter Department:** Dropdown populated with registered university faculties (e.g., `Computer Science (CS)`, `Software Engineering (SE)`, `Electrical Engineering (EE)`), with live course counts.
- **Search Box:** Fixed-width, non-collapsible search field with real-time matching across course code, title, teacher name, and department, plus an instant clear (`×`) button.
- **Quick Reset:** A dedicated `Reset` button appears whenever any combination of filters or search queries is active.

### Faculty Directory Table & Multi-Criteria Filtering
- **Table Presentation:** Clean tabular layout presenting instructor profile (avatar, name, email), affiliated departments, academic designation, leadership/HOD status (`👑 HOD`), assigned course badges, and direct actions.
- **Filter Department:** Dropdown with all university departments and real-time faculty headcounts.
- **Filter HOD:** Dropdown with options for `All Faculty`, `👑 Heads of Department Only`, and `Faculty Members Only`.
- **Search Box:** Instant filtering across instructor name, email, academic designation, department title, phone number, and assigned course codes.
- **Reset Controls:** Dedicated `Reset` button when any filter or query is active, with full synchronization if departments are modified.

### Dynamic Admin Analytics Filtering ("System Analytics & Metrics")
- **Header Filter Bar:** Responsive filter bar situated above the KPI metric cards with "Filter Department" (default: `All Departments`), "Filter Semester" (default: `All Semesters`), and a dynamic `Reset Filters` button.
- **Multi-Criteria Scope Logic:**
  - **Overall Aggregation (Default):** University-wide metrics across all departments and semesters.
  - **Department-Specific:** Enrolled students, courses, seatings, attendance, GPA, and grades filter strictly to that department. Faculty Members count reflects faculty affiliated with the department.
  - **Semester-Specific:** Students, courses, seatings, attendance, GPA, and grades filter strictly to that semester cohort. **Critical Rule:** Faculty members have no direct binding to a specific semester, so the semester filter is ignored on the Faculty Members card, displaying total university faculty.
  - **Intersection (Both Selected):** Metrics compute for the specific department in that term. Faculty count depends exclusively on the selected department.
- **Interactive Visualizations & Zero-Cohort Integrity:**
  - **Zero-Student Handling:** If a selected department or semester filter has 0 students, metrics accurately reflect reality: Avg Attendance is `0%` (neutral `No student records` subtext, suppressing green threshold highlights), Avg GPA is `0.00` (`No enrolled students`), Attendance Audit Health displays `0% (No Cohort)` with neutral progress bars, and the Bell Curve displays `0%` with clear empty status.
  - **Grade Distribution:** Bell curve bar chart re-calculates counts and percentage of students in Good Academic Standing (CGPA &ge; 2.00).
  - **Departmental Enrollments:** Displays comparative headcounts when all departments are viewed, or an in-depth semester-by-semester breakdown / cohort profile when a specific department is chosen.
  - **Attendance Audit Health:** Dynamically re-evaluates physical attendance compliance (Eligible &ge;75%, Warning 60-74%, Debarred &lt;60%) with real-time progress bars.
- **Registration Window Quick Switcher:** Dedicated one-click registration window toggle button in the Analytics header (`[Active Term Name]: Open/Closed (Toggle)`), allowing the Registrar to open or freeze enrollment windows university-wide with immediate client and database synchronization.
- **Backend API:** Dedicated aggregation endpoint `GET /api/admin/analytics?department=...&semesterId=...` for full-stack reporting.

---

## 🎓 Student Semester Progression & Management

UniCore LMS incorporates university degree progression rules, automated term result evaluation, and strict administrative audit logging.

### 1. Student Creation & Onboarding Rules
- **Fresh Admissions:** When creating a fresh student, the system automatically sets `current_semester = 1` and locks the field. Fresh students must always start at the foundational first semester.
- **Transfer / Lateral Entry:** For students entering with recognized external credits, the starting semester dropdown displays **only the active semesters available in the system** (e.g. if 3 semesters exist, only those 3 are shown, preventing invalid term selection).
- **Session (Enrollment Year) Calendar Date Picker:** Enrollment session year is selected via an interactive calendar date picker with today's current date selected by default. The 4-digit year is extracted directly from the calendar date.
- **Dynamic Credential Generation:** The extracted year dynamically generates the student's official Roll Number (`<Year>-<Dept>-<Roll>`, e.g., `2026-cs-01`) and Institutional Email (`<Year>-<Dept>-<Roll>@domain`, e.g., `2026-cs-01@nicore.edu.pk`) with live preview badges.
- **Default Academic Status:** Automatically initialized to `active`.

### 2. Automated Semester Promotion Engine (Batch Processing)
- **Batch Evaluation:** In the *Semesters Directory*, administrators can trigger **"Declare Results & Promote"** to run batch progression analysis across all cohort candidates.
- **Passing Threshold:** Checks that candidates achieve a Minimum CGPA &ge; 2.00 (HEC standard) and successfully earn required credit hours.
- **Promotion Decision:**
  - **Pass:** Increments `current_semester` by 1 (`current_semester += 1`) and maintains `active` status (or graduates candidate if completing final term).
  - **Fail / Under-Criteria (Detention & Repeat Policy):** Does **NOT** increment `current_semester`. Semester remains unchanged, status is updated to `detained`, and unearned courses must be repeated.
  - **Notifications:** Dispatches automated institutional result alerts to each evaluated student.

### 3. Super Admin Manual Override & Audit Trail
- **Role-Based Restriction:** Restricted strictly to Super Admin or Academic Controller roles.
- **Dynamic Curriculum Semesters:** The target semester dropdown strictly offers only the semesters active in the curriculum.
- **Session & Credential Synchronization:** Administrators can adjust the student's enrollment session date via calendar picker directly in the override modal, automatically re-synchronizing the student's Roll Number and institutional email in real time.
- **Mandatory Justification:** Every manual change requires a non-empty audit reason (e.g., credit transfer evaluation, grade rechecking correction, council dispensation). Empty justifications are rejected by both client and backend validation middlewares.
- **Automatic Status Synchronization:** Advancing a `detained` student manually clears the restriction and synchronizes academic status back to `active`.
- **Immutable Audit Logging:** All manual and batch progression events are logged with student ID, roll number, performing admin, previous & new semesters, previous & new statuses, justification, and UTC timestamp.
- **Audit Logs Tab:** Accessible directly from the top navigation bar (`Audit Logs`) with full-text search, event count badges, and complete progression history.

---

## 🛠️ Technical Stack & Development

- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide React Icons.
- **Backend:** Node.js, Express, tsx.
- **Database:** MongoDB Atlas with Mongoose (with automated in-memory persistence fallback).
- **Tooling:** Vite, ESLint, TypeScript Compiler (`tsc`).

### Running the Project

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run TypeScript checks and linting
npm run lint

# Build for production
npm run build
```

---

## 📄 User Manual

For an in-depth, step-by-step user guide explaining every button, modal, and role workflow in plain language, please refer to:
- [`manual.txt`](./manual.txt) (Plain-text user manual)
