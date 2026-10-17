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