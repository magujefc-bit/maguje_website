const injected = new Set();

export function injectStyle(id, css) {
  if (injected.has(id)) return;
  const tag = document.createElement('style');
  tag.setAttribute('data-component', id);
  tag.textContent = css;
  document.head.appendChild(tag);
  injected.add(id);
}
