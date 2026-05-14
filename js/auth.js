/* ═══════════════════════════════════════════
   AUTH MANAGER — Registration, Login, Logout
   Vertex KANBAN System
   ═══════════════════════════════════════════ */

const AuthManager = (() => {
  const USERS_KEY = 'vertex_users';
  const SESSION_KEY = 'vertex_session';

  function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return hash.toString(36);
  }

  function register(name, email, password) {
    if (!name || !email || !password) return { ok: false, msg: 'All fields are required' };
    if (password.length < 4) return { ok: false, msg: 'Password must be at least 4 characters' };

    const users = getUsers();
    if (users.find(u => u.email === email.toLowerCase())) {
      return { ok: false, msg: 'This email is already registered' };
    }

    const user = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: simpleHash(password),
      createdAt: new Date().toISOString()
    };

    users.push(user);
    saveUsers(users);
    setSession(user);
    return { ok: true, user };
  }

  function login(email, password) {
    if (!email || !password) return { ok: false, msg: 'All fields are required' };

    const users = getUsers();
    const user = users.find(u => u.email === email.toLowerCase().trim());
    if (!user) return { ok: false, msg: 'No account found with this email' };
    if (user.password !== simpleHash(password)) return { ok: false, msg: 'Incorrect password' };

    setSession(user);
    return { ok: true, user };
  }

  function setSession(user) {
    const session = { userId: user.id, name: user.name, email: user.email };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  function getCurrentUser() {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  }

  function getInitials(name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  return { register, login, logout, getCurrentUser, getInitials };
})();
