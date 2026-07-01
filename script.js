/* =========================================================
   NALGYA FASHION — shared logic (cart, cross-frame sync, ui)
   Most markup now lives directly in the HTML (product cards,
   shipping options, <template> blocks). This file only wires
   up behaviour and fills in values that truly depend on state
   (the cart), it no longer builds pages out of JS strings.
   ========================================================= */

/* ---------- Product data (still needed for cross-page cart lookups,
   since the cart only stores id -> qty in localStorage) ---------- */
const PRODUCTS = [
  { id:"Dress",       name:"Dress Wanita summer",            cat:"Dress",     catLabel:"Dress",   material:"Bahan Berkualitas", price:500000, img:"NALGYA/dress.jpg" },
  { id:"Kemeja",      name:"kemeja pink wanita slimfit",     cat:"Kemeja",    catLabel:"Kemeja",  material:"Bahan Berkualitas",  price:450000, img:"NALGYA/kemejapink.jpg" },
  { id:"Celana",      name:"Celana High Waist Cullotes",     cat:"Celana",    catLabel:"Celana", material:"Bahan Berkualitas",price:425000, img:"NALGYA/celana.jpg" },
  { id:"Sepatu",      name:"Flatshoes Cantika",              cat:"Sepatu",    catLabel:"Sepatu",   material:"Bahan Berkualitas",  price:365000, img:"NALGYA/flatshoes.jpg" },
  { id:"Aksesoris",   name:"Sling Bag Nalgya",               cat:"Aksesoris", catLabel:"Aksesoris",   material:"Bahan Berkualitas",  price:510000, img:"NALGYA/SlingBag.png" },
  { id:"Aksesoris",   name:"Set Aksesoris Berliana",         cat:"Aksesoris", catLabel:"Aksesoris",material:"Bahan Premium",   price:1599000, img:"NALGYA/set aksesoris.jpg" },
  { id:"Aksesoris",  name:"Topi Wanita Summer",      cat:"Aksesoris",   catLabel:"Aksesoris",  material:"Bahan Berkualitas",   price:250000, img:"NALGYA/topi.jpg" },
  { id:"Sepatu",    name:"Heels Wanita Cyntya",        cat:"Sepatu",      catLabel:"Sepatu",     material:"Bahan Berkualitas",  price:400000, img:"NALGYA/heels.jpg" },
];

const PROMO_CODES = { "NALGYA03": 0.10, "FASHION6": 0.05 };

/* ---------- Cart persistence (shared across frames via localStorage) ---------- */
const CART_KEY = "as_cart_v1";
const CHECKOUT_KEY = "as_checkout_v1";

function getCart(){
  try{ return JSON.parse(localStorage.getItem(CART_KEY)) || {}; }
  catch(e){ return {}; }
}
function saveCart(cart){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}
function addToCart(id, qty=1){
  const cart = getCart();
  cart[id] = (cart[id]||0) + qty;
  saveCart(cart);
}
function setQty(id, qty){
  const cart = getCart();
  if(qty <= 0){ delete cart[id]; } else { cart[id] = qty; }
  saveCart(cart);
}
function removeFromCart(id){
  const cart = getCart();
  delete cart[id];
  saveCart(cart);
}
function cartCount(){
  return Object.values(getCart()).reduce((a,b)=>a+b, 0);
}
function cartEntries(){
  const cart = getCart();
  return Object.entries(cart).map(([id, qty])=>{
    const product = PRODUCTS.find(p=>p.id===id);
    return product ? { ...product, qty } : null;
  }).filter(Boolean);
}
function cartSubtotal(){
  return cartEntries().reduce((sum, item)=> sum + item.price * item.qty, 0);
}
function updateCartBadge(){
  document.querySelectorAll("[data-cart-badge]").forEach(el=> el.textContent = cartCount());
}
/* Sync badge when the cart changes in ANOTHER frame/document (classic frameset
   pages can't call each other's functions directly across documents unless
   related — the storage event is the reliable, standard way to keep the
   topFrame badge in sync with additions made inside the catalog frame). */
window.addEventListener("storage", (e)=>{
  if(e.key === CART_KEY) updateCartBadge();
});

/* ---------- Formatting ---------- */
function rupiah(n){ return "Rp " + Math.round(n).toLocaleString("id-ID"); }

