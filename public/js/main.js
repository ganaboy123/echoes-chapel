const page = document.documentElement.getAttribute('data-page');

const shouldShowGateway = () => {
  if (page === 'gateway.html') return false;

  const params = new URLSearchParams(window.location.search);
  const fromGateway = params.get('fromGateway') === '1';
  if (fromGateway) {
    params.delete('fromGateway');
    const query = params.toString();
    const cleanUrl = window.location.pathname + (query ? ('?' + query) : '') + (window.location.hash || '');
    window.history.replaceState({}, '', cleanUrl);
    return false;
  }

  const navEntry = performance.getEntriesByType('navigation')[0];
  const navType = navEntry ? navEntry.type : '';
  const referrer = document.referrer || '';
  const sameOriginReferrer = referrer.startsWith(window.location.origin);
  return navType === 'reload' || !sameOriginReferrer;
};

if (shouldShowGateway()) {
  window.location.replace('gateway.html');
}

const nav = document.querySelector('nav');
const toggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelectorAll('nav a');

if (toggle && nav) {
  toggle.setAttribute('aria-label', 'Open navigation menu');
  toggle.setAttribute('aria-expanded', 'false');
  nav.id = nav.id || 'site-nav';
  toggle.setAttribute('aria-controls', nav.id);

  toggle.addEventListener('click', () => {
    nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', nav.classList.contains('open') ? 'true' : 'false');
  });
}

navLinks.forEach(link => {
  if (page && link.getAttribute('href') === page) link.classList.add('active');
});

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal').forEach((el, idx) => {
  el.style.setProperty('--reveal-delay', `${Math.min(idx * 60, 300)}ms`);
  observer.observe(el);
});

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const handleSubmit = async (form, endpoint) => {
  const button = form.querySelector('button[type="submit"]');
  const notice = form.querySelector('.notice');
  const data = Object.fromEntries(new FormData(form).entries());

  const fileInput = form.querySelector('input[type="file"]');
  if (fileInput && fileInput.files && fileInput.files[0]) {
    data.image = await readFileAsDataUrl(fileInput.files[0]);
  }

  if (notice) notice.textContent = '';
  if (button) {
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.textContent = 'Sending...';
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Request failed');
    if (notice) {
      notice.textContent = json.message || 'Success';
      notice.className = 'notice success';
    }
    form.reset();
  } catch (err) {
    if (notice) {
      notice.textContent = err.message || 'Something went wrong';
      notice.className = 'notice error';
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = button.dataset.originalText || 'Submit';
    }
  }
};

document.querySelectorAll('[data-form="contact"]').forEach(form => {
  form.addEventListener('submit', e => {
    e.preventDefault();
    handleSubmit(form, '/contact');
  });
});

document.querySelectorAll('[data-form="donate"]').forEach(form => {
  form.addEventListener('submit', e => {
    e.preventDefault();
    handleSubmit(form, '/donate');
  });
});

document.querySelectorAll('[data-form="impact"]').forEach(form => {
  form.addEventListener('submit', e => {
    e.preventDefault();
    handleSubmit(form, '/impact');
  });
});

const initHeroSlideshow = () => {
  if (page !== 'index.html') return;
  const container = document.querySelector('.hero-slideshow');
  if (!container) return;

  const slides = [
    { file: 'prophet (3).jpeg', pos: 'center 18%', posMobile: 'center 16%' }
  ];

  const toSrc = (name) => `images/${encodeURIComponent(name)}`;
  const nodes = slides.map((slide, index) => {
    const node = document.createElement('div');
    node.className = 'hero-slide';
    node.style.backgroundImage = `url("${toSrc(slide.file)}")`;
    node.style.setProperty('--bg-pos', slide.pos);
    node.style.setProperty('--bg-pos-mobile', slide.posMobile);
    if (index === 0) node.classList.add('is-active');
    container.appendChild(node);
    return node;
  });

  if (!nodes.length) return;

  let activeIndex = 0;

  if (nodes.length > 1) {
    const intervalMs = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 6500 : 4600;
    window.setInterval(() => {
      nodes[activeIndex].classList.remove('is-active');
      activeIndex = (activeIndex + 1) % nodes.length;
      nodes[activeIndex].classList.add('is-active');
    }, intervalMs);
  }
};

const ensureYouTubeApi = (() => {
  let loader;
  return () => {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (loader) return loader;

    loader = new Promise((resolve) => {
      const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!existing) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        document.head.appendChild(script);
      }

      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof previous === 'function') previous();
        resolve(window.YT);
      };

      const poll = () => {
        if (window.YT && window.YT.Player) resolve(window.YT);
        else window.setTimeout(poll, 80);
      };
      poll();
    });

    return loader;
  };
})();

