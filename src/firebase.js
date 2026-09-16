import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB5maoonF8cWoO-sDCfrzj0N5k7zXIaZ9s",
  authDomain: "adeeg-e2635.firebaseapp.com",
  projectId: "adeeg-e2635",
  storageBucket: "adeeg-e2635.appspot.com",
  messagingSenderId: "549413168791",
  appId: "1:549413168791:web:f800089d7f8f5368a66bd2"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);