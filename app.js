// ===== MyShop full app.js (drop-in) =====

// 1) Keep your firebase config exactly (no changes)
const firebaseConfig = {
  apiKey: "AIzaSyDvNYYoo_v7vN2Tn27KVoDFZIng3neqdIM",
  authDomain: "simpleshop-db495.firebaseapp.com",
  projectId: "simpleshop-db495",
  storageBucket: "simpleshop-db495.firebasestorage.app",
  messagingSenderId: "244413237194",
  appId: "1:244413237194:web:c29e10261cf8f2efbef133",
  measurementId: "G-G99228M0HZ"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 2) Fallback products (safe dev)
const FALLBACK_PRODUCTS = [
  { id:'f1', title:'Classic Lamp', price:49.99, stock:20, category:'Home', image:'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=800&auto=format&fit=crop' },
  { id:'f2', title:'Ceramic Mug', price:19.99, stock:30, category:'Kitchen', image:'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=800&auto=format&fit=crop' }
];

// 3) Cart (persisted)
let CART = JSON.parse(localStorage.getItem('MYSHOP_CART') || '[]');
function saveCart(){ localStorage.setItem('MYSHOP_CART', JSON.stringify(CART)); updateCartCount(); }
function updateCartCount(){ const el = document.getElementById('cart-count'); if(el) el.textContent = CART.reduce((s,i)=> s + (i.qty||0), 0); }
updateCartCount();

// 4) Utility helpers
function $(s){ return document.querySelector(s); }
function $all(s){ return Array.from(document.querySelectorAll(s)); }
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

// 5) Load products (Firestore or fallback)
async function loadProducts() {
  const list = $('#product-list');
  if(!list) return;
  list.innerHTML = 'Loading products...';
  try {
    const snap = await db.collection('products').orderBy('createdAt','desc').get();
    const products = snap.docs.map(d=>({ id:d.id, ...d.data() }));
    if(products.length === 0) return renderProducts(FALLBACK_PRODUCTS);
    renderProducts(products);
    populateCategories(products);
  } catch(e) {
    console.error('loadProducts', e);
    renderProducts(FALLBACK_PRODUCTS);
    populateCategories(FALLBACK_PRODUCTS);
  }
}

function renderProducts(products) {
  const list = $('#product-list');
  if(!list) return;
  list.innerHTML = '';
  products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product';
    const img = p.image || '';
    card.innerHTML = `
      <img src="${escapeHtml(img)}" alt="${escapeHtml(p.title||'')}" />
      <h4>${escapeHtml(p.title||'Untitled')}</h4>
      <div class="price">$${Number(p.price||0).toFixed(2)}</div>
      <p style="color:#666;margin:6px 0">${p.stock !== undefined ? 'Stock: ' + p.stock : ''}</p>
      <div style="display:flex;gap:8px;margin-top:auto">
        <button class="btn add-btn" data-id="${p.id}" data-title="${escapeHtml(p.title||'')}" data-price="${Number(p.price||0)}">Add to cart</button>
        <button class="btn ghost view-btn" data-id="${p.id}">View</button>
      </div>
    `;
    list.appendChild(card);
  });
}

function populateCategories(products) {
  const cats = new Set(['']);
  products.forEach(p => { if(p.category) cats.add(p.category); });
  const ul = $('#categories');
  if(!ul) return;
  ul.innerHTML = '';
  Array.from(cats).forEach(cat => {
    const li = document.createElement('li');
    li.className = 'cat' + (cat==='' ? ' active' : '');
    li.dataset.cat = cat || '';
    li.textContent = cat || 'All';
    ul.appendChild(li);
  });
}

