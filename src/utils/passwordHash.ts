import bcrypt from 'bcryptjs';

/**
 * Hashes a plain-text password using bcrypt with 10 salt rounds.
 */
export const hashPassword = (password: string): string => {
  return bcrypt.hashSync(password, 10);
};

/**
 * Verifies a plain-text password against a stored password.
 * Supports bcrypt hashes ($2a$, $2b$, $2y$) and gracefully checks
 * legacy unhashed plain-text passwords for backward compatibility.
 */
export const verifyPassword = (plainPassword: string, storedPassword?: string): boolean => {
  if (!storedPassword) return false;
  const isBcryptHash =
    storedPassword.startsWith('$2a$') ||
    storedPassword.startsWith('$2b$') ||
    storedPassword.startsWith('$2y$');
  if (isBcryptHash) {
    try {
      return bcrypt.compareSync(plainPassword, storedPassword);
    } catch {
      return false;
    }
  }
  return plainPassword === storedPassword;
};
