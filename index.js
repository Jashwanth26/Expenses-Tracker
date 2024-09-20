import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getDatabase, ref, push, get, child, remove } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

const appSettings = {
    databaseURL: "https://expense-tracker-2bfc6-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const app = initializeApp(appSettings);
const database = getDatabase(app);
const transactionsInDB = ref(database, "transactions");

document.getElementById("transaction-form").addEventListener("submit", function (event) {
    event.preventDefault();
    const transname = document.getElementById("transaction-name").value;
    const transamount = parseFloat(document.getElementById("transaction-amount").value);
    const transdate = document.getElementById("transaction-date").value;
    const transcategory = document.getElementById("transaction-category").value;

    if (transname && transamount && transdate && transcategory) {
        let transaction = {
            id: Date.now(),
            name: transname,
            amount: transamount,
            date: transdate,
            category: transcategory
        };

        // Save transaction to sessionStorage
        saveTransaction(transaction);

        // Save transaction to Firebase
        push(transactionsInDB, transaction);

        // Add transaction to the list
        addTransactionToList(transaction);

        // Reset form fields
        document.getElementById("transaction-name").value = '';
        document.getElementById("transaction-amount").value = '';
        document.getElementById("transaction-date").value = '';
        document.getElementById("transaction-category").value = '';
    } else {
        console.log("Please fill out all fields.");
    }
});

function saveTransaction(transaction) {
    let transactions = JSON.parse(sessionStorage.getItem('transactions')) || [];
    transactions.push(transaction);
    sessionStorage.setItem('transactions', JSON.stringify(transactions));
}

function addTransactionToList(transaction) {
    const translist = document.getElementById("transaction-list");

    let newEl = document.createElement("li");
    newEl.setAttribute("data-id", transaction.id);
    newEl.innerHTML = `${transaction.date} - ${transaction.name} - $${transaction.amount} (${transaction.category}) <button class="delete-transaction">Delete</button>`;

    translist.appendChild(newEl);

    newEl.querySelector(".delete-transaction").addEventListener("click", function () {
        removeTransactionFromList(transaction.id);
    });
}

function removeTransactionFromList(id) {
    const translist = document.getElementById("transaction-list");
    const transactionItem = translist.querySelector(`[data-id='${id}']`);
    translist.removeChild(transactionItem);

    let transactions = JSON.parse(sessionStorage.getItem('transactions')) || [];
    transactions = transactions.filter(transaction => transaction.id !== id);
    sessionStorage.setItem('transactions', JSON.stringify(transactions));
}

document.getElementById("clear-transactions").addEventListener("click", function () {
    const translist = document.getElementById("transaction-list");
    translist.innerHTML = '';
});

document.getElementById("view-summary").addEventListener("click", function () {
    populateYearSelect();
    document.getElementById("summary-container").style.display = 'flex';
});

function populateYearSelect() {
    let transactions = JSON.parse(sessionStorage.getItem('transactions')) || [];
    let years = new Set(transactions.map(transaction => new Date(transaction.date).getFullYear()));

    let yearSelect = document.getElementById("year-select");
    yearSelect.innerHTML = "<option value='' disabled selected>Select Year</option>";
    years.forEach(year => {
        let option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });

    yearSelect.addEventListener("change", populateMonthSelect);
}

function populateMonthSelect() {
    let transactions = JSON.parse(sessionStorage.getItem('transactions')) || [];
    let selectedYear = document.getElementById("year-select").value;
    let months = new Set(transactions.filter(transaction => new Date(transaction.date).getFullYear() == selectedYear)
                                            .map(transaction => new Date(transaction.date).getMonth() + 1));

    let monthSelect = document.getElementById("month-select");
    monthSelect.innerHTML = "<option value='' disabled selected>Select Month</option>";
    months.forEach(month => {
        let option = document.createElement("option");
        option.value = month;
        option.textContent = month;
        monthSelect.appendChild(option);
    });

    monthSelect.addEventListener("change", generateSummary);
}

function generateSummary() {
    let transactions = JSON.parse(sessionStorage.getItem('transactions')) || [];
    let selectedYear = document.getElementById("year-select").value;
    let selectedMonth = document.getElementById("month-select").value;

    let filteredTransactions = transactions.filter(transaction => {
        let date = new Date(transaction.date);
        return date.getFullYear() == selectedYear && (date.getMonth() + 1) == selectedMonth;
    });

    let summaryTableContainer = document.getElementById("summary-table-container");
    summaryTableContainer.innerHTML = '';

    if (filteredTransactions.length > 0) {
        let table = document.createElement("table");
        let thead = document.createElement("thead");
        let tbody = document.createElement("tbody");

        let headerRow = document.createElement("tr");
        ["Date", "Name", "Amount", "Category"].forEach(text => {
            let th = document.createElement("th");
            th.textContent = text;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        let categoryTotals = {
            food: 0,
            groceries: 0,
            transport: 0,
            entertainment: 0,
            other: 0
        };
        let totalAmount = 0;

        filteredTransactions.forEach(transaction => {
            let row = document.createElement("tr");
            ["date", "name", "amount", "category"].forEach(key => {
                let td = document.createElement("td");
                td.textContent = transaction[key];
                row.appendChild(td);
            });
            tbody.appendChild(row);

            categoryTotals[transaction.category] += transaction.amount;
            totalAmount += transaction.amount;
        });

        table.appendChild(thead);
        table.appendChild(tbody);
        summaryTableContainer.appendChild(table);

        let summaryDiv = document.createElement("div");
        summaryDiv.innerHTML = `
            <p>Food: $${categoryTotals.food.toFixed(2)}</p>
            <p>Groceries: $${categoryTotals.groceries.toFixed(2)}</p>
            <p>Transport: $${categoryTotals.transport.toFixed(2)}</p>
            <p>Entertainment: $${categoryTotals.entertainment.toFixed(2)}</p>
            <p>Other: $${categoryTotals.other.toFixed(2)}</p>
            <p>Total: $${totalAmount.toFixed(2)}</p>
            <button id="download-summary">Download Summary</button>
        `;
        summaryTableContainer.appendChild(summaryDiv);

        document.getElementById("download-summary").addEventListener("click", function () {
            const jsPDF = window.jspdf.jsPDF;
            const doc = new jsPDF();

            doc.text(`Summary for ${selectedYear}-${selectedMonth}`, 10, 10);

            let rows = filteredTransactions.map(transaction => [
                transaction.date,
                transaction.name,
                `$${transaction.amount.toFixed(2)}`,
                transaction.category
            ]);

            doc.autoTable({
                head: [['Date', 'Name', 'Amount', 'Category']],
                body: rows
            });

            doc.text(`Food: $${categoryTotals.food.toFixed(2)}`, 10, doc.autoTable.previous.finalY + 10);
            doc.text(`Groceries: $${categoryTotals.groceries.toFixed(2)}`, 10, doc.autoTable.previous.finalY + 20);
            doc.text(`Transport: $${categoryTotals.transport.toFixed(2)}`, 10, doc.autoTable.previous.finalY + 30);
            doc.text(`Entertainment: $${categoryTotals.entertainment.toFixed(2)}`, 10, doc.autoTable.previous.finalY + 40);
            doc.text(`Other: $${categoryTotals.other.toFixed(2)}`, 10, doc.autoTable.previous.finalY + 50);
            doc.text(`Total: $${totalAmount.toFixed(2)}`, 10, doc.autoTable.previous.finalY + 60);

            doc.save('summary.pdf');
        });
    } else {
        summaryTableContainer.innerHTML = '<p>No transactions found for the selected year and month.</p>';
    }
} 