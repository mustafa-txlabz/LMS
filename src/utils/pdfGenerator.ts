import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { User, Course, StudentMarks } from '../types';
import { formatStudentRollNumber, getUserPrimaryDepartment } from './studentEmail';

export interface StudentGradeRow {
  course: Course;
  marks: StudentMarks | null;
}

export interface StudentAttendanceRow {
  course: Course;
  totalLectures: number;
  attended: number;
  absent: number;
  late: number;
  percentage: number;
  isEligible: boolean;
}

/**
 * Generates an official Semester Academic Transcript & Grade Report PDF
 */
export function generateAcademicTranscriptPDF(
  student: User,
  semesterName: string,
  coursesWithMarks: StudentGradeRow[],
  stats: {
    totalCredits: number;
    semesterGpa: number;
    cgpa?: number;
  }
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // University Header Border Top Strip
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 6, 'F');

  doc.setFillColor(30, 58, 138); // blue-900
  doc.rect(0, 6, pageWidth, 2, 'F');

  // University Name & Letterhead
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('UNICORE UNIVERSITY OF ADVANCED TECHNOLOGY', pageWidth / 2, 20, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('OFFICE OF THE REGISTRAR & CONTROLLER OF EXAMINATIONS', pageWidth / 2, 25, { align: 'center' });
  doc.text('University Campus Way · Academic District · www.unicore.edu', pageWidth / 2, 29, { align: 'center' });

  // Divider line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 33, pageWidth - 14, 33);

  // Document Title Banner
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 37, pageWidth - 28, 12, 1.5, 1.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 37, pageWidth - 28, 12, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`OFFICIAL SEMESTER GRADE REPORT · ${semesterName.toUpperCase()}`, pageWidth / 2, 44.5, { align: 'center' });

  // Student Details Grid
  const detailsY = 56;
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);

  // Left column
  doc.setFont('helvetica', 'bold');
  doc.text('Student Full Name:', 14, detailsY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(student.name, 48, detailsY);

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('University Roll No:', 14, detailsY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(formatStudentRollNumber(student.session || student.sessionYear, getUserPrimaryDepartment(student), student.rollNumber), 48, detailsY + 6);

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('Academic Program:', 14, detailsY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`Bachelor of Science in ${getUserPrimaryDepartment(student)}`, 48, detailsY + 12);

  // Right column
  const rightColX = pageWidth / 2 + 10;
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('Current Semester:', rightColX, detailsY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`Semester ${student.semester || 5}`, rightColX + 34, detailsY);

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('Official Email:', rightColX, detailsY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(student.email, rightColX + 34, detailsY + 6);

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('Issue Date:', rightColX, detailsY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), rightColX + 34, detailsY + 12);

  // Course Grade Table
  const tableData = coursesWithMarks.map((row) => {
    const m = row.marks;
    const a1 = m ? m.assignment1 : 0;
    const a2 = m ? m.assignment2 : 0;
    const assignTotal = m ? (a1 + a2).toFixed(1) : '-';
    const mids = m ? m.mids.toFixed(1) : '-';
    const final = m ? m.finalExam.toFixed(1) : '-';
    const att = m ? (m.attendanceMarks !== undefined ? m.attendanceMarks.toFixed(1) : '10.0') : '-';
    const total = m ? `${m.total.toFixed(1)}%` : '-';
    const grade = m ? m.letterGrade : 'N/A';
    const gpa = m ? m.gradePoints.toFixed(2) : '-';

    return [
      row.course.code,
      row.course.title,
      `${row.course.creditHours} Cr`,
      assignTotal,
      mids,
      final,
      att,
      total,
      grade,
      gpa,
    ];
  });

  autoTable(doc, {
    startY: detailsY + 18,
    head: [
      [
        'Code',
        'Course Title',
        'Credits',
        'Assign (20)',
        'Mids (30)',
        'Final (40)',
        'Att (10)',
        'Total',
        'Grade',
        'Points',
      ],
    ],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
      cellPadding: 3,
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'center', cellWidth: 18 },
      1: { cellWidth: 54 },
      2: { halign: 'center', cellWidth: 14 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'center', cellWidth: 16 },
      5: { halign: 'center', cellWidth: 16 },
      6: { halign: 'center', cellWidth: 14 },
      7: { halign: 'center', fontStyle: 'bold', cellWidth: 14 },
      8: { halign: 'center', fontStyle: 'bold', cellWidth: 14 },
      9: { halign: 'center', cellWidth: 14 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
  });

  // Calculate position after table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY || 160;

  // GPA Summary Box
  const summaryBoxY = finalY + 8;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, summaryBoxY, pageWidth - 28, 24, 1.5, 1.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, summaryBoxY, pageWidth - 28, 24, 1.5, 1.5, 'S');

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);

  // Column 1
  doc.text('Total Credits Registered:', 20, summaryBoxY + 8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${stats.totalCredits} Credit Hours`, 65, summaryBoxY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Total Earned Credits:', 20, summaryBoxY + 16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${student.creditsEarned || 68} Credits`, 65, summaryBoxY + 16);

  // Column 2
  const col2X = pageWidth / 2 + 10;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Semester GPA (SGPA):', col2X, summaryBoxY + 8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.setFontSize(11);
  doc.text(stats.semesterGpa.toFixed(2), col2X + 42, summaryBoxY + 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Cumulative GPA (CGPA):', col2X, summaryBoxY + 16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text((student.cgpa || 3.78).toFixed(2), col2X + 42, summaryBoxY + 16);

  // Grading Scale Reference Legend
  const legendY = summaryBoxY + 30;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('GRADING SCALE SCHEME:', 14, legendY);
  doc.setFont('helvetica', 'normal');
  doc.text('A+ (93-100% · 4.00) | A (86-92% · 4.00) | A- (82-85% · 3.70) | B+ (78-81% · 3.30) | B (73-77% · 3.00) | B- (68-72% · 2.70) | C (58-67% · 2.00) | F (<50% · 0.00)', 14, legendY + 4);

  // Signatures / Validation Block
  const sigY = pageHeight - 34;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);

  // Signature 1
  doc.line(24, sigY, 74, sigY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Controller of Examinations', 49, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('University Examination Branch', 49, sigY + 8, { align: 'center' });

  // Official Stamp Center
  doc.setDrawColor(30, 58, 138);
  doc.roundedRect(pageWidth / 2 - 18, sigY - 10, 36, 18, 2, 2, 'S');
  doc.setTextColor(30, 58, 138);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIALLY VERIFIED', pageWidth / 2, sigY - 3, { align: 'center' });
  doc.text('UNICORE ACADEMIC SEAL', pageWidth / 2, sigY + 2, { align: 'center' });

  // Signature 2
  doc.setDrawColor(148, 163, 184);
  doc.line(pageWidth - 74, sigY, pageWidth - 24, sigY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Dean of Academic Affairs', pageWidth - 49, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Faculty Board & Registrar', pageWidth - 49, sigY + 8, { align: 'center' });

  // Footer note
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('This is an authenticated computer-generated academic transcript from UniCore LMS. Any alteration invalidates this record.', pageWidth / 2, pageHeight - 6, { align: 'center' });

  // Save / Trigger Download
  const filename = `Transcript_${student.rollNumber || 'Report'}_${semesterName.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
}

/**
 * Generates an official Course Attendance Audit Report PDF
 */
export function generateAttendanceReportPDF(
  student: User,
  semesterName: string,
  attendanceRows: StudentAttendanceRow[]
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // University Header Border
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 6, 'F');
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 6, pageWidth, 2, 'F');

  // Title
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('UNICORE UNIVERSITY OF ADVANCED TECHNOLOGY', pageWidth / 2, 20, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('DEPARTMENT OF STUDENT AFFAIRS & ACADEMIC AUDIT', pageWidth / 2, 25, { align: 'center' });
  doc.text('Official Semester Course Attendance & Examination Eligibility Audit', pageWidth / 2, 29, { align: 'center' });

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 33, pageWidth - 14, 33);

  // Document Title Banner
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 37, pageWidth - 28, 12, 1.5, 1.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 37, pageWidth - 28, 12, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`ATTENDANCE AUDIT & ELIGIBILITY REPORT · ${semesterName.toUpperCase()}`, pageWidth / 2, 44.5, { align: 'center' });

  // Student details
  const detailsY = 56;
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);

  doc.setFont('helvetica', 'bold');
  doc.text('Student Name:', 14, detailsY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(student.name, 44, detailsY);

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('Roll Number:', 14, detailsY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(formatStudentRollNumber(student.session || student.sessionYear, getUserPrimaryDepartment(student), student.rollNumber), 44, detailsY + 6);

  const rightColX = pageWidth / 2 + 10;
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('Department:', rightColX, detailsY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(getUserPrimaryDepartment(student), rightColX + 28, detailsY);

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('Audit Date:', rightColX, detailsY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), rightColX + 28, detailsY + 6);

  // Table
  const tableData = attendanceRows.map((row) => [
    row.course.code,
    row.course.title,
    row.course.teacherName,
    row.totalLectures.toString(),
    row.attended.toString(),
    row.absent.toString(),
    row.late.toString(),
    `${row.percentage}%`,
    row.isEligible ? 'ELIGIBLE' : 'DEBARRED (<75%)',
  ]);

  autoTable(doc, {
    startY: detailsY + 14,
    head: [
      [
        'Code',
        'Course Title',
        'Instructor',
        'Lectures',
        'Attended',
        'Absent',
        'Late',
        'Rate',
        'Exam Status',
      ],
    ],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
      cellPadding: 3,
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'center', cellWidth: 18 },
      1: { cellWidth: 50 },
      2: { cellWidth: 35 },
      3: { halign: 'center', cellWidth: 15 },
      4: { halign: 'center', cellWidth: 16 },
      5: { halign: 'center', cellWidth: 14 },
      6: { halign: 'center', cellWidth: 14 },
      7: { halign: 'center', fontStyle: 'bold', cellWidth: 15 },
      8: { halign: 'center', fontStyle: 'bold', cellWidth: 25 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY || 160;

  // Policy Alert Box
  const alertY = finalY + 10;
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(14, alertY, pageWidth - 28, 22, 1.5, 1.5, 'F');
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(14, alertY, pageWidth - 28, 22, 1.5, 1.5, 'S');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28);
  doc.text('UNIVERSITY ATTENDANCE POLICY (REGULATION 4.2):', 20, alertY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(127, 29, 29);
  doc.text(
    'A minimum of 75% physical attendance in each registered theory and laboratory course is strictly required to sit in the Final Semester Examinations. Students with attendance below 75% are classified as Debarred and must repeat the course during summer terms.',
    20,
    alertY + 12,
    { maxWidth: pageWidth - 40 }
  );

  // Signatures
  const sigY = pageHeight - 34;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);

  doc.line(24, sigY, 74, sigY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Director of Student Affairs', 49, sigY + 4, { align: 'center' });

  doc.line(pageWidth - 74, sigY, pageWidth - 24, sigY);
  doc.text('Academic Registrar Seal', pageWidth - 49, sigY + 4, { align: 'center' });

  const filename = `Attendance_Report_${student.rollNumber || 'Report'}_${semesterName.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
}
