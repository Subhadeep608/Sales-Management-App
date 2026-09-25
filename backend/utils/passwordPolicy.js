const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/;

const PASSWORD_MESSAGE =
  'Password must be 8-64 characters and include uppercase, lowercase, a number, and a special character.';

module.exports = { PASSWORD_REGEX, PASSWORD_MESSAGE };
