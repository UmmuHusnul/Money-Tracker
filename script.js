let viewDate = new Date();
let transactions = [];
let initialBalances = null;
let myChart;

const categories = {
    income: ['Gaji', 'Bonus', 'Pemberian', 'Penjualan', 'Lainnya'],
    expense: ['Makanan', 'Transportasi', 'Belanja', 'Hiburan', 'Investasi', 'Tagihan', 'Lainnya']
};

const toggleSwitch = document.querySelector('#checkbox');
const currentTheme = localStorage.getItem('theme');

if (currentTheme) {
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'dark') {
        toggleSwitch.checked = true;
        document.querySelector('.mode-icon').textContent = '🌙';
    }
}

toggleSwitch.addEventListener('change', (e) => {
    if (e.target.checked) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        document.querySelector('.mode-icon').textContent = '🌙';
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
        document.querySelector('.mode-icon').textContent = '☀️';
    }
});


function init() {
    updateMonthDisplay();
    loadMonthData();
    updateCategoryOptions();
    calculateBalances();
    renderList();
}

function loadMonthData() {
    const monthKey = getMonthKey(viewDate);
    transactions = JSON.parse(localStorage.getItem(`money_trans_${monthKey}`)) || [];
    initialBalances = JSON.parse(localStorage.getItem(`money_init_${monthKey}`));

    if (!initialBalances) {
        handleMonthTransition();
    }
}

function handleMonthTransition() {
    const lastMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    const lastMonthKey = getMonthKey(lastMonth);
    const prevTrans = JSON.parse(localStorage.getItem(`money_trans_${lastMonthKey}`)) || [];
    const prevInit = JSON.parse(localStorage.getItem(`money_init_${lastMonthKey}`));

    if (prevInit) {
        let carryOver = { ...prevInit };
        prevTrans.forEach(t => {
            const val = t.type === 'income' ? t.amount : -t.amount;
            carryOver[t.wallet] += val;
        });
        initialBalances = carryOver;
        localStorage.setItem(`money_init_${getMonthKey(viewDate)}`, JSON.stringify(initialBalances));
    } else {
        document.getElementById('setup-modal').style.display = 'flex';
    }
}

function saveInitialBalance() {
    // Otomatis 0 jika kosong
    const cash = parseFloat(document.getElementById('init-cash').value) || 0;
    const bank = parseFloat(document.getElementById('init-bank').value) || 0;
    const qris = parseFloat(document.getElementById('init-qris').value) || 0;

    const key = getMonthKey(viewDate);
    initialBalances = { cash, bank, qris };
    localStorage.setItem(`money_init_${key}`, JSON.stringify(initialBalances));
    
    document.getElementById('setup-modal').style.display = 'none';
    init();
}

function updateCategoryOptions() {
    const type = document.querySelector('input[name="transaction-type"]:checked').value;
    const select = document.getElementById('category');
    select.innerHTML = '<option value="">Pilih Kategori</option>';
    categories[type].forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat; opt.textContent = cat;
        select.appendChild(opt);
    });
}

function calculateBalances() {
    if (!initialBalances) return;
    const totals = { income: 0, expense: 0, cash: initialBalances.cash, bank: initialBalances.bank, qris: initialBalances.qris };

    transactions.forEach(t => {
        const val = t.type === 'income' ? t.amount : -t.amount;
        if (t.type === 'income') totals.income += t.amount;
        else totals.expense += t.amount;
        totals[t.wallet] += val;
    });

    const grandTotal = totals.cash + totals.bank + totals.qris;
    document.getElementById('total-balance').innerText = `Rp ${grandTotal.toLocaleString()}`;
    document.getElementById('total-income').innerText = `Rp ${totals.income.toLocaleString()}`;
    document.getElementById('total-expense').innerText = `Rp ${totals.expense.toLocaleString()}`;
    document.getElementById('wallet-cash').innerText = `Rp ${totals.cash.toLocaleString()}`;
    document.getElementById('wallet-bank').innerText = `Rp ${totals.bank.toLocaleString()}`;
    document.getElementById('wallet-qris').innerText = `Rp ${totals.qris.toLocaleString()}`;

    updateChart(totals.income, totals.expense);
}

function renderList() {
    const list = document.getElementById('transaction-list');
    list.innerHTML = '';
    [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(t => {
        const li = document.createElement('li');
        li.className = `transaction-item ${t.type}`;
        li.innerHTML = `
            <div>
                <strong>${t.category}</strong> <span class="wallet-badge">${t.wallet}</span> <br>
                <small>${t.date} ${t.note ? '• ' + t.note : ''}</small>
            </div>
            <div style="text-align:right">
                <span style="font-weight:600">${t.type === 'income' ? '+' : '-'} ${t.amount.toLocaleString()}</span> <br>
                <button class="delete-btn" onclick="deleteTransaction(${t.id})">&times;</button>
            </div>
        `;
        list.appendChild(li);
    });
}

document.getElementById('transaction-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const amountInput = document.getElementById('amount');
    const categorySelect = document.getElementById('category');
    const walletSelect = document.getElementById('wallet-type');

    if (parseFloat(amountInput.value) <= 0 || !categorySelect.value || !walletSelect.value) {
        alert("Mohon isi semua data dengan benar!");
        return;
    }

    const trans = {
        id: Date.now(),
        type: document.querySelector('input[name="transaction-type"]:checked').value,
        amount: parseFloat(amountInput.value),
        wallet: walletSelect.value,
        category: categorySelect.value,
        date: document.getElementById('date').value,
        note: document.getElementById('note').value
    };

    transactions.push(trans);
    localStorage.setItem(`money_trans_${getMonthKey(viewDate)}`, JSON.stringify(transactions));
    
    amountInput.value = '';
    document.getElementById('note').value = '';
    
    init();
});
document.querySelectorAll('input[name="transaction-type"]').forEach(r => {
    r.addEventListener('change', updateCategoryOptions);
});

function deleteTransaction(id) {
    const modal = document.getElementById('delete-modal');
    modal.style.display = 'flex'; 
    
    document.getElementById('confirm-delete-btn').onclick = function() {
        transactions = transactions.filter(t => t.id !== id);
        localStorage.setItem(`money_trans_${getMonthKey(viewDate)}`, JSON.stringify(transactions));
        closeDeleteModal();
        init();
    };
}

function closeDeleteModal() {
    document.getElementById('delete-modal').style.display = 'none';
}

function changeMonth(offset) {
    viewDate.setMonth(viewDate.getMonth() + offset);
    init();
}

function getMonthKey(date) {
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}_${date.getFullYear()}`;
}

function updateMonthDisplay() {
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    document.getElementById('month-display').innerText = `${months[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
}

function updateChart(inc, exp) {
    const ctx = document.getElementById('transactionChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Masuk', 'Keluar'],
            datasets: [{ data: [inc, exp], backgroundColor: ['#00b894', '#d63031'], borderWeight: 0 }]
        },
        options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
}

function exportToCSV() {
    if (transactions.length === 0) return alert("Data kosong!");
    let csv = "Tanggal,Tipe,Kategori,Dompet,Jumlah,Catatan\n";
    transactions.forEach(t => csv += `${t.date},${t.type},${t.category},${t.wallet},${t.amount},"${t.note}"\n`);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `NunuTracker_${getMonthKey(viewDate)}.csv`;
    a.click();
}

window.onclick = function(event) {
    const setupModal = document.getElementById('setup-modal');
    const deleteModal = document.getElementById('delete-modal');
    
    if (event.target == setupModal) {
    }
    if (event.target == deleteModal) {
        closeDeleteModal();
    }
}

init();