export const isValidMobile = (value) => /^[6-9]\d{9}$/.test(value.trim());
export const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export const validateProfileCompletion = (values, userType) => {
  if (!values.fullName?.trim()) return 'Full Name is required.';
  if (!values.mobile?.trim()) return 'Mobile Number is required.';
  if (!isValidMobile(values.mobile)) return 'Enter a valid 10-digit mobile number.';
  if (!values.email?.trim()) return 'Email ID is required.';
  if (!isValidEmail(values.email)) return 'Enter a valid email ID.';

  if (userType === 'student') {
    if (!values.collegeName?.trim()) return 'College Name is required.';
    if (!values.course?.trim()) return 'Course is required.';
    if (!values.rollNumber?.trim()) return 'Roll Number is required.';
    if (!values.semesterYear?.trim()) return 'Semester / Year is required.';
  }

  if (!values.password) return 'Password is required.';
  if (!values.confirmPassword) return 'Confirm Password is required.';
  if (values.password !== values.confirmPassword) return 'Password and Confirm Password must match.';

  return '';
};
