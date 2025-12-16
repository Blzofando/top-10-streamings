// Scroll Reveal Animation
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        }
    });
}, observerOptions);

// Observe all scroll-reveal elements
document.addEventListener('DOMContentLoaded', () => {
    const revealElements = document.querySelectorAll('.scroll-reveal');
    revealElements.forEach(el => observer.observe(el));
});

// Copy Code Function
function copyCode(button) {
    const codeBlock = button.parentElement.querySelector('code');
    const text = codeBlock.textContent;

    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.textContent;
        button.textContent = '✓ Copiado!';
        button.style.background = '#10b981';

        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '';
        }, 2000);
    });
}

// Smooth Scroll
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

// Navbar Background on Scroll
let lastScroll = 0;
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    const currentScroll = window.pageYOffset;

    if (currentScroll > 100) {
        navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
    } else {
        navbar.style.boxShadow = 'none';
    }

    lastScroll = currentScroll;
});

// Typing Effect for Code Window
const codeElement = document.querySelector('.code-content code');
if (codeElement) {
    const originalCode = codeElement.textContent;
    codeElement.textContent = '';

    let i = 0;
    const typeSpeed = 30;

    function typeCode() {
        if (i < originalCode.length) {
            codeElement.textContent += originalCode.charAt(i);
            i++;
            setTimeout(typeCode, typeSpeed);
        }
    }

    // Start typing after a delay
    setTimeout(typeCode, 1000);
}

// Carousel Navigation
function moveCarousel(direction) {
    const carousel = document.getElementById('demoCarousel');
    const itemWidth = carousel.querySelector('.carousel-item').offsetWidth + 20; // width + gap
    carousel.scrollBy({
        left: direction * itemWidth * 2,
        behavior: 'smooth'
    });
}