const initSermonPreview = ({ cardTitle, videoId, fullSermonUrl }) => {
  const targetCard = Array.from(document.querySelectorAll('.media-card')).find((card) => {
    const title = card.querySelector('h3');
    return title && title.textContent.trim().toLowerCase() === cardTitle.toLowerCase();
  });
  if (!targetCard) return;

  const thumb = targetCard.querySelector('.media-thumb');
  if (!thumb) return;

  thumb.classList.add('sermon-snippet');
  thumb.setAttribute('role', 'button');
  thumb.setAttribute('tabindex', '0');
  thumb.setAttribute('aria-label', `Play or pause sermon preview: ${cardTitle}`);
  thumb.innerHTML = `<img class="snippet-cover" src="https://i.ytimg.com/vi/${videoId}/hqdefault.jpg" alt="${cardTitle} sermon preview thumbnail">`;

  const cta = document.createElement('div');
  cta.className = 'snippet-cta';
  cta.innerHTML = `<a class="btn" href="${fullSermonUrl}" target="_blank" rel="noopener">Full Sermon</a>`;
  targetCard.appendChild(cta);

  let started = false;
  let isPlaying = false;
  let player;

  const togglePlayback = () => {
    if (!player || !window.YT || !window.YT.PlayerState) return;
    const state = player.getPlayerState();
    if (state === window.YT.PlayerState.PLAYING) player.pauseVideo();
    else player.playVideo();
  };

  const startPreview = async () => {
    if (started) {
      togglePlayback();
      return;
    }
    started = true;

    thumb.innerHTML = '';

    const host = document.createElement('div');
    host.className = 'snippet-player-host';
    const playerId = `sermon-player-${videoId}-${Math.random().toString(36).slice(2, 7)}`;
    host.id = playerId;

    const touchLayer = document.createElement('button');
    touchLayer.type = 'button';
    touchLayer.className = 'snippet-touch-layer';
    touchLayer.setAttribute('aria-label', `Toggle play or pause for ${cardTitle}`);

    thumb.appendChild(host);
    thumb.appendChild(touchLayer);

    const YT = await ensureYouTubeApi();
    player = new YT.Player(playerId, {
      videoId,
      playerVars: {
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        start: 0,
        end: 180,
        controls: 0,
        fs: 0,
        iv_load_policy: 3
      },
      events: {
        onReady: () => {
          player.playVideo();
          isPlaying = true;
        },
        onStateChange: (event) => {
          isPlaying = event.data === YT.PlayerState.PLAYING;
        }
      }
    });

    touchLayer.addEventListener('pointerup', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!player) return;
      if (isPlaying) player.pauseVideo();
      else player.playVideo();
    }, { passive: false });
  };

  thumb.addEventListener('pointerup', (event) => {
    event.preventDefault();
    startPreview();
  }, { passive: false });

  thumb.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      startPreview();
    }
  });
};

