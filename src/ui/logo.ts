/**
 * CleanBG / ClearBG Brand Logo Component
 */

export function getLogoSvg(size: number = 32, showText: boolean = false): string {
  // If showText, render the full CleanBG logo image from /CleanBG.png
  if (showText) {
    return `
      <div style="display:inline-flex; align-items:center; gap:8px; text-decoration:none; user-select:none;">
        <img src="/CleanBG.png" alt="CleanBG" style="height:${size}px; width:auto; object-fit:contain; vertical-align:middle; filter:drop-shadow(0 2px 8px rgba(0,0,0,0.08));" />
      </div>
    `;
  }

  // Render standalone emblem / logo
  return `
    <img src="/CleanBG.png" alt="CleanBG Logo" style="height:${size}px; width:auto; object-fit:contain; vertical-align:middle; display:inline-block;" />
  `;
}
