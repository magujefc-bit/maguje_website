const injected = new Set();

export function injectStyle(key, css) {
  if (injected.has(key)) return;
  injected.add(key);
  const tag = document.createElement('style');
  tag.setAttribute('data-style', key);
  tag.textContent = css;
  document.head.appendChild(tag);
}
