// Simple AOS (Animate On Scroll)
function initAOS() {
    const elements = document.querySelectorAll('[data-aos]');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('aos-animate');
            }
        });
    }, {
        threshold: 0.1
    });

    elements.forEach(el => {
        const delay = el.getAttribute('data-aos-delay');
        if (delay) {
            el.style.transitionDelay = `${delay}ms`;
        }
        observer.observe(el);
    });
}

// Copy code function
function copyCode() {
    const code = document.getElementById('codeBlock').textContent;
    navigator.clipboard.writeText(code).then(() => {
        const btn = document.querySelector('.copy-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 8L7 11L12 5" stroke="currentColor" stroke-width="2"/>
            </svg>
            Copiado!
        `;
        btn.style.borderColor = '#10b981';
        btn.style.color = '#10b981';

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.borderColor = '';
            btn.style.color = '';
        }, 2000);
    });
}

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initAOS();
});
