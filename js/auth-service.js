// js/auth-service.js
// Layanan Autentikasi (Sign In, Sign Up, Reset Password, Session Guard) berbasis Supabase Auth
import { getSupabase } from './supabase-service.js';

export function formatAuthError(error) {
  const raw = (error?.message || String(error || '')).toLowerCase();
  if (raw.includes('invalid login credentials')) {
    return 'Email atau password salah. Silakan periksa kembali.';
  }
  if (raw.includes('email not confirmed')) {
    return 'Email belum diverifikasi. Silakan cek kotak masuk email Anda.';
  }
  if (raw.includes('user already registered') || raw.includes('already been registered')) {
    return 'Email ini sudah terdaftar. Silakan masuk melalui tab Sign In.';
  }
  if (raw.includes('password should be at least')) {
    return 'Password minimal harus terdiri dari 6 karakter.';
  }
  if (raw.includes('unable to validate email address') || raw.includes('invalid format')) {
    return 'Format alamat email tidak valid.';
  }
  if (raw.includes('rate limit') || raw.includes('too many requests')) {
    return 'Terlalu banyak percobaan. Tunggu beberapa saat sebelum mencoba lagi.';
  }
  if (raw.includes('fetch') || raw.includes('network') || raw.includes('url')) {
    return 'Gagal terhubung ke server Supabase. Pastikan SUPABASE_URL & SUPABASE_ANON_KEY aktif.';
  }
  return error?.message || 'Terjadi kesalahan autentikasi.';
}

