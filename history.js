document.addEventListener("DOMContentLoaded", function () {
    let historyList = document.getElementById("history-list");
    let transactions = JSON.parse(localStorage.getItem('transactions')) || [];

    transactions.forEach(transaction => {
        let newEl = document.createElement("li");
        newEl.textContent = `${transaction.date} - ${transaction.name} - $${transaction.amount} (${transaction.category})`;
        historyList.appendChild(newEl);
    });
});
