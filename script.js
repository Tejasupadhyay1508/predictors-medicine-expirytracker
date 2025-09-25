// Simple frontend: handles login, camera barcode scan (BarcodeDetector when available),
// OpenFoodFacts lookup fallback, localStorage for meds/prescriptions, and lists for pharmacies/hospitals

// ----- Data -----
const USERS = [
  {name:'Nikita Dinkar', mobile:'6232298863', email:'nk.sta2005@gmail.com', place:'Rajendra Nagar'},
  {name:'Prince Mishra', mobile:'6232298863', email:'pm.sta2005@gmail.com', place:'Satna'}
];

const SAMPLE_MEDICINES = [
  {id:'m1', name:'Paracetamol 500mg', qty:10, price:45, expiry: addDays(20)},
  {id:'m2', name:'Cetirizine 10mg', qty:5, price:30, expiry: addDays(6)},
  {id:'m3', name:'Amoxicillin 250mg', qty:20, price:180, expiry: addDays(120)},
  {id:'m4', name:'Ibuprofen 200mg', qty:15, price:60, expiry: addDays(40)},
  {id:'m5', name:'Vitamin C 500mg', qty:30, price:120, expiry: addDays(400)}
];

const PHARMACIES = [
  {name:'Shree Medicals', phone:'0731-2520001', addr:'MG Road'},
  {name:'Rajesh Pharmacy', phone:'0731-2520002', addr:'Rajendra Nagar'},
  {name:'City Care Pharmacy', phone:'0731-2520003', addr:'Sindhi Colony'},
  {name:'Asha Pharma', phone:'0731-2520004', addr:'Vijay Nagar'},
  {name:'HealthPlus Pharmacy', phone:'0731-2520005', addr:'Palasia'},
  {name:'GreenLife Medicals', phone:'0731-2520006', addr:'Bhanwarkuan'},
  {name:'QuickMed', phone:'0731-2520007', addr:'Lalbagh'},
  {name:'Apollo Pharmacy', phone:'0731-2520008', addr:'AB Road'},
  {name:'CareWell', phone:'0731-2520009', addr:'Nehru Nagar'},
  {name:'Family Pharmacy', phone:'0731-2520010', addr:'Kothari Market'}
];

const HOSPITALS = [
  {name:'Bombay Hospital Indore', phone:'0731-4040404', addr:'Old Palasia'},
  {name:'CHL Hospitals', phone:'0731-4020000', addr:'Vijay Nagar'},
  {name:'Apex Hospital', phone:'0731-2727000', addr:'AB Road'},
  {name:'Shalby Hospital', phone:'0731-2510000', addr:'MR 10'},
  {name:'Narrow Hospital', phone:'0731-5550000', addr:'Rajendra Nagar'},
  {name:'Suyash Hospital', phone:'0731-6660000', addr:'Sindhi Colony'},
  {name:'Choithram Hospital', phone:'0731-7770000', addr:'Palasia'},
  {name:'Medanta Indore', phone:'0731-8880000', addr:'MR 12'},
  {name:'Apollo Indore', phone:'0731-9990000', addr:'AB Road'},
  {name:'Sanjivani Hospital', phone:'0731-1110000', addr:'Lalbagh'}
];

// ----- Utilities -----
function addDays(n){ const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
function escapeHtml(s){ return (s||'').toString().replace(/[&<>\"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":"&#39;"}[c])); }

// ----- DOM refs -----
const pageLogin = document.getElementById('page-login');
const pageDash = document.getElementById('page-dashboard');
const btnDemo1 = document.getElementById('btnDemo1');
const btnDemo2 = document.getElementById('btnDemo2');
const btnLogin = document.getElementById('btnLogin');
const loginMsg = document.getElementById('loginMsg');
const welcome = document.getElementById('welcome');
const userPlace = document.getElementById('userPlace');
const logout = document.getElementById('logout');

const navScan = document.getElementById('navScan');
const navMyMed = document.getElementById('navMyMed');
const navPharma = document.getElementById('navPharma');
const navHosp = document.getElementById('navHosp');
const navPres = document.getElementById('navPres');