export const AuthService = {
  async getSession() {
    const { supabase } = await getSupabase();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data?.session || null;
  },

  async getCurrentUser() {
    const session = await this.getSession();
    return session?.user || null;
  },

  async signIn({ email, password }) {
    const { supabase } = await getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    if (error) throw new Error(formatAuthError(error));
    return data;
  },

  async signUp({ email, password, fullName, handle }) {
    const { supabase } = await getSupabase();
    const cleanHandle = handle
      ? (handle.trim().startsWith('@') ? handle.trim() : `@${handle.trim()}`)
      : `@${email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_')}`;

    const redirectUrl = `${window.location.origin}/login?verified=1`;
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: (fullName || '').trim(),
          rider_handle: cleanHandle
        }
      }
    });
    if (error) throw new Error(formatAuthError(error));

    // Sinkronkan nama & handle ke tabel rider_settings jika sesi langsung aktif
    if (data?.session && fullName) {
      try {
        await supabase
          .from('rider_settings')
          .update({
            rider_name: fullName.trim(),
            handle: cleanHandle,
            updated_at: new Date().toISOString()
          })
          .eq('id', 1);
      } catch (_) {
        // Abaikan jika tabel rider_settings belum diinisialisasi
      }
    }

    return data;
  },

  async signOut() {
    const { supabase } = await getSupabase();
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(formatAuthError(error));
    return true;
  },

  async resetPassword(email) {
    const { supabase } = await getSupabase();
    const redirectTo = `${window.location.origin}/login?reset=1`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo
    });
    if (error) throw new Error(formatAuthError(error));
    return true;
  },

  async resendConfirmation(email) {
    const { supabase } = await getSupabase();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/login?verified=1`
      }
    });
    if (error) throw new Error(formatAuthError(error));
    return true;
  },

  onAuthStateChange(callback) {
    getSupabase().then(({ supabase }) => {
      supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
      });
    });
  },

  async requireAuth({ redirectTo = '/login' } = {}) {
    try {
      const session = await this.getSession();
      if (!session) {
        const currentPath = window.location.pathname + window.location.search;
        const nextParam = currentPath && currentPath !== '/' && currentPath !== '/login'
          ? `?redirect=${encodeURIComponent(currentPath)}`
          : '';
        window.location.replace(`${redirectTo}${nextParam}`);
        return null;
      }
      return session.user;
    } catch (err) {
      console.error('Auth guard check failed:', err);
      return null;
    }
  }
};

// Evaluasi kekuatan password (skor 0 - 4)
export function evaluatePasswordStrength(pw) {
  if (!pw) return { score: 0, label: 'Empty', colorClass: 'bg-surface-container-highest', textClass: 'text-on-surface-variant' };
  let score = 0;
  if (pw.length >= 6) score += 1;
  if (pw.length >= 10) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score += 1;

  if (score <= 1) {
    return { score: 1, label: 'Weak', colorClass: 'bg-error', textClass: 'text-error' };
  }
  if (score === 2) {
    return { score: 2, label: 'Fair', colorClass: 'bg-secondary', textClass: 'text-secondary' };
  }
  if (score === 3) {
    return { score: 3, label: 'Good', colorClass: 'bg-tertiary-container', textClass: 'text-tertiary-fixed' };
  }
  return { score: 4, label: 'Strong', colorClass: 'bg-primary-container', textClass: 'text-primary-fixed' };
}

// Inisialisasi interaktivitas halaman login.html
export async function initAuthPage() {
  const tabSignin = document.getElementById('tab-signin');
  const tabSignup = document.getElementById('tab-signup');
  const formSignin = document.getElementById('form-signin');
  const formSignup = document.getElementById('form-signup');
  const formForgot = document.getElementById('form-forgot');
  const verifyNotice = document.getElementById('verify-email-panel');
  const alertBox = document.getElementById('auth-alert');
  const alertText = document.getElementById('auth-alert-text');
  const alertIcon = document.getElementById('auth-alert-icon');

  const params = new URLSearchParams(window.location.search);
  const redirectTarget = params.get('redirect') || '/';

  function showAlert(message, variant = 'error') {
    if (!alertBox) return;
    alertBox.classList.remove('hidden', 'bg-error-container/25', 'border-error/40', 'text-error', 'bg-tertiary-container/15', 'border-tertiary-container/40', 'text-tertiary-fixed');
    if (variant === 'success') {
      alertBox.classList.add('bg-tertiary-container/15', 'border-tertiary-container/40', 'text-tertiary-fixed');
      alertIcon.textContent = 'check_circle';
    } else {
      alertBox.classList.add('bg-error-container/25', 'border-error/40', 'text-error');
      alertIcon.textContent = 'error';
    }
    alertText.textContent = message;
  }

  function hideAlert() {
    if (alertBox) alertBox.classList.add('hidden');
  }

  function switchMode(mode) {
    hideAlert();
    verifyNotice?.classList.add('hidden');
    formForgot?.classList.add('hidden');

    if (mode === 'signup') {
      formSignin.classList.add('hidden');
      formSignup.classList.remove('hidden');
      tabSignup.className = 'flex-1 py-2.5 rounded-lg bg-surface-container-high text-primary-container font-label-caps text-label-caps uppercase font-bold transition-all shadow';
      tabSignin.className = 'flex-1 py-2.5 rounded-lg text-on-surface-variant hover:text-primary font-label-caps text-label-caps uppercase font-bold transition-all';
    } else if (mode === 'forgot') {
      formSignin.classList.add('hidden');
      formSignup.classList.add('hidden');
      formForgot.classList.remove('hidden');
    } else {
      formSignup.classList.add('hidden');
      formSignin.classList.remove('hidden');
      tabSignin.className = 'flex-1 py-2.5 rounded-lg bg-surface-container-high text-primary-container font-label-caps text-label-caps uppercase font-bold transition-all shadow';
      tabSignup.className = 'flex-1 py-2.5 rounded-lg text-on-surface-variant hover:text-primary font-label-caps text-label-caps uppercase font-bold transition-all';
    }
  }

  // Cek jika user sudah login -> langsung arahkan ke dashboard
  try {
    const existingSession = await AuthService.getSession();
    if (existingSession) {
      window.location.replace(redirectTarget);
      return;
    }
  } catch (_) {
    // Abaikan jika Supabase belum terkonfigurasi
  }

  // Status dari query parameter (mis. setelah klik link verifikasi email)
  if (params.get('verified') === '1') {
    showAlert('Email berhasil diverifikasi! Silakan masuk menggunakan akun Anda.', 'success');
  } else if (params.get('signedout') === '1') {
    showAlert('Anda telah keluar dari sesi Bike Logbook.', 'success');
  }

  if (params.get('mode') === 'signup') {
    switchMode('signup');
  } else {
    switchMode('signin');
  }

  tabSignin?.addEventListener('click', () => switchMode('signin'));
  tabSignup?.addEventListener('click', () => switchMode('signup'));
  document.getElementById('btn-open-forgot')?.addEventListener('click', () => switchMode('forgot'));
  document.getElementById('btn-back-signin')?.addEventListener('click', () => switchMode('signin'));
  document.getElementById('btn-verified-signin')?.addEventListener('click', () => switchMode('signin'));

  // Toggle Show/Hide Password untuk semua tombol mata
  document.querySelectorAll('[data-toggle-pw]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const inputId = btn.getAttribute('data-toggle-pw');
      const inputEl = document.getElementById(inputId);
      const iconEl = btn.querySelector('.material-symbols-outlined');
      if (!inputEl) return;
      const isHidden = inputEl.type === 'password';
      inputEl.type = isHidden ? 'text' : 'password';
      if (iconEl) iconEl.textContent = isHidden ? 'visibility_off' : 'visibility';
    });
  });

  // Live Password Strength Meter pada Form Sign Up
  const signupPwInput = document.getElementById('signup-password');
  const strengthLabel = document.getElementById('pw-strength-label');
  const strengthBars = [
    document.getElementById('pw-bar-1'),
    document.getElementById('pw-bar-2'),
    document.getElementById('pw-bar-3'),
    document.getElementById('pw-bar-4')
  ];

  signupPwInput?.addEventListener('input', () => {
    const res = evaluatePasswordStrength(signupPwInput.value);
    if (strengthLabel) {
      strengthLabel.textContent = res.label;
      strengthLabel.className = `font-label-caps text-label-caps uppercase ${res.textClass}`;
    }
    strengthBars.forEach((bar, idx) => {
      if (!bar) return;
      bar.className = `h-1.5 flex-1 rounded-full transition-all ${idx < res.score ? res.colorClass : 'bg-surface-container-highest'}`;
    });
  });

  // Handler Submit Sign In
  formSignin?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();
    const btn = document.getElementById('btn-submit-signin');
    const origText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span><span>Signing In...</span>';

    const fd = new FormData(formSignin);
    try {
      await AuthService.signIn({
        email: fd.get('email'),
        password: fd.get('password')
      });
      showAlert('Autentikasi berhasil! Membuka Telemetry Dashboard...', 'success');
      setTimeout(() => {
        window.location.replace(redirectTarget);
      }, 450);
    } catch (err) {
      showAlert(err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = origText;
    }
  });

  // Handler Submit Sign Up
  let pendingVerifyEmail = '';
  formSignup?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const fd = new FormData(formSignup);
    const password = String(fd.get('password') || '');
    const confirmPassword = String(fd.get('confirm_password') || '');

    if (password.length < 6) {
      showAlert('Password minimal 6 karakter.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showAlert('Konfirmasi password tidak cocok dengan password baru.', 'error');
      return;
    }

    const btn = document.getElementById('btn-submit-signup');
    const origText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span><span>Creating Account...</span>';

    try {
      const email = String(fd.get('email') || '');
      const data = await AuthService.signUp({
        email,
        password,
        fullName: fd.get('full_name'),
        handle: fd.get('handle')
      });

      if (data?.session) {
        showAlert('Akun berhasil dibuat! Mengalihkan ke Dashboard...', 'success');
        setTimeout(() => {
          window.location.replace(redirectTarget);
        }, 500);
      } else {
        // Supabase membutuhkan konfirmasi email terlebih dahulu
        pendingVerifyEmail = email;
        document.getElementById('verify-email-address').textContent = email;
        formSignup.classList.add('hidden');
        verifyNotice?.classList.remove('hidden');
      }
    } catch (err) {
      showAlert(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = origText;
    }
  });

  // Handler Resend Verification Email
  document.getElementById('btn-resend-verify')?.addEventListener('click', async () => {
    if (!pendingVerifyEmail) return;
    try {
      await AuthService.resendConfirmation(pendingVerifyEmail);
      showAlert(`Email verifikasi ulang dikirim ke ${pendingVerifyEmail}.`, 'success');
    } catch (err) {
      showAlert(err.message, 'error');
    }
  });

  // Handler Forgot Password
  formForgot?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();
    const btn = document.getElementById('btn-submit-forgot');
    const origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Sending Reset Link...';

    const fd = new FormData(formForgot);
    try {
      await AuthService.resetPassword(fd.get('email'));
      showAlert('Link reset password telah dikirim ke email Anda. Periksa inbox atau folder spam.', 'success');
      formForgot.reset();
    } catch (err) {
      showAlert(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = origText;
    }
  });
}
