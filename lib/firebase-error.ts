import { FirebaseError } from "firebase/app";

const MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/user-not-found": "No account found with that email.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/email-already-in-use": "An account with that email already exists.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/network-request-failed": "Network error — please check your connection.",
  "auth/configuration-not-found":
    "Firebase isn't configured yet for this app — set the NEXT_PUBLIC_FIREBASE_* env vars.",
  "auth/invalid-api-key":
    "Firebase isn't configured yet for this app — set the NEXT_PUBLIC_FIREBASE_* env vars in .env.local.",
};

export function firebaseErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    return MESSAGES[error.code] ?? "Something went wrong. Please try again.";
  }
  return "Something went wrong. Please try again.";
}
