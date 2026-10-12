/* GALAKSI — logika (berkas 3/3) */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ls={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}},del:k=>{try{localStorage.removeItem(k)}catch(e){}}};
const FX=()=>ls.get('gx-fx')!=='0';
let ME=null,items=[],db=null,filt='',shown=[],queue=[],cur=null,curURL=null;
const API='https://galaksi-server.kahfiramdhani3.workers.dev/api'; // alamat server, TANPA "/" di akhir
const tk=()=>ls.get('gx-tk');
async function api(p,o={}){const h={...(o.headers||{})};if(tk())h.Authorization='Bearer '+tk();try{const r=await fetch(API+p,{...o,headers:h});return o.raw?r:await r.json()}catch(e){return{ok:false,error:'Tidak dapat terhubung ke server.'}}}
const post=(p,d)=>api(p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
const shrink=(f,m=1600)=>new Promise(res=>{const u=URL.createObjectURL(f),im=new Image();im.onload=()=>{const k=Math.min(1,m/Math.max(im.naturalWidth,im.naturalHeight)),c=document.createElement('canvas');c.width=im.naturalWidth*k;c.height=im.naturalHeight*k;c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);c.toBlob(b=>res(b||f),'image/jpeg',.85)};im.onerror=()=>{URL.revokeObjectURL(u);res(f)};im.src=u});
const me=()=>ME,ok=u=>u&&u.status==='verified';
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const fsize=b=>b<1048576?(b/1024).toFixed(0)+' KB':b<1073741824?(b/1048576).toFixed(1)+' MB':(b/1073741824).toFixed(2)+' GB';
const fdur=s=>s?Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'):'';
const SL={pending:'menunggu',verified:'terverifikasi',rejected:'ditolak'};
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),3400)}
async function hash(t){try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}catch(e){let h=5381;for(const c of t)h=(h*33^c.charCodeAt(0))>>>0;return'f'+h}}

/* penyimpanan */
const openDB=()=>new Promise((a,b)=>{const r=indexedDB.open('galaksi-v2',1);r.onupgradeneeded=()=>['media','cards'].forEach(n=>r.result.createObjectStore(n,{keyPath:'id'}));r.onsuccess=()=>a(r.result);r.onerror=()=>b(r.error)});
const R=(s,m,f)=>new Promise((a,b)=>{const t=db.transaction(s,m),q=f(t.objectStore(s));t.oncomplete=()=>a(q&&q.result);t.onerror=t.onabort=()=>b(t.error)});
const put=(s,r)=>R(s,'readwrite',o=>o.put(r)),all=()=>R('media','readonly',o=>o.getAll()),getc=id=>R('cards','readonly',o=>o.get(id)),del=(s,id)=>R(s,'readwrite',o=>o.delete(id));

