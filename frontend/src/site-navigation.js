(() => {
  const pages = [
    { href: '/index.html', label: 'Home', icon: '⌂' },
    { href: '/amplify-tutor.html', label: 'Amplify Tutor', icon: '✦' },
    { href: '/classroomai.html', label: 'AI Classroom', icon: '◉' },
    { href: '/classroom.html', label: 'Classrooms', icon: '▤' },
    { href: '/deeplearn.html', label: 'DeepLearn', icon: '⌘' },
    { href: '/career.html', label: 'Career Engine', icon: '↗' },
    { href: '/experiments.html', label: 'Experiments', icon: '⚗' },
    { href: '/biology-lab.html', label: 'Biology Lab', icon: '❋' },
    { href: '/chemistry.html', label: 'Chemistry Lab', icon: '⚗' },
    { href: '/quiz.html', label: 'Quiz', icon: '?' },
    { href: '/routine.html', label: 'Study Routine', icon: '◷' },
    { href: '/dashboard.html', label: 'Dashboard', icon: '▥' },
    { href: '/teacher/index.html', label: 'Educator Portal', icon: '♙' },
    { href: '/teacher/classroom.html', label: 'Teacher Classroom', icon: '▧' },
  ];

  const currentPath = window.location.pathname.replace(/\/$/, '') || '/index.html';
  const style = document.createElement('style');
  style.textContent = `
    #amplify-site-nav, #amplify-site-nav * { box-sizing: border-box; }
    #amplify-site-nav {
      --site-nav-ink: #edf5f6;
      --site-nav-muted: #a5b6bb;
      --site-nav-accent: #38d9a9;
      color: var(--site-nav-ink);
      font: 500 14px/1.4 "DM Sans", system-ui, sans-serif;
    }
    #amplify-site-nav button, #amplify-site-nav a { font: inherit; }
    #amplify-site-nav .site-nav-toggle {
      position: fixed;
      right: 22px;
      bottom: 22px;
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 9px;
      min-height: 48px;
      padding: 0 17px;
      border: 1px solid rgba(255,255,255,.18);
      border-radius: 999px;
      background: #10232a;
      color: var(--site-nav-ink);
      box-shadow: 0 8px 28px rgba(0,0,0,.28);
      cursor: pointer;
    }
    #amplify-site-nav .site-nav-toggle:hover,
    #amplify-site-nav .site-nav-toggle:focus-visible {
      border-color: var(--site-nav-accent);
      outline: none;
    }
    #amplify-site-nav .site-nav-toggle-icon { color: var(--site-nav-accent); font-size: 18px; }
    #amplify-site-nav .site-nav-panel {
      position: fixed;
      right: 22px;
      bottom: 82px;
      z-index: 9999;
      display: none;
      width: min(340px, calc(100vw - 32px));
      max-height: min(72vh, 590px);
      overflow-y: auto;
      padding: 14px;
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 18px;
      background: #10232a;
      box-shadow: 0 18px 55px rgba(0,0,0,.38);
    }
    #amplify-site-nav .site-nav-panel.open { display: block; }
    #amplify-site-nav .site-nav-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 5px 4px 12px;
    }
    #amplify-site-nav .site-nav-title { font-size: 15px; font-weight: 700; }
    #amplify-site-nav .site-nav-actions { display: flex; gap: 6px; }
    #amplify-site-nav .site-nav-actions button {
      border: 1px solid rgba(255,255,255,.15);
      border-radius: 8px;
      padding: 6px 9px;
      background: rgba(255,255,255,.06);
      color: var(--site-nav-ink);
      cursor: pointer;
    }
    #amplify-site-nav .site-nav-actions button:hover { border-color: var(--site-nav-accent); }
    #amplify-site-nav .site-nav-links { display: grid; gap: 4px; }
    #amplify-site-nav .site-nav-link {
      display: flex;
      align-items: center;
      gap: 11px;
      min-height: 40px;
      padding: 8px 10px;
      border: 1px solid transparent;
      border-radius: 10px;
      color: var(--site-nav-ink);
      text-decoration: none;
    }
    #amplify-site-nav .site-nav-link:hover,
    #amplify-site-nav .site-nav-link[aria-current="page"] {
      border-color: rgba(56,217,169,.3);
      background: rgba(56,217,169,.1);
    }
    #amplify-site-nav .site-nav-link[aria-current="page"] { color: var(--site-nav-accent); }
    #amplify-site-nav .site-nav-link-icon {
      display: inline-grid;
      width: 22px;
      place-items: center;
      color: var(--site-nav-accent);
      font-size: 16px;
    }
    @media (max-width: 600px) {
      #amplify-site-nav .site-nav-toggle { right: 14px; bottom: 14px; }
      #amplify-site-nav .site-nav-panel { right: 14px; bottom: 72px; }
    }
  `;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = 'amplify-site-nav';
  root.innerHTML = `
    <button class="site-nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav-panel">
      <span class="site-nav-toggle-icon" aria-hidden="true">☰</span>
      <span>Pages</span>
    </button>
    <nav class="site-nav-panel" id="site-nav-panel" aria-label="Website pages">
      <div class="site-nav-heading">
        <span class="site-nav-title">Explore Amplify</span>
        <span class="site-nav-actions">
          <button type="button" data-action="back" aria-label="Go to previous page">← Back</button>
          <button type="button" data-action="home">Home</button>
        </span>
      </div>
      <div class="site-nav-links"></div>
    </nav>
  `;
  document.body.appendChild(root);

  const panel = root.querySelector('.site-nav-panel');
  const toggle = root.querySelector('.site-nav-toggle');
  const links = root.querySelector('.site-nav-links');

  pages.forEach(({ href, label, icon }) => {
    const link = document.createElement('a');
    link.className = 'site-nav-link';
    link.href = href;
    if (href === currentPath || (currentPath === '/' && href === '/index.html')) {
      link.setAttribute('aria-current', 'page');
    }
    const symbol = document.createElement('span');
    symbol.className = 'site-nav-link-icon';
    symbol.setAttribute('aria-hidden', 'true');
    symbol.textContent = icon;
    link.append(symbol, document.createTextNode(label));
    links.appendChild(link);
  });

  toggle.addEventListener('click', () => {
    const isOpen = panel.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  root.querySelector('[data-action="home"]').addEventListener('click', () => {
    window.location.assign('/index.html');
  });

  root.querySelector('[data-action="back"]').addEventListener('click', () => {
    const previousPage = document.referrer ? new URL(document.referrer) : null;
    if (
      previousPage?.origin === window.location.origin &&
      pages.some(page => page.href === previousPage.pathname)
    ) {
      window.history.back();
      return;
    }
    window.location.assign('/index.html');
  });

  document.addEventListener('pointerdown', event => {
    if (!root.contains(event.target)) {
      panel.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      panel.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }
  });
})();