const areaScan = document.getElementById('area-scan');
const areaMy = document.getElementById('area-mymed');
const areaPh = document.getElementById('area-pharma');
const areaHosp = document.getElementById('area-hosp');
const areaPres = document.getElementById('area-pres');

const preview = document.getElementById('preview');
const startCamera = document.getElementById('startCamera');
const stopCamera = document.getElementById('stopCamera');
const manualBarcode = document.getElementById('manualBarcode');
const lookup = document.getElementById('lookup');
const scanMsg = document.getElementById('scanMsg');

const s_name = document.getElementById('s_name');
const s_qty = document.getElementById('s_qty');
const s_price = document.getElementById('s_price');
const s_expiry = document.getElementById('s_expiry');
const s_barcode = document.getElementById('s_barcode');
const saveMed = document.getElementById('saveMed');
const clearScan = document.getElementById('clearScan');

const medList = document.getElementById('medList');
const pharmaList = document.getElementById('pharmaList');
const hospList = document.getElementById('hospList');

const presFile = document.getElementById('presFile');
const uploadPres = document.getElementById('uploadPres');
const presList = document.getElementById('presList');

// ----- App state -----
let currentUser = null; let stream=null; let scanning=false; let barcodeDetector=null;

// initialize storage
if(!localStorage.getItem('pred_meds')) localStorage.setItem('pred_meds', JSON.stringify(SAMPLE_MEDICINES));
if(!localStorage.getItem('pred_pres')) localStorage.setItem('pred_pres', JSON.stringify([]));

// ----- Login logic -----
btnDemo1.addEventListener('click', ()=>{
  document.getElementById('loginName').value = USERS[0].name;
  document.getElementById('loginMobile').value = USERS[0].mobile;
  document.getElementById('loginEmail').value = USERS[0].email;
  document.getElementById('loginPlace').value = USERS[0].place;
});
btnDemo2.addEventListener('click', ()=>{
  document.getElementById('loginName').value = USERS[1].name;
  document.getElementById('loginMobile').value = USERS[1].mobile;
  document.getElementById('loginEmail').value = USERS[1].email;
  document.getElementById('loginPlace').value = USERS[1].place;
});

btnLogin.addEventListener('click', ()=>{
  const name = document.getElementById('loginName').value.trim();
  const mobile = document.getElementById('loginMobile').value.trim();
  const email = document.getElementById('loginEmail').value.trim();
  const place = document.getElementById('loginPlace').value.trim() || 'Indore';
  if(!name || !mobile || !email){ loginMsg.textContent = 'Please fill name, mobile & email'; return; }
  currentUser = {name,mobile,email,place};
  localStorage.setItem('pred_current_user', JSON.stringify(currentUser));
  openDashboard();
});

function openDashboard(){
  pageLogin.style.display='none'; pageDash.style.display='block';
  welcome.textContent = `Welcome, ${currentUser.name}`;
  userPlace.textContent = `${currentUser.place} • ${currentUser.email} • ${currentUser.mobile}`;
  showSection('scan');
  renderMedList(); renderPharmacies(); renderHospitals(); renderPres();
}

// auto-login if saved
const savedUser = JSON.parse(localStorage.getItem('pred_current_user')||'null');
if(savedUser){ currentUser = savedUser; openDashboard(); }

logout.addEventListener('click', ()=>{ localStorage.removeItem('pred_current_user'); currentUser=null; pageDash.style.display='none'; pageLogin.style.display='block'; });

// ----- Navigation -----
navScan.addEventListener('click', ()=> showSection('scan'));
navMyMed.addEventListener('click', ()=> showSection('mymed'));
navPharma.addEventListener('click', ()=> showSection('pharma'));
navHosp.addEventListener('click', ()=> showSection('hosp'));
navPres.addEventListener('click', ()=> showSection('pres'));

