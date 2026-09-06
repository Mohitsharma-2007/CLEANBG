import { ICONS } from './icons';
import { getLogoSvg } from './logo';
import { eventBus, events } from '../core/event-bus';
import { authState } from '../core/auth-state';
import type { View } from '../core/types';

export function createHeader(currentView: View): HTMLElement {
  const header = document.createElement('header');
  header.className = 'header';
  header.id = 'app-header';

  const navItems: { id: View; label: string; icon: string }[] = [
    { id: 'remove-bg', label: 'Remove Background', icon: ICONS.removeBg },
    { id: 'resize', label: 'Resize', icon: ICONS.resize },
    { id: 'upscale', label: 'Upscale', icon: ICONS.upscale },
    { id: 'convert', label: 'Convert', icon: ICONS.convert },
    { id: 'compress', label: 'Compress', icon: ICONS.compress },
    { id: 'history', label: 'History', icon: ICONS.history },
  ];

  header.innerHTML = `
    <div class="header-inner">
      <div class="header-left">
        <div class="header-logo" id="header-logo" style="cursor:pointer;" title="ClearBG AI">
          ${getLogoSvg(28, true)}
        </div>
        <nav class="header-nav" id="header-nav">
          ${navItems.map(item => `
            <button class="nav-btn ${item.id === currentView ? 'active' : ''}" data-view="${item.id}" id="nav-${item.id}">
              ${item.icon}
              <span>${item.label}</span>
            </button>
          `).join('')}
        </nav>
      </div>
      <div class="header-right" id="header-right-actions">
        <button class="btn-icon" id="btn-help" title="Help">
          ${ICONS.help}
        </button>
        <button class="btn-icon notification-badge" id="btn-notifications" title="Notifications">
          ${ICONS.bell}
        </button>
        
        <!-- Auth / User Profile Button -->
        <div id="header-user-container">
          ${renderUserHeaderSlot()}
        </div>
      </div>
    </div>
  `;

  // Navigation click handlers
  header.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = (btn as HTMLElement).dataset.view as View;
      eventBus.emit('navigate', view);
    });
  });

  // User Profile / Sign In click
  setupUserContainerEvents(header);

  // Help button click
  header.querySelector('#btn-help')?.addEventListener('click', () => {
    events.emit('notify', {
      type: 'info',
      title: 'Help Center',
      message: 'Need help? Contact support@clearbg.com for assistance.',
    });
  });

  // Notifications button click
  header.querySelector('#btn-notifications')?.addEventListener('click', (e) => {
    const btn = e.currentTarget as HTMLElement;
    // Clear the red dot indicator if present
    btn.classList.remove('notification-badge');
    events.emit('notify', {
      type: 'info',
      title: 'Notifications',
      message: 'You are all caught up! No new notifications.',
    });
  });

  // Listen for auth state changes
  events.on('auth:login', () => refreshUserSlot(header));
  events.on('auth:logout', () => refreshUserSlot(header));
  events.on('auth:updated', () => refreshUserSlot(header));

  return header;
}

function renderUserHeaderSlot(): string {
  const user = authState.getUser();
  if (user) {
    const initials = user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

    return `
      <div class="header-avatar" id="header-avatar" title="${user.name} (${user.email})" style="cursor:pointer; background:linear-gradient(135deg, var(--color-primary), #7c3aed); color:white; font-weight:700; font-size:13px; display:flex; align-items:center; justify-content:center;">
        ${initials}
      </div>
    `;
  }

  return `
    <button class="btn btn-sm btn-primary" id="btn-header-signin" style="padding:6px 14px; font-weight:600; font-size:12px; gap:6px;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      Sign In
    </button>
  `;
}

function setupUserContainerEvents(header: HTMLElement): void {
  const container = header.querySelector('#header-user-container');
  if (!container) return;

  container.addEventListener('click', () => {
    events.emit('auth:open', authState.isAuthenticated() ? 'profile' : 'login');
  });
}

function refreshUserSlot(header: HTMLElement): void {
  const container = header.querySelector('#header-user-container');
  if (container) {
    container.innerHTML = renderUserHeaderSlot();

  }
}

export function updateHeaderActiveTab(header: HTMLElement, view: View): void {
  header.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', (btn as HTMLElement).dataset.view === view);
  });
}
