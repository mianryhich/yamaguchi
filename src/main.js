import './style.scss';

const slides = [...document.querySelectorAll('.slide')];
const buttons = [...document.querySelectorAll('.wheel__button')];
const rotor = document.querySelector('.wheel__items');
const label = document.querySelector('.wheel__label');

const desktop = window.matchMedia('(min-width: 1024px)');
const reducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
);

const labels = [
  'Фен-стайлер\n2 в 1',
  'Суперлёгкий',
  'Инновационный\nяпонский мотор',
];

const angleStep = 22.5;
const transitionDuration = 750;
const scrollThreshold = 50;

let currentSlide = 0;
let lockedUntil = 0;
let wheelDelta = 0;
let lastWheelTime = 0;
let labelAnimation = null;

// Обновление колеса и подписи

function updateWheel(animate = false) {
  const shouldAnimate = animate && !reducedMotion.matches;

  if (!shouldAnimate) {
    rotor.style.transition = 'none';

    buttons.forEach((button) => {
      button.style.transition = 'none';
    });
  }

  rotor.style.setProperty(
    '--rotation',
    `${-currentSlide * angleStep}deg`
  );

  buttons.forEach((button, index) => {
    const isActive = index === currentSlide;

    button.style.setProperty('--angle', `${index * angleStep}deg`);

    // Удаляем координаты старой реализации, если они остались.
    button.style.removeProperty('left');
    button.style.removeProperty('top');

    button.classList.toggle('is-active', isActive);

    if (isActive) {
      button.setAttribute('aria-current', 'true');
    } else {
      button.removeAttribute('aria-current');
    }
  });

  labelAnimation?.cancel();
  label.textContent = labels[currentSlide];

  if (shouldAnimate) {
    labelAnimation = label.animate(
      [
        {
          opacity: 0,
          transform: 'translateY(calc(-50% + 8px))',
        },
        {
          opacity: 1,
          transform: 'translateY(-50%)',
        },
      ],
      {
        duration: 400,
        easing: 'ease-out',
      }
    );
  } else {
    // Фиксируем начальное положение без анимации.
    void rotor.offsetWidth;

    rotor.style.removeProperty('transition');

    buttons.forEach((button) => {
      button.style.removeProperty('transition');
    });
  }
}

// Состояния карточек

function renderSlides() {
  slides.forEach((slide, index) => {
    const isActive = index === currentSlide;

    slide.classList.toggle('is-active', isActive);
    slide.classList.toggle('is-before', index < currentSlide);

    if (desktop.matches) {
      slide.inert = !isActive;
      slide.setAttribute('aria-hidden', String(!isActive));
    } else {
      slide.inert = false;
      slide.removeAttribute('aria-hidden');
    }
  });
}

// Общая функция перехода для кнопок, прокрутки и клавиатуры

function goToSlide(index) {
  if (!desktop.matches || performance.now() < lockedUntil) return;

  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= slides.length ||
    index === currentSlide
  ) {
    return;
  }

  const focusedElement = document.activeElement;

  if (
    focusedElement instanceof HTMLElement &&
    slides[currentSlide].contains(focusedElement)
  ) {
    focusedElement.blur();
  }

  currentSlide = index;
  wheelDelta = 0;

  lockedUntil =
    performance.now() +
    (reducedMotion.matches ? 250 : transitionDuration);

  renderSlides();
  updateWheel(true);
}

// Нажатие на иконку

buttons.forEach((button) => {
  button.addEventListener('click', () => {
    goToSlide(Number(button.dataset.slide));
  });
});

// Прокрутка мышью или тачпадом

window.addEventListener(
  'wheel',
  (event) => {
    if (
      !desktop.matches ||
      event.ctrlKey ||
      event.deltaY === 0 ||
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
    ) {
      return;
    }

    event.preventDefault();

    const now = performance.now();

    if (now < lockedUntil) {
      wheelDelta = 0;
      lastWheelTime = now;
      return;
    }

    const directionChanged =
      wheelDelta !== 0 &&
      Math.sign(event.deltaY) !== Math.sign(wheelDelta);

    if (now - lastWheelTime > 180 || directionChanged) {
      wheelDelta = 0;
    }

    lastWheelTime = now;

    let multiplier = 1;

    if (event.deltaMode === 1) {
      multiplier = 16;
    } else if (event.deltaMode === 2) {
      multiplier = window.innerHeight;
    }

    wheelDelta += event.deltaY * multiplier;

    if (Math.abs(wheelDelta) >= scrollThreshold) {
      const direction = Math.sign(wheelDelta);

      wheelDelta = 0;
      goToSlide(currentSlide + direction);
    }
  },
  { passive: false }
);

// Управление с клавиатуры

window.addEventListener('keydown', (event) => {
  if (
    !desktop.matches ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  ) {
    return;
  }

  if (
    event.target instanceof Element &&
    event.target.closest('input, textarea, select, [contenteditable]')
  ) {
    return;
  }

  const targets = {
    ArrowDown: currentSlide + 1,
    PageDown: currentSlide + 1,
    ArrowUp: currentSlide - 1,
    PageUp: currentSlide - 1,
    Home: 0,
    End: slides.length - 1,
  };

  if (!Object.hasOwn(targets, event.key)) return;

  event.preventDefault();
  goToSlide(targets[event.key]);
});

// Переключение между десктопной и мобильной раскладкой

function configureLayout() {
  document.documentElement.classList.toggle(
    'desktop-slides',
    desktop.matches
  );

  wheelDelta = 0;
  lastWheelTime = 0;
  lockedUntil = 0;

  renderSlides();
  updateWheel(false);
}

desktop.addEventListener('change', configureLayout);

configureLayout();