function hideAll(){ areaScan.style.display='none'; areaMy.style.display='none'; areaPh.style.display='none'; areaHosp.style.display='none'; areaPres.style.display='none'; }
function showSection(name){ hideAll(); if(name==='scan') areaScan.style.display='block'; if(name==='mymed') areaMy.style.display='block'; if(name==='pharma') areaPh.style.display='block'; if(name==='hosp') areaHosp.style.display='block'; if(name==='pres') areaPres.style.display='block'; }

// ----- Camera & Barcode -----
startCamera.addEventListener('click', startPreview);
stopCamera.addEventListener('click', stopPreview);
lookup.addEventListener('click', manualLookup);

async function startPreview(){
  if(scanning) return; scanning=true; try{
    stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    preview.srcObject = stream; await preview.play();
    scanMsg.textContent = 'Camera started — point to a barcode.';
    if('BarcodeDetector' in window){ try{ const formats = await barcodeDetector.getSupportedFormats(); barcodeDetector = new barcodeDetector({formats}); }catch(e){ barcodeDetector=null; } }
    scanLoop();
  }catch(e){ scanning=false; scanMsg.textContent='Camera permission denied or unavailable.'; }
}
function stopPreview(){ if(stream){ stream.getTracks().forEach(t=>t.stop()); preview.srcObject=null;} scanning=false; scanMsg.textContent='Camera stopped.' }

async function scanLoop(){ if(!scanning) return; try{
  if(barcodeDetector){ const bitmap = await createImageBitmap(preview); const detections = await barcodeDetector.detect(bitmap); if(detections && detections.length){ const code = detections[0].rawValue; handleDetectedBarcode(code); stopPreview(); scanning=false; return; } }
}catch(e){}
  setTimeout(scanLoop,700);
}

function handleDetectedBarcode(code){ manualBarcode.value = code; s_barcode.value=code; scanMsg.textContent = 'Detected: '+code + ' — looking up...'; manualLookup(); }

