/*
 * =========================================================
 * CẤU HÌNH FIREBASE
 * Hệ thống Nhiệm vụ và đánh giá KPI
 * Trung tâm Bảo trợ xã hội Tân Hiệp
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
  apiKey: "__FIREBASE_API_KEY__",
  authDomain: "__FIREBASE_AUTH_DOMAIN__",
  projectId: "__FIREBASE_PROJECT_ID__",
  storageBucket: "__FIREBASE_STORAGE_BUCKET__",
  messagingSenderId: "__FIREBASE_MESSAGING_SENDER_ID__",
  appId: "__FIREBASE_APP_ID__"
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
