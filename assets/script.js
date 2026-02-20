// ==========================================
// KONFIGURASI & STATE
// ==========================================
const ADMIN_CREDS = { u: 'unejcempaka2', p: 'unejcempaka2' };
const STORAGE_KEYS = {
    MATERI: 'panda_materi_db',
    USERS: 'panda_users_db',
    TRASH: 'panda_trash_db',
    ADMIN: 'panda_admin_logged_in'
};

const audioLinks = { 
    indo: "#", 
    jawa: "#", bali: "#", inggris: "#", jepang: "#" 
};
const firebaseConfig = {
  apiKey: "AIzaSyBBq4QCboJRpZ5go8b3PeQRozDQbi_bxtI",
  authDomain: "panda-app-8e7cd.firebaseapp.com",
  databaseURL: "https://panda-app-8e7cd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "panda-app-8e7cd",
  storageBucket: "panda-app-8e7cd.firebasestorage.app",
  messagingSenderId: "231146803507",
  appId: "1:231146803507:web:0e39757fd50792395c2e46"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Default Data jika LocalStorage kosong
const defaultDB = {
    'DM': [
        { 
            id: 'dm_senam', 
            judul: 'Senam Kaki Diabetik', 
            yt: 'https://www.youtube.com/embed/fVYNRp2EM_A',
            teks: `Senam kaki diabetik bertujuan melancarkan darah dan mencegah luka.`,
            soal: [
                {q: "Apa tujuan utama senam kaki diabetik?", a: ["Melancarkan darah", "Menambah nafsu makan"], c: 0},
                {q: "Kapan sebaiknya senam kaki dilakukan?", a: ["Hanya saat luka", "Setiap hari rutin"], c: 1},
                {q: "Posisi terbaik melakukan senam kaki adalah?", a: ["Duduk tegak", "Berlari"], c: 0}
            ]
        }
    ],
    'HT': [
        { 
            id: 'ht1', 
            judul: 'Mengenal Hipertensi', 
            yt: 'https://www.youtube.com/embed/dQw4w9WgXcQ', 
            teks: 'Tekanan darah normal adalah 120/80 mmHg.', 
            soal: [
                {q: "Berapakah tekanan darah normal?", a: ["120/80 mmHg", "180/100 mmHg"], c: 0},
                {q: "Apa julukan penyakit hipertensi?", a: ["The Silent Killer", "Penyakit Biasa"], c: 0},
                {q: "Garam harus dikurangi oleh penderita hipertensi?", a: ["Salah", "Benar"], c: 1}
            ]
        }
    ]
};

// Load Data
let db = JSON.parse(localStorage.getItem(STORAGE_KEYS.MATERI)) || defaultDB;
let users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];
let trash = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRASH)) || [];

// Session User Aktif
let currentUser = { 
    id: null, nama: '', ruang: '', gender: '', 
    materiId: '', materiJudul: '', 
    skorPre: 0, skorPost: 0, 
    waktuMasuk: null, kepuasan: '-' 
};

let currentEditSoal = { cat: '', id: '' };
let isMuted = false;

   
// ==========================================
// --- FUNGSI NAVIGASI & INIT (VERSI FIREBASE) ---
// ==========================================

// Init App: Ambil dan Pantau data dari server secara REAL-TIME
document.addEventListener('DOMContentLoaded', () => {
    
    // Menggunakan .on() bukan .once()
    database.ref('/').on('value', (snapshot) => {
        const data = snapshot.val();
        
        if (data) {
            // Selalu perbarui data lokal dengan data paling fresh dari server
            db = data.materi || defaultDB;
            
            // Konversi aman untuk memastikan formatnya tetap Array (karena Firebase kadang mengubah array jadi object)
            users = data.users ? (Array.isArray(data.users) ? data.users : Object.values(data.users)) : [];
            trash = data.trash ? (Array.isArray(data.trash) ? data.trash : Object.values(data.trash)) : [];
        } else {
            // Jika kosong, simpan data bawaan
            saveDB();
        }

        // Render ulang tampilan depan
        renderDiagnosaGrid();
        
        // FITUR SULAP: Jika panel admin sedang dibuka, otomatis update tabel tanpa perlu refresh halaman!
        const editor = document.getElementById('editor-menu');
        if(editor && !editor.classList.contains('hidden')) {
            renderTablePasien();
            renderGridMateriAdmin();
            renderListSoalAdmin();
            renderTableSampah();
        }

    }, (error) => {
        console.error("Gagal sinkronisasi data:", error);
    });
    
});

