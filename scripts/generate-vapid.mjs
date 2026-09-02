// Bikin sepasang VAPID key buat Web Push.
// Jalanin sekali, simpan hasilnya di .env, jangan pernah di-commit.
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("Tempel ke .env kamu:\n");
console.log(`VAPID_PUBLIC_KEY="${keys.publicKey}"`);
console.log(`VAPID_PRIVATE_KEY="${keys.privateKey}"`);
console.log(`VAPID_SUBJECT="mailto:email-kamu@contoh.com"`);
