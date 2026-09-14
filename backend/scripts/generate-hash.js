// One-off utility: prints a bcrypt hash for a given plaintext password.
// Usage: node scripts/generate-hash.js "Password123!"
//
// Useful for regenerating the seed data's password hash if you ever need to
// confirm it independently, or to create a hash for a new dev account without
// going through the /api/auth/register endpoint.
const bcrypt = require('bcrypt');

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/generate-hash.js "<password>"');
  process.exit(1);
}

bcrypt.hash(password, 10).then((hash) => {
  console.log(hash);
});