// Fungsi Save sekarang mengirim data ke Firebase
function saveDB() {
    database.ref('materi').set(db);
}
function saveUsers() {
    database.ref('users').set(users);
}
function saveTrash() {
    database.ref('trash').set(trash);
}
function goPage(n) {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById('page-' + n);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('page-active');
        window.scrollTo({top:0, behavior:'smooth'});
    }
}

// Render Grid Kategori (Page 2)
function renderDiagnosaGrid() {
    const grid = document.getElementById('grid-diagnosa');
    if(!grid) return;
    grid.innerHTML = '';
    
    // Ambil keys dari DB
    const categories = Object.keys(db);
    if(categories.length === 0) {
        grid.innerHTML = '<p class="col-span-2 text-center text-slate-400 text-xs">Belum ada materi tersedia.</p>';
        return;
    }

    categories.forEach(cat => {
        grid.innerHTML += `
            <button onclick="setDiagnosa('${cat}')" class="diag-btn p-6 bg-white rounded-3xl shadow-sm border border-slate-100 text-sm font-bold flex flex-col items-center gap-3 hover:shadow-lg hover:border-blue-200 transition group">
                <div class="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl group-hover:bg-blue-600 group-hover:text-white transition">
                    <i class="fa-solid fa-notes-medical"></i>
                </div>
                <span class="uppercase">${cat}</span>
            </button>`;
    });
}

function startApp() {
    const nama = document.getElementById('inputNama').value;
    const gender = document.getElementById('inputGender').value;
    const ruang = document.getElementById('inputRuang').value;

    if(!nama || !gender || !ruang) return Swal.fire('Waduh', 'Mohon lengkapi semua data diri ya!', 'warning');

    // Buat Session User Baru
    currentUser = {
        id: Date.now(),
        nama: nama,
        gender: gender,
        ruang: ruang,
        waktuMasuk: new Date().toISOString(),
        materiJudul: '-',
        skorPre: 0,
        skorPost: 0,
        kepuasan: '-'
    };
    
    // Push ke DB Users (Akan diupdate bertahap)
    users.push(currentUser);
    saveUsers();

    // Play Audio Background
    const audio = document.getElementById('bgMusic');
    if(audio && !isMuted) {
        audio.volume = 0.3;
        audio.play().catch(e => console.log("Autoplay blocked", e));
    }

    goPage(2);
}

// ==========================================
// --- FITUR AUDIO ---
// ==========================================
function toggleMute() {
    const audio = document.getElementById('bgMusic');
    const btn = document.getElementById('btnMute');
    isMuted = !isMuted;
    
    if(isMuted) {
        audio.pause();
        btn.innerHTML = '<i class="fa-solid fa-volume-xmark text-slate-400"></i>';
    } else {
        audio.play();
        btn.innerHTML = '<i class="fa-solid fa-volume-high text-blue-600"></i>';
    }
}

// ==========================================
// --- FUNGSI MATERI & KUIS ---
// ==========================================
function setDiagnosa(cat) {
    document.getElementById('judulDiagnosa').innerText = "Panduan " + cat;
    const list = document.getElementById('listSubMateri'); 
    list.innerHTML = '';
    
    if(!db[cat] || db[cat].length === 0) {
        list.innerHTML = '<p class="text-slate-400 text-xs">Materi kosong.</p>';
    } else {
        db[cat].forEach(m => {
            list.innerHTML += `
                <button onclick="pilihMateri('${cat}', '${m.id}')" class="w-full p-5 bg-white rounded-3xl font-bold flex justify-between items-center shadow-sm border border-slate-100 hover:bg-blue-50 transition mb-3 group">
                    <span class="text-left text-sm group-hover:text-blue-700">${m.judul}</span> 
                    <i class="fa-solid fa-circle-play text-blue-200 group-hover:text-blue-600 text-2xl transition"></i>
                </button>`;
        });
    }
    goPage(3);
}

let activeMateri = null;
let quizState = { idx: 0, isPost: false };

