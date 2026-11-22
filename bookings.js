// LastCall Eats - My Bookings page (student view).
// Reads the same saved bookings that index.html writes, and colours from config.js.

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KEY = 'lastcall-eats', NAME_KEY = 'lastcall-name';
let tab = 'upcoming';

function getState() {
  try { return JSON.parse(localStorage.getItem(KEY)) || { bookings: [], extraMeals: [] }; }
  catch { return { bookings: [], extraMeals: [] }; }
}
function setState(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }
function isClosed(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const t = new Date(); t.setHours(h, m, 0, 0);
  return Date.now() > t.getTime();
}
function fmtTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function render() {
  const root = document.documentElement.style;
  root.setProperty('--bg', CONFIG.theme.background);
  root.setProperty('--dusk', CONFIG.theme.header);
  root.setProperty('--mango', CONFIG.theme.accent);

  const me = $('name').value.trim().toLowerCase();
  const mine = me ? getState().bookings.filter((b) => b.name.toLowerCase() === me) : [];
  const upcoming = mine.filter((b) => !isClosed(b.pickupBy));
  const past = mine.filter((b) => isClosed(b.pickupBy));

  $('count').textContent = mine.length;
  $('money').textContent = '₹' + mine.reduce((n, b) => n + b.saving, 0);
  document.querySelector('[data-tab="upcoming"]').textContent = `Upcoming (${upcoming.length})`;
  document.querySelector('[data-tab="past"]').textContent = `Past (${past.length})`;

  const shown = (tab === 'upcoming' ? upcoming : past).slice().reverse();
  $('hint').textContent = !me ? 'Enter your name to see your bookings.'
    : !shown.length ? (tab === 'upcoming' ? 'No upcoming bookings. Go to Meals to book one.' : 'No past bookings yet.') : '';

  $('list').innerHTML = shown.map((b) => {
    const closed = tab === 'past';
    return `<article class="tkt ${closed ? 'done' : ''}">
      <div class="stub"><span>BOOKING CODE</span><b>${esc(b.code)}</b></div>
      <div class="info">
        <h3>${esc(b.mealName)}</h3>
        <span class="meta">Booked by ${esc(b.name)}</span>
        <span class="meta">Pickup by ${fmtTime(b.pickupBy)}</span>
        ${b.paid != null ? `<span class="meta">Paid ₹${b.paid} via ${esc(b.payment)} | ${esc(b.txn)}</span>` : ''}
        <span class="badge">${closed ? 'Pickup time over' : 'Ready for pickup'}</span>
        ${closed ? '' : `<button class="cancel" data-code="${esc(b.code)}">Cancel booking</button>`}
      </div>
    </article>`;
  }).join('');
}

$('name').addEventListener('input', () => {
  try { localStorage.setItem(NAME_KEY, $('name').value.trim()); } catch {}
  render();
});

document.querySelector('.tabs').addEventListener('click', (e) => {
  const t = e.target.closest('.tab');
  if (!t) return;
  tab = t.dataset.tab;
  document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('on', x === t));
  render();
});

$('list').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-code]');
  if (!btn) return;
  const st = getState();
  const bk = st.bookings.find((x) => x.code === btn.dataset.code);
  const refund = bk && bk.paid != null ? ` ₹${bk.paid} will be refunded (demo).` : '';
  if (!confirm('Cancel this booking?' + refund + ' The meal goes back on sale.')) return;
  st.bookings = st.bookings.filter((b) => b.code !== btn.dataset.code);
  setState(st);
  render();
});

try { $('name').value = localStorage.getItem(NAME_KEY) || ''; } catch {}
render();
setInterval(render, 30000);
