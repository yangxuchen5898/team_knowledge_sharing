// ============ 工具 =============
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const storage = {
  get(key, def=null){ try{return JSON.parse(localStorage.getItem(key)) ?? def}catch{ return def } },
  set(key, val){ localStorage.setItem(key, JSON.stringify(val)) },
  del(key){ localStorage.removeItem(key) }
};

function toast(msg, type='ok', timeout=2600){
  const host = $('#toastHost');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px)';
    setTimeout(() => el.remove(), 180);
  }, timeout);
}

// ============ 主题 =============
const themeToggle = $('#themeToggle');
function applyTheme(t){
  document.documentElement.setAttribute('data-theme', t);
  storage.set('theme', t);
}
function toggleTheme(){
  const cur = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(cur === 'light' ? 'dark' : 'light');
}
themeToggle.addEventListener('click', toggleTheme);
// 默认跟随系统，首次进入写入
applyTheme(storage.get('theme', (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')));

// ============ 抽屉菜单（移动端） ============
const drawer = $('#drawer');
const drawerBackdrop = $('#drawerBackdrop');
const menuToggle = $('#menuToggle');
function openDrawer(){ drawer.classList.add('open'); drawerBackdrop.classList.add('show'); menuToggle.setAttribute('aria-expanded','true'); }
function closeDrawer(){ drawer.classList.remove('open'); drawerBackdrop.classList.remove('show'); menuToggle.setAttribute('aria-expanded','false'); }
menuToggle.addEventListener('click', () => drawer.classList.contains('open') ? closeDrawer() : openDrawer());
drawerBackdrop.addEventListener('click', closeDrawer);
window.addEventListener('keydown', e => { if(e.key==='Escape') { closeDrawer(); closeModal(); } });

// ============ KPI 动画 ============
function animateNum(el, target, ms=900){
  if (!el) return; // 如果元素不存在，直接返回
  const start = performance.now();
  const from = 0;
  const tick = (t) => {
    const p = Math.min(1, (t - start) / ms);
    el.textContent = Math.round(from + (target - from) * (0.5 - 0.5 * Math.cos(Math.PI * p))).toLocaleString();
    if(p<1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
window.addEventListener('DOMContentLoaded', () => {
  const kpiUsersEl = $('#kpiUsers');
  const kpiLatencyEl = $('#kpiLatency');
  const kpiUptimeEl = $('#kpiUptime');
  
  if (kpiUsersEl) animateNum(kpiUsersEl, 12876);
  if (kpiLatencyEl) animateNum(kpiLatencyEl, 86);
  if (kpiUptimeEl) animateNum(kpiUptimeEl, 99.97);

  // 联系我们表单提交
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('contactName')?.value?.trim();
      const email = document.getElementById('contactEmail')?.value?.trim();
      const subject = document.getElementById('contactSubject')?.value?.trim();
      const message = document.getElementById('contactMessage')?.value?.trim();

      if (!name || !email || !subject || !message) {
        toast('请填写完整信息', 'err');
        return;
      }

      try {
        const res = await api.submitContact({ name, email, subject, message });
        if (res?.success) {
          toast('发送成功，我们会尽快联系你', 'ok');
          contactForm.reset();
        } else {
          throw new Error(res?.message || '提交失败');
        }
      } catch (err) {
        toast(err.message || '提交失败，请稍后重试', 'err');
      }
    });
  }
});

// ============ 搜索 & 通知 演示 ============
const searchInput = $('#searchInput');
if (searchInput) {
  searchInput.addEventListener('keydown', e => {
    if(e.key === 'Enter'){
      toast(`搜索：${e.currentTarget.value || '（空）'}`, 'ok');
    }
  });
}
$('#notifyBtn').addEventListener('click', () => {
  const kinds = ['ok','warn','err'];
  const pick = kinds[Math.floor(Math.random()*kinds.length)];
  toast('这是一条示例通知', pick);
});

// ============ 登录状态 ============
const AUTH_KEY = 'authUser';
const authArea = $('#authArea');

function renderAuthed(user){
  const displayName = user.username || user.email || '用户';
  authArea.innerHTML = `
    <div class="user">
      <button id="userBtn" class="icon-btn" aria-expanded="false" aria-haspopup="menu" title="${displayName}">
        <svg viewBox="0 0 24 24" class="icon"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="currentColor"/></svg>
      </button>
      <div id="userMenu" class="menu" role="menu" hidden>
        <button class="menu-item" id="viewProfile">个人资料</button>
        <button class="menu-item" id="changePassword">修改密码</button>
        <button class="menu-item" id="logoutBtn">退出登录</button>
      </div>
    </div>
  `;
  // 简约菜单样式（内联注入）
  injectUserMenuStyle();

  const userBtn = $('#userBtn');
  const userMenu = $('#userMenu');
  userBtn.addEventListener('click', () => {
    const open = !userMenu.hasAttribute('hidden');
    if(open){ userMenu.setAttribute('hidden', '') }
    else { userMenu.removeAttribute('hidden') }
    userBtn.setAttribute('aria-expanded', String(!open));
  });
  $('#logoutBtn').addEventListener('click', () => {
    storage.del(AUTH_KEY);
    try { localStorage.removeItem('authToken'); } catch {}
    toast('已退出登录', 'warn');
    renderGuest();
  });
  $('#viewProfile').addEventListener('click', () => {
    toast(`当前用户：${displayName}`, 'ok');
  });
  $('#changePassword').addEventListener('click', () => {
    // 统一跳转到独立的修改密码页面（使用绝对路径，避免相对路径在不同页面解析差异）
    window.location.href = '/change-password.html';
  });

  // 点击外部关闭菜单
  document.addEventListener('click', (e) => {
    if(!userMenu || !userBtn) return;
    if(!userMenu.contains(e.target) && !userBtn.contains(e.target)){
      if(!userMenu.hasAttribute('hidden')) userMenu.setAttribute('hidden','');
      userBtn.setAttribute('aria-expanded','false');
    }
  }, { once:true });
}

function renderGuest(){
  authArea.innerHTML = `<button id="openLogin" class="btn primary">登录</button>`;
  $('#openLogin').addEventListener('click', openModal);
}

const savedUser = storage.get(AUTH_KEY);
savedUser ? renderAuthed(savedUser) : renderGuest();

// ============ 登录模态 ============
const loginModal = $('#loginModal');
const modalBackdrop = $('#modalBackdrop');
const closeLogin = $('#closeLogin');

function openModal(){
  loginModal.classList.add('show');
  modalBackdrop.classList.add('show');
  loginModal.setAttribute('aria-hidden','false');
  $('#email')?.focus();
}
function closeModal(){
  loginModal.classList.remove('show');
  modalBackdrop.classList.remove('show');
  loginModal.setAttribute('aria-hidden','true');
}
$('#openLogin')?.addEventListener('click', openModal);
closeLogin.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', closeModal);

$('#getStarted')?.addEventListener('click', () => toast('欢迎使用！建议先个性化主题与品牌色。','ok'));
$('#learnMore')?.addEventListener('click', () => toast('查看 styles.css 中变量：--glass-grad / --glass-bg。','ok'));
$('#demoToast')?.addEventListener('click', () => toast('Toast 演示。','ok'));
$('#demoLogin')?.addEventListener('click', openModal);
$('#demoTheme')?.addEventListener('click', toggleTheme);

// ============ 登录表单校验 ============
const form = $('#loginForm');
const email = $('#email');
const password = $('#password');
const emailErr = $('#emailErr');
const pwdErr = $('#pwdErr');

$('#togglePwd').addEventListener('click', () => {
  const isPwd = password.type === 'password';
  password.type = isPwd ? 'text' : 'password';
});

function validateEmail(val){
  const ok = val && val.trim().length >= 2; // 账号至少2位
  emailErr.textContent = ok ? '' : '请输入有效账号';
  return ok;
}
function validatePwd(val){
  const ok = (val?.length ?? 0) >= 1; // 改为至少1位，适配CSV中的短密码
  pwdErr.textContent = ok ? '' : '请输入密码';
  return ok;
}

email.addEventListener('input', e => validateEmail(e.target.value));
password.addEventListener('input', e => validatePwd(e.target.value));

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const v1 = validateEmail(email.value.trim());
  const v2 = validatePwd(password.value);
  if(!v1 || !v2){
    form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
    toast('请修正表单错误', 'err');
    return;
  }
  
  try {
    // 使用新的API登录
    const result = await api.login({
      account: email.value.trim(),
      password: password.value
    });
    
    if (result.success) {
      const user = { 
        id: result.data.user?._id || result.data.user?.id,
        username: result.data.user.username, 
        role: result.data.user.role,
        mustChangePassword: result.data.user.mustChangePassword,
        remember: $('#remember').checked, 
        ts: Date.now() 
      };
      storage.set(AUTH_KEY, user);
      toast('登录成功！', 'ok');
      closeModal();
      renderAuthed(user);
      
      // 如果需要修改密码，显示提示
      if (result.data.user.mustChangePassword) {
        setTimeout(() => {
          toast('请及时修改您的密码', 'warn');
        }, 1000);
      }
    }
  } catch (error) {
    toast(error.message || '登录失败', 'err');
    form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
  }
});

// ============ 细节：用户菜单样式注入 ============
function injectUserMenuStyle(){
  if($('#__menu_style')) return;
  const style = document.createElement('style');
  style.id = '__menu_style';
  style.textContent = `
    .menu{position:absolute; right:0; margin-top:8px; background: var(--card);
      border:1px solid var(--border); border-radius:12px; box-shadow: var(--shadow); overflow:hidden}
    .user{position:relative}
    .menu-item{display:block; width:160px; text-align:left; padding:10px 12px; background:transparent; border:none; color:var(--text); cursor:pointer}
    .menu-item:hover{background:var(--glass-bg)}
  `;
  document.head.appendChild(style);
}
/* 轮播图配置 */
const JSON_URL = 'images.json';

const track = document.getElementById('carouselTrack');
const dotsWrap = document.getElementById('carouselDots');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

// 轮播运行时状态（需在顶层声明，供所有函数使用）
let images = [];
let index = 0;
let playing = true;
let timer = null;
const AUTOPLAY_MS = 3000;

// 如果当前页面没有轮播元素，直接跳过轮播初始化，避免报错
if (!track || !dotsWrap) {
  // 提供空实现，防止后续调用
  window.buildSlides = () => {};
  window.buildDots = () => {};
} else {
// 读取 JSON 并初始化
  fetch(JSON_URL)
    .then(r => {
      if (!r.ok) throw new Error(`无法加载 ${JSON_URL}`);
      return r.json();
    })
    .then(list => {
      images = Array.isArray(list) ? list : [];
      if (!images.length) throw new Error('JSON 中没有图片路径');

      buildSlides(images);
      buildDots(images.length);
      goTo(0);
      startAutoplay();
      attachEvents();
    })
    .catch(err => {
      console.error(err);
      if (track) {
        track.innerHTML = `<li class="carousel-slide"><div style="padding:16px;color:#555;">加载失败：${String(err.message || err)}</div></li>`;
      }
    });
}

function buildSlides(urls){
  track.innerHTML = urls.map((src, i) => {
    const alt = `轮播图片 ${i+1}`;
    return `
      <li class="carousel-slide" data-idx="${i}">
        <img src="${src}" alt="${alt}" loading="lazy" />
      </li>`;
  }).join('');
}

function buildDots(n){
  dotsWrap.innerHTML = '';
  for (let i = 0; i < n; i++){
    const b = document.createElement('button');
    b.className = 'carousel-dot';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', `第 ${i+1} 张`);
    b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    b.addEventListener('click', () => goTo(i, true));
    dotsWrap.appendChild(b);
  }
}

function goTo(i, userAction=false){
  const slidesCount = images.length;
  index = (i + slidesCount) % slidesCount;
  const offset = -index * 100;
  track.style.transform = `translateX(${offset}%)`;

  // 更新圆点
  [...dotsWrap.children].forEach((dot, di) => {
    dot.setAttribute('aria-selected', di === index ? 'true' : 'false');
  });

  // 用户操作时可重置自动播放
  if (userAction){
    restartAutoplay();
  }
}

function next(){ goTo(index + 1, true); }
function prev(){ goTo(index - 1, true); }

function startAutoplay(){
  if (timer) return;
  playing = true;
  timer = setInterval(() => goTo(index + 1), AUTOPLAY_MS);
}
function stopAutoplay(){
  playing = false;
  clearInterval(timer);
  timer = null;
}
function restartAutoplay(){
  stopAutoplay();
  startAutoplay();
}

function attachEvents(){
  nextBtn.addEventListener('click', next);
  prevBtn.addEventListener('click', prev);

  // 悬停暂停/离开继续
  const viewport = document.querySelector('.carousel-viewport');
  viewport.addEventListener('mouseenter', stopAutoplay);
  viewport.addEventListener('mouseleave', () => { if (!timer) startAutoplay(); });


  // 触摸滑动（移动端）
  let startX = 0;
  let deltaX = 0;
  const THRESHOLD = 50;

  viewport.addEventListener('touchstart', (e) => {
    stopAutoplay();
    startX = e.touches[0].clientX;
    deltaX = 0;
  }, {passive: true});

  viewport.addEventListener('touchmove', (e) => {
    deltaX = e.touches[0].clientX - startX;
  }, {passive: true});

  viewport.addEventListener('touchend', () => {
    if (Math.abs(deltaX) > THRESHOLD){
      if (deltaX < 0) next(); else prev();
    }
    startAutoplay();
  });
}

// ============ 修改密码功能 ============
function openChangePasswordModal() {
  const modal = $('#changePasswordModal');
  if (modal) {
    modal.setAttribute('aria-hidden', 'false');
    $('#currentPassword').focus();
  }
}

function closeChangePasswordModal() {
  const modal = $('#changePasswordModal');
  if (modal) {
    modal.setAttribute('aria-hidden', 'true');
    // 清空表单
    $('#changePasswordForm').reset();
    const errors = modal.querySelectorAll('.error');
    errors.forEach(err => err.textContent = '');
  }
}

// 修改密码表单相关元素和验证
document.addEventListener('DOMContentLoaded', () => {
  const changePasswordModal = $('#changePasswordModal');
  const changePasswordForm = $('#changePasswordForm');
  const closeChangePasswordBtn = $('#closeChangePassword');
  
  if (changePasswordModal && changePasswordForm && closeChangePasswordBtn) {
    // 关闭模态框
    closeChangePasswordBtn.addEventListener('click', closeChangePasswordModal);
    
    // 点击背景关闭
    changePasswordModal.addEventListener('click', (e) => {
      if (e.target === changePasswordModal) {
        closeChangePasswordModal();
      }
    });

    // 密码可见性切换
    const toggles = [
      { btn: '#toggleCurrentPwd', input: '#currentPassword' },
      { btn: '#toggleNewPwd', input: '#newPassword' },
      { btn: '#toggleConfirmPwd', input: '#confirmPassword' }
    ];
    
    toggles.forEach(({ btn, input }) => {
      const toggleBtn = $(btn);
      const inputField = $(input);
      if (toggleBtn && inputField) {
        toggleBtn.addEventListener('click', () => {
          const isPwd = inputField.type === 'password';
          inputField.type = isPwd ? 'text' : 'password';
        });
      }
    });

    // 表单验证函数
    function validateCurrentPassword(val) {
      const ok = val && val.length >= 1;
      const err = $('#currentPwdErr');
      if (err) err.textContent = ok ? '' : '请输入当前密码';
      return ok;
    }

    function validateNewPassword(val) {
      const ok = val && val.length >= 6;
      const err = $('#newPwdErr');
      if (err) err.textContent = ok ? '' : '新密码至少 6 位';
      return ok;
    }

    function validateConfirmPassword(val, newPwd) {
      const ok = val === newPwd;
      const err = $('#confirmPwdErr');
      if (err) err.textContent = ok ? '' : '两次输入的密码不一致';
      return ok;
    }

    // 实时验证
    $('#currentPassword')?.addEventListener('input', e => validateCurrentPassword(e.target.value));
    $('#newPassword')?.addEventListener('input', e => {
      validateNewPassword(e.target.value);
      const confirmPwd = $('#confirmPassword')?.value;
      if (confirmPwd) validateConfirmPassword(confirmPwd, e.target.value);
    });
    $('#confirmPassword')?.addEventListener('input', e => {
      const newPwd = $('#newPassword')?.value;
      validateConfirmPassword(e.target.value, newPwd);
    });

    // 表单提交
    changePasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const currentPassword = $('#currentPassword')?.value;
      const newPassword = $('#newPassword')?.value;
      const confirmPassword = $('#confirmPassword')?.value;
      
      const v1 = validateCurrentPassword(currentPassword);
      const v2 = validateNewPassword(newPassword);
      const v3 = validateConfirmPassword(confirmPassword, newPassword);
      
      if (!v1 || !v2 || !v3) {
        changePasswordForm.classList.remove('shake'); 
        void changePasswordForm.offsetWidth; 
        changePasswordForm.classList.add('shake');
        toast('请修正表单错误', 'err');
        return;
      }
      
      try {
        const result = await api.changePassword({
          currentPassword,
          newPassword
        });
        
        if (result.success) {
          toast('密码修改成功！', 'ok');
          closeChangePasswordModal();
        }
      } catch (error) {
        toast(error.message || '密码修改失败', 'err');
        changePasswordForm.classList.remove('shake'); 
        void changePasswordForm.offsetWidth; 
        changePasswordForm.classList.add('shake');
      }
    });
  }
});