function pilihMateri(cat, id) {
    const target = db[cat].find(x => x.id === id);
    if(!target) return;

    activeMateri = target;
    quizState = { idx: 0, isPost: false };

    // Update User Session - Materi yang dipilih
    currentUser.materiJudul = target.judul;
    updateCurrentUser();

    // Setup Video
    const container = document.getElementById('videoContainer');
    if(target.localVideo) {
        container.innerHTML = `<video controls class="w-full h-full object-cover"><source src="${target.localVideo}"></video>`;
    } else {
        container.innerHTML = `<iframe id="ytVideo" class="w-full h-full" src="${target.yt}" frameborder="0" allowfullscreen></iframe>`;
    }

    // Setup Audio Links
    if(target.customAudio) Object.assign(audioLinks, target.customAudio);

    // Setup Teks
    document.getElementById('judulMateri').innerText = target.judul;
    document.getElementById('isiTeksMateri').innerText = target.teks;

    // Show Pre-Test First
    document.getElementById('kuis-area').classList.remove('hidden');
    document.getElementById('materi-area').classList.add('hidden');
    
    // Jika soal kosong, skip kuis
    if(!activeMateri.soal || activeMateri.soal.length === 0) {
        Swal.fire('Info', 'Materi ini tidak memiliki kuis, langsung ke materi.', 'info');
        document.getElementById('kuis-area').classList.add('hidden');
        document.getElementById('materi-area').classList.remove('hidden');
    } else {
        showSoal(); 
    }
    
    goPage(4);
}

function showSoal() {
    const sData = activeMateri.soal[quizState.idx];
    
    // Cek Selesai Kuis
    if(!sData) {
        if(!quizState.isPost) {
            Swal.fire({
                title: 'Pre-Test Selesai!', 
                text: 'Silakan pelajari materi dengan seksama.', 
                icon: 'success',
                confirmButtonText: 'Buka Materi',
                confirmButtonColor: '#2563eb'
            }).then(() => {
                document.getElementById('kuis-area').classList.add('hidden');
                document.getElementById('materi-area').classList.remove('hidden');
            });
        } else {
            Swal.fire({
                title: 'Luar Biasa!', 
                text: 'Anda telah menyelesaikan seluruh rangkaian.', 
                icon: 'success',
                confirmButtonText: 'Lanjut',
                confirmButtonColor: '#2563eb'
            }).then(() => {
                goPage(5); 
                confetti({particleCount:150, spread: 70, origin: { y: 0.6 }});
            });
        }
        return;
    }

    // Render Soal
    document.getElementById('labelTipeKuis').innerText = quizState.isPost ? "Post-Test" : "Pre-Test";
    document.getElementById('labelTipeKuis').className = quizState.isPost ? 
        "px-3 py-1 bg-green-100 text-green-600 text-[10px] font-black rounded-full uppercase" : 
        "px-3 py-1 bg-blue-100 text-blue-600 text-[10px] font-black rounded-full uppercase";
        
    document.getElementById('progresSoal').innerText = `${quizState.idx + 1} / ${activeMateri.soal.length}`;
    document.getElementById('teksSoal').innerText = sData.q;
    
    const opsi = document.getElementById('opsiKuis'); 
    opsi.innerHTML = '';
    sData.a.forEach((opt, i) => {
        opsi.innerHTML += `
            <button onclick="jawab(${i})" class="w-full p-4 bg-white border border-slate-100 rounded-2xl text-left mb-2 shadow-sm hover:bg-blue-50 hover:border-blue-300 transition group">
                <span class="font-bold text-slate-400 mr-2 group-hover:text-blue-500">${String.fromCharCode(65+i)}.</span> ${opt}
            </button>`;
    });
}

function jawab(idx) {
    const sData = activeMateri.soal[quizState.idx];
    if(idx === sData.c) {
        Swal.fire({ title: 'Benar!', icon: 'success', timer: 800, showConfirmButton: false, backdrop: `rgba(0,0,123,0.1)` });
        
        // Update Skor
        if(!quizState.isPost) currentUser.skorPre += 10; 
        else currentUser.skorPost += 10;
        updateCurrentUser();
        
    } else {
        Swal.fire({ title: 'Kurang Tepat', icon: 'error', timer: 800, showConfirmButton: false, backdrop: `rgba(123,0,0,0.1)` });
    }
    
    // Next Soal
    setTimeout(() => {
        quizState.idx++;
        showSoal();
    }, 900);
}

