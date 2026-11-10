export const ensureAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) return next();
  return res.redirect('/login');
};

export const ensureRole = (roles) => (req, res, next) => {
  const user = req.session?.user;
  if (!user) return res.redirect('/login');
  if (!roles.includes(user.role)) {
    return res.redirect(user.role === 'TEACHER' ? '/admin/dashboard' : '/student/dashboard');
  }
  return next();
};
