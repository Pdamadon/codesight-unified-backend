export interface ClickCapture {
  timestamp: number;
  x: number;
  y: number;
  url: string;
  sessionTime: number;
}

export class ClickOverlay {
  private overlay: HTMLDivElement | null = null;
  private isActive = false;
  private startTime = 0;
  private clicks: ClickCapture[] = [];
  private onClickCallback?: (click: ClickCapture) => void;

  constructor(onClickCallback?: (click: ClickCapture) => void) {
    this.onClickCallback = onClickCallback;
  }

  start(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    this.startTime = Date.now();
    this.clicks = [];
    this.createOverlay();
  }

  stop(): ClickCapture[] {
    this.isActive = false;
    this.removeOverlay();
    return [...this.clicks];
  }

  private createOverlay(): void {
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 999999;
      pointer-events: none;
      background: transparent;
    `;

    // Enable click capture but let clicks pass through
    this.overlay.style.pointerEvents = 'auto';
    
    this.overlay.addEventListener('click', this.handleOverlayClick.bind(this));
    document.body.appendChild(this.overlay);

    // Show brief visual indicator
    this.showActivationIndicator();
  }

  private removeOverlay(): void {
    if (this.overlay) {
      document.body.removeChild(this.overlay);
      this.overlay = null;
    }
  }

  private handleOverlayClick(event: MouseEvent): void {
    const click: ClickCapture = {
      timestamp: Date.now(),
      x: event.clientX,
      y: event.clientY,
      url: window.location.href,
      sessionTime: Date.now() - this.startTime
    };

    this.clicks.push(click);
    
    if (this.onClickCallback) {
      this.onClickCallback(click);
    }

    // Show visual feedback
    this.showClickIndicator(event.clientX, event.clientY);

    // Let the click pass through to underlying elements
    this.overlay!.style.pointerEvents = 'none';
    setTimeout(() => {
      if (this.overlay) {
        this.overlay.style.pointerEvents = 'auto';
      }
    }, 10);
  }

  private showClickIndicator(x: number, y: number): void {
    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: fixed;
      left: ${x - 5}px;
      top: ${y - 5}px;
      width: 10px;
      height: 10px;
      background: rgba(255, 0, 0, 0.7);
      border-radius: 50%;
      z-index: 1000000;
      pointer-events: none;
      animation: clickPulse 0.5s ease-out;
    `;

    // Add animation keyframes if not already added
    if (!document.querySelector('#click-indicator-styles')) {
      const style = document.createElement('style');
      style.id = 'click-indicator-styles';
      style.textContent = `
        @keyframes clickPulse {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(3); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(indicator);
    setTimeout(() => {
      if (indicator.parentElement) {
        indicator.parentElement.removeChild(indicator);
      }
    }, 500);
  }

  private showActivationIndicator(): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(34, 197, 94, 0.9);
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      z-index: 1000001;
      pointer-events: none;
    `;
    notification.textContent = '🎯 Click tracking active';

    document.body.appendChild(notification);
    setTimeout(() => {
      if (notification.parentElement) {
        notification.parentElement.removeChild(notification);
      }
    }, 3000);
  }

  getClickCount(): number {
    return this.clicks.length;
  }
}