function playAudio(l) { 
    const p = document.getElementById('audioMateri');
    if(audioLinks[l] && audioLinks[l] !== "#") {
        p.src = audioLinks[l]; p.play();
    } else {
        Swal.fire('Maaf', 'Audio untuk bahasa ini belum tersedia.', 'info');
    }
}

function startPostTest() { 
    quizState.isPost = true; 
    quizState.idx = 0; 
    document.getElementById('materi-area').classList.add('hidden'); 
    document.getElementById('kuis-area').classList.remove('hidden'); 
    
    // Stop video/audio
    const vContainer = document.getElementById('videoContainer');
    const oldHTML = vContainer.innerHTML;
    vContainer.innerHTML = oldHTML; // hack to stop iframe/video
    document.getElementById('audioMateri').pause();

    showSoal(); 
}

function finish(val) {
    currentUser.kepuasan = val;
    updateCurrentUser();
    
    Swal.fire('Terima Kasih!', 'Semoga lekas sembuh dan sehat selalu!', 'success').then(() => {
        location.reload();
    });
}

function updateCurrentUser() {
    const idx = users.findIndex(u => u.id === currentUser.id);
    if(idx !== -1) {
        users[idx] = currentUser;
        saveUsers();
    }
}

// ==========================================
// --- ADMIN DASHBOARD ---
// ==========================================
function toggleEditor() {
    // Cek Login Session
    const isLogged = sessionStorage.getItem(STORAGE_KEYS.ADMIN);
    const editor = document.getElementById('editor-menu');
    
    if(editor.classList.contains('hidden')) {
        // Mau Buka
        if(isLogged === 'true') {
            editor.classList.remove('hidden');
            switchTab('tab-pasien');
        } else {
            promptLogin();
        }
    } else {
        // Mau Tutup
        editor.classList.add('hidden');
    }
}

function promptLogin() {
    Swal.fire({
        title: 'Login Admin',
        html: `
            <input type="text" id="loginUser" class="swal2-input" placeholder="Username">
            <input type="password" id="loginPass" class="swal2-input" placeholder="Password">
        `,
        confirmButtonText: 'Masuk',
        focusConfirm: false,
        preConfirm: () => {
            const u = Swal.getPopup().querySelector('#loginUser').value;
            const p = Swal.getPopup().querySelector('#loginPass').value;
            if (!u || !p) Swal.showValidationMessage(`Input tidak boleh kosong`);
            return { u: u, p: p };
        }
    }).then((result) => {
        if(result.isConfirmed) {
            const creds = result.value;
            if(creds.u === ADMIN_CREDS.u && creds.p === ADMIN_CREDS.p) {
                sessionStorage.setItem(STORAGE_KEYS.ADMIN, 'true');
                Swal.fire('Berhasil', 'Selamat datang Admin!', 'success');
                document.getElementById('editor-menu').classList.remove('hidden');
                switchTab('tab-pasien');
            } else {
                Swal.fire('Gagal', 'Username atau Password salah!', 'error');
            }
        }
    });
}

function logoutAdmin() {
    sessionStorage.removeItem(STORAGE_KEYS.ADMIN);
    document.getElementById('editor-menu').classList.add('hidden');
    Swal.fire('Logout', 'Anda telah keluar.', 'success');
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('border-blue-600', 'text-blue-600');
        b.classList.add('border-transparent', 'text-slate-400');
    });
    
    document.getElementById(tabId).classList.remove('hidden');
    document.getElementById('btn-' + tabId).classList.remove('border-transparent', 'text-slate-400');
    document.getElementById('btn-' + tabId).classList.add('border-blue-600', 'text-blue-600');
    
    if(tabId === 'tab-pasien') renderTablePasien();
    if(tabId === 'tab-materi') renderGridMateriAdmin();
    if(tabId === 'tab-soal') renderListSoalAdmin();
    if(tabId === 'tab-sampah') renderTableSampah();
}

