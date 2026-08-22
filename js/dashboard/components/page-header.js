export function pageHeader(title, subtitle) {
  return `<h1>${title}</h1>${subtitle ? `<p class="sub">${subtitle}</p>` : ''}`;
}
