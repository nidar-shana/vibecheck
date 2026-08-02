const STORAGE_KEY = 'vibecheck-users';
const SESSION_KEY = 'vibecheck-current-user';
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const tabs = document.querySelectorAll('.tab');
const statusMessage = document.getElementById('status-message');

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function setSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function showStatus(message, type = 'info') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`.trim();
}

function switchTab(target) {
  tabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.target === target);
  });

  loginForm.classList.toggle('active', target === 'login');
  registerForm.classList.toggle('active', target === 'register');
}

function registerUser(user) {
  const users = loadUsers();
  const exists = users.some((entry) => entry.email.toLowerCase() === user.email.toLowerCase());

  if (exists) {
    throw new Error('An account with that email already exists.');
  }

  users.push(user);
  saveUsers(users);
  return user;
}

function handleLogin(email, password) {
  const users = loadUsers();
  const user = users.find(
    (entry) => entry.email.toLowerCase() === email.toLowerCase() && entry.password === password
  );

  if (!user) {
    throw new Error('No account matches those credentials.');
  }

  setSession(user);
  return user;
}

function initializeGoogleAuth() {
  if (!window.google?.accounts) {
    showStatus('Google SDK is still loading. Please wait a moment and try again.', 'info');
    return;
  }

  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('141503760783-so53jb1ca36v8856dibc8l1p1rai3v5a.apps.googleusercontent.com')) {
    showStatus('Google login is ready for setup.', 'info');
    return;
  }

  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleCredential,
  });

  window.google.accounts.id.renderButton(document.getElementById('google-signin'), {
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
  });
}

function decodeJwt(token) {
  const payload = token.split('.')[1];
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const decoded = atob(normalized);
  return JSON.parse(decoded);
}

function handleGoogleCredential(response) {
  try {
    const profile = decodeJwt(response.credential);
    const user = {
      id: profile.sub,
      name: profile.name || profile.given_name || 'Google User',
      email: profile.email,
      password: '',
      provider: 'google',
    };

    const users = loadUsers();
    const existing = users.find((entry) => entry.email.toLowerCase() === user.email.toLowerCase());

    if (!existing) {
      users.push(user);
      saveUsers(users);
    }

    setSession(user);
    showStatus(`Signed in as ${user.name}.`, 'success');
  } catch (error) {
    console.error(error);
    showStatus('Google sign-in could not be completed.', 'error');
  }
}

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '').trim();

  try {
    const user = handleLogin(email, password);
    showStatus(`Welcome back, ${user.name}.`, 'success');
  } catch (error) {
    showStatus(error.message, 'error');
  }
});

registerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(registerForm);
  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '').trim();
  const confirmPassword = String(formData.get('confirmPassword') || '').trim();

  if (!name || !email || !password || !confirmPassword) {
    showStatus('Please fill in every field.', 'error');
    return;
  }

  if (password !== confirmPassword) {
    showStatus('Passwords do not match.', 'error');
    return;
  }

  try {
    const user = registerUser({ id: crypto.randomUUID(), name, email, password, provider: 'local' });
    setSession(user);
    showStatus(`Account created for ${user.name}.`, 'success');
    registerForm.reset();
  } catch (error) {
    showStatus(error.message, 'error');
  }
});

tabs.forEach((tab) => {
  tab.addEventListener('click', () => switchTab(tab.dataset.target));
});

const currentUser = getCurrentUser();
if (currentUser) {
  showStatus(`Signed in as ${currentUser.name}.`, 'success');
}

initializeGoogleAuth();