// --- TAB PASIEN ---
function renderTablePasien() {
    const tbody = document.getElementById('table-pasien-body');
    const empty = document.getElementById('empty-state-pasien');
    
    // Sort desc by time
    const data = users.sort((a,b) => new Date(b.waktuMasuk) - new Date(a.waktuMasuk));
    
    if(data.length === 0) {
        tbody.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');
    
    tbody.innerHTML = '';
    data.forEach(u => {
        const time = new Date(u.waktuMasuk).toLocaleString('id-ID');
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 transition border-b border-slate-50">
                <td class="p-4 text-center"><input type="checkbox" class="check-pasien" value="${u.id}"></td>
                <td class="p-4 text-xs font-bold text-slate-500">${time}</td>
                <td class="p-4 font-bold text-slate-700">${u.nama}<br><span class="text-[9px] text-slate-400 font-normal uppercase">${u.gender}</span></td>
                <td class="p-4 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg w-fit h-fit">${u.ruang}</td>
                <td class="p-4 text-xs text-slate-600 max-w-[150px] truncate">${u.materiJudul}</td>
                <td class="p-4 text-center font-bold text-slate-700">${u.skorPre}</td>
                <td class="p-4 text-center font-bold text-slate-700">${u.skorPost}</td>
                <td class="p-4 text-xs">${u.kepuasan}</td>
                <td class="p-4 text-center">
                    <button onclick="hapusPasien(${u.id})" class="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

function hapusPasien(id) {
    Swal.fire({
        title: 'Hapus Pasien?',
        text: "Data akan dipindahkan ke tempat sampah.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, Hapus!'
    }).then((result) => {
        if (result.isConfirmed) {
            const idx = users.findIndex(u => u.id === id);
            if(idx !== -1) {
                const deleted = users.splice(idx, 1)[0];
                deleted.deletedAt = new Date().toISOString();
                trash.push(deleted);
                saveUsers();
                saveTrash();
                renderTablePasien();
                updateCountSampah();
                Swal.fire('Terhapus!', 'Data pasien dipindahkan ke sampah.', 'success');
            }
        }
    });
}

function toggleCheckAll(source) {
    const checkboxes = document.querySelectorAll('.check-pasien');
    checkboxes.forEach(cb => cb.checked = source.checked);
}

function hapusManual() {
    const checked = document.querySelectorAll('.check-pasien:checked');
    if(checked.length === 0) return Swal.fire('Info', 'Pilih data yang ingin dihapus dulu.', 'info');
    
    Swal.fire({
        title: `Hapus ${checked.length} Data?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, Hapus Semua!'
    }).then((result) => {
        if(result.isConfirmed) {
            const idsToDelete = Array.from(checked).map(cb => parseInt(cb.value));
            
            // Filter users to keep, move others to trash
            const keptUsers = [];
            users.forEach(u => {
                if(idsToDelete.includes(u.id)) {
                    u.deletedAt = new Date().toISOString();
                    trash.push(u);
                } else {
                    keptUsers.push(u);
                }
            });
            
            users = keptUsers;
            saveUsers();
            saveTrash();
            renderTablePasien();
            updateCountSampah();
            Swal.fire('Selesai', 'Data terpilih telah dihapus.', 'success');
        }
    });
}

function hapusBerkala(days) {
    Swal.fire({
        title: `Hapus Data > ${days} Hari?`,
        text: "Pembersihan otomatis berdasarkan waktu.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Jalankan'
    }).then((res) => {
        if(res.isConfirmed) {
            const now = new Date();
            const threshold = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
            
            let count = 0;
            const keptUsers = [];
            users.forEach(u => {
                const entryTime = new Date(u.waktuMasuk);
                if(entryTime < threshold) {
                    u.deletedAt = new Date().toISOString();
                    trash.push(u);
                    count++;
                } else {
                    keptUsers.push(u);
                }
            });
            
            users = keptUsers;
            saveUsers();
            saveTrash();
            renderTablePasien();
            updateCountSampah();
            Swal.fire('Selesai', `${count} data lawas dibersihkan.`, 'success');
        }
    });
}

function exportToCSV() {
    if(users.length === 0) return Swal.fire('Info', 'Tidak ada data untuk diekspor.', 'info');
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Waktu,Nama,Jenis Kelamin,Ruang,Materi,Skor Pre,Skor Post,Kepuasan\n";
    
    users.forEach(u => {
        const row = [
            `"${new Date(u.waktuMasuk).toLocaleString('id-ID')}"`,
            `"${u.nama}"`,
            `"${u.gender}"`,
            `"${u.ruang}"`,
            `"${u.materiJudul}"`,
            u.skorPre,
            u.skorPost,
            `"${u.kepuasan}"`
        ].join(",");
        csvContent += row + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "data_pasien_panda_" + new Date().toISOString().slice(0,10) + ".csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- TAB SAMPAH ---
function updateCountSampah() {
    document.getElementById('count-sampah').innerText = trash.length;
}
function renderTableSampah() {
    updateCountSampah();
    const tbody = document.getElementById('table-sampah-body');
    tbody.innerHTML = '';
    
    if(trash.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-slate-400 text-xs">Tempat sampah kosong.</td></tr>';
        return;
    }
    
    trash.forEach(u => {
        const time = new Date(u.deletedAt).toLocaleString('id-ID');
        tbody.innerHTML += `
            <tr class="border-b border-slate-50">
                <td class="p-4 text-xs font-bold text-red-400">${time}</td>
                <td class="p-4 font-bold text-slate-700">${u.nama}</td>
                <td class="p-4 text-xs text-slate-500">${u.materiJudul}</td>
                <td class="p-4 text-center">
                    <button onclick="restorePasien(${u.id})" class="text-green-500 hover:text-green-700 font-bold text-xs uppercase bg-green-50 px-3 py-1 rounded-lg">Pulihkan</button>
                </td>
            </tr>
        `;
    });
}

function restorePasien(id) {
    const idx = trash.findIndex(u => u.id === id);
    if(idx !== -1) {
        const restored = trash.splice(idx, 1)[0];
        delete restored.deletedAt;
        users.push(restored);
        saveUsers();
        saveTrash();
        renderTableSampah();
        Swal.fire('Dipulihkan', 'Data dikembalikan ke daftar pasien.', 'success');
    }
}

function kosongkanSampah() {
    if(trash.length === 0) return;
    Swal.fire({
        title: 'Kosongkan Sampah?',
        text: "Data akan hilang selamanya!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, Musnahkan!'
    }).then((res) => {
        if(res.isConfirmed) {
            trash = [];
            saveTrash();
            renderTableSampah();
            Swal.fire('Bersih', 'Tempat sampah telah dikosongkan.', 'success');
        }
    });
}

// --- TAB MATERI (ADMIN) ---
function renderGridMateriAdmin() {
    const grid = document.getElementById('grid-materi-admin');
    grid.innerHTML = '';
    
    Object.keys(db).forEach(cat => {
        db[cat].forEach(m => {
            grid.innerHTML += `
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition relative group">
                    <span class="absolute top-4 right-4 bg-blue-100 text-blue-600 text-[9px] font-black px-2 py-1 rounded uppercase">${cat}</span>
                    <h4 class="font-bold text-slate-800 mb-2 pr-12">${m.judul}</h4>
                    <p class="text-xs text-slate-400 mb-4 truncate">${m.teks || 'Tidak ada deskripsi'}</p>
                    <div class="flex gap-2 border-t pt-4">
                        <button onclick="editMateri('${cat}', '${m.id}')" class="flex-1 py-2 rounded-lg bg-slate-50 text-slate-600 text-[10px] font-bold hover:bg-blue-50 hover:text-blue-600 transition"><i class="fa-solid fa-pen"></i> EDIT</button>
                        <button onclick="hapusMateri('${cat}', '${m.id}')" class="flex-1 py-2 rounded-lg bg-slate-50 text-slate-600 text-[10px] font-bold hover:bg-red-50 hover:text-red-600 transition"><i class="fa-solid fa-trash"></i> HAPUS</button>
                    </div>
                </div>
            `;
        });
    });
}

function editMateri(cat, id) {
    const m = db[cat].find(x => x.id === id);
    if(!m) return;
    
    document.getElementById('form-title').innerHTML = '<i class="fa-solid fa-pen-to-square text-blue-600"></i> Edit Materi';
    document.getElementById('edit-id').value = m.id;
    document.getElementById('editKategori').value = cat;
    document.getElementById('editJudul').value = m.judul;
    document.getElementById('editTeks').value = m.teks || '';
    document.getElementById('editYt').value = m.yt || '';
    
    document.getElementById('modal-form').classList.remove('hidden');
}

function openFormMateri() {
    document.getElementById('form-title').innerHTML = '<i class="fa-solid fa-plus-circle text-blue-600"></i> Tambah Materi';
    document.getElementById('edit-id').value = '';
    ['editKategori', 'editJudul', 'editTeks', 'editVideoFile', 'audioIndo', 'audioJepang', 'audioInggris', 'audioBali', 'editYt'].forEach(id => {
        document.getElementById(id).value = "";
    });
    document.getElementById('modal-form').classList.remove('hidden');
}

function closeModalForm() {
    document.getElementById('modal-form').classList.add('hidden');
}

function simpanMateri() {
    const id = document.getElementById('edit-id').value;
    const cat = document.getElementById('editKategori').value.trim().toUpperCase();
    const judul = document.getElementById('editJudul').value.trim();
    const teks = document.getElementById('editTeks').value;
    const ytLink = document.getElementById('editYt').value;

    if(!cat || !judul) return Swal.fire('Error', 'Kategori dan Judul wajib diisi!', 'error');
    if(!db[cat]) db[cat] = [];

    // Cek materi existing
    const currentMateri = id ? db[cat].find(x => x.id === id) : null;
    
    // File Inputs (Handle Object URL for prototype)
    const vFile = document.getElementById('editVideoFile').files[0];
    const aIndo = document.getElementById('audioIndo').files[0];
    const aBali = document.getElementById('audioBali').files[0];
    const aInggris = document.getElementById('audioInggris').files[0];
    const aJepang = document.getElementById('audioJepang').files[0];

    const materiData = {
        id: id || 'm_' + Date.now(),
        judul: judul,
        teks: teks,
        yt: ytLink || (currentMateri ? currentMateri.yt : ''),
        // Note: For real app, use backend upload. Here we use Blob URL for session or existing data.
        // Persistence Issue: Blob URLs expire on reload. 
        // fallback to keep existing if not changed, else use fake path or empty for static site limitation
        localVideo: vFile ? URL.createObjectURL(vFile) : (currentMateri ? currentMateri.localVideo : null),
        customAudio: {
            indo: aIndo ? URL.createObjectURL(aIndo) : (currentMateri?.customAudio?.indo || null),
            bali: aBali ? URL.createObjectURL(aBali) : (currentMateri?.customAudio?.bali || null),
            inggris: aInggris ? URL.createObjectURL(aInggris) : (currentMateri?.customAudio?.inggris || null),
            jepang: aJepang ? URL.createObjectURL(aJepang) : (currentMateri?.customAudio?.jepang || null),
        },
        soal: currentMateri ? currentMateri.soal : []
    };

    if(id) {
        // Update existing (check if category changed handling needed? simplified here assuming same cat)
        const idx = db[cat].findIndex(x => x.id === id);
        if(idx !== -1) db[cat][idx] = materiData;
        else db[cat].push(materiData); // Should not happen if id exists
    } else {
        db[cat].push(materiData);
    }

    saveDB();
    closeModalForm();
    renderGridMateriAdmin();
    renderDiagnosaGrid(); // Update front view too
    Swal.fire('Tersimpan', 'Data materi berhasil disimpan.', 'success');
}

function hapusMateri(cat, id) {
    Swal.fire({
        title: 'Hapus Materi?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33'
    }).then((res) => {
        if(res.isConfirmed) {
            db[cat] = db[cat].filter(m => m.id !== id);
            if(db[cat].length === 0) delete db[cat];
            saveDB();
            renderGridMateriAdmin();
            renderDiagnosaGrid();
            Swal.fire('Terhapus', 'Materi dihapus.', 'success');
        }
    });
}

// --- TAB SOAL (ADMIN) ---
function renderListSoalAdmin() {
    const list = document.getElementById('list-soal-admin');
    list.innerHTML = '';
    
    Object.keys(db).forEach(cat => {
        db[cat].forEach(m => {
            list.innerHTML += `
                <div class="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:bg-slate-50 transition">
                    <div class="flex items-center gap-4">
                        <div class="bg-blue-100 text-blue-600 font-bold px-3 py-1 rounded text-xs">${cat}</div>
                        <div>
                            <h4 class="font-bold text-slate-700 text-sm">${m.judul}</h4>
                            <p class="text-[10px] text-slate-400">${m.soal ? m.soal.length : 0} Pertanyaan</p>
                        </div>
                    </div>
                    <button onclick="openEditSoal('${cat}', '${m.id}')" class="bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-700">KELOLA SOAL</button>
                </div>
            `;
        });
    });
}

function openEditSoal(cat, id) {
    currentEditSoal = { cat, id };
    const m = db[cat].find(x => x.id === id);
    const container = document.getElementById('list-edit-soal');
    
    container.innerHTML = `
        <div class="sticky top-0 bg-slate-50 z-20 pb-4 border-b mb-4">
            <button onclick="tambahBarisSoal()" class="w-full p-4 bg-white text-blue-600 border-2 border-dashed border-blue-200 rounded-2xl font-black text-xs hover:bg-blue-50 transition flex items-center justify-center gap-2">
                <i class="fa-solid fa-plus-circle text-lg"></i> TAMBAH PERTANYAAN BARU
            </button>
        </div>
        <div id="wrapper-soal" class="space-y-4 pt-2"></div>
    `;

    const wrapper = document.getElementById('wrapper-soal');
    
    if(m.soal && m.soal.length > 0) {
        m.soal.forEach(s => {
            wrapper.insertAdjacentHTML('beforeend', buatTemplateSoal(s.q, s.a[0], s.a[1], s.c));
        });
    } else {
        tambahBarisSoal(); 
    }

    document.getElementById('modal-soal').classList.remove('hidden');
}

function buatTemplateSoal(q = '', a0 = '', a1 = '', c = 0) {
    return `
        <div class="soal-item p-5 bg-white rounded-2xl border border-slate-200 relative shadow-sm group">
            <button onclick="this.parentElement.remove()" class="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow hover:bg-red-600 transition z-10">
                <i class="fa-solid fa-times text-[10px]"></i>
            </button>
            <div class="mb-3">
                <input type="text" value="${q}" placeholder="Pertanyaan..." class="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-100 soal-q">
            </div>
            <div class="grid grid-cols-2 gap-3 mb-3">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-400">A.</span>
                    <input type="text" value="${a0}" placeholder="Opsi A" class="w-full p-2 bg-slate-50 border-none rounded-lg text-xs soal-a0">
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-400">B.</span>
                    <input type="text" value="${a1}" placeholder="Opsi B" class="w-full p-2 bg-slate-50 border-none rounded-lg text-xs soal-a1">
                </div>
            </div>
            <div class="flex items-center gap-2 bg-green-50 p-2 rounded-lg">
                <span class="text-[10px] font-bold text-green-700 uppercase">Kunci Jawaban:</span>
                <select class="bg-transparent text-xs font-bold text-green-700 outline-none soal-c cursor-pointer">
                    <option value="0" ${c === 0 ? 'selected' : ''}>Opsi A</option>
                    <option value="1" ${c === 1 ? 'selected' : ''}>Opsi B</option>
                </select>
            </div>
        </div>`;
}

function tambahBarisSoal() {
    const wrapper = document.getElementById('wrapper-soal');
    wrapper.insertAdjacentHTML('afterbegin', buatTemplateSoal());
}

function simpanSemuaSoal() {
    const { cat, id } = currentEditSoal;
    const m = db[cat].find(x => x.id === id);
    const items = document.querySelectorAll('.soal-item');
    
    const kumpulanSoalBaru = [];
    items.forEach(item => {
        const q = item.querySelector('.soal-q').value.trim();
        const a0 = item.querySelector('.soal-a0').value.trim();
        const a1 = item.querySelector('.soal-a1').value.trim();
        const c = parseInt(item.querySelector('.soal-c').value);
        
        if(q !== "") {
            kumpulanSoalBaru.push({ q, a: [a0, a1], c });
        }
    });

    m.soal = kumpulanSoalBaru;
    saveDB();
    document.getElementById('modal-soal').classList.add('hidden');
    renderListSoalAdmin();
    Swal.fire('Berhasil', 'Bank soal diperbarui!', 'success');
}