async function manualLookup(){ const code = manualBarcode.value.trim(); if(!code){ scanMsg.textContent='Enter barcode first'; return; }
  scanMsg.textContent='Looking up product (OpenFoodFacts)...';
  try{
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`);
    const data = await res.json();
    if(data && data.status===1){ const p = data.product; s_name.value = p.product_name || p.generic_name || s_name.value; s_price.value = p.price || s_price.value; s_barcode.value = code; scanMsg.textContent='Product filled from public database'; }
    else{ scanMsg.textContent='No public data found — fill manually'; s_barcode.value = code; }
  }catch(e){ scanMsg.textContent='Lookup failed (CORS or offline). Fill manually.'; }
}

clearScan.addEventListener('click', ()=>{ s_name.value=''; s_qty.value='1'; s_price.value=''; s_expiry.value=''; s_barcode.value=''; scanMsg.textContent=''; });

saveMed.addEventListener('click', ()=>{
  const name = s_name.value.trim(); const qty = +s_qty.value||1; const price = +s_price.value||0; const expiry = s_expiry.value; const barcode = s_barcode.value.trim();
  if(!name){ alert('Enter medicine name'); return; }
  const meds = JSON.parse(localStorage.getItem('pred_meds')||'[]');
  meds.push({id:'m'+Date.now(), name, qty, price, expiry, barcode, savedBy: currentUser?currentUser.email:'guest', savedAt: new Date().toISOString()});
  localStorage.setItem('pred_meds', JSON.stringify(meds));
  alert('Saved to My Medicines'); renderMedList();
  s_name.value=''; s_qty.value=1; s_price.value=''; s_expiry.value=''; s_barcode.value='';
});

// ----- Render lists -----
function renderMedList(){ const meds = JSON.parse(localStorage.getItem('pred_meds')||'[]'); medList.innerHTML=''; if(meds.length===0) medList.innerHTML='<div class="small-note">No medicines yet.</div>';
  meds.slice().reverse().forEach(m=>{
    const div = document.createElement('div'); div.className='list-item';
    div.innerHTML = `<div><strong>${escapeHtml(m.name)}</strong><div class='meta'>Qty: ${m.qty} • ₹${m.price} • Expiry: ${m.expiry||'-'}</div><div class='hidden-info'>Saved by: ${escapeHtml(m.savedBy||'unknown')}</div></div>
      <div><button class='btn' onclick="viewMed('${m.id}')">View</button> <button class='btn ghost' onclick="deleteMed('${m.id}')">Delete</button></div>`;
    medList.appendChild(div);
  }); }

window.viewMed = function(id){ const meds = JSON.parse(localStorage.getItem('pred_meds')||'[]'); const m = meds.find(x=>x.id===id); if(!m) return; alert(`${m.name}\nQty: ${m.qty}\nPrice: ₹${m.price}\nExpiry: ${m.expiry||'-'}\nBarcode: ${m.barcode||'-'}`); }
window.deleteMed = function(id){ if(!confirm('Delete this medicine?')) return; let meds = JSON.parse(localStorage.getItem('pred_meds')||'[]'); meds = meds.filter(m=>m.id!==id); localStorage.setItem('pred_meds', JSON.stringify(meds)); renderMedList(); }

function renderPharmacies(){ pharmaList.innerHTML=''; PHARMACIES.forEach((p,idx)=>{
  const div = document.createElement('div'); div.className='list-item';
  div.innerHTML = `<div><strong>${escapeHtml(p.name)}</strong><div class='meta'>${escapeHtml(p.addr)}</div><div class='hidden-info'>Contact: ${escapeHtml(p.phone)}</div></div><div><button class='btn' data-idx='${idx}' onclick='toggleInfo(this)'>Show</button></div>`;
  pharmaList.appendChild(div);
}); }

function renderHospitals(){ hospList.innerHTML=''; HOSPITALS.forEach((h,idx)=>{
  const div = document.createElement('div'); div.className='list-item';
  div.innerHTML = `<div><strong>${escapeHtml(h.name)}</strong><div class='meta'>${escapeHtml(h.addr)}</div><div class='hidden-info'>Contact: ${escapeHtml(h.phone)}</div></div><div><button class='btn' data-idx='${idx}' onclick='toggleInfo(this)'>Show</button></div>`;
  hospList.appendChild(div);
}); }

window.toggleInfo = function(btn){ const item = btn.closest('.list-item'); item.classList.toggle('show'); btn.textContent = item.classList.contains('show') ? 'Hide' : 'Show'; }

// ----- Prescriptions -----
uploadPres.addEventListener('click', ()=>{
  const f = presFile.files[0]; if(!f){ alert('Choose a file to upload'); return; }
  const reader = new FileReader(); reader.onload = function(e){ const arr = JSON.parse(localStorage.getItem('pred_pres')||'[]'); arr.push({id:'p'+Date.now(), name:f.name, data:e.target.result, uploadedAt:new Date().toISOString(), by: currentUser?currentUser.email:'guest'}); localStorage.setItem('pred_pres', JSON.stringify(arr)); renderPres(); alert('Uploaded'); presFile.value=''; };
  reader.readAsDataURL(f);
});

function renderPres(){ const arr = JSON.parse(localStorage.getItem('pred_pres')||'[]'); presList.innerHTML=''; if(arr.length===0) presList.innerHTML='<div class="small-note">No prescriptions uploaded.</div>';
  arr.slice().reverse().forEach(p=>{ const div=document.createElement('div'); div.className='list-item'; div.innerHTML = `<div><strong>${escapeHtml(p.name)}</strong><div class='meta'>Uploaded by: ${escapeHtml(p.by)} • ${new Date(p.uploadedAt).toLocaleString()}</div></div><div><button class='btn' onclick="viewPres('${p.id}')">View</button></div>`; presList.appendChild(div); }); }

window.viewPres = function(id){ const arr = JSON.parse(localStorage.getItem('pred_pres')||'[]'); const p = arr.find(x=>x.id===id); if(!p) return; const w = window.open('','_blank'); w.document.write(`<h3>${escapeHtml(p.name)}</h3><img src='${p.data}' style='max-width:100%'>`); }

// ----- initial render -----
renderMedList(); renderPharmacies(); renderHospitals(); renderPres();
