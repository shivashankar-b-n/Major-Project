// Formatting + small presentation helpers.
export const timeAgo = (iso) => {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

export const formatDate = (iso, withTime = false) => {
  if (!iso) return '';
  const d = new Date(iso);
  const opts = { day: 'numeric', month: 'short', year: 'numeric' };
  if (withTime) { opts.hour = '2-digit'; opts.minute = '2-digit'; }
  return d.toLocaleDateString('en-IN', opts);
};

export const dueLabel = (iso) => {
  if (!iso) return { text: 'No SLA', breached: false };
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) {
    const h = Math.floor(-diff / 3600000);
    return { text: h < 24 ? `Overdue ${h}h` : `Overdue ${Math.floor(h / 24)}d`, breached: true };
  }
  const h = Math.floor(diff / 3600000);
  return { text: h < 24 ? `${h}h left` : `${Math.floor(h / 24)}d left`, breached: false };
};

export const greetingKey = () => {
  const h = new Date().getHours();
  if (h < 12) return 'greeting_morning';
  if (h < 17) return 'greeting_afternoon';
  return 'greeting_evening';
};

export const initials = (name = '') =>
  name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

// Resize + compress an image File to a small base64 JPEG (keeps DB light).
export const fileToCompressedBase64 = (file, maxDim = 1000, quality = 0.72) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) { height = (height * maxDim) / width; width = maxDim; }
        else if (height > maxDim) { width = (width * maxDim) / height; height = maxDim; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
