/* scripts/helpers.js - data and storage utilities
   Responsibilities: data schema, persistence, formatting, seed data. Exposes methods on window.App.Storage
*/
(function(){
  'use strict';
  window.App = window.App || {};
  window.App.Storage = window.App.Storage || {};

  const STORAGE_KEY = 'crimson_ledger_v1';

  // Load data or return empty structure
  window.App.Storage.load = function(){
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { transactions: [] };
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to load storage', e);
      return { transactions: [] };
    }
  };

  window.App.Storage.save = function(data){
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Failed to save storage', e);
      return false;
    }
  };

  window.App.Storage.clear = function(){
    window.localStorage.removeItem(STORAGE_KEY);
  };

  window.App.Storage.getNextId = function(items){
    if (!items || !items.length) return 1;
    return Math.max.apply(null, items.map(i => i.id || 0)) + 1;
  };

  window.App.Storage.formatCurrency = function(amount){
    try {
      const opts = { style: 'currency', currency: 'USD', minimumFractionDigits: 2 };
      return new Intl.NumberFormat('en-US', opts).format(amount);
    } catch (e) {
      return '$' + Number(amount).toFixed(2);
    }
  };

  // seed demo data when none exists for first-time experience
  window.App.Storage.seedIfEmpty = function(){
    const store = window.App.Storage.load();
    if (!store || !store.transactions || !store.transactions.length) {
      const now = new Date();
      const dd = (d)=>d.toISOString().slice(0,10);
      const sample = [
        { id: 1, type: 'income', category: 'Salary', amount: 2500, date: dd(new Date(now.getFullYear(), now.getMonth(), 1)), note: 'Monthly salary' },
        { id: 2, type: 'expense', category: 'Rent', amount: 900, date: dd(new Date(now.getFullYear(), now.getMonth(), 3)), note: 'Apartment rent' },
        { id: 3, type: 'expense', category: 'Groceries', amount: 160.45, date: dd(new Date(now.getFullYear(), now.getMonth(), 7)), note: 'Weekly groceries' },
        { id: 4, type: 'expense', category: 'Transport', amount: 45.2, date: dd(new Date(now.getFullYear(), now.getMonth(), 9)), note: 'Gas and rides' },
        { id: 5, type: 'income', category: 'Freelance', amount: 400, date: dd(new Date(now.getFullYear(), now.getMonth(), 12)), note: 'Side project' }
      ];
      const data = { transactions: sample };
      window.App.Storage.save(data);
      return data;
    }
    return store;
  };

})();
