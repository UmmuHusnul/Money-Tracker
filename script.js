let viewDate = new Date();
let transactions = [];
let initialBalances = { cash: 0, bank: 0, qris: 0 };
let myChart;

const categories = {
    income: ['Gaji', 'Bonus', 'Pemberian', 'Penjualan'],
    expense: ['Makanan', 'Transportasi', 'Belanja', 'Hiburan', 'Investasi', 'Tagihan', 'Lainnya']
};

// --- CORE LOGIC ---

function init() {
    updateMonthDisplay();
    loadMonthData();
    updateCategoryOptions();
    calculateBalances();
    renderList();
}

function loadMonthData() {
    const monthKey = getMonthKey(viewDate);
    transactions = JSON.parse(localStorage.getItem(`nunu_trans_${monthKey}`)) || [];
    initialBalances = JSON.parse(localStorage.getItem(`nunu_init_${monthKey}`));

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
        // Jika benar-benar baru, tampilkan modal
        document.getElementById('setup-modal').style.display = 'flex';
    }
}

function saveInitialBalance() {
    const cash = parseFloat(document.getElementById('init-cash').value) || 0;
    const bank = parseFloat(document.getElementById('init-bank').value) || 0;
    const qris = parseFloat(document.getElementById('init-qris').value) || 0;

    initialBalances = { cash, bank, qris };
    localStorage.setItem(`money_init_${getMonthKey(viewDate)}`, JSON.stringify(initialBalances));
    document.getElementById('setup-modal').style.display = 'none';
    init();
}

// --- UI UPDATES ---

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

// --- EVENTS ---

document.getElementById('transaction-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const trans = {
        id: Date.now(),
        type: document.querySelector('input[name="transaction-type"]:checked').value,
        amount: parseFloat(document.getElementById('amount').value),
        wallet: document.getElementById('wallet-type').value,
        category: document.getElementById('category').value,
        date: document.getElementById('date').value,
        note: document.getElementById('note').value
    };
    transactions.push(trans);
    localStorage.setItem(`money_trans_${getMonthKey(viewDate)}`, JSON.stringify(transactions));
    e.target.reset();
    updateCategoryOptions();
    init();
});

document.querySelectorAll('input[name="transaction-type"]').forEach(r => {
    r.addEventListener('change', updateCategoryOptions);
});

function deleteTransaction(id) {
    if(confirm('Hapus transaksi?')) {
        transactions = transactions.filter(t => t.id !== id);
        localStorage.setItem(`money_trans_${getMonthKey(viewDate)}`, JSON.stringify(transactions));
        init();
    }
}

function changeMonth(offset) {
    viewDate.setMonth(viewDate.getMonth() + offset);
    init();
}

// --- UTILS ---

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
    a.href = url; a.download = `MoneyTracker_${getMonthKey(viewDate)}.csv`;
    a.click();
}

init();