
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {
  apiKey: "AIzaSyC4NVnYKXE1Hr-LJU-bu4JfIIaS6Turat0",
  authDomain: "nexuschat-2bd91.firebaseapp.com",
  projectId: "nexuschat-2bd91",
  storageBucket: "nexuschat-2bd91.firebasestorage.app",
  messagingSenderId: "428090346407",
  appId: "1:428090346407:web:d82c15d85cfa59e8ad4482",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
