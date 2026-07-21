import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export async function registerGuest(email, password, fullName, mobileNumber, termsAccepted = true) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    await setDoc(doc(db, 'guests', uid), {
      uid,
      fullName,
      mobileNumber,
      email,
      createdAt: serverTimestamp(),
      role: 'guest',
    });

    return userCredential.user;
  } catch (error) {
    throw error;
  }
}

export async function registerStudent(
  email,
  password,
  fullName,
  mobileNumber,
  collegeName,
  course,
  rollNumber,
  semesterYear
) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    await setDoc(doc(db, 'students', uid), {
      uid,
      fullName,
      mobileNumber,
      email,
      collegeName,
      course,
      rollNumber,
      semesterYear,
      createdAt: serverTimestamp(),
      role: 'student',
    });

    return userCredential.user;
  } catch (error) {
    throw error;
  }
}

const withTimeout = (promise, ms) => Promise.race([
  promise,
  new Promise((resolve) => setTimeout(() => resolve(null), ms)),
]);

export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    let profileData = { email: user.email || email, userType: 'guest' };

    const profileSnap = await withTimeout(
      Promise.all([
        getDoc(doc(db, 'students', user.uid)),
        getDoc(doc(db, 'guests', user.uid)),
      ]),
      4000
    );

    if (profileSnap) {
      const [studentSnap, guestSnap] = profileSnap;
      profileData = studentSnap.exists()
        ? { ...studentSnap.data(), userType: 'student' }
        : guestSnap.exists()
          ? { ...guestSnap.data(), userType: 'guest' }
          : profileData;
    }

    return {
      user,
      profile: {
        id: user.uid,
        firebaseUid: user.uid,
        fullName: profileData.fullName || '',
        mobile: profileData.mobileNumber || profileData.mobile || '',
        email: profileData.email || user.email || email,
        userType: profileData.userType,
        collegeName: profileData.collegeName || '',
        course: profileData.course || '',
        rollNumber: profileData.rollNumber || '',
        semesterYear: profileData.semesterYear || '',
      },
    };
  } catch (error) {
    throw error;
  }
}

export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
}

export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    throw error;
  }
}
