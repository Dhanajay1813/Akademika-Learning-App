export const isGuestUser = (user) => user?.userType === 'guest' || user?.role === 'guest';
export const isStudentUser = (user) => user?.userType === 'student' || user?.role === 'student';
export const getDraftOwnerId = (user) => user?.id || user?.firebaseUid || user?.email || 'local-user';
