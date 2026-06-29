const isWhitelisted = (email) => {
  if (!email) return false;
  const domain = email.split('@')[1];
  const allowedDomains = ['tealvue.com', 'test.com', 'admin.com', 'gmail.com'];
  return allowedDomains.includes(domain) || email.endsWith('@example.com');
};

module.exports = { isWhitelisted };
