/**
 * Amplify Auth Modal
 * -------------------
 * Drop this script into both index.html (student portal) and teacher/index.html
 * It checks for a stored token on load. If absent, shows the auth popup.
 * After login/register it redirects based on role:
 *   student  → /index.html
 *   teacher  → /teacher/index.html
 *
 * Usage: <script src="/src/auth-modal.js"></script>
 */

(function () {
  'use strict';

  const API_BASE = window.AMPLIFY_API_BASE || '/api';

  // ── Storage helpers ────────────────────────────────────────────────────
  const Auth = {
    save(token, user) {
      localStorage.setItem('amplify_token', token);
      localStorage.setItem('amplify_user', JSON.stringify(user));
    },
    token() {
      return localStorage.getItem('amplify_token');
    },
    user() {
      try { return JSON.parse(localStorage.getItem('amplify_user')); }
      catch { return null; }
    },
    clear() {
      localStorage.removeItem('amplify_token');
      localStorage.removeItem('amplify_user');
    },
    isLoggedIn() { return !!this.token(); },
  };

  // ── Determine current portal ───────────────────────────────────────────
  const isTeacherPortal = window.location.pathname.startsWith('/teacher');

  // ── Guard: redirect if wrong portal ───────────────────────────────────
  function enforcePortalAccess() {
    if (!Auth.isLoggedIn()) return; // will be handled by modal
    const user = Auth.user();
    if (!user) return;

    if (user.role === 'teacher' && !isTeacherPortal) {
      window.location.replace('/teacher/index.html');
    } else if (user.role === 'student' && isTeacherPortal) {
      window.location.replace('/index.html');
    }
  }

  // ── API calls ──────────────────────────────────────────────────────────
  async function apiPost(endpoint, body) {
    const res = await fetch(API_BASE + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    const responseBody = await res.text();
    let data;
    try {
      data = responseBody ? JSON.parse(responseBody) : {};
    } catch {
      if (res.ok) throw new Error('The server returned an invalid response.');
      data = {};
    }
    if (!res.ok) {
      const msg = data.message
        || data.detail
        || (data.errors ? Object.values(data.errors).flat().join(' ') : '')
        || `Request failed (${res.status}).`;
      throw new Error(msg);
    }
    return data;
  }

  // ── Inject CSS ─────────────────────────────────────────────────────────
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* ── Amplify Auth Modal ── */
      #amplify-auth-overlay {
        position: fixed; inset: 0; z-index: 9999;
        background: rgba(10, 10, 15, 0.88);
        backdrop-filter: blur(12px);
        display: flex; align-items: center; justify-content: center;
        font-family: 'Inter', system-ui, sans-serif;
        opacity: 0; transition: opacity 0.3s ease;
      }
      #amplify-auth-overlay.visible { opacity: 1; }

      #amplify-auth-box {
        background: #12121a;
        border: 1px solid rgba(0,255,136,0.25);
        border-radius: 28px;
        padding: 40px 36px;
        width: 100%; max-width: 420px;
        box-shadow: 0 40px 100px rgba(0,0,0,0.6);
        position: relative;
      }

      #amplify-auth-box .am-logo {
        font-size: 22px; font-weight: 800; letter-spacing: -0.04em;
        background: linear-gradient(135deg,#fff,#00ff88);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        margin-bottom: 6px;
      }

      #amplify-auth-box .am-subtitle {
        font-size: 13px; color: #888; margin-bottom: 28px;
      }

      .am-tabs {
        display: flex; gap: 4px; margin-bottom: 28px;
        background: rgba(255,255,255,0.04);
        border-radius: 999px; padding: 4px;
        border: 1px solid rgba(255,255,255,0.08);
      }

      .am-tab {
        flex: 1; border: none; background: transparent; cursor: pointer;
        padding: 9px 0; border-radius: 999px; font-size: 14px; font-weight: 600;
        color: #888; transition: all 0.2s ease; font-family: inherit;
      }
      .am-tab.active {
        background: #00ff88; color: #000;
        box-shadow: 0 6px 20px rgba(0,255,136,0.3);
      }

      .am-field { margin-bottom: 14px; }
      .am-field label {
        display: block; font-size: 12px; font-weight: 600;
        color: #888; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;
      }
      .am-field input, .am-field select {
        width: 100%; padding: 12px 16px;
        border-radius: 14px; border: 1px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.05); color: #fff;
        font-family: inherit; font-size: 14px; outline: none;
        transition: border-color 0.2s ease;
      }
      .am-field input::placeholder { color: #555; }
      .am-field input:focus, .am-field select:focus {
        border-color: rgba(0,255,136,0.5);
      }
      .am-field select option { background: #1a1a2a; color: #fff; }

      .am-role-row {
        display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px;
      }
      .am-role-btn {
        border: 1.5px solid rgba(255,255,255,0.1);
        border-radius: 14px; background: rgba(255,255,255,0.04);
        padding: 14px 10px; cursor: pointer; transition: all 0.2s ease;
        text-align: center; font-family: inherit; color: #888;
      }
      .am-role-btn .role-icon { font-size: 24px; margin-bottom: 6px; display: block; }
      .am-role-btn .role-label { font-size: 13px; font-weight: 600; display: block; }
      .am-role-btn .role-desc  { font-size: 11px; color: #555; margin-top: 2px; display: block; }
      .am-role-btn.selected {
        border-color: rgba(0,255,136,0.6);
        background: rgba(0,255,136,0.08);
        color: #fff;
      }

      .am-submit {
        width: 100%; padding: 14px;
        border-radius: 999px; border: none; cursor: pointer;
        background: linear-gradient(135deg,#00ff88,#00dd75);
        color: #000; font-weight: 700; font-size: 15px;
        font-family: inherit; margin-top: 6px;
        transition: opacity 0.2s, transform 0.2s;
      }
      .am-submit:hover { opacity: 0.9; transform: translateY(-2px); }
      .am-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

      .am-error {
        background: rgba(255,80,80,0.12); border: 1px solid rgba(255,80,80,0.3);
        color: #ff8080; border-radius: 12px; padding: 10px 14px;
        font-size: 13px; margin-bottom: 14px; display: none;
      }
      .am-error.visible { display: block; }

      .am-divider {
        text-align: center; font-size: 12px; color: #444; margin: 18px 0 6px;
      }
    `;
    document.head.appendChild(style);
  }

  // ── Build modal HTML ───────────────────────────────────────────────────
  function buildModal() {
    const overlay = document.createElement('div');
    overlay.id = 'amplify-auth-overlay';

    overlay.innerHTML = `
      <div id="amplify-auth-box">
        <div class="am-logo">Amplify</div>
        <div class="am-subtitle">Your Student & Educator Platform</div>

        <div class="am-tabs">
          <button class="am-tab active" id="amTabLogin"  onclick="amplifyAuthSwitchTab('login')">Sign In</button>
          <button class="am-tab"        id="amTabReg"    onclick="amplifyAuthSwitchTab('register')">Create Account</button>
        </div>

        <div id="amErrorBox" class="am-error"></div>

        <!-- LOGIN FORM -->
        <div id="amLoginForm">
          <div class="am-field">
            <label>Email</label>
            <input type="email" id="amLoginEmail" placeholder="you@example.com" />
          </div>
          <div class="am-field">
            <label>Password</label>
            <input type="password" id="amLoginPassword" placeholder="••••••••" />
          </div>
          <button class="am-submit" id="amLoginBtn" onclick="amplifyAuthLogin()">
            Sign In →
          </button>
        </div>

        <!-- REGISTER FORM -->
        <div id="amRegForm" style="display:none;">
          <div class="am-field">
            <label>Full Name</label>
            <input type="text" id="amRegName" placeholder="Your name" />
          </div>
          <div class="am-field">
            <label>Email</label>
            <input type="email" id="amRegEmail" placeholder="you@example.com" />
          </div>
          <div class="am-field">
            <label>Password (min 8 characters)</label>
            <input type="password" id="amRegPassword" placeholder="••••••••" />
          </div>
          <div class="am-field">
            <label>Confirm Password</label>
            <input type="password" id="amRegPasswordConfirm" placeholder="••••••••" />
          </div>

          <label style="display:block;font-size:12px;font-weight:600;color:#888;
                        text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">
            I am a...
          </label>
          <div class="am-role-row" id="amRoleRow">
            <div class="am-role-btn" id="amRoleStudent" onclick="amplifyAuthSelectRole('student')">
              <span class="role-icon">🎓</span>
              <span class="role-label">Student</span>
              <span class="role-desc">Access study tools</span>
            </div>
            <div class="am-role-btn" id="amRoleTeacher" onclick="amplifyAuthSelectRole('teacher')">
              <span class="role-icon">👩‍🏫</span>
              <span class="role-label">Educator</span>
              <span class="role-desc">Manage your class</span>
            </div>
          </div>

          <button class="am-submit" id="amRegBtn" onclick="amplifyAuthRegister()">
            Create Account →
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));
  }

  // ── Tab switching ──────────────────────────────────────────────────────
  window.amplifyAuthSwitchTab = function (tab) {
    document.getElementById('amErrorBox').className = 'am-error';
    if (tab === 'login') {
      document.getElementById('amLoginForm').style.display = '';
      document.getElementById('amRegForm').style.display   = 'none';
      document.getElementById('amTabLogin').classList.add('active');
      document.getElementById('amTabReg').classList.remove('active');
    } else {
      document.getElementById('amLoginForm').style.display = 'none';
      document.getElementById('amRegForm').style.display   = '';
      document.getElementById('amTabLogin').classList.remove('active');
      document.getElementById('amTabReg').classList.add('active');
    }
  };

  // ── Role selection ─────────────────────────────────────────────────────
  let selectedRole = null;
  window.amplifyAuthSelectRole = function (role) {
    selectedRole = role;
    document.getElementById('amRoleStudent').classList.toggle('selected', role === 'student');
    document.getElementById('amRoleTeacher').classList.toggle('selected', role === 'teacher');
  };

  // ── Show error ─────────────────────────────────────────────────────────
  function showError(msg) {
    const el = document.getElementById('amErrorBox');
    el.textContent = msg;
    el.className = 'am-error visible';
  }

  // ── Redirect after auth ────────────────────────────────────────────────
  function redirectByRole(role) {
    if (role === 'teacher') {
      window.location.replace('/teacher/index.html');
    } else {
      window.location.replace('/index.html');
    }
  }

  // ── Dismiss modal ──────────────────────────────────────────────────────
  function dismissModal() {
    const overlay = document.getElementById('amplify-auth-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 300);
    }
  }

  // ── Login ──────────────────────────────────────────────────────────────
  window.amplifyAuthLogin = async function () {
    const email    = document.getElementById('amLoginEmail').value.trim();
    const password = document.getElementById('amLoginPassword').value;
    const btn      = document.getElementById('amLoginBtn');

    if (!email || !password) return showError('Please fill in all fields.');

    btn.disabled    = true;
    btn.textContent = 'Signing in...';

    try {
      const data = await apiPost('/login', { email, password });
      Auth.save(data.token, data.user);
      dismissModal();
      redirectByRole(data.user.role);
    } catch (err) {
      showError(err.message);
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Sign In →';
    }
  };

  // ── Register ───────────────────────────────────────────────────────────
  window.amplifyAuthRegister = async function () {
    const name              = document.getElementById('amRegName').value.trim();
    const email             = document.getElementById('amRegEmail').value.trim();
    const password          = document.getElementById('amRegPassword').value;
    const passwordConfirm   = document.getElementById('amRegPasswordConfirm').value;
    const btn               = document.getElementById('amRegBtn');

    if (!name || !email || !password || !passwordConfirm) return showError('Please fill in all fields.');
    if (!selectedRole) return showError('Please select whether you are a Student or Educator.');
    if (password !== passwordConfirm) return showError('Passwords do not match.');
    if (password.length < 8) return showError('Password must be at least 8 characters.');

    btn.disabled    = true;
    btn.textContent = 'Creating account...';

    try {
      const data = await apiPost('/register', {
        name,
        email,
        password,
        password_confirmation: passwordConfirm,
        role: selectedRole,
      });
      Auth.save(data.token, data.user);
      dismissModal();
      redirectByRole(data.user.role);
    } catch (err) {
      showError(err.message);
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Create Account →';
    }
  };

  // ── Init ───────────────────────────────────────────────────────────────
  function init() {
    enforcePortalAccess();

    if (!Auth.isLoggedIn()) {
      injectStyles();
      buildModal();
    }

    // Expose logout globally so you can call amplifyLogout() from anywhere
    window.amplifyLogout = async function () {
      try {
        await fetch(API_BASE + '/logout', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + Auth.token(),
            Accept: 'application/json',
          },
        });
      } catch (_) {}
      Auth.clear();
      window.location.replace('/');
    };
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
