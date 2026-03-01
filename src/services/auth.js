// ============================================
// Authentication Service — Firebase Auth
// Email/Password + Google Sign-In
// ============================================

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

// --- Sign Up with Email/Password ---
export async function signUpWithEmail(email, password, displayName) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  // Set display name
  await updateProfile(result.user, { displayName });
  return result.user;
}

// --- Sign In with Email/Password ---
export async function signInWithEmail(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

// --- Sign In with Google ---
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

// --- Sign Out ---
export async function logOut() {
  await signOut(auth);
}

// --- Password Reset ---
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

// --- Auth State Listener ---
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// --- Get Current User ---
export function getCurrentUser() {
  return auth.currentUser;
}

// --- Format Firebase Auth Error Messages ---
export function getAuthErrorMessage(errorCode) {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Try signing in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password. Try again.';
    case 'auth/invalid-credential':
      return 'Invalid email or password. Try again.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Try again later.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed. Try again.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
