export interface InteractionEvent {
  type: 'click' | 'scroll' | 'input' | 'navigation' | 'hover' | 'focus' | 'blur' | 'keypress';
  timestamp: number;
  sessionTime: number; // Time since recording started
  data: Record<string, any>;
}

export interface ClickEvent extends InteractionEvent {
  type: 'click';
  data: {
    selector: string;
    element: string;
    x: number;
    y: number;
    pageX: number;
    pageY: number;
    text: string;
    attributes: Record<string, string>;
    url: string;
    viewportWidth: number;
    viewportHeight: number;
  };
}

export interface ScrollEvent extends InteractionEvent {
  type: 'scroll';
  data: {
    scrollX: number;
    scrollY: number;
    deltaX?: number;
    deltaY?: number;
    url: string;
    documentHeight: number;
    viewportHeight: number;
    scrollPercentage: number;
  };
}

export interface InputEvent extends InteractionEvent {
  type: 'input';
  data: {
    selector: string;
    element: string;
    inputType: string;
    value: string; // Anonymized for sensitive data
    placeholder?: string;
    label?: string;
    url: string;
    fieldName?: string;
  };
}

export interface NavigationEvent extends InteractionEvent {
  type: 'navigation';
  data: {
    from: string;
    to: string;
    method: 'click' | 'type' | 'back' | 'forward' | 'reload';
    title: string;
  };
}

export class InteractionTracker {
  private events: InteractionEvent[] = [];
  private isTracking = false;
  private startTime = 0;
  private lastScrollTime = 0;
  private scrollTimeout: number | null = null;

  constructor() {
    this.bindEvents();
  }

  start(): void {
    this.isTracking = true;
    this.startTime = Date.now();
    this.events = [];
    
    // Track initial page load
    this.addEvent({
      type: 'navigation',
      timestamp: Date.now(),
      sessionTime: 0,
      data: {
        from: '',
        to: window.location.href,
        method: 'type',
        title: document.title,
      },
    });
  }

  stop(): InteractionEvent[] {
    this.isTracking = false;
    return [...this.events];
  }

  private addEvent(event: InteractionEvent): void {
    if (!this.isTracking) return;
    
    event.sessionTime = Date.now() - this.startTime;
    this.events.push(event);
    
    // Log for debugging
    console.log('Tracked interaction:', event.type, event.data);
  }

  private bindEvents(): void {
    // Click tracking
    document.addEventListener('click', this.handleClick.bind(this), true);
    
    // Scroll tracking
    document.addEventListener('scroll', this.handleScroll.bind(this), true);
    window.addEventListener('scroll', this.handleScroll.bind(this));
    
    // Input tracking
    document.addEventListener('input', this.handleInput.bind(this), true);
    document.addEventListener('change', this.handleInput.bind(this), true);
    
    // Focus/blur tracking
    document.addEventListener('focus', this.handleFocus.bind(this), true);
    document.addEventListener('blur', this.handleBlur.bind(this), true);
    
    // Mouse hover tracking (throttled)
    document.addEventListener('mouseover', this.handleHover.bind(this), true);
    
    // Keyboard tracking
    document.addEventListener('keydown', this.handleKeypress.bind(this), true);
    
    // Navigation tracking
    this.bindNavigationEvents();
  }

  private handleClick(event: MouseEvent): void {
    if (!this.isTracking) return;

    const target = event.target as Element;
    const selector = this.getElementSelector(target);
    const rect = target.getBoundingClientRect();

    const clickEvent: ClickEvent = {
      type: 'click',
      timestamp: Date.now(),
      sessionTime: 0,
      data: {
        selector,
        element: target.tagName.toLowerCase(),
        x: Math.round(event.clientX),
        y: Math.round(event.clientY),
        pageX: Math.round(event.pageX),
        pageY: Math.round(event.pageY),
        text: this.getElementText(target),
        attributes: this.getElementAttributes(target),
        url: window.location.href,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      },
    };

    this.addEvent(clickEvent);
  }