/* ---------- Toast ---------- */
let toastTimer = null;
function showToast(message){
  let toast = document.querySelector(".toast");
  if(!toast){
    toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
      <span class="toast-msg"></span>`;
    document.body.appendChild(toast);
  }
  toast.querySelector(".toast-msg").textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> toast.classList.remove("show"), 2600);
}

/* =========================================================
   Header / nav shared behavior (standalone pages)
   ========================================================= */
function initHeader(){
  updateCartBadge();
  const toggle = document.querySelector(".nav__toggle");
  const links = document.querySelector(".nav__links");
  if(toggle && links) toggle.addEventListener("click", ()=> links.classList.toggle("open"));
}

/* =========================================================
   Catalog frame (product grid is static HTML now — we only
   wire up filtering + add-to-cart on the existing cards)
   ========================================================= */
function initCatalogFrame(){
  const grid = document.getElementById("productGrid");
  if(!grid) return;

  const cards = Array.from(grid.querySelectorAll(".card"));

  function applyFilter(filter){
    cards.forEach((card, i)=>{
      const match = filter === "Semua" || card.dataset.cat === filter;
      card.classList.toggle("hidden", !match);
      if(match) card.style.animation = `fade-in .5s var(--ease) ${i*0.05}s both`;
    });
  }

  cards.forEach(card=>{
    const btn = card.querySelector(".add-btn");
    btn.addEventListener("click", ()=>{
      addToCart(card.dataset.id, 1);
      showToast(`${card.dataset.name} ditambahkan ke keranjang`);
      btn.classList.add("added");
      const original = btn.innerHTML;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg> Ditambahkan`;
      setTimeout(()=>{ btn.classList.remove("added"); btn.innerHTML = original; }, 1400);
    });
  });

  document.querySelectorAll(".chip").forEach(chip=>{
    chip.addEventListener("click", ()=>{
      document.querySelectorAll(".chip").forEach(c=>c.classList.remove("active"));
      chip.classList.add("active");
      applyFilter(chip.dataset.filter);
    });
  });

  updateCartBadge();

  /* respond to category clicks coming from the sidebar frame */
  window.addEventListener("message", (e)=>{
    if(e.data && e.data.type === "filter"){
      const chip = document.querySelector(`.chip[data-filter="${e.data.cat}"]`);
      if(chip) chip.click();
      window.scrollTo({top:0, behavior:"smooth"});
    }
  });
}

/* =========================================================
   Sidebar frame (category nav — talks to catalog via postMessage)
   ========================================================= */
function initSidebarFrame(){
  const cats = document.querySelectorAll("[data-cat-link]");
  if(!cats.length) return;
  cats.forEach(link=>{
    link.addEventListener("click", (e)=>{
      e.preventDefault();
      cats.forEach(c=>c.classList.remove("active"));
      link.classList.add("active");
      const cat = link.dataset.catLink;
      if(parent && parent.frames && parent.frames["mainFrame"]){
        parent.frames["mainFrame"].postMessage({ type:"filter", cat }, "*");
      }
    });
  });
}

/* =========================================================
   Topbar frame
   ========================================================= */
function initTopbarFrame(){
  const badge = document.querySelector("[data-cart-badge]");
  if(!badge) return;
  updateCartBadge();
  const search = document.querySelector("[data-search]");
  if(search){
    search.addEventListener("keydown", (e)=>{
      if(e.key === "Enter" && parent && parent.frames && parent.frames["mainFrame"]){
        parent.frames["mainFrame"].postMessage({ type:"search", q: search.value }, "*");
      }
    });
  }
}

/* =========================================================
   Checkout page (standalone, outside frameset)
   Shipping options are static HTML `.radio-card` elements now —
   we just toggle the checked state and read their data attributes.
   The cart list is filled in using the <template id="lineItemTemplate">
   already defined in checkout.html.
   ========================================================= */
