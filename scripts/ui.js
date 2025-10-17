/* scripts/ui.js - UI rendering and app methods
   Responsibilities: define window.App.init and window.App.render plus helper render functions.
   Uses jQuery for DOM updates. Exposes App.addTransaction, App.removeTransaction.
*/
(function(){
  'use strict';
  window.App = window.App || {};

  // Application state held in memory and persisted via Storage helpers
  const state = {
    data: { transactions: [] },
    filtered: []
  };

  // Utility: safely parse numeric input
  function toNumber(v){
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  // Prepare months filter options
  function uniqueMonths(transactions){
    const months = {};
    transactions.forEach(t => {
      const key = t.date.slice(0,7);
      months[key] = true;
    });
    return Object.keys(months).sort().reverse();
  }

  // Render transactions table rows
  function renderTxTable(){
    const $body = $('#txBody');
    $body.empty();
    const items = state.filtered.length ? state.filtered : state.data.transactions.slice().sort((a,b)=> new Date(b.date)-new Date(a.date));
    if (!items.length) {
      $body.append('<tr><td colspan="6" class="py-6 text-center text-gray-500">No transactions yet</td></tr>');
      return;
    }

    items.forEach(t => {
      const amountClass = t.type === 'income' ? 'text-red-600' : 'text-gray-700';
      const $row = $(`<tr data-id="${t.id}">
        <td class="text-sm text-gray-600">${t.date}</td>
        <td><span class="chip ${t.type==='income' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-700'}">${t.type}</span></td>
        <td class="text-sm">${t.category}</td>
        <td class="text-right font-medium ${amountClass}">${window.App.Storage.formatCurrency(t.amount)}</td>
        <td class="text-sm">${t.note || ''}</td>
        <td class="text-center"><button class="action-btn text-sm text-red-600 px-3 py-1 remove-btn" aria-label="Remove transaction">Remove</button></td>
      </tr>`);

      $body.append($row);
    });
  }

  // Render quick totals and balance
  function renderTotals(){
    let income = 0, expense = 0;
    state.data.transactions.forEach(t => {
      if (t.type === 'income') income += toNumber(t.amount);
      else expense += toNumber(t.amount);
    });
    const balance = income - expense;
    $('#totalIncome').text(window.App.Storage.formatCurrency(income));
    $('#totalExpense').text(window.App.Storage.formatCurrency(expense));
    $('#balance').text(window.App.Storage.formatCurrency(balance));

    // color balance
    if (balance < 0) $('#balance').removeClass('text-gray-800').addClass('text-red-600');
    else $('#balance').removeClass('text-red-600').addClass('text-gray-800');
  }

  // Render month filter options
  function renderMonthFilter(){
    const months = uniqueMonths(state.data.transactions);
    const $sel = $('#filterMonth');
    $sel.find('option[value!="all"]').remove();
    months.forEach(m => {
      const opt = $('<option/>').attr('value', m).text(m);
      $sel.append(opt);
    });
  }

  // Build a simple bar chart (SVG) for monthly incomes and expenses
  function renderBarChart(){
    const byMonth = {};
    state.data.transactions.forEach(t => {
      const key = t.date.slice(0,7);
      byMonth[key] = byMonth[key] || { income: 0, expense: 0 };
      byMonth[key][t.type] += toNumber(t.amount);
    });
    const months = Object.keys(byMonth).sort();
    const maxValue = months.reduce((m, key) => Math.max(m, byMonth[key].income + byMonth[key].expense), 0) || 100;

    const svgParts = [];
    const w = 100; // per column
    const gap = 12;
    const width = months.length * (w + gap);
    const height = 120;
    const viewBox = `0 0 ${Math.max(width, 300)} ${height}`;

    let x = 0;
    months.forEach(key => {
      const total = byMonth[key].income + byMonth[key].expense;
      const h = Math.round((total / maxValue) * (height - 30));
      const incomeH = Math.round((byMonth[key].income / Math.max(total,1)) * h);
      const expenseH = h - incomeH;

      // expense at bottom
      const expenseY = height - expenseH - 10;
      const incomeY = expenseY - incomeH;

      // expense bar
      svgParts.push(`<rect x="${x}" y="${expenseY}" width="${w}" height="${expenseH}" rx="6" fill="#fca5a5" />`);
      // income bar
      svgParts.push(`<rect x="${x}" y="${incomeY}" width="${w}" height="${incomeH}" rx="6" fill="#dc2626" />`);
      // label
      svgParts.push(`<text x="${x + w/2}" y="${height}" font-size="11" fill="#6b7280" text-anchor="middle">${key.slice(5)}</text>`);

      x += w + gap;
    });

    const svg = `<svg viewBox=\"${viewBox}\" class=\"w-full h-full\">${svgParts.join('')}</svg>`;
    $('#barChart').html(svg);
  }

  // Render category breakdown list
  function renderCategoryList(){
    const byCat = {};
    state.data.transactions.forEach(t => {
      if (!byCat[t.category]) byCat[t.category] = 0;
      byCat[t.category] += toNumber(t.amount) * (t.type === 'expense' ? 1 : -1) * -1; // produce spending numbers positive for expenses
    });
    const entries = Object.keys(byCat).map(k => ({ k, v: Math.abs(byCat[k]) })).sort((a,b)=>b.v-a.v);
    const $list = $('#categoryList').empty();
    if (!entries.length) { $list.append('<div class="text-sm text-gray-500">No categories yet</div>'); return; }
    entries.forEach(e => {
      const el = $(`<div class="flex items-center justify-between"><div class="text-sm">${e.k}</div><div class="text-sm font-medium">${window.App.Storage.formatCurrency(e.v)}</div></div>`);
      $list.append(el);
    });
  }

  // Apply filters from inputs
  function applyFilters(){
    const qRaw = $('#search').val();
    const q = (typeof qRaw === 'string' ? qRaw : '').trim().toLowerCase();
    const month = $('#filterMonth').length ? $('#filterMonth').val() : 'all';
    state.filtered = state.data.transactions.filter(t => {
      if (month !== 'all' && t.date.slice(0,7) !== month) return false;
      if (!q) return true;
      return (t.note || '').toLowerCase().includes(q) || (t.category || '').toLowerCase().includes(q);
    });
  }

  // Public: add transaction
  window.App.addTransaction = function(trans){
    try {
      const data = state.data;
      trans.id = window.App.Storage.getNextId(data.transactions);
      data.transactions.push(trans);
      window.App.Storage.save(data);
      state.data = data;
      applyFilters();
      window.App.render();
      return true;
    } catch (e) {
      console.error('addTransaction failed', e);
      return false;
    }
  };

  // Public: remove transaction
  window.App.removeTransaction = function(id){
    const data = state.data;
    const idx = data.transactions.findIndex(t => t.id === id);
    if (idx === -1) return false;
    data.transactions.splice(idx,1);
    window.App.Storage.save(data);
    state.data = data;
    applyFilters();
    window.App.render();
    return true;
  };

  // Init - bind events
  window.App.init = function(){
    try {
      // load data and seed if empty
      state.data = window.App.Storage.seedIfEmpty();
      applyFilters();

      // Set default date to today
      const now = new Date();
      const iso = now.toISOString().slice(0,10);
      $('#date').val(iso);

      // Type toggle
      $(document).on('click', '.type-btn', function(){
        $('.type-btn').removeClass('bg-red-50 text-red-600 border-red-100').addClass('bg-white text-gray-700 border-gray-200');
        $(this).removeClass('bg-white text-gray-700 border-gray-200').addClass('bg-red-50 text-red-600 border-red-100');
      });

      // Add transaction
      $('#txForm').on('submit', function(e){
        e.preventDefault();
        const type = $('.type-btn.bg-red-50').data('type') || 'income';
        const data = {
          type: type,
          category: $('#category').val(),
          amount: parseFloat($('#amount').val() || 0),
          date: $('#date').val(),
          note: $('#note').val() || ''
        };
        // basic validation
        if (!data.amount || data.amount <= 0) {
          alert('Please enter an amount greater than zero.');
          return;
        }
        if (!data.date) {
          alert('Please select a date.');
          return;
        }
        window.App.addTransaction(data);
        // animate success
        const $btn = $('#addTx');
        $btn.prop('disabled', true).text('Added');
        setTimeout(()=>{ $btn.prop('disabled', false).text('Add Transaction'); }, 800);
        $('#amount').val(''); $('#note').val('');
      });

      $('#clearForm').on('click', function(){
        $('#amount').val(''); $('#note').val(''); $('.type-btn').removeClass('bg-red-50 text-red-600 border-red-100').first().addClass('bg-red-50 text-red-600 border-red-100');
      });

      // Remove
      $(document).on('click', '.remove-btn', function(){
        const id = Number($(this).closest('tr').data('id'));
        if (!confirm('Remove this transaction?')) return;
        window.App.removeTransaction(id);
      });

      // search and filter
      $('#search').on('input', function(){ applyFilters(); window.App.render(); });
      $('#filterMonth').on('change', function(){ applyFilters(); window.App.render(); });

      // export/import
      $('#exportBtn').on('click', function(){
        const data = window.App.Storage.load();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'crimson-ledger.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });

      $('#importBtn').on('click', function(){
        const input = $('<input type="file" accept="application/json" />');
        input.on('change', function(e){
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = function(ev){
            try {
              const parsed = JSON.parse(ev.target.result);
              if (!parsed.transactions) throw new Error('Invalid file');
              window.App.Storage.save(parsed);
              state.data = parsed;
              applyFilters();
              window.App.render();
            } catch (err) {
              alert('Failed to import file.');
              console.error(err);
            }
          };
          reader.readAsText(file);
        });
        input.trigger('click');
      });

      // help modal
      $('#helpOpen').on('click', function(e){ e.preventDefault(); $('#helpModal').addClass('flex').removeClass('hidden'); });
      $('#helpClose, #helpOverlay').on('click', function(){ $('#helpModal').removeClass('flex').addClass('hidden'); });

    } catch (e) {
      console.error('App.init failed', e);
    }
  };

  // Render - update UI with current state
  window.App.render = function(){
    try {
      renderTxTable();
      renderTotals();
      renderMonthFilter();
      renderBarChart();
      renderCategoryList();
    } catch (e) {
      console.error('App.render failed', e);
    }
  };

})();
