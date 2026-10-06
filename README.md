# UniCore Enterprise LMS (Learning & Academic Management System)

A high-performance, full-stack University Academic Management & Learning Platform built with React 19, TypeScript, Tailwind CSS, Express, and MongoDB.

---

## 📖 Table of Contents

- [System Architecture & Roles](#-system-architecture--roles)
- [Semester & Course Registration Architecture](#-semester--course-registration-architecture)
  - [Registration Window Toggle](#registration-window-toggle)
- [Course & Faculty Filtering Systems](#-course--faculty-filtering-systems)
  - [Courses Directory Filtering](#courses-directory-filtering)
  - [Faculty Directory Table & Multi-Criteria Filtering](#faculty-directory-table--multi-criteria-filtering)
  - [Dynamic Admin Analytics Filtering](#dynamic-admin-analytics-filtering-system-analytics--metrics)
- [Student Semester Progression & Credit-Hour Backlog Architecture](#-student-semester-progression--credit-hour-backlog-architecture)
  - [1. Student Onboarding Rules](#1-student-creation--onboarding-rules)
  - [2. Automated Semester Promotion Engine & Backlogs](#2-automated-semester-promotion-engine-credit-hour-progression--backlogs)
  - [3. Dual-Section Course Registration Portal](#3-dual-section-course-registration-portal-with-backlog-retakes)
  - [4. Super Admin Manual Override & Audit Trail](#4-super-admin-manual-override--audit-trail)
- [Technical Stack & Development](#-technical-stack--development)
- [User Manual](#-user-manual)

---

## 🏛️ System Architecture & Roles

UniCore LMS provides unified role-based workflows for three core academic personas:

1. **Administrator (Registrar & Dean Office)**
   - Governance over up to 8 Academic Semesters (curriculum catalog, duration dates, per-semester registration window permissions, batch progression engine).
   - University Course Directory (scheduling, credit hours, venues, capacities, faculty assignments).
   - Academic Departments & Degree Programs (codes, titles, HOD assignments).
   - Student Candidate Directory with automated Roll Number generation (`<Year>-<Dept>-<Roll>`) and official university email creation.
   - Faculty Directory, department affiliations, and password resets.
   - Institutional domain cascade management (e.g. `@uet.edu.pk`).

2. **Faculty (Professors & Instructors)**
   - Course section selector and real-time student roster.
   - Continuous evaluations (Quizzes 15%, Assignments 25%, Midterm 25%, Final Exam 35%).
   - Dynamic letter grades (A, B+, B, C, F) and GPA calculation.
   - Attendance marking and automated low-attendance warnings (<75%).
   - Class broadcasts and automated rescheduling notifications.

3. **Student**
   - Semester course registration with seat capacity checks, pending backlog retakes, and 21 credit ceiling enforcement.
   - Real-time transcript, component-wise grade breakdown, and Cumulative GPA (CGPA) monitoring.
   - Attendance percentage tracking and automated email alerts.

---

## 🔄 Semester & Course Registration Architecture

Course enrollment permissions in UniCore LMS are governed directly and exclusively on a per-semester basis:

> **Architecture Note:** The redundant global "Current Term" column and obsolete master toggle buttons have been completely removed from the system. Student enrollment eligibility is managed strictly per-semester via the dedicated "Registration Window" toggle.

### "Registration Window" Toggle
- **Location:** In the *Registration Window* column of each row in the *Academic Semesters Directory* table.
- **States:** 
  - 🟢 **Open (Toggle):** Students eligible for this semester can actively register for, add, or drop courses in their Student Portal.
  - 🔴 **Closed (Toggle):** Course enrollment is strictly locked for this semester. Students cannot modify their registrations after the institutional deadline has passed.
- **Workflow:** Administrators open the window during registration and add/drop periods and close it to freeze enrollments before final fee clearances.

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
- **Backend API:** Dedicated aggregation endpoint `GET /api/admin/analytics?department=...&semesterId=...` for full-stack reporting.

---

## 🎓 Student Semester Progression & Credit-Hour Backlog Architecture

UniCore LMS incorporates university degree progression rules, automated term result evaluation, backlog course tagging, and strict administrative audit logging.

### 1. Student Creation & Onboarding Rules
- **Fresh Admissions:** When creating a fresh student, the system automatically sets `current_semester = 1` and locks the field. Fresh students must always start at the foundational first semester.
- **Transfer / Lateral Entry:** For students entering with recognized external credits, the starting semester dropdown displays **only the active semesters available in the system** (e.g. if 3 semesters exist, only those 3 are shown, preventing invalid term selection).
- **Session (Enrollment Year) Calendar Date Picker:** Enrollment session year is selected via an interactive calendar date picker with today's current date selected by default. The 4-digit year is extracted directly from the calendar date.
- **Dynamic Credential Generation:** The extracted year dynamically generates the student's official Roll Number (`<Year>-<Dept>-<Roll>`, e.g., `2026-cs-01`) and Institutional Email (`<Year>-<Dept>-<Roll>@domain`, e.g., `2026-cs-01@uet.edu.pk`) with live preview badges.
- **Default Academic Status:** Automatically initialized to `active`.

### 2. Automated Semester Promotion Engine (Credit-Hour Progression & Backlogs)
- **Batch Evaluation:** In the *Academic Semesters Directory*, administrators can click **"Declare Results & Promote"** to execute credit-hour progression auditing across all cohort candidates.
- **Course Audit & Reconciliation:**
  - Evaluates student registrations against the official term curriculum for their department.
  - **Passed Courses:** Grade quality points and credit hours are added to cumulative earned credits and GPA. (Clears previously logged backlogs).
  - **Failed Courses (Grade F / <50%):** Automatically tagged into the student's persistent `backlogCourses` array with `reason: 'failed'`.
  - **Missed / Unenrolled Courses:** Any curriculum course from that term that the student never registered for is identified and tagged into `backlogCourses` with `reason: 'missed'`.
- **Sequential Semester Progression:**
  - **Continuing Terms (< Semester 8):** All students advance sequentially to the next semester (`current_semester += 1`). Full-semester detention/year-back is eliminated.
  - **Academic Standing:**
    - **Active Standing:** Cumulative GPA $\ge 2.00$.
    - **Academic Probation:** Cumulative GPA $< 2.00$ (candidate is still promoted, but placed on academic probation advisory).
  - **Final Term (Semester 8 Graduation Audit):**
    - **Conferred Graduation:** Awarded (`graduated`) when all required credit hours ($\ge 130$ credits) are earned and **zero pending backlogs** exist.
    - **Graduation Deferred:** If any backlog courses remain, candidate maintains status (`pending_graduation`) at Semester 8 until repeat courses are cleared.
- **Batch Promotion Audit & Evaluation Modal:**
  - Summary KPI metrics: Total Evaluated, Promoted (Active), Promoted on Probation, Carrying Backlogs, Graduated, and Pending Graduation.
  - Candidate filter tabs: All, Promoted, On Probation, Carrying Backlogs, Graduated.
  - Roster breakdown with candidate profile, evaluated term GPA, cumulative CGPA, progression transition, standing badge, backlog tags, and academic justification.
- **Electronic Result Notices:** Dispatches automated email notifications detailing term GPA, cumulative CGPA, updated semester number, probation advisories, and breakdown of backlog courses.

### 3. Dual-Section Course Registration Portal (with Backlog Retakes)
- **Academic Standing Warning:** Students with CGPA $< 2.00$ receive an academic probation alert banner advising them to prioritize repeating backlog courses.
- **Pending / Repeat Courses (Backlogs):** Dedicated top section in the course registration portal listing all failed or unattempted courses from prior terms with "Must Repeat / Retake" badges and direct repeat enrollment.
- **Regular Semester Offerings:** Displays offerings for their newly promoted semester with real-time seat capacity checks.
- **Workload Ceiling:** Enforces the university maximum workload limit (18 to 21 credit hours combined across regular and repeat courses) to prevent student overextension.
- **Registration Window Enforcement:** Controlled in real-time per-semester by the admin "Registration Window" toggle button.

### 4. Super Admin Manual Override & Audit Trail
- **Role-Based Restriction:** Restricted strictly to Super Admin or Academic Controller roles.
- **Dynamic Curriculum Semesters:** The target semester dropdown strictly offers only the semesters active in the curriculum.
- **Session & Credential Synchronization:** Administrators can adjust the student's enrollment session date via calendar picker directly in the override modal, automatically re-synchronizing the student's Roll Number and institutional email in real time.
- **Mandatory Justification:** Every manual change requires a non-empty audit reason (e.g., credit transfer evaluation, grade rechecking correction, council dispensation). Empty justifications are rejected by both client and backend validation middlewares.
- **Automatic Status Synchronization:** Advancing a student on probation or repeat status synchronizes academic status and records audit history.
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