function initCheckoutPage(){
  const list = document.getElementById("cartList");
  if(!list) return;

  const emptyState = document.getElementById("emptyCart");
  const cartWrap = document.getElementById("cartWrap");
  const shipCards = Array.from(document.querySelectorAll("#shipOptions .radio-card"));
  const lineItemTpl = document.getElementById("lineItemTemplate");
  let promoDiscount = 0;

  function selectedShipCard(){
    return shipCards.find(c => c.classList.contains("checked")) || shipCards[0];
  }

  shipCards.forEach(card=>{
    card.addEventListener("click", ()=>{
      shipCards.forEach(c=>{
        c.classList.remove("checked");
        c.querySelector("input").checked = false;
      });
      card.classList.add("checked");
      card.querySelector("input").checked = true;
      renderTotals();
    });
  });

  function renderCart(){
    const entries = cartEntries();
    if(entries.length === 0){
      cartWrap.classList.add("hidden");
      emptyState.classList.remove("hidden");
      return;
    }
    cartWrap.classList.remove("hidden");
    emptyState.classList.add("hidden");

    list.innerHTML = "";
    entries.forEach(item=>{
      const row = lineItemTpl.content.firstElementChild.cloneNode(true);
      row.dataset.id = item.id;
      row.querySelector(".li-thumb img").src = item.img;
      row.querySelector(".li-thumb img").alt = item.name;
      row.querySelector(".li-name").textContent = item.name;
      row.querySelector(".li-origin").textContent = `${item.catLabel} · ${item.material}`;
      row.querySelector(".qty-val").textContent = item.qty;
      row.querySelector(".li-price").textContent = rupiah(item.price * item.qty);

      row.querySelector('[data-action="inc"]').addEventListener("click", ()=>{
        setQty(item.id, (getCart()[item.id]||0)+1); renderCart(); renderTotals();
      });
      row.querySelector('[data-action="dec"]').addEventListener("click", ()=>{
        setQty(item.id, (getCart()[item.id]||0)-1); renderCart(); renderTotals();
      });
      row.querySelector('[data-action="remove"]').addEventListener("click", ()=>{
        removeFromCart(item.id); renderCart(); renderTotals();
      });
      list.appendChild(row);
    });
  }

  function renderTotals(){
    const subtotal = cartSubtotal();
    const shipCard = selectedShipCard();
    const shipPrice = Number(shipCard.dataset.price);
    const shipping = subtotal > 0 ? shipPrice : 0;
    const discount = subtotal * promoDiscount;
    const total = Math.max(subtotal + shipping - discount, 0);

    document.getElementById("sumSubtotal").textContent = rupiah(subtotal);
    document.getElementById("sumShipping").textContent = shipping === 0 ? "Gratis" : rupiah(shipping);
    document.getElementById("sumDiscount").textContent = discount > 0 ? "− " + rupiah(discount) : rupiah(0);
    document.getElementById("sumTotal").textContent = rupiah(total);

    const proceedBtn = document.getElementById("proceedBtn");
    if(proceedBtn) proceedBtn.disabled = subtotal <= 0;
  }

  renderCart();
  renderTotals();

  const promoForm = document.getElementById("promoForm");
  if(promoForm){
    promoForm.addEventListener("submit", (e)=>{
      e.preventDefault();
      const input = document.getElementById("promoInput");
      const msg = document.getElementById("promoMsg");
      const code = input.value.trim().toUpperCase();
      if(PROMO_CODES[code]){
        promoDiscount = PROMO_CODES[code];
        msg.textContent = `Kode berhasil dipakai — diskon ${promoDiscount*100}%`;
        msg.className = "promo-msg ok";
      } else {
        promoDiscount = 0;
        msg.textContent = "Kode tidak ditemukan atau sudah kedaluwarsa";
        msg.className = "promo-msg err";
      }
      renderTotals();
    });
  }

  const form = document.getElementById("shippingForm");
  if(form){
    form.addEventListener("submit", (e)=>{
      e.preventDefault();
      let valid = true;
      form.querySelectorAll("[required]").forEach(field=>{
        if(!field.value.trim()){ field.classList.add("invalid"); valid = false; }
        else field.classList.remove("invalid");
      });
      if(!valid){ showToast("Lengkapi dulu data pengiriman ya"); return; }

      const subtotal = cartSubtotal();
      const shipCard = selectedShipCard();
      const shipping = Number(shipCard.dataset.price);
      const shipLabel = shipCard.querySelector(".rc-main > span > span").textContent.trim();
      const discount = subtotal * promoDiscount;
      const total = Math.max(subtotal + shipping - discount, 0);

      const checkoutData = {
        name: document.getElementById("fldName").value.trim(),
        phone: document.getElementById("fldPhone").value.trim(),
        address: document.getElementById("fldAddress").value.trim(),
        shipping: shipLabel,
        subtotal, shippingCost: shipping, discount, total,
      };
      localStorage.setItem(CHECKOUT_KEY, JSON.stringify(checkoutData));
      window.location.href = "payment.html";
    });
  }
}

/* =========================================================
   Payment page (standalone, outside frameset)
   The tabs/panels/QRIS/VA markup is already static HTML in
   payment.html — this only fills in order-specific values and
   wires up the tab switching, countdown, and copy buttons.
   ========================================================= */
