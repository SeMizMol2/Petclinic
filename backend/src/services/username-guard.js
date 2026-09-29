const usernameValidationMessage = (username) => {
  if (username.length < 3 || username.length > 50 || /\s|[\u0000-\u001f\u007f]/u.test(username)) {
    return 'ชื่อผู้ใช้ต้องมี 3–50 ตัวอักษร และไม่มีช่องว่าง';
  }
  return null;
};

// Every app route that writes a username shares this lock while checking for duplicates.
const lockUsernameWrites = (client) => client.query('SELECT pg_advisory_xact_lock(74018, 3)');

const usernameExists = async (client, username, excludedUserId = null) => {
  const result = await client.query(
    'SELECT 1 FROM tb_user WHERE username = $1 AND ($2::varchar IS NULL OR user_id <> $2) LIMIT 1',
    [username, excludedUserId]
  );
  return result.rowCount > 0;
};

module.exports = { usernameValidationMessage, lockUsernameWrites, usernameExists };
