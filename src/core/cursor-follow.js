// Custom cursor follower: moves a `.curser-view` element to track the mouse.
export function initCursorFollow() {
  let cursor = null;
  document.addEventListener('mousemove', (e) => {
    cursor = cursor || document.querySelector('.curser-view');
    if (!cursor) return;
    cursor.style.left = e.clientX - 34 + 'px';
    cursor.style.top = e.clientY - 34 + 'px';
  });
}
