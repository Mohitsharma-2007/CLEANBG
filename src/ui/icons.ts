import * as lucide from 'lucide';

export const ICONS = {
  // Navigation
  get removeBg() { return '<morph-icon data-icon="Eraser" size="20" stroke-width="2"></morph-icon>'; },
  get resize() { return '<morph-icon data-icon="Maximize" size="20" stroke-width="2"></morph-icon>'; },
  get upscale() { return '<morph-icon data-icon="Sparkles" size="20" stroke-width="2"></morph-icon>'; },
  get convert() { return '<morph-icon data-icon="RefreshCcw" size="20" stroke-width="2"></morph-icon>'; },
  get compress() { return '<morph-icon data-icon="Minimize" size="20" stroke-width="2"></morph-icon>'; },
  get history() { return '<morph-icon data-icon="History" size="20" stroke-width="2"></morph-icon>'; },

  // Header actions
  get help() { return '<morph-icon data-icon="CircleHelp" size="20" stroke-width="2"></morph-icon>'; },
  get bell() { return '<morph-icon data-icon="Bell" size="20" stroke-width="2"></morph-icon>'; },
  get settings() { return '<morph-icon data-icon="Settings" size="20" stroke-width="2"></morph-icon>'; },

  // Tools
  get remove() { return '<morph-icon data-icon="Eraser" size="20" stroke-width="2"></morph-icon>'; },
  get keep() { return '<morph-icon data-icon="CheckCircle2" size="20" stroke-width="2"></morph-icon>'; },
  get eraser() { return '<morph-icon data-icon="Eraser" size="20" stroke-width="2"></morph-icon>'; },
  get wand() { return '<morph-icon data-icon="Wand2" size="20" stroke-width="2"></morph-icon>'; },

  // Actions
  get undo() { return '<morph-icon data-icon="Undo" size="20" stroke-width="2"></morph-icon>'; },
  get redo() { return '<morph-icon data-icon="Redo" size="20" stroke-width="2"></morph-icon>'; },
  get rotateLeft() { return '<morph-icon data-icon="RotateCcw" size="20" stroke-width="2"></morph-icon>'; },
  get rotateRight() { return '<morph-icon data-icon="RotateCw" size="20" stroke-width="2"></morph-icon>'; },
  get flipH() { return '<morph-icon data-icon="FlipHorizontal" size="20" stroke-width="2"></morph-icon>'; },
  get flipV() { return '<morph-icon data-icon="FlipVertical" size="20" stroke-width="2"></morph-icon>'; },

  // View
  get zoomIn() { return '<morph-icon data-icon="ZoomIn" size="20" stroke-width="2"></morph-icon>'; },
  get zoomOut() { return '<morph-icon data-icon="ZoomOut" size="20" stroke-width="2"></morph-icon>'; },
  get pan() { return '<morph-icon data-icon="Move" size="20" stroke-width="2"></morph-icon>'; },
  get fit() { return '<morph-icon data-icon="Maximize2" size="20" stroke-width="2"></morph-icon>'; },
  get fullscreen() { return '<morph-icon data-icon="Expand" size="20" stroke-width="2"></morph-icon>'; },

  // General
  get upload() { return '<morph-icon data-icon="Upload" size="20" stroke-width="2"></morph-icon>'; },
  get uploadPlus() { return '<morph-icon data-icon="UploadCloud" size="36" stroke-width="2"></morph-icon>'; },
  get download() { return '<morph-icon data-icon="Download" size="20" stroke-width="2"></morph-icon>'; },
  get close() { return '<morph-icon data-icon="X" size="20" stroke-width="2"></morph-icon>'; },
  get check() { return '<morph-icon data-icon="Check" size="16" stroke-width="2"></morph-icon>'; },
  get checkCircle() { return '<morph-icon data-icon="CheckCircle" size="20" stroke-width="2"></morph-icon>'; },
  get plus() { return '<morph-icon data-icon="Plus" size="16" stroke-width="2"></morph-icon>'; },
  get arrowLeft() { return '<morph-icon data-icon="ArrowLeft" size="16" stroke-width="2"></morph-icon>'; },
  get arrowRight() { return '<morph-icon data-icon="ArrowRight" size="16" stroke-width="2"></morph-icon>'; },
  get chevronDown() { return '<morph-icon data-icon="ChevronDown" size="14" stroke-width="2"></morph-icon>'; },
  get link() { return '<morph-icon data-icon="Link" size="16" stroke-width="2"></morph-icon>'; },
  get lock() { return '<morph-icon data-icon="Lock" size="16" stroke-width="2"></morph-icon>'; },
  get swap() { return '<morph-icon data-icon="ArrowLeftRight" size="16" stroke-width="2"></morph-icon>'; },
  get info() { return '<morph-icon data-icon="Info" size="14" stroke-width="2"></morph-icon>'; },
  get image() { return '<morph-icon data-icon="Image" size="20" stroke-width="2"></morph-icon>'; },
  get lightning() { return '<morph-icon data-icon="Zap" size="16" stroke-width="2"></morph-icon>'; },
  get shield() { return '<morph-icon data-icon="Shield" size="20" stroke-width="2"></morph-icon>'; },
  get sparkle() { return '<morph-icon data-icon="Sparkles" size="16" stroke-width="2"></morph-icon>'; },
  get bookmark() { return '<morph-icon data-icon="Bookmark" size="16" stroke-width="2"></morph-icon>'; },
  get eye() { return '<morph-icon data-icon="Eye" size="16" stroke-width="2"></morph-icon>'; },
  get compare() { return '<morph-icon data-icon="SplitSquareHorizontal" size="20" stroke-width="2"></morph-icon>'; },
  get palette() { return '<morph-icon data-icon="Palette" size="20" stroke-width="2"></morph-icon>'; },
  get crop() { return '<morph-icon data-icon="Crop" size="20" stroke-width="2"></morph-icon>'; },
  get scale() { return '<morph-icon data-icon="Scale" size="16" stroke-width="2"></morph-icon>'; },
};

export function mountIcons() {
  const mountUnmounted = () => {
    const elements = document.querySelectorAll('morph-icon[data-icon]:not([data-mounted])');
    elements.forEach((el: any) => {
      const iconName = el.getAttribute('data-icon');
      if (iconName && (lucide as any)[iconName]) {
        el.icon = (lucide as any)[iconName];
        el.setAttribute('data-mounted', 'true');
      }
    });
  };

  // Mount existing icons
  mountUnmounted();

  // Setup observer to auto-mount any dynamically added icons (e.g. innerHTML changes)
  const observer = new MutationObserver((mutations) => {
    let shouldMount = false;
    for (const m of mutations) {
      if (m.addedNodes.length > 0) {
        shouldMount = true;
        break;
      }
    }
    if (shouldMount) {
      mountUnmounted();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}