const initInspirationGenerator = () => {
  if (page !== 'index.html') return;

  const inspireBtn = document.getElementById('inspireMeBtn');
  const inspireAgainBtn = document.getElementById('inspireAgainBtn');
  const result = document.getElementById('inspirationResult');
  const scriptureEl = document.getElementById('inspirationScripture');
  const messageEl = document.getElementById('inspirationMessage');
  if (!inspireBtn || !result || !scriptureEl || !messageEl) return;

  const scriptures = [
    { verse: 'Isaiah 41:10', text: 'Fear not, for I am with you; be not dismayed, for I am your God.' },
    { verse: 'Jeremiah 29:11', text: 'For I know the plans I have for you, declares the Lord, plans for welfare and not for evil.' },
    { verse: 'Romans 8:28', text: 'In all things God works for the good of those who love Him, who have been called according to His purpose.' },
    { verse: 'Psalm 46:1', text: 'God is our refuge and strength, an ever-present help in trouble.' },
    { verse: 'Philippians 4:6-7', text: 'Do not be anxious about anything... and the peace of God will guard your hearts and your minds in Christ Jesus.' },
    { verse: 'Lamentations 3:22-23', text: 'His compassions never fail. They are new every morning; great is Your faithfulness.' },
    { verse: '2 Corinthians 12:9', text: 'My grace is sufficient for you, for My power is made perfect in weakness.' },
    { verse: 'Joshua 1:9', text: 'Be strong and courageous. Do not be afraid... for the Lord your God will be with you wherever you go.' }
  ];

  const encouragementTemplates = [
    'God is not late in your story. Stay steady and keep trusting His timing.',
    'Grace is active in your life right now. Take the next step with confidence.',
    'You are not carrying today alone. The Lord is strengthening you as you move forward.',
    'This season is not empty. God is shaping purpose and maturity in you.',
    'Peace is available to you now. Breathe, pray, and keep your heart anchored in Christ.'
  ];

  let lastScriptureIndex = -1;
  let lastMessageIndex = -1;

  const nextIndex = (length, previous) => {
    if (length < 2) return 0;
    let idx = Math.floor(Math.random() * length);
    if (idx === previous) idx = (idx + 1) % length;
    return idx;
  };

  const renderInspiration = () => {
    const scriptureIndex = nextIndex(scriptures.length, lastScriptureIndex);
    const messageIndex = nextIndex(encouragementTemplates.length, lastMessageIndex);

    lastScriptureIndex = scriptureIndex;
    lastMessageIndex = messageIndex;

    const selected = scriptures[scriptureIndex];
    scriptureEl.textContent = `"${selected.text}" — ${selected.verse}`;
    messageEl.textContent = encouragementTemplates[messageIndex];

    inspireBtn.hidden = true;
    result.hidden = false;
    result.classList.remove('is-visible');
    window.requestAnimationFrame(() => result.classList.add('is-visible'));
  };

  inspireBtn.addEventListener('click', renderInspiration);
  if (inspireAgainBtn) inspireAgainBtn.addEventListener('click', renderInspiration);
};
const initAnnouncementBar = async () => {
  const container = document.querySelector('.container');
  const header = container?.querySelector('header');
  if (!container || !header) return;

  const bar = document.createElement('div');
  bar.className = 'announcement-bar';
  bar.innerHTML = '<span class="announcement-label">Announcement</span><span class="announcement-text">Loading updates...</span>';
  container.insertBefore(bar, header);

  const textNode = bar.querySelector('.announcement-text');
  let messages = [];
  let idx = 0;

  const render = () => {
    if (!messages.length) {
      textNode.textContent = 'Welcome to Echoes Chapel International.';
      return;
    }
    textNode.textContent = messages[idx % messages.length];
    idx += 1;
  };

  try {
    const data = await fetch('/api/announcements').then((r) => r.json());
    messages = (data.items || []).filter((a) => a.active).map((a) => a.text);
    render();
    window.setInterval(render, 5000);
  } catch (_e) {
    textNode.textContent = 'Welcome to Echoes Chapel International.';
  }
};

const initWhatsAppFab = () => {
  const pageName = page.replace('.html', '').toLowerCase();
  const prompts = {
    index: 'Hello Echoes Chapel, I visited your website and would like to connect.',
    visit: 'Hello Echoes Chapel, I want to plan my first visit.',
    events: 'Hello Echoes Chapel, I want details about upcoming events.',
    media: 'Hello Echoes Chapel, I want sermon and media updates.',
    give: 'Hello Echoes Chapel, I need guidance on giving options.',
    impact: 'Hello Echoes Chapel, I want to share an impact testimony.',
    contact: 'Hello Echoes Chapel, I would like to contact the ministry.'
  };
  const message = prompts[pageName] || 'Hello Echoes Chapel, I would like to connect.';
  const link = `https://wa.me/233000000000?text=${encodeURIComponent(message)}`;

  const fab = document.createElement('a');
  fab.className = 'whatsapp-fab';
  fab.href = link;
  fab.target = '_blank';
  fab.rel = 'noopener';
  fab.setAttribute('aria-label', 'Chat with Echoes Chapel on WhatsApp');
  fab.textContent = 'WhatsApp';
  document.body.appendChild(fab);
};

initHeroSlideshow();
initSermonPreview({
  cardTitle: 'ANOINTED SENT FORTH. DOMINATE. TAKEOVER',
  videoId: 'HFt4OGfr5_8',
  fullSermonUrl: 'https://youtu.be/HFt4OGfr5_8?si=_w0qmGnXv7aznvNf'
});
initSermonPreview({
  cardTitle: 'IT IS A NEW DAWN',
  videoId: 'DsMx3hzPBuU',
  fullSermonUrl: 'https://youtu.be/DsMx3hzPBuU?si=4t9cFyZWRzZp5pTD'
});
initSermonPreview({
  cardTitle: 'PROPHETIC WAVES, SOUND THE TRUMPET',
  videoId: 'wIlzdUwO1YQ',
  fullSermonUrl: 'https://youtu.be/wIlzdUwO1YQ?si=arLpovtu2bhAYgge'
});
initInspirationGenerator();
initAnnouncementBar();
initWhatsAppFab();

document.querySelectorAll('img:not([loading])').forEach((img) => {
  if (!img.closest('header')) img.loading = 'lazy';
});