// 6) Delegated events: add-to-cart, view, admin toggle, category click
document.addEventListener('click', async (ev) => {
  const t = ev.target;
  if(!t) return;

  // Add to cart
  if(t.classList.contains('add-btn')) {
    const id = t.dataset.id, title = t.dataset.title, price = Number(t.dataset.price||0);
    const idx = CART.findIndex(x=>x.id===id);
    if(idx>=0) CART[idx].qty += 1; else CART.push({ id, title, price, qty:1 });
    saveCart();
    alert(`${title} added to cart`);
  }

  // View product
  if(t.classList.contains('view-btn')) {
    const id = t.dataset.id;
    try {
      const doc = await db.collection('products').doc(id).get();
      if(!doc.exists) {
        const f = FALLBACK_PRODUCTS.find(x=>x.id===id);
        if(f) return showProductDetail(f, true);
        return alert('Product not found');
      }
      showProductDetail({ id: doc.id, ...doc.data() });
    } catch(e) { console.error(e); alert('Cannot load product'); }
  }

  // Admin toggle
  if(t.id === 'btn-admin-toggle') {
    const panel = $('#admin-panel');
    if(panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  }

  // Category filter
  if(t.classList.contains('cat')) {
    $all('.cat').forEach(el=>el.classList.remove('active'));
    t.classList.add('active');
    const cat = t.dataset.cat;
    // fetch products then filter
    db.collection('products').orderBy('createdAt','desc').get().then(snap=>{
      const products = snap.docs.map(d=>({ id:d.id, ...d.data() }));
      const filtered = cat ? products.filter(p => p.category === cat) : products;
      if(filtered.length===0) renderProducts(cat ? [] : FALLBACK_PRODUCTS);
      else renderProducts(filtered);
    }).catch(()=> { renderProducts(FALLBACK_PRODUCTS.filter(p => !cat || p.category === cat)); });
  }
});

// 7) Product detail modal
function showProductDetail(p, isFallback=false) {
  const modal = document.getElementById('product-modal');
  const detail = document.getElementById('product-detail');
  if(!modal || !detail) return;
  detail.innerHTML = `
    <div style="display:flex;gap:12px">
      <img src="${escapeHtml(p.image||'')}" style="width:240px;height:240px;object-fit:cover;border-radius:6px" />
      <div style="flex:1">
        <h2>${escapeHtml(p.title)}</h2>
        <div style="color:var(--accent);font-weight:700">$${Number(p.price||0).toFixed(2)}</div>
        <p style="color:#666">${escapeHtml(p.description||'')}</p>
        <p>Stock: ${p.stock !== undefined ? p.stock : '—'}</p>
        <div style="margin-top:12px;display:flex;gap:8px">
          <button id="modal-add" class="btn primary">Add to cart</button>
          <button id="modal-close" class="btn ghost">Close</button>
        </div>
      </div>
    </div>
  `;
  modal.style.display = 'flex';

  document.getElementById('modal-close').onclick = ()=> { modal.style.display = 'none'; };
  document.getElementById('close-product').onclick = ()=> { modal.style.display = 'none'; };
  document.getElementById('modal-add').onclick = ()=> {
    // add to cart (if fallback, still add but will be ensured at checkout)
    const idx = CART.findIndex(x=>x.id===p.id);
    if(idx>=0) CART[idx].qty += 1; else CART.push({ id: p.id, title: p.title, price: p.price || 0, qty: 1 });
    saveCart();
    alert('Added to cart');
    modal.style.display = 'none';
  };
}

// close product modal by clicking outside
document.getElementById('product-modal').addEventListener('click', (e)=> {
  if(e.target.id === 'product-modal') e.target.style.display = 'none';
});

// 8) Auth modal wiring
function showAuthModal() {
  const tpl = document.getElementById('auth-template');
  if(!tpl) return alert('Auth template missing');
  const clone = tpl.content.cloneNode(true);
  const closeBtn = clone.querySelector('#close-auth');
  const tabLogin = clone.querySelector('#tab-login');
  const tabReg = clone.querySelector('#tab-register');
  const loginPanel = clone.querySelector('#login-panel');
  const regPanel = clone.querySelector('#register-panel');

  // events
  closeBtn.onclick = ()=> closeModal('auth-modal');
  tabLogin.onclick = ()=> { tabLogin.classList.add('active'); tabReg.classList.remove('active'); loginPanel.style.display='block'; regPanel.style.display='none'; };
  tabReg.onclick = ()=> { tabReg.classList.add('active'); tabLogin.classList.remove('active'); regPanel.style.display='block'; loginPanel.style.display='none'; };

  // google sign-in
  const googleBtn = clone.querySelector('#google-signin');
  googleBtn.onclick = async ()=> {
    const provider = new firebase.auth.GoogleAuthProvider();
    try { await auth.signInWithPopup(provider); closeModal('auth-modal'); } catch(e){ alert(e.message||e); }
  };

  // login form
  const loginForm = clone.querySelector('#login-form');
  loginForm.onsubmit = async (ev) => {
    ev.preventDefault();
    const email = loginForm.querySelector('#login-email').value;
    const password = loginForm.querySelector('#login-password').value;
    try { await auth.signInWithEmailAndPassword(email,password); closeModal('auth-modal'); } catch(e){ alert(e.message||e); }
  };

  // register form
  const regForm = clone.querySelector('#register-form');
  regForm.onsubmit = async (ev) => {
    ev.preventDefault();
    const name = regForm.querySelector('#reg-name').value.trim();
    const email = regForm.querySelector('#reg-email').value.trim();
    const password = regForm.querySelector('#reg-password').value;
    const phone = regForm.querySelector('#reg-phone') ? regForm.querySelector('#reg-phone').value.trim() : '';
    const address = regForm.querySelector('#reg-address') ? regForm.querySelector('#reg-address').value.trim() : '';
    if(!name||!email||!password) return alert('Please fill name, email and password');
    try {
      const u = await auth.createUserWithEmailAndPassword(email,password);
      await u.user.updateProfile({ displayName: name });
      await db.collection('users').doc(u.user.uid).set({ name, email, phone, address, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      alert('Registration successful');
      closeModal('auth-modal');
    } catch(e) { alert(e.message||e); }
  };

  const wrapper = document.createElement('div');
  wrapper.id = 'auth-modal';
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);
}

function closeModal(id) { const e=document.getElementById(id); if(e) e.remove(); }
if($('#btn-login')) $('#btn-login').onclick = showAuthModal;

// 9) Auth state observer
auth.onAuthStateChanged(async (user) => {
  const info = $('#user-info'); const btnLogin = $('#btn-login');
  if(user) {
    // get profile
    let profile = null;
    try { const d = await db.collection('users').doc(user.uid).get(); if(d.exists) profile = d.data(); } catch(e){}
    const name = user.displayName || (profile && profile.name) || user.email;
    if(info) {
      info.style.display = 'inline-flex';
      info.innerHTML = `<img class="user-avatar" src="${user.photoURL||'https://www.gravatar.com/avatar/?d=identicon'}" style="width:28px;height:28px;border-radius:50%;margin-right:8px"> ${escapeHtml(name)} <button id="btn-signout" class="btn ghost" style="margin-left:8px">Sign out</button>`;
      const s = $('#btn-signout'); if(s) s.onclick = ()=> auth.signOut();
      info.onclick = ()=> {
        alert(`Name: ${name}\nEmail: ${user.email}\n` + (profile ? `Phone: ${profile.phone||'-'}\nAddress: ${profile.address||'-'}` : ''));
      };
    }
    if(btnLogin) btnLogin.style.display = 'none';
  } else {
    if(info) info.style.display = 'none';
    if(btnLogin) btnLogin.style.display = 'inline-block';
  }
});

// 10) Admin add product logic
if($('#admin-add-form')) {
  $('#admin-add-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const title = $('#admin-title').value.trim();
    const category = $('#admin-category').value.trim();
    const price = Number($('#admin-price').value);
    const stock = Number($('#admin-stock').value);
    const image = $('#admin-image').value.trim();
    const description = $('#admin-desc').value.trim();
    if(!title || isNaN(price) || isNaN(stock)) return alert('Fill title, price and stock');
    try {
      await db.collection('products').add({ title, category, price, stock, image, description, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      alert('Product added');
      $('#admin-add-form').reset();
      loadProducts();
    } catch(e) { alert('Add failed: ' + (e.message || e)); }
  });
  $('#admin-close').onclick = ()=> { const p = $('#admin-panel'); if(p) p.style.display='none'; };
}

// 11) Ensure fallback product exists in Firestore if needed (creates doc)
async function ensureProductInFirestore(id) {
  const docRef = db.collection('products').doc(id);
  const snap = await docRef.get();
  if(snap.exists) return;
  const p = FALLBACK_PRODUCTS.find(x=>x.id===id);
  if(!p) throw new Error('Product missing: ' + id);
  await docRef.set({ title:p.title, category:p.category||'', price:p.price, stock:p.stock||20, image:p.image||'', description:p.description||'', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
}

// 12) Checkout: fixed transaction (reads first then writes)
async function createOrderTransaction(cartItems) {
  const user = auth.currentUser;
  if(!user) throw new Error('You must be logged in to checkout.');
  const orderRef = db.collection('orders').doc();

  await db.runTransaction(async (tx) => {
    const productRefs = cartItems.map(it => db.collection('products').doc(it.id));
    const productSnaps = await Promise.all(productRefs.map(ref => tx.get(ref)));

    let total = 0;
    const orderItems = [];

    for(let i=0;i<cartItems.length;i++){
      const it = cartItems[i];
      const snap = productSnaps[i];
      if(!snap.exists) throw new Error('Product removed: ' + it.id);
      const pdata = snap.data();
      const stock = Number(pdata.stock || 0);
      if(stock < it.qty) throw new Error('Out of stock: ' + (pdata.title || it.id));
      const price = Number(pdata.price || 0);
      total += price * it.qty;
      orderItems.push({ productId: it.id, title: pdata.title || '', qty: it.qty, price });
    }

    // now updates
    for(let i=0;i<cartItems.length;i++){
      const it = cartItems[i];
      const snap = productSnaps[i];
      const pdata = snap.data();
      const newStock = (Number(pdata.stock || 0) - it.qty);
      const pRef = productRefs[i];
      tx.update(pRef, { stock: newStock });
    }

    tx.set(orderRef, { userId: user.uid, items: orderItems, total, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  });

  return orderRef.id;
}

async function checkout() {
  if(CART.length === 0) return alert('Cart is empty');
  try {
    // make sure any fallback ids exist in DB
    for(const i of CART) {
      if(FALLBACK_PRODUCTS.find(p=>p.id===i.id)) await ensureProductInFirestore(i.id);
    }
    const items = CART.map(i=>({ id: i.id, qty: i.qty }));
    const orderId = await createOrderTransaction(items);
    CART = []; saveCart();
    alert('Order placed — ID: ' + orderId);
    loadProducts();
  } catch(e) {
    alert('Checkout failed: ' + (e.message || e));
  }
}

// wire cart button
if($('#btn-cart')) $('#btn-cart').onclick = () => {
  if(CART.length === 0) return alert('Cart is empty');
  let s = 'Cart:\\n';
  CART.forEach(i => s += `${i.title} × ${i.qty} — $${(i.price*i.qty).toFixed(2)}\\n`);
  s += '\\nTotal: $' + CART.reduce((a,b)=> a + (b.price*b.qty), 0).toFixed(2) + '\\n\\nCheckout now?';
  if(confirm(s)) {
    if(!auth.currentUser){ alert('Please login to checkout'); showAuthModal(); return; }
    checkout();
  }
};

// 13) Orders panel (user order history)
if($('#btn-orders')) {
  $('#btn-orders').onclick = async ()=> {
    const panel = $('#orders-panel'); if(!panel) return;
    if(!auth.currentUser) { alert('Please login to see orders'); showAuthModal(); return; }
    panel.style.display = 'block';
    const list = $('#orders-list'); list.innerHTML = 'Loading...';
    try {
      const snap = await db.collection('orders').where('userId','==',auth.currentUser.uid).orderBy('createdAt','desc').get();
      if(snap.empty) { list.innerHTML = '<div>No orders yet</div>'; return; }
      list.innerHTML = '';
      snap.docs.forEach(d => {
        const o = d.data();
        const el = document.createElement('div'); el.className='card'; el.style.marginBottom='8px';
        el.innerHTML = `<strong>Order ${d.id}</strong><div>Total: $${(o.total||0).toFixed(2)}</div><div>${(o.items||[]).map(it=>`${it.title} × ${it.qty}`).join('<br>')}</div>`;
        list.appendChild(el);
      });
    } catch(e) { list.innerHTML = 'Failed to load orders'; }
  };
  $('#orders-close').onclick = ()=> { const p = $('#orders-panel'); if(p) p.style.display='none'; };
}

// 14) Search filter
if($('#search-input')) $('#search-input').addEventListener('input', (e)=> {
  const q = e.target.value.toLowerCase();
  db.collection('products').orderBy('createdAt','desc').get().then(snap=>{
    const products = snap.docs.map(d=>({ id:d.id, ...d.data() })).filter(p => (p.title||'').toLowerCase().includes(q));
    if(products.length) renderProducts(products); else renderProducts(FALLBACK_PRODUCTS.filter(p => (p.title||'').toLowerCase().includes(q)));
  }).catch(()=> renderProducts(FALLBACK_PRODUCTS.filter(p => (p.title||'').toLowerCase().includes(q))));
});

// 15) init
window.addEventListener('DOMContentLoaded', ()=> {
  loadProducts();
  updateCartCount();
  console.log('MyShop loaded — Firebase ready.');
});

// expose helpers for debug
window.MS = { db, auth, CART, loadProducts, createOrderTransaction, ensureProductInFirestore };