function initPaymentPage(){
  const summaryTotal = document.getElementById("payTotal");
  if(!summaryTotal) return;

  let checkoutData;
  try{ checkoutData = JSON.parse(localStorage.getItem(CHECKOUT_KEY)); }catch(e){ checkoutData = null; }

  if(!checkoutData || cartCount() === 0){
    document.getElementById("payMain").classList.add("hidden");
    document.getElementById("payEmpty").classList.remove("hidden");
    return;
  }

  document.getElementById("payName").textContent = checkoutData.name;
  document.getElementById("payShipping").textContent = checkoutData.shipping;
  document.getElementById("paySubtotal").textContent = rupiah(checkoutData.subtotal);
  document.getElementById("payShipCost").textContent = checkoutData.shippingCost === 0 ? "Gratis" : rupiah(checkoutData.shippingCost);
  document.getElementById("payDiscount").textContent = checkoutData.discount > 0 ? "− " + rupiah(checkoutData.discount) : rupiah(0);
  summaryTotal.textContent = rupiah(checkoutData.total);

  const itemsWrap = document.getElementById("payItems");
  const itemTpl = document.getElementById("payItemTemplate");
  cartEntries().forEach(item=>{
    const row = itemTpl.content.firstElementChild.cloneNode(true);
    row.querySelector(".pi-name").textContent = `${item.name} × ${item.qty}`;
    row.querySelector(".pi-price").textContent = rupiah(item.price * item.qty);
    itemsWrap.appendChild(row);
  });

  const tabs = document.querySelectorAll(".pay-tab");
  const panels = document.querySelectorAll(".pay-panel");
  tabs.forEach(tab=>{
    tab.addEventListener("click", ()=>{
      tabs.forEach(t=>t.classList.remove("active"));
      panels.forEach(p=>p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.target).classList.add("active");
    });
  });

  let seconds = 15*60;
  const countdownEl = document.getElementById("countdown");
  if(countdownEl){
    const timer = setInterval(()=>{
      seconds--;
      if(seconds <= 0){ clearInterval(timer); countdownEl.textContent = "00:00"; return; }
      const m = String(Math.floor(seconds/60)).padStart(2,"0");
      const s = String(seconds%60).padStart(2,"0");
      countdownEl.textContent = `${m}:${s}`;
    }, 1000);
  }

  document.querySelectorAll(".copy-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      navigator.clipboard?.writeText(btn.dataset.copy).catch(()=>{});
      btn.classList.add("copied");
      const original = btn.textContent;
      btn.textContent = "Tersalin!";
      setTimeout(()=>{ btn.classList.remove("copied"); btn.textContent = original; }, 1600);
    });
  });

  const confirmBtn = document.getElementById("confirmPayBtn");
  if(confirmBtn){
    confirmBtn.addEventListener("click", ()=>{
      confirmBtn.disabled = true;
      confirmBtn.textContent = "Memproses...";
      setTimeout(()=>{
        showSuccessModal();
        localStorage.removeItem(CART_KEY);
        localStorage.removeItem(CHECKOUT_KEY);
        updateCartBadge();
      }, 900);
    });
  }
}

function showSuccessModal(){
  const backdrop = document.getElementById("successModal");
  if(!backdrop) return;
  const orderId = "AS-" + Math.random().toString(36).slice(2,8).toUpperCase();
  document.getElementById("orderIdText").textContent = orderId;
  backdrop.classList.add("show");
  launchConfetti(backdrop.querySelector(".modal"));
}
function launchConfetti(container){
  const colors = ["#7a2e27","#b08d3e","#2b3a55","#f3ede3"];
  for(let i=0;i<28;i++){
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.style.left = Math.random()*100 + "%";
    piece.style.background = colors[Math.floor(Math.random()*colors.length)];
    piece.style.animation = `confetti-fall ${1.6 + Math.random()*1.2}s ease-in ${Math.random()*0.4}s forwards`;
    piece.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
    container.appendChild(piece);
    setTimeout(()=> piece.remove(), 3200);
  }
}

/* =========================================================
   Boot — each frame/page only initializes the parts it has
   ========================================================= */
document.addEventListener("DOMContentLoaded", ()=>{
  initHeader();
  initTopbarFrame();
  initSidebarFrame();
  initCatalogFrame();
  initCheckoutPage();
  initPaymentPage();
});
