// Helper for generating and updating institutional email addresses and roll numbers

export interface DepartmentLookupItem {
  name: string;
  code: string;
}

/**
 * Suggests an institutional abbreviation for a given department name.
 * e.g.,
 * "Computer Science" -> "cs"
 * "English" -> "eng"
 * "Software Engineering" -> "se"
 * "Artificial Intelligence & Data" -> "ai"
 * "Physics" -> "phy"
 */
export const suggestDepartmentCode = (departmentName: string): string => {
  if (!departmentName || !departmentName.trim()) return '';
  const trimmed = departmentName.trim();
  const lower = trimmed.toLowerCase();

  const standardMap: Record<string, string> = {
    'computer science': 'cs',
    'software engineering': 'se',
    'artificial intelligence & data': 'ai',
    'artificial intelligence': 'ai',
    'data science': 'ds',
    'computer systems': 'csys',
    'computer engineering': 'ce',
    'information technology': 'it',
    'mathematics & natural sciences': 'math',
    'mathematics': 'math',
    'electrical engineering': 'ee',
    'mechanical engineering': 'me',
    'civil engineering': 'ce',
    'business administration': 'bba',
    'english': 'eng',
    'physics': 'phy',
    'chemistry': 'chem',
    'economics': 'econ',
    'biology': 'bio',
    'biotechnology': 'biotech',
    'management sciences': 'ms',
    'cyber security': 'cys',
    'humanities': 'hum',
  };

  if (standardMap[lower]) return standardMap[lower];

  const stopWords = new Set(['and', '&', 'of', 'in', 'for', 'the', 'to', 'at', 'with']);
  const words = trimmed
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !stopWords.has(w.toLowerCase()));

  if (words.length > 1) {
    return words.map((w) => w[0].toLowerCase()).join('');
  } else if (words.length === 1) {
    const single = words[0].toLowerCase();
    if (single.length <= 4) return single;
    return single.slice(0, 3);
  }

  return trimmed.toLowerCase().slice(0, 3);
};

export const getDepartmentCode = (
  department: string,
  departments?: DepartmentLookupItem[]
): string => {
  if (!department) return 'cs';
  const cleanName = department.trim().toLowerCase();

  // 1. Check dynamic departments list if provided
  if (departments && departments.length > 0) {
    const found = departments.find(
      (d) => d.name.trim().toLowerCase() === cleanName
    );
    if (found && found.code) {
      return found.code.trim().toLowerCase();
    }
  }

  // 2. Fall back to suggestion algorithm / standard map
  return suggestDepartmentCode(department);
};

export const formatStudentEmail = (
  session: number | string | undefined,
  department: string | undefined,
  rollNumber: number | string | undefined,
  domain: string,
  departments?: DepartmentLookupItem[]
): string => {
  const sess = session || 2026;
  const deptCode = getDepartmentCode(department || 'Computer Science', departments);
  const rawRoll = String(rollNumber || '').trim().toLowerCase().replace(/\s+/g, '-');
  const cleanRoll = rawRoll.startsWith(`${deptCode}-`) ? rawRoll.slice(deptCode.length + 1) : rawRoll;
  const numMatch = cleanRoll.match(/(\d+)$/);
  const numPart = numMatch ? numMatch[1] : cleanRoll;
  const paddedRoll = numPart && numPart.length === 1 ? '0' + numPart : numPart || '01';
  const cleanDomain = domain.replace(/^@/, '').trim().toLowerCase() || 'nicore.edu.pk';
  return `${sess}-${deptCode}-${paddedRoll}@${cleanDomain}`;
};

/**
 * Formats a student's complete institutional roll number following the formula:
 * year-department-rollnumber (e.g. 2021-cs-01)
 */
export const formatStudentRollNumber = (
  session: number | string | undefined,
  department: string | undefined,
  rollNumber: number | string | undefined,
  departments?: DepartmentLookupItem[]
): string => {
  const sess = session || 2026;
  const deptCode = getDepartmentCode(department || 'Computer Science', departments);
  if (!rollNumber && rollNumber !== 0) return `${sess}-${deptCode}-01`;

  const raw = String(rollNumber).trim().toLowerCase();
  // Extract trailing digits or numeric portion
  const match = raw.match(/(\d+)$/);
  const numPart = match ? match[1] : raw.replace(/^[a-z0-9]+-/, '');
  const paddedRoll = numPart && numPart.length === 1 ? '0' + numPart : numPart || '01';

  return `${sess}-${deptCode}-${paddedRoll}`;
};

/**
 * Extracts pure numeric digits from any roll representation for number input fields
 */
export const extractRollNumberDigits = (rollNumber: number | string | undefined): string => {
  if (!rollNumber && rollNumber !== 0) return '';
  const str = String(rollNumber).trim();
  const match = str.match(/(\d+)$/);
  return match ? match[1] : str.replace(/\D/g, '');
};
