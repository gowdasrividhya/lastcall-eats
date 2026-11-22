// LastCall Eats - runs fully in the browser.
// config.js = meals, colours, text.  localStorage = bookings and staff-added meals.

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KEY = 'lastcall-eats';

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
  const st = getState();
  const root = document.documentElement.style;          // colours come from config.js
  root.setProperty('--bg', CONFIG.theme.background);
  root.setProperty('--dusk', CONFIG.theme.header);
  root.setProperty('--mango', CONFIG.theme.accent);
  $('canteen').textContent = CONFIG.canteen;
  $('tagline').textContent = CONFIG.tagline;
  document.title = CONFIG.canteen + ' | LastCall Eats';

  $('saved').textContent = st.bookings.length;
  $('money').textContent = '₹' + st.bookings.reduce((n, b) => n + b.saving, 0);

  const meals = CONFIG.meals.concat(st.extraMeals);
  $('meals').innerHTML = meals.length ? meals.map((m) => {
    const left = m.quantity - st.bookings.filter((b) => b.mealId === m.id).length;
    const closed = isClosed(m.pickupBy), out = left < 1;
    const label = out ? 'Sold out' : closed ? 'Pickup closed' : 'Book and pay';
    return `<article class="meal">
      <h3>${esc(m.name)}</h3>
      <div class="price"><b>₹${m.price}</b><s>₹${m.originalPrice}</s></div>
      <div class="meta ${left > 0 && left <= 3 ? 'low' : ''}">${Math.max(left, 0)} left</div>
      <div class="meta">Pickup by ${fmtTime(m.pickupBy)}</div>
      <button data-id="${m.id}" ${out || closed ? 'disabled' : ''}>${label}</button>
    </article>`;
  }).join('') : '<p class="empty">No surplus meals right now. Check back near closing time.</p>';

  const recent = st.bookings.slice(-10).reverse();
  $('bookings').innerHTML = recent.length
    ? recent.map((b) => `<li><b>${esc(b.code)}</b> ${esc(b.name)} booked ${esc(b.mealName)}</li>`).join('')
    : '<li>No bookings yet.</li>';
}

let pending = null;   // the meal waiting for payment

// Step 1: student picks a meal -> checkout opens
$('meals').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-id]');
  if (!btn) return;
  const name = $('name').value.trim();
  if (!name) { alert('Enter your name to book.'); $('name').focus(); return; }
  const st = getState();
  const meal = CONFIG.meals.concat(st.extraMeals).find((m) => m.id === Number(btn.dataset.id));
  if (!meal || meal.quantity - st.bookings.filter((b) => b.mealId === meal.id).length < 1) {
    alert('Sold out. Someone booked the last one.'); render(); return;
  }
  pending = { meal, name };
  $('orderBox').innerHTML = `<b>${esc(meal.name)}</b><br>Booking for ${esc(name)}<br>Pickup by ${fmtTime(meal.pickupBy)}
    <div class="total">Total: ₹${meal.price}</div>`;
  $('payMsg').textContent = '';
  $('payBtn').textContent = 'Pay ₹' + meal.price;
  $('payBtn').disabled = false;
  $('checkout').showModal();
});

// switch between UPI and Card fields
document.querySelectorAll('input[name="method"]').forEach((r) => r.addEventListener('change', () => {
  const card = document.querySelector('input[name="method"]:checked').value === 'Card';
  $('cardBox').hidden = !card;
  $('upiBox').hidden = card;
}));
$('payCancel').addEventListener('click', () => $('checkout').close());

// Step 2: validate the payment details (demo only, nothing is charged)
$('payForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const msg = $('payMsg');
  msg.className = 'msg err';
  const method = document.querySelector('input[name="method"]:checked').value;
  let payment;
  if (method === 'UPI') {
    const upi = $('upiId').value.trim();
    if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upi)) { msg.textContent = 'Enter a valid UPI ID, for example name@bank.'; return; }
    payment = 'UPI';
  } else {
    const num = $('cardNo').value.replace(/\s/g, ''), exp = $('cardExp').value, cvv = $('cardCvv').value;
    if (!/^\d{16}$/.test(num)) { msg.textContent = 'Card number must be 16 digits.'; return; }
    const m = exp.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
    if (!m) { msg.textContent = 'Expiry must look like 08/28.'; return; }
    if (new Date(2000 + Number(m[2]), Number(m[1]), 1) <= new Date()) { msg.textContent = 'This card has expired.'; return; }
    if (!/^\d{3}$/.test(cvv)) { msg.textContent = 'CVV must be 3 digits.'; return; }
    payment = 'Card ending ' + num.slice(-4);   // only the last 4 digits are kept
  }
  msg.textContent = '';
  $('payBtn').disabled = true;
  $('payBtn').textContent = 'Processing…';
  setTimeout(() => finishBooking(payment), 1500);   // pretend the bank is responding
});

// Step 3: payment done -> confirm the booking and show the receipt
function finishBooking(payment) {
  const { meal, name } = pending;
  const st = getState();
  if (meal.quantity - st.bookings.filter((b) => b.mealId === meal.id).length < 1) {
    $('checkout').close(); alert('Sold out just now. No payment was taken.'); render(); return;
  }
  const rand = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  const booking = {
    code: 'LC-' + rand(), name, mealId: meal.id, mealName: meal.name, pickupBy: meal.pickupBy,
    saving: meal.originalPrice - meal.price, paid: meal.price, payment, txn: 'TXN' + rand() + rand(),
  };
  st.bookings.push(booking);
  setState(st);
  $('checkout').close();
  $('payForm').reset();
  $('cardBox').hidden = true; $('upiBox').hidden = false;
  const t = $('ticket');
  t.hidden = false;
  t.innerHTML = `<p>Payment of ₹${booking.paid} received via ${esc(payment)}. Booked, ${esc(name)}!<br>Show this code at the counter by ${fmtTime(meal.pickupBy)}.</p>
    <div class="code">${esc(booking.code)}</div>
    <p>${esc(meal.name)}<br><span class="meta">Transaction ID: ${esc(booking.txn)}</span></p>
    <p><a class="link" href="bookings.html">View in My Bookings</a></p>`;
  t.scrollIntoView({ behavior: 'smooth', block: 'center' });
  render();
}

$('addForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target, msg = $('formMsg');
  const b = Object.fromEntries(new FormData(f));
  const price = Number(b.price), originalPrice = Number(b.originalPrice), quantity = Number(b.quantity);
  if (!(price > 0) || originalPrice < price || !(quantity > 0)) {
    msg.className = 'msg err'; msg.textContent = 'Discounted price must not exceed the original price.'; return;
  }
  const st = getState();
  st.extraMeals.push({ id: Date.now(), name: b.name.trim(), originalPrice, price, quantity, pickupBy: b.pickupBy });
  setState(st);
  msg.className = 'msg ok'; msg.textContent = 'Meal added. Students can see it now.';
  f.reset(); render();
});

$('reset').addEventListener('click', () => {
  if (confirm('Clear all bookings and staff-added meals?')) { setState({ bookings: [], extraMeals: [] }); $('ticket').hidden = true; render(); }
});

const NAME_KEY = 'lastcall-name';   // remembered so the My Bookings page knows who you are
try { $('name').value = localStorage.getItem(NAME_KEY) || ''; } catch {}
$('name').addEventListener('input', () => { try { localStorage.setItem(NAME_KEY, $('name').value.trim()); } catch {} });

render();
setInterval(render, 30000); // refresh so closed pickups update
