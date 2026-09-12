/*
 * =========================================================
 * CẤU HÌNH FIREBASE
 * Hệ thống Nhiệm vụ và đánh giá KPI
 * Trung tâm Hỗ trợ xã hội
 * =========================================================
 */

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyCOF2ocM8lj8lj3pJH2ojlr4rawjcv1UM",
  authDomain: "kpi-htxh-4b6e9.firebaseapp.com",
  projectId: "kpi-htxh-4b6e9",
  storageBucket: "kpi-htxh-4b6e9.firebasestorage.app",
  messagingSenderId: "12332823471",
  appId: "1:12332823471:web:26e435911b224eb505355a"
};

if (Object.values(firebaseConfig).some(value => String(value || "").startsWith("__FIREBASE_"))) {
  throw new Error("Chưa cấu hình Firebase cho tenant mới. Hãy thay toàn bộ __FIREBASE_*__ theo Web App của project mới.");
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export {
  app,
  auth,
  db
};
