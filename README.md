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

## 🔍 Course Filtering System

The Courses Directory includes a non-collapsible, responsive filter bar:

- **Filter Semester:** Dropdown strictly populated with active configured terms from the Semesters Directory (e.g., `All Configured Semesters`, `Fall 2026 (Semester 5)`, `Spring 2026 (Semester 4)`).
- **Filter Department:** Dropdown populated with registered university faculties (e.g., `Computer Science (CS)`, `Software Engineering (SE)`, `Electrical Engineering (EE)`), with live course counts.
- **Search Box:** Fixed-width, non-collapsible search field with real-time matching across course code, title, teacher name, and department, plus an instant clear (`×`) button.
- **Quick Reset:** A dedicated `Reset` button appears whenever any combination of filters or search queries is active.

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