/* navigasi */
const IC={galeri:'<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',unggah:'<path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 16v2.5a1.5 1.5 0 001.5 1.5h11a1.5 1.5 0 001.5-1.5V16"/>',tentang:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11.5V16M12 8h.01"/>',akun:'<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c.8-4 3.8-6 7.5-6s6.7 2 7.5 6"/>',pengurus:'<path d="M12 3l7.5 2.8v5.4c0 4.6-3.2 7.8-7.5 9.8-4.3-2-7.5-5.2-7.5-9.8V5.8L12 3z"/><path d="M9 12l2.2 2.2 4-4.4"/>'};
$('#nav').insertAdjacentHTML('beforeend',['galeri','unggah','tentang','akun','pengurus'].map(v=>`<button data-v="${v}"${v==='pengurus'?' hidden':''}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${IC[v]}</svg><span>${v[0].toUpperCase()+v.slice(1)}</span></button>`).join(''));
$('#nav').onclick=e=>{const b=e.target.closest('button');if(b)go(b.dataset.v)};
function lens(){const a=$('#nav button.on'),L=$('#lens');if(!a||!a.offsetWidth){L.style.width='0px';return}L.style.width=a.offsetWidth+'px';L.style.transform=`translateX(${a.offsetLeft}px)`}
function go(v){
  const u=me();
  if(!u&&v!=='auth'&&v!=='tentang')v='intro';
  if(u&&(v==='intro'||v==='auth'))v=ok(u)?'galeri':'akun';
  if(u&&!ok(u)&&(v==='galeri'||v==='unggah'))v='akun';
  if(v==='pengurus'&&!(u&&u.role==='admin'))v='akun';
  $$('.v').forEach(s=>s.classList.toggle('on',s.id===v));
  document.body.classList.toggle('in',!!u);
  $$('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));
  $('#nav [data-v=pengurus]').hidden=!(u&&u.role==='admin');
  closeTh();scrollTo(0,0);
  if(v==='galeri'){render();loadMedia()}if(v==='akun')akun();if(v==='pengurus')admin();
  lens();
}
$$('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
addEventListener('resize',lens);document.fonts&&document.fonts.ready.then(lens);
addEventListener('keydown',e=>{if(e.key==='Escape')closeTh();else if(cur&&e.target.tagName!=='VIDEO'&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){const k=shown.findIndex(x=>x.id===cur.id)+(e.key==='ArrowLeft'?-1:1);if(shown[k])openTh(shown[k].id)}});

/* masuk & daftar */
function tab(t){$$('.tabs button').forEach(x=>x.classList.toggle('on',x.dataset.t===t));$('#fin').hidden=t!=='in';$('#fup').hidden=t!=='up';$('#fotp').hidden=true;$('.tabs').style.display=''}
$$('.tabs button').forEach(b=>b.onclick=()=>tab(b.dataset.t));
$('#fin').onsubmit=async e=>{e.preventDefault();const r=await post('/login',{id:$('#li').value.trim().toLowerCase(),password:$('#lp').value});
  if(r.need==='otp'){showOtp(r.email,r.sent);return}
  if(!r.ok){$('#e1').textContent=r.error||'Email/NIS atau kata sandi salah.';return}
  $('#e1').textContent='';ls.set('gx-tk',r.token);ME=r.user;go(ok(ME)?'galeri':'akun')};
$('#fup').onsubmit=async e=>{e.preventDefault();const g=i=>$(i).value.trim(),er=$('#e2');
  const d={nama:g('#rn'),nis:g('#rs'),kelas:g('#rk'),email:g('#re').toLowerCase(),wa:g('#rw'),pw:$('#rp').value};
  const bad=d.nama.length<3?'Isi nama lengkap.':!/^\d{4,20}$/.test(d.nis)?'NIS harus angka (4–20 digit).':!d.kelas?'Isi kelasmu.':!/^\S+@\S+\.\S+$/.test(d.email)?'Email tidak valid.':!/^(\+?62|0)8\d{7,12}$/.test(d.wa.replace(/[\s-]/g,''))?'Nomor WhatsApp tidak valid (contoh 08123456789).':d.pw.length<8?'Kata sandi minimal 8 karakter.':'';
  if(bad){er.textContent=bad;return}
  er.textContent='Mendaftarkan akun…';
  const r=await post('/register',{nama:d.nama,nis:d.nis,kelas:d.kelas,email:d.email,wa:d.wa,password:d.pw,kode:g('#rx'),join:g('#rj')});
  if(!r.ok){er.textContent=r.error||'Pendaftaran gagal.';return}
  er.textContent='';
  if(r.token){ls.set('gx-tk',r.token);ME=r.user;toast('Akun pengurus dibuat.');go('galeri');return}
  showOtp(d.email,r.sent)};
let OTPE='';
function showOtp(em,sent){OTPE=em;$('.tabs').style.display='none';$('#fin').hidden=true;$('#fup').hidden=true;$('#fotp').hidden=false;
  $('#otpsub').textContent=(sent?'Kode 6 angka dikirim ke ':'Kode belum terkirim ke ')+em+(sent?'. Cek juga folder Spam. Berlaku 10 menit.':'. Tekan Kirim ulang kode.');$('#ro').value='';$('#e4').textContent=''}
$('#fotp').onsubmit=async e=>{e.preventDefault();const r=await post('/verify',{email:OTPE,code:$('#ro').value.trim()});
  if(!r.ok){$('#e4').textContent=r.error||'Kode salah.';return}
  ls.set('gx-tk',r.token);ME=r.user;$('.tabs').style.display='';$('#fotp').hidden=true;toast('Akun terverifikasi. Selamat datang!');go('galeri')};
$('#rs2').onclick=async()=>{const r=await post('/resend',{email:OTPE});$('#e4').textContent=r.ok?'Kode baru dikirim. Cek emailmu.':(r.error||'Gagal mengirim.')};

/* akun & pengurus */
function akun(){const u=me(),T={pending:['Menunggu verifikasi','Akunmu belum diverifikasi. Galeri dan unggah terbuka setelah verifikasi selesai.'],verified:['Terverifikasi','Akunmu sudah terverifikasi. Selamat menjelajah!'],rejected:['Ditolak','Alasan: '+(u.alasan||'Data tidak cocok dengan kartu.')+' Hubungi pengurus kalau ini keliru.']}[u.status];
  $('#ab').innerHTML=`<h2>Akunku</h2><div class="glass pf"><span class="stat ${u.status}">${T[0]}</span><h2>${esc(u.nama)}</h2><p class="sub">${esc(u.kelas)} · NIS ${esc(u.nis)}<br>${esc(u.email)}<br>${items.filter(i=>i.uid===u.id).length} unggahan</p><p>${esc(T[1])}</p><details><summary>Ubah kata sandi</summary><div class="chg"><label>Kata sandi lama<input id="po" type="password" autocomplete="current-password"></label><label>Kata sandi baru (min. 8 karakter)<input id="pn" type="password" autocomplete="new-password"></label><p class="err" id="e3" role="alert"></p><button class="btn main sm" id="pw">Simpan kata sandi</button></div></details><div class="acts">${ok(u)?'<button class="btn main" data-go="galeri">Buka galeri</button>':'<button class="btn" id="rf">Cek status</button>'}<button class="btn" id="fx">Efek partikel: ${FX()?'nyala':'mati'}</button><button class="btn" id="lo">Keluar</button></div></div>`;
  if(navigator.storage&&navigator.storage.estimate)navigator.storage.estimate().then(s=>{const p=$('#ab .pf');if(p&&s.quota)p.insertAdjacentHTML('beforeend',`<p class="sub" style="margin-top:16px">Penyimpanan terpakai ${fsize(s.usage)} dari ${fsize(s.quota)}</p><div class="meter"><i style="width:${Math.min(100,s.usage/s.quota*100)}%"></i></div>`)}).catch(()=>{})}
$('#ab').onclick=async e=>{const b=e.target.closest('button');if(!b)return;
  if(b.id==='lo'){ls.del('gx-tk');ME=null;go('intro')}
  else if(b.id==='rf'){const r=await api('/me');if(r.ok)ME=r.user;go('akun')}
  else if(b.id==='rd'){await post('/admin/decide',{id:me().id,action:'delete'});ls.del('gx-tk');ME=null;tab('up');go('auth')}
  else if(b.id==='fx'){ls.set('gx-fx',FX()?'0':'1');fxApply();akun()}
  else if(b.id==='pw'){const n=$('#pn').value;if(n.length<8){$('#e3').textContent='Kata sandi baru minimal 8 karakter.';return}const r=await post('/password',{old:$('#po').value,password:n});if(!r.ok){$('#e3').textContent=r.error||'Gagal mengubah.';return}$('#po').value=$('#pn').value='';$('#e3').textContent='';toast('Kata sandi diubah.')}
  else if(b.dataset.go)go(b.dataset.go)};
let AU=[];
async function admin(){const r=await api('/admin/users');if(!r.ok){$('#ac').textContent=r.error||'Gagal memuat.';return}AU=r.users;
  const L=AU.slice().sort((a,b)=>(a.status==='pending'?0:1)-(b.status==='pending'?0:1)),p=L.filter(u=>u.status==='pending').length;
  $('#ac').textContent=p?p+' menunggu verifikasi.':'Tidak ada pendaftar yang menunggu.';
  $('#al').innerHTML=L.map(u=>`<div class="glass ad"><div><b>${esc(u.nama)}</b><br><span class="sub">${esc(u.kelas)} · NIS ${esc(u.nis)}<br>${esc(u.email)}<br>WA <a href="https://wa.me/${esc(u.wa||'')}" target="_blank" rel="noopener" style="color:var(--c)">${esc(u.wa||'-')}</a></span><br><span class="stat ${u.status}">${SL[u.status]}</span></div>${u.status==='pending'?`<button class="btn main sm" data-a="${u.id}">Setujui</button><button class="btn bad sm" data-r="${u.id}">Tolak</button>`:u.status==='rejected'?`<button class="btn main sm" data-a="${u.id}">Setujui</button>`:''}<button class="btn bad sm" data-d="${u.id}">Hapus akun</button></div>`).join('');
}
$('#al').onclick=async e=>{const b=e.target.closest('button');if(!b)return;const id=b.dataset.a||b.dataset.r||b.dataset.d,u=AU.find(x=>x.id===id);if(!u)return;const body={id};
  if(b.dataset.d){if(!confirm('Hapus akun '+u.nama+'? Unggahannya tetap ada.'))return;body.action='delete'}else if(b.dataset.a)body.action='approve';else{const r=prompt('Alasan penolakan:','Nama atau NIS tidak terbaca');if(r===null)return;body.action='reject';body.alasan=r}
  const r=await post('/admin/decide',body);toast(r.ok?'Tersimpan.':r.error||'Gagal.');admin()};

/* galeri */
const SO={new:(a,b)=>b.at-a.at,old:(a,b)=>a.at-b.at,big:(a,b)=>b.size-a.size};
const sha=async f=>{if(!(window.crypto&&crypto.subtle)||f.size>157286400)return null;try{return[...new Uint8Array(await crypto.subtle.digest('SHA-256',await f.arrayBuffer()))].map(x=>x.toString(16).padStart(2,'0')).join('')}catch(e){return null}};
function stats(){const v=items.filter(i=>i.kind!=='image').length,t=items.reduce((a,i)=>a+i.size,0);$('#stats').innerHTML=[[items.length,'Arsip'],[v,'Video'],[items.length-v,'Foto'],[fsize(t),'Total ukuran']].map(([n,l])=>`<div class="glass"><b>${n}</b><span class="sub">${l}</span></div>`).join('')}
const favs=()=>{try{return JSON.parse(ls.get('gx-fav-'+(me()||{}).id)||'[]')}catch(e){return[]}};
const togFav=id=>{const f=favs(),k=f.indexOf(id);k<0?f.push(id):f.splice(k,1);ls.set('gx-fav-'+me().id,JSON.stringify(f))};
function albums(){const A=[...new Set(items.map(i=>i.album).filter(Boolean))].sort(),s=$('#album'),v=s.value;s.innerHTML='<option value="">Semua album</option>'+A.map(a=>`<option>${esc(a)}</option>`).join('');s.value=A.includes(v)?v:'';$('#albl').innerHTML=A.map(a=>`<option value="${esc(a)}">`).join('')}
function render(){albums();const fv=favs(),al=$('#album').value,q=$('#q').value.trim().toLowerCase(),L=items.filter(i=>(!filt||(filt==='fav'?fv.includes(i.id):i.kind===filt))&&(!al||i.album===al)&&(!q||(i.title+' '+i.author).toLowerCase().includes(q))).sort(SO[$('#sort').value]||SO.new);shown=L;stats();
  $('#grid').innerHTML=L.length?L.map(i=>`<article class="card" data-id="${i.id}"><div class="th"><button class="hrt${fv.includes(i.id)?' on':''}" data-f="${i.id}" aria-label="Favorit">♥</button>${i.thumb?`<img src="${i.thumb}" alt="" loading="lazy">`:''}<span class="tag">${i.kind==='image'?'Foto':'Video'+(i.dur?' · '+fdur(i.dur):'')}</span></div><div class="b"><h3>${esc(i.title)}</h3><p>${esc(i.author)} · ${new Date(i.at).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}</p></div></article>`).join(''):`<p class="sub" style="grid-column:1/-1;text-align:center;padding:60px 0">${items.length?'Tidak ada hasil.':'Belum ada kenangan. Jadilah yang pertama menyimpannya.'}</p>`}
$('#q').oninput=render;$('#sort').onchange=render;$('#album').onchange=render;
$('#chips').onclick=e=>{const b=e.target.closest('button');if(!b)return;filt=b.dataset.k;$$('#chips button').forEach(x=>x.classList.toggle('on',x===b));render()};
$('#grid').onclick=e=>{const h=e.target.closest('[data-f]');if(h){togFav(h.dataset.f);h.classList.toggle('on');if(filt==='fav')render();return}const c=e.target.closest('.card');if(c)openTh(c.dataset.id)};
async function openTh(id){const i=items.find(x=>x.id===id),u=me();if(!i)return;cur=i;curURL=null;$('#th').innerHTML='<p style="color:#fff">Memuat…</p>';$('#th').classList.add('on');document.documentElement.style.overflow='hidden';
  const ur=await api('/media/url/'+id);if(cur!==i)return;if(!ur.ok){closeTh();toast(ur.error||'Gagal memuat berkas.');return}curURL=ur.url;
  const m=i.kind==='image'?`<img src="${curURL}" alt="${esc(i.title)}">`:`<video src="${curURL}" controls playsinline autoplay></video>`,k=shown.findIndex(x=>x.id===id),own=u&&(u.id===i.uid||u.role==='admin');
  $('#th').innerHTML=`<div class="pn glass">${m}${k>0?'<button class="nv" id="pv" style="left:22px" aria-label="Sebelumnya">‹</button>':''}${k>=0&&k<shown.length-1?'<button class="nv" id="nx" style="right:22px" aria-label="Berikutnya">›</button>':''}<h2 style="margin-top:14px">${esc(i.title)}</h2><p class="sub">${esc(i.author)} · ${esc(i.name)} · ${fsize(i.size)}${i.w?' · '+i.w+'×'+i.h:''}${i.album?' · '+esc(i.album):''}</p>${i.note?'<p>'+esc(i.note)+'</p>':''}<p class="fp" id="fp">${i.sha?'SHA-256 '+i.sha:'Sidik jari tidak dihitung (berkas besar atau browser tidak mendukung).'}</p><div class="acts"><a class="btn main sm" href="${curURL}&download=${encodeURIComponent(i.name)}">Unduh asli</a>${i.sha?'<button class="btn sm" id="vf">Verifikasi keaslian</button>':''}<button class="btn sm" id="fv">${favs().includes(i.id)?'♥ Difavoritkan':'♡ Favorit'}</button>${navigator.canShare?'<button class="btn sm" id="sh">Bagikan</button>':''}${own?'<button class="btn sm" id="ed">Ubah</button><button class="btn bad sm" id="dl">Hapus</button>':''}<button class="btn sm" id="cl">Tutup</button></div></div>`;
  $('#th').classList.add('on');document.documentElement.style.overflow='hidden'}
function closeTh(){$('#th').classList.remove('on');$('#th').innerHTML='';if(curURL)URL.revokeObjectURL(curURL);curURL=null;cur=null;document.documentElement.style.overflow=''}
$('#th').onclick=async e=>{const t=e.target.id;
  if(t==='th'||t==='cl')closeTh();
  else if((t==='pv'||t==='nx')&&cur){const k=shown.findIndex(x=>x.id===cur.id)+(t==='pv'?-1:1);if(shown[k])openTh(shown[k].id)}
  else if(t==='vf'&&cur){const i=cur,f=$('#fp');f.className='fp';f.textContent='Membaca ulang dan menghitung…';let h=null;try{h=await sha(await(await fetch(curURL)).blob())}catch(_){}if(cur!==i)return;
    if(h&&h===i.sha){f.className='fp ok';f.textContent='Byte identik. Arsip masih 100% orisinal · SHA-256 '+h}else{f.className='fp no';f.textContent='Sidik jari berbeda. Arsip mungkin rusak.'}}
  else if(t==='fv'&&cur){togFav(cur.id);e.target.textContent=favs().includes(cur.id)?'♥ Difavoritkan':'♡ Favorit';render()}
  else if(t==='sh'&&cur){try{const bl=await(await fetch(curURL)).blob();await navigator.share({files:[new File([bl],cur.name,{type:cur.mime||bl.type})],title:cur.title})}catch(x){if(x.name!=='AbortError')toast('Berbagi tidak didukung untuk berkas ini.')}}
  else if(t==='ed'&&cur){const i=cur,n=prompt('Judul:',i.title);if(n===null)return;const c=prompt('Catatan momen (boleh kosong):',i.note||'');i.title=n.trim()||i.title;if(c!==null)i.note=c.trim();await post('/media/edit',{id:i.id,title:i.title,note:i.note});openTh(i.id);render();toast('Tersimpan.')}
  else if(t==='dl'&&cur&&confirm('Hapus kenangan ini secara permanen?')){const id=cur.id;closeTh();await post('/media/delete',{id});items=items.filter(x=>x.id!==id);render();toast('Terhapus.')}};

async function loadMedia(){const r=await api('/media');if(r.ok){items=r.items;stats();if($('#galeri').classList.contains('on'))render()}else if(r.error)toast(r.error)}
const up=(id,f,cb)=>new Promise(res=>{const x=new XMLHttpRequest();x.open('PUT',API+'/media/file/'+id);x.setRequestHeader('Authorization','Bearer '+tk());x.upload.onprogress=e=>e.lengthComputable&&cb(e.loaded/e.total);x.onload=()=>{let j={};try{j=JSON.parse(x.responseText)}catch(_){}res(j)};x.onerror=()=>res({ok:false,error:'Koneksi terputus.'});x.send(f)});

/* unggah */
const kindOf=f=>/^video\//.test(f.type)||/\.(mp4|mov|mkv|webm|avi|m4v|3gp)$/i.test(f.name)?'video':/^image\//.test(f.type)||/\.(jpe?g|png|gif|webp|heic|heif|avif|bmp)$/i.test(f.name)?'image':null;
const probe=(f,k)=>new Promise(res=>{const url=URL.createObjectURL(f),el=document.createElement(k==='image'?'img':'video'),o={thumb:null,dur:null,w:0,h:0};let d=0;
  const fin=()=>{if(d++)return;try{const W=Math.min(360,o.w||360),c=document.createElement('canvas');c.width=W;c.height=Math.round(W*(o.h||3)/(o.w||4));const x=c.getContext('2d');x.fillStyle='#10143a';x.fillRect(0,0,c.width,c.height);x.drawImage(el,0,0,c.width,c.height);o.thumb=c.toDataURL('image/jpeg',.7)}catch(e){}URL.revokeObjectURL(url);res(o)};
  if(k==='image')el.onload=()=>{o.w=el.naturalWidth;o.h=el.naturalHeight;fin()};
  else{el.muted=true;el.preload='auto';el.onloadedmetadata=()=>{o.dur=el.duration;o.w=el.videoWidth;o.h=el.videoHeight;el.currentTime=Math.min(1,(el.duration||0)/4)};el.onseeked=fin}
  el.onerror=fin;setTimeout(fin,12000);el.src=url});
function qr(){$('#ql').innerHTML=queue.map(q=>`<div class="q glass" data-q="${q.id}"><span class="pill">${q.k==='image'?'Foto':'Video'}</span><input value="${esc(q.t??q.f.name.replace(/\.[^.]+$/,''))}" maxlength="100" aria-label="Judul"><small>${fsize(q.f.size)}</small><button class="btn sm" data-x="${q.id}" aria-label="Buang">✕</button></div>`).join('');$('#save').hidden=!queue.length}
function add(fs){const v=[...fs].filter(f=>kindOf(f)&&f.size<=5e7);if(v.length<fs.length)toast('Dilewati: bukan video atau foto, atau lebih dari 50 MB.');queue.push(...v.map(f=>({id:uid(),f,k:kindOf(f)})));qr()}
$('#ql').oninput=e=>{const r=e.target.closest('[data-q]'),q=r&&queue.find(x=>x.id===r.dataset.q);if(q)q.t=e.target.value};
$('#ql').onclick=e=>{const b=e.target.closest('[data-x]');if(b){queue=queue.filter(x=>x.id!==b.dataset.x);qr()}};
const dz=$('#drop');dz.onclick=()=>$('#fi').click();dz.onkeydown=e=>(e.key==='Enter'||e.key===' ')&&$('#fi').click();
$('#fi').onchange=e=>{add(e.target.files);e.target.value=''};
['dragover','dragenter'].forEach(n=>dz.addEventListener(n,e=>{e.preventDefault();dz.classList.add('dr')}));
['dragleave','drop'].forEach(n=>dz.addEventListener(n,()=>dz.classList.remove('dr')));
dz.addEventListener('drop',e=>{e.preventDefault();add(e.dataTransfer.files)});
$('#save').onclick=async()=>{const b=$('#save');b.disabled=true;let n=0,dup=0,bad=0;const alb=$('#alb').value.trim().slice(0,40);
  for(const q of queue){n++;b.textContent='Menyiapkan '+n+'/'+queue.length+'…';const sh=await sha(q.f),p=await probe(q.f,q.k);
    const r=await post('/media/init',{kind:q.k,title:(q.t??q.f.name.replace(/\.[^.]+$/,'')).trim()||q.f.name,album:alb,name:q.f.name,mime:q.f.type,size:q.f.size,w:p.w,h:p.h,dur:p.dur,sha:sh,thumb:p.thumb});
    if(r.dup){dup++;continue}if(!r.ok){bad++;toast(r.error||'Gagal menyiapkan unggahan.');continue}
    const u=await up(r.id,q.f,f=>{b.textContent='Mengunggah '+n+'/'+queue.length+' · '+Math.round(f*100)+'%'});
    if(!u.ok){bad++;toast(u.error||'Gagal mengunggah "'+q.f.name+'".')}}
  queue=[];qr();b.disabled=false;b.textContent='Simpan ke galaksi';await loadMedia();toast(bad?'Sebagian berkas gagal diunggah.':dup?dup+' berkas sama dilewati.':'Tersimpan utuh, tanpa kompresi.');go('galeri')};

/* partikel atom: saling tersambung, menghindar saat disentuh */
(()=>{const cv=$('#bg'),x=cv.getContext('2d'),C=['139,124,255','79,216,255','255,122,182'],m={x:-999,y:-999,a:false},RM=matchMedia('(prefers-reduced-motion:reduce)').matches;let W,H,P=[],raf;
  function size(){const r=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=W*r;cv.height=H*r;x.setTransform(r,0,0,r,0,0);
    P=Array.from({length:Math.max(28,Math.min(90,W*H/16000|0))},()=>{const px=Math.random()*W,py=Math.random()*H;return{x:px,y:py,hx:px,hy:py,vx:0,vy:0,r:Math.random()*1.5+1,c:C[Math.random()*3|0],t:Math.random()*6.28,at:Math.random()<.25}});if(RM)tick(0)}
  function tick(t){x.clearRect(0,0,W,H);const s=t/1000,L=Math.min(145,Math.max(100,W*.1)),Rr=125;
    for(const p of P){p.vx+=(p.hx+Math.sin(s*.4+p.t)*14-p.x)*.01;p.vy+=(p.hy+Math.cos(s*.35+p.t*1.3)*14-p.y)*.01;
      if(m.a){const dx=p.x-m.x,dy=p.y-m.y,d=Math.hypot(dx,dy);if(d<Rr&&d>.1){const f=(1-d/Rr)*2.4;p.vx+=dx/d*f;p.vy+=dy/d*f}}
      p.vx*=.9;p.vy*=.9;p.x+=p.vx;p.y+=p.vy}
    x.lineWidth=1;
    for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++){const a=P[i],b=P[j],dx=a.x-b.x,dy=a.y-b.y,d=dx*dx+dy*dy;if(d<L*L){x.strokeStyle='rgba('+a.c+','+((1-Math.sqrt(d)/L)*.4).toFixed(3)+')';x.beginPath();x.moveTo(a.x,a.y);x.lineTo(b.x,b.y);x.stroke()}}
    for(const p of P){x.fillStyle='rgba('+p.c+','+(.65+.3*Math.sin(s*1.5+p.t)).toFixed(2)+')';x.beginPath();x.arc(p.x,p.y,p.r,0,6.3);x.fill();
      if(p.at){x.strokeStyle='rgba('+p.c+',.35)';x.beginPath();x.ellipse(p.x,p.y,8,3.4,s*.7+p.t,0,6.3);x.stroke();x.beginPath();x.arc(p.x+Math.cos(s*2+p.t)*8*Math.cos(s*.7+p.t),p.y+Math.cos(s*2+p.t)*8*Math.sin(s*.7+p.t)*.45,1.2,0,6.3);x.fill()}}
    if(!RM)raf=requestAnimationFrame(tick)}
  addEventListener('pointermove',e=>{m.x=e.clientX;m.y=e.clientY;m.a=true},{passive:true});
  addEventListener('pointerdown',e=>{m.x=e.clientX;m.y=e.clientY;m.a=true},{passive:true});
  addEventListener('pointerup',e=>{if(e.pointerType!=='mouse')m.a=false});
  addEventListener('pointercancel',()=>m.a=false);document.addEventListener('mouseleave',()=>m.a=false);
  addEventListener('resize',size);size();
  if(!RM){raf=requestAnimationFrame(tick);document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(raf);if(!document.hidden&&FX())raf=requestAnimationFrame(tick)})}
  window.fxApply=()=>{cancelAnimationFrame(raf);cv.style.display=FX()?'':'none';if(FX()&&!RM)raf=requestAnimationFrame(tick)};fxApply();
})();

(async()=>{if(tk()){const r=await api('/me');if(r.ok)ME=r.user;else if(!/terhubung/.test(r.error||''))ls.del('gx-tk');else toast(r.error)}go(me()?'galeri':'intro')})();
