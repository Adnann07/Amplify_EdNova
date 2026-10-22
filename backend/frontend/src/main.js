// ─── Favicon ──────────────────────────────────────────────────
(function () {
    function setFavicon() {
        document.querySelectorAll('link[rel*="icon"]').forEach(el => el.remove());
        const link = document.createElement('link');
        link.rel  = 'icon';
        link.type = 'image/png';
        link.href = '/src/assets/amplify.png';
        document.head.appendChild(link);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setFavicon);
    } else {
        setFavicon();
    }
})();

// ─── Init ─────────────────────────────────────────────────────
console.log('%c✅ Amplify loaded', 'color:#00ff88;font-weight:700;font-size:14px;');

// ─── Header scroll ────────────────────────────────────────────
window.addEventListener('scroll', () => {
    const header = document.getElementById('header');
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

// ─── Utilities ───────────────────────────────────────────────
function showDownloadAlert() {
    const apkUrl = 'https://github.com/Adnann07/AmplifyApp---Release/releases/download/Amplify/Amplify.apk';
    window.open(apkUrl, '_blank', 'noopener,noreferrer');
    return false;
}

function stopVoice() {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    const btn = document.getElementById('dashboardSpeakBtn');
    if (btn) btn.classList.remove('speaking');
}

// ─── DOM Ready ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.lang = 'en';

    const headline = document.querySelector('.hero-headline');
    const headlineLines = headline
        ? [...headline.querySelectorAll('.hero-line-1, .hero-line-2')]
        : [];
    if (headlineLines.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const fullText = headlineLines.map(line => line.textContent);
        headline.classList.add('is-typing');
        headlineLines.forEach(line => { line.textContent = ''; });
        let lineIndex = 0;
        let characterIndex = 0;
        const typeNextCharacter = () => {
            if (lineIndex >= headlineLines.length) {
                headline.classList.remove('is-typing');
                return;
            }
            const text = fullText[lineIndex];
            headlineLines[lineIndex].textContent = text.slice(0, ++characterIndex);
            if (characterIndex >= text.length) {
                lineIndex += 1;
                characterIndex = 0;
                if (lineIndex === 1) headline.classList.add('typing-second-line');
                window.setTimeout(typeNextCharacter, 180);
                return;
            }
            window.setTimeout(typeNextCharacter, 48);
        };
        window.setTimeout(typeNextCharacter, 220);
    }

    // Animate cards into view on scroll
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.08 }
    );

    document.querySelectorAll('.feature-card, .step-card, .card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(card);
    });
});