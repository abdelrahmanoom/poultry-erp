const bcrypt = require('bcryptjs');
const password = 'Admin@2026';
const hash = bcrypt.hashSync(password, 10);
console.log(hash);