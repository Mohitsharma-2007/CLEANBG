import { events } from '../core/event-bus';
import { ICONS } from './icons';

interface NotificationPayload {
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
}

export function createNotifications(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'notification-container';
  container.id = 'notification-container';

  events.on('notification:show', (notif: NotificationPayload) => {
    showToast(container, notif);
  });

  events.on('notify', (notif: NotificationPayload) => {
    showToast(container, notif);
  });

  return container;
}

export function showToast(container: HTMLElement, notif: NotificationPayload): void {
  const item = document.createElement('div');
  item.className = `notification ${notif.type}`;

  const icon = notif.type === 'success' ? ICONS.checkCircle : notif.type === 'error' ? ICONS.close : ICONS.info;

  item.innerHTML = `
    <div class="notification-icon">${icon}</div>
    <div class="notification-text">
      ${notif.title ? `<div class="notification-title">${notif.title}</div>` : ''}
      <div class="notification-message">${notif.message}</div>
    </div>
    <button class="notification-close">${ICONS.close}</button>
  `;

  item.querySelector('.notification-close')?.addEventListener('click', () => {
    item.remove();
  });

  container.appendChild(item);

  setTimeout(() => {
    item.style.opacity = '0';
    item.style.transform = 'translateX(100%)';
    item.style.transition = 'all 0.25s ease';
    setTimeout(() => item.remove(), 250);
  }, 4000);
}
