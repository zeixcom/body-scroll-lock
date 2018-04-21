// @flow
// Adopted and modified solution from Bohdan Didukh (2017)
// https://stackoverflow.com/questions/41594997/ios-10-safari-prevent-scrolling-behind-a-fixed-overlay-and-maintain-scroll-posi

const isIosDevice =
  typeof window !== 'undefined' &&
  window.navigator &&
  window.navigator.platform &&
  /iPad|iPhone|iPod|(iPad Simulator)|(iPhone Simulator)|(iPod Simulator)/.test(window.navigator.platform);
type HandleScrollEvent = TouchEvent;

let firstTargetElement: any = null;
const allTargetElements: { [any]: any } = {};
let initialClientY: number = -1;
let previousBodyOverflowSetting = '';
let previousDocumentElementOverflowSetting = '';
let previousBodyPaddingRight = '';

const preventDefault = (rawEvent: HandleScrollEvent): boolean => {
  const e = rawEvent || window.event;
  if (e.preventDefault) e.preventDefault();

  return false;
};

const setPaddingRightForScrollbarWidth = () => {
  const padding = window.innerWidth - document.body.clientWidth;
  previousBodyPaddingRight = document.body.style.paddingRight;
  document.body.style.paddingRight = `${padding}px`;
};

const restorePaddingRightForScrollbarWidth = () => {
  document.body.style.paddingRight = previousBodyPaddingRight || 0;
};

const setOverflowHidden = reserveScrollBarWidth => {
  // Setting overflow on body/documentElement synchronously in Desktop Safari slows down
  // the responsiveness for some reason. Setting within a setTimeout fixes this.
  setTimeout(() => {
    previousBodyOverflowSetting = document.body.style.overflow;
    previousDocumentElementOverflowSetting = document.documentElement.style.overflow;

    if (reserveScrollBarWidth) setPaddingRightForScrollbarWidth();

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  });
};

const setOverflowAuto = reserveScrollBarWidth => {
  // Setting overflow on body/documentElement synchronously in Desktop Safari slows down
  // the responsiveness for some reason. Setting within a setTimeout fixes this.
  setTimeout(() => {
    if (reserveScrollBarWidth) restorePaddingRightForScrollbarWidth();

    document.body.style.overflow = previousBodyOverflowSetting;
    document.documentElement.style.overflow = previousDocumentElementOverflowSetting;
  });
};

// https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollHeight#Problems_and_solutions
const isTargetElementTotallyScrolled = (targetElement: any): boolean =>
  targetElement ? targetElement.scrollHeight - targetElement.scrollTop <= targetElement.clientHeight : false;

const handleScroll = (event: HandleScrollEvent, targetElement: any): boolean => {
  const clientY = event.targetTouches[0].clientY - initialClientY;

  if (targetElement && targetElement.scrollTop === 0 && clientY > 0) {
    // element is at the top of its scroll
    return preventDefault(event);
  }

  if (isTargetElementTotallyScrolled(targetElement) && clientY < 0) {
    // element is at the top of its scroll
    return preventDefault(event);
  }

  return true;
};

export const disableBodyScroll = (targetElement: any, reserveScrollBarWidth: boolean = true): void => {
  if (isIosDevice) {
    if (targetElement) {
      allTargetElements[targetElement] = targetElement;

      targetElement.ontouchstart = (event: HandleScrollEvent) => {
        if (event.targetTouches.length === 1) {
          // detect single touch
          initialClientY = event.targetTouches[0].clientY;
        }
      };
      targetElement.ontouchmove = (event: HandleScrollEvent) => {
        if (event.targetTouches.length === 1) {
          // detect single touch
          handleScroll(event, targetElement);
        }
      };
    }
  } else {
    setOverflowHidden(reserveScrollBarWidth);
  }

  if (!firstTargetElement) firstTargetElement = targetElement;
};

export const clearAllBodyScrollLocks = (reserveScrollBarWidth: boolean = true): void => {
  if (isIosDevice) {
    // Clear all allTargetElements ontouchstart/ontouchmove handlers, and the references
    Object.entries(allTargetElements).forEach(([key, targetElement]: [any, any]) => {
      targetElement.ontouchstart = null;
      targetElement.ontouchmove = null;

      delete allTargetElements[key];
    });

    // Reset initial clientY
    initialClientY = -1;
  } else {
    setOverflowAuto();

    firstTargetElement = null;
  }
};

export const enableBodyScroll = (targetElement: any): void => {
  if (isIosDevice) {
    targetElement.ontouchstart = null;
    targetElement.ontouchmove = null;
  } else if (firstTargetElement === targetElement) {
    setOverflowAuto();

    firstTargetElement = null;
  }
};