  private handleScroll(event: Event): void {
    if (!this.isTracking) return;

    // Throttle scroll events to avoid spam
    const now = Date.now();
    if (now - this.lastScrollTime < 100) return;
    this.lastScrollTime = now;

    const target = event.target === document ? window : event.target as Element;
    const scrollX = target === window ? window.scrollX : (target as Element).scrollLeft;
    const scrollY = target === window ? window.scrollY : (target as Element).scrollTop;
    
    const documentHeight = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );

    const scrollEvent: ScrollEvent = {
      type: 'scroll',
      timestamp: Date.now(),
      sessionTime: 0,
      data: {
        scrollX: Math.round(scrollX),
        scrollY: Math.round(scrollY),
        url: window.location.href,
        documentHeight,
        viewportHeight: window.innerHeight,
        scrollPercentage: Math.round((scrollY / (documentHeight - window.innerHeight)) * 100),
      },
    };

    this.addEvent(scrollEvent);
  }

  private handleInput(event: Event): void {
    if (!this.isTracking) return;

    const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const selector = this.getElementSelector(target);
    
    // Anonymize sensitive data
    let value = target.value;
    const inputType = target.type || 'text';
    
    // Anonymize passwords, emails, and other sensitive fields
    if (inputType === 'password') {
      value = '[PASSWORD]';
    } else if (inputType === 'email' || target.name?.toLowerCase().includes('email')) {
      value = value ? '[EMAIL_PROVIDED]' : '';
    } else if (target.name?.toLowerCase().includes('credit') || target.name?.toLowerCase().includes('card')) {
      value = '[PAYMENT_INFO]';
    } else if (value.length > 100) {
      value = value.substring(0, 100) + '...';
    }

    const inputEvent: InputEvent = {
      type: 'input',
      timestamp: Date.now(),
      sessionTime: 0,
      data: {
        selector,
        element: target.tagName.toLowerCase(),
        inputType,
        value,
        placeholder: (target as HTMLInputElement).placeholder || '',
        label: this.getInputLabel(target),
        url: window.location.href,
        fieldName: target.name || target.id || '',
      },
    };

    this.addEvent(inputEvent);
  }

  private handleFocus(event: FocusEvent): void {
    if (!this.isTracking) return;

    const target = event.target as Element;
    this.addEvent({
      type: 'focus',
      timestamp: Date.now(),
      sessionTime: 0,
      data: {
        selector: this.getElementSelector(target),
        element: target.tagName.toLowerCase(),
        url: window.location.href,
      },
    });
  }

  private handleBlur(event: FocusEvent): void {
    if (!this.isTracking) return;

    const target = event.target as Element;
    this.addEvent({
      type: 'blur',
      timestamp: Date.now(),
      sessionTime: 0,
      data: {
        selector: this.getElementSelector(target),
        element: target.tagName.toLowerCase(),
        url: window.location.href,
      },
    });
  }

  private handleHover(event: MouseEvent): void {
    if (!this.isTracking) return;

    // Throttle hover events heavily
    if (Math.random() > 0.1) return; // Only track 10% of hover events

    const target = event.target as Element;
    this.addEvent({
      type: 'hover',
      timestamp: Date.now(),
      sessionTime: 0,
      data: {
        selector: this.getElementSelector(target),
        element: target.tagName.toLowerCase(),
        x: Math.round(event.clientX),
        y: Math.round(event.clientY),
        url: window.location.href,
      },
    });
  }

  private handleKeypress(event: KeyboardEvent): void {
    if (!this.isTracking) return;

    // Don't track actual key values for privacy, just key types
    const key = event.key.length === 1 ? '[CHAR]' : event.key;
    
    this.addEvent({
      type: 'keypress',
      timestamp: Date.now(),
      sessionTime: 0,
      data: {
        key,
        code: event.code,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        url: window.location.href,
      },
    });
  }

  private bindNavigationEvents(): void {
    // Track navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(state, title, url) {
      const result = originalPushState.apply(history, arguments as any);
      window.dispatchEvent(new CustomEvent('navigationChange', { 
        detail: { method: 'pushState', url } 
      }));
      return result;
    };

    history.replaceState = function(state, title, url) {
      const result = originalReplaceState.apply(history, arguments as any);
      window.dispatchEvent(new CustomEvent('navigationChange', { 
        detail: { method: 'replaceState', url } 
      }));
      return result;
    };

    window.addEventListener('popstate', () => {
      window.dispatchEvent(new CustomEvent('navigationChange', { 
        detail: { method: 'back', url: window.location.href } 
      }));
    });

    window.addEventListener('navigationChange', (event: any) => {
      if (!this.isTracking) return;

      this.addEvent({
        type: 'navigation',
        timestamp: Date.now(),
        sessionTime: 0,
        data: {
          from: document.referrer || '',
          to: window.location.href,
          method: event.detail.method,
          title: document.title,
        },
      });
    });
  }

  private getElementSelector(element: Element): string {
    // Generate a unique CSS selector for the element
    if (element.id) {
      return `#${element.id}`;
    }

    let selector = element.tagName.toLowerCase();
    
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        selector += '.' + classes.slice(0, 3).join('.'); // Limit to first 3 classes
      }
    }

    // Add attribute selectors for common attributes
    ['name', 'type', 'role', 'data-testid'].forEach(attr => {
      const value = element.getAttribute(attr);
      if (value) {
        selector += `[${attr}="${value}"]`;
      }
    });

    // Add position if no unique identifiers
    if (!element.id && !element.className) {
      const parent = element.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(child => 
          child.tagName === element.tagName
        );
        const index = siblings.indexOf(element);
        if (siblings.length > 1) {
          selector += `:nth-of-type(${index + 1})`;
        }
      }
    }

    return selector;
  }

  private getElementText(element: Element): string {
    // Get the visible text content, truncated
    const text = element.textContent?.trim() || '';
    return text.length > 50 ? text.substring(0, 50) + '...' : text;
  }

  private getElementAttributes(element: Element): Record<string, string> {
    const attrs: Record<string, string> = {};
    const importantAttrs = ['class', 'id', 'name', 'type', 'role', 'href', 'src', 'alt', 'title'];
    
    importantAttrs.forEach(attr => {
      const value = element.getAttribute(attr);
      if (value) {
        attrs[attr] = value;
      }
    });

    return attrs;
  }

  private getInputLabel(input: Element): string {
    // Try to find associated label
    const id = input.getAttribute('id');
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) {
        return label.textContent?.trim() || '';
      }
    }

    // Check for parent label
    const parentLabel = input.closest('label');
    if (parentLabel) {
      return parentLabel.textContent?.trim() || '';
    }

    // Check for aria-label
    const ariaLabel = input.getAttribute('aria-label');
    if (ariaLabel) {
      return ariaLabel;
    }

    return '';
  }

  getEventsSummary(): any {
    const summary = {
      totalEvents: this.events.length,
      duration: this.events.length > 0 ? this.events[this.events.length - 1].sessionTime : 0,
      eventTypes: {} as Record<string, number>,
      urls: new Set<string>(),
      clicks: 0,
      scrolls: 0,
      inputs: 0,
      navigations: 0,
    };

    this.events.forEach(event => {
      summary.eventTypes[event.type] = (summary.eventTypes[event.type] || 0) + 1;
      
      if (event.data.url) {
        summary.urls.add(event.data.url);
      }

      switch (event.type) {
        case 'click':
          summary.clicks++;
          break;
        case 'scroll':
          summary.scrolls++;
          break;
        case 'input':
          summary.inputs++;
          break;
        case 'navigation':
          summary.navigations++;
          break;
      }
    });

    return {
      ...summary,
      urls: Array.from(summary.urls),
    };
  }
}