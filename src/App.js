import React, { useState, useMemo, Fragment, useEffect, useRef } from 'react';
import { Dialog, Transition, Menu } from '@headlessui/react';
import { createClient } from '@supabase/supabase-js';
import { 
    LayoutDashboard, BookOpen, FileText, Settings, X, PlusCircle, Trash2, Briefcase,
    Edit, Save, FileSignature, ChevronDown, ArrowLeft,
    Receipt, ShoppingCart, Landmark, Banknote, BookCopy, MoreVertical, ArrowRightLeft, Download, Sun, Moon,
    Users, PercentCircle, AlertTriangle, Menu as MenuIcon, UploadCloud, Info, Loader2
} from 'lucide-react';

// --- KONEKSI SUPABASE ---
// Silakan isi dengan URL dan Anon Key Supabase Anda
const supabaseUrl = 'https://pgvdmbchnbzxgsbvmtih.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBndmRtYmNobmJ6eGdzYnZtdGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzA5MzgsImV4cCI6MjA2OTgwNjkzOH0.NcP4xsNFi1WgDtbmSxnJn2vZrL-qq5K88ILXKDm5LUo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- STRUKTUR DATA & KLASIFIKASI ---
const accountClassifications = {
    Aset: ['Bank', 'Accounts Receivable', 'Other Current Asset', 'Fixed Asset', 'Other Asset'],
    Liabilitas: ['Credit Card', 'Accounts Payable', 'Other Current Liability', 'Long Term Liability', 'Other Liability'],
    Ekuitas: ['Equity'],
    Pendapatan: ['Income'],
    Beban: ['Cost of Sales', 'Expense'],
};

// --- UTILITY & HOOKS ---
const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

const useAccountBalances = (accounts, entries) => useMemo(() => {
    const balances = accounts.reduce((acc, account) => ({ ...acc, [account.id]: { ...account, balance: account.openingBalance || 0 } }), {});
    entries.forEach(entry => entry.transactions.forEach(t => {
        if (balances[t.accountId]) {
            const acc = balances[t.accountId];
            if (acc.category === 'Aset' || acc.category === 'Beban') balances[t.accountId].balance += t.debit - t.credit;
            else balances[t.accountId].balance += t.credit - t.debit;
        }
    }));
    return balances;
}, [accounts, entries]);

// --- UI COMPONENTS (Memoized for performance) ---
const StatCard = React.memo(({ title, value, icon, color }) => ( <div className="bg-white dark:bg-gray-800 p-5 shadow-sm rounded-lg flex items-center space-x-4 border-l-4" style={{borderColor: color}}> <div className="text-3xl" style={{color}}>{icon}</div> <div> <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p> <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{value}</p> </div> </div> ));
const ReminderCard = React.memo(({ title, dueDate, icon, color }) => ( <div className="bg-white dark:bg-gray-800 p-4 shadow-sm rounded-lg flex items-center space-x-4"> <div className={`p-3 rounded-full ${color.bg}`}>{icon}</div> <div> <p className="font-semibold text-gray-800 dark:text-gray-200">{title}</p> <p className="text-sm text-gray-600 dark:text-gray-400">Jatuh tempo: <span className={`font-medium ${color.text}`}>{dueDate}</span></p> </div> </div> ));

const DownloadPDFButton = React.memo(({ title, period, companyProfile, headers, data, fileName, startDate, endDate, orientation = 'p' }) => {
    const [loading, setLoading] = useState(false);
    const handleDownload = () => {
        setLoading(true);
        if (!window.jspdf || !window.jspdf.jsPDF || typeof window.jspdf.jsPDF.API.autoTable !== 'function') {
            console.error("jsPDF or autoTable plugin not loaded yet.");
            alert("Gagal memuat pustaka PDF. Silakan coba lagi nanti.");
            setLoading(false);
            return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation });
        doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.text(companyProfile.name, 14, 15);
        doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text(companyProfile.address, 14, 21);
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text(title, 14, 30);
        doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text(period, 14, 36);
        doc.autoTable({ head: [headers], body: data, startY: 40, theme: 'grid', headStyles: { fillColor: [22, 163, 74] } });
        const today = new Date().toISOString().slice(0, 10);
        const finalFileName = `${fileName}_${startDate}_${endDate}_${today}.pdf`;
        doc.save(finalFileName);
        setLoading(false);
    };
    return ( <button onClick={handleDownload} disabled={loading} className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"> <Download size={16} className={`mr-2 ${loading ? 'animate-pulse' : ''}`}/> {loading ? 'Memproses...' : 'Unduh PDF'} </button> );
});

const Notification = React.memo(({ message, show, type }) => {
    if (!show) return null;
    const bgColor = type === 'error' ? 'bg-red-500' : 'bg-green-500';
    return ( <div className={`fixed top-5 right-5 ${bgColor} text-white py-2 px-4 rounded-lg shadow-lg z-50 animate-fade-in-out`}> {message} </div> );
});

const RecentTransactions = ({ entries }) => {
    const recentEntries = entries.slice(0, 5);
    return (
        <div className="bg-white dark:bg-gray-800 p-6 shadow-sm rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Transaksi Terkini</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {recentEntries.length > 0 ? recentEntries.map(entry => {
                            const amount = entry.transactions.reduce((sum, t) => sum + t.debit, 0);
                            return (
                                <tr key={entry.id}>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(entry.date)}</td>
                                    <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{entry.description}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200 text-right font-mono">{formatCurrency(amount)}</td>
                                </tr>
                            );
                        }) : ( <tr><td colSpan="3" className="text-center py-10 text-gray-500 dark:text-gray-400">Belum ada transaksi.</td></tr> )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- TRANSACTION MODALS & FORMS ---
const SalesForm = ({ onSave, closeModal, clients, accounts, initialData, taxSettings, showNotification }) => {
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().slice(0, 10));
    const [ref, setRef] = useState(initialData?.ref || '');
    const [clientId, setClientId] = useState(initialData?.clientId || '');
    const [items, setItems] = useState(initialData?.items || [{ description: '', qty: 1, price: '' }]);
    const [taxOption, setTaxOption] = useState(initialData?.taxOption || 'exclude');
    const [paymentType, setPaymentType] = useState('credit');
    const [depositToAccountId, setDepositToAccountId] = useState('');
    const [receivableAccountId, setReceivableAccountId] = useState('');

    const cashAccounts = useMemo(() => accounts.filter(a => a.subCategory === 'Bank'), [accounts]);
    const receivableAccounts = useMemo(() => accounts.filter(a => a.subCategory === 'Accounts Receivable'), [accounts]);
    const PPN_RATE = taxSettings.ppnRate;
    const subtotal = useMemo(() => items.reduce((sum, item) => sum + (item.qty * item.price), 0), [items]);
    const ppn = useMemo(() => { if (taxOption === 'non_ppn') return 0; if (taxOption === 'exclude') return subtotal * PPN_RATE; return subtotal - (subtotal / (1 + PPN_RATE)); }, [subtotal, taxOption, PPN_RATE]);
    const total = useMemo(() => { if (taxOption === 'non_ppn') return subtotal; if (taxOption === 'exclude') return subtotal + ppn; return subtotal; }, [subtotal, ppn, taxOption]);
    const handleItemChange = (index, field, value) => { const newItems = [...items]; newItems[index][field] = value; setItems(newItems); };
    const addItem = () => setItems([...items, { description: '', qty: 1, price: '' }]);
    const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

    const handleSubmit = () => {
        if (!clientId || subtotal === 0 || !ref) { showNotification("Harap isi No. Bukti, Klien, dan detail transaksi.", 'error'); return; }
        if (paymentType === 'credit' && !receivableAccountId) { showNotification("Harap pilih akun piutang.", 'error'); return; }
        if (paymentType === 'cash' && !depositToAccountId) { showNotification("Harap pilih akun kas/bank tujuan.", 'error'); return; }
        const description = `Penjualan kepada ${clients.find(c => c.id === clientId)?.name}`;
        const revenueAmount = total - ppn;
        const debitAccountId = paymentType === 'credit' ? receivableAccountId : depositToAccountId;
        let transactions = [];
        if (taxOption === 'non_ppn') {
            transactions = [ { accountId: debitAccountId, debit: total, credit: 0 }, { accountId: '4102', debit: 0, credit: total } ];
        } else {
            transactions = [ { accountId: debitAccountId, debit: total, credit: 0 }, { accountId: '4101', debit: 0, credit: revenueAmount }, { accountId: '2102', debit: 0, credit: ppn } ];
        }
        onSave({ id: initialData?.id, date, description, ref, type: 'sale', transactions, clientId, items, taxOption });
        closeModal();
    };
    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Klien</label><select value={clientId} onChange={e => setClientId(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"><option>Pilih Klien</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tanggal</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"/></div>
                <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">No. Faktur</label><input type="text" value={ref} onChange={e => setRef(e.target.value)} placeholder="e.g., INV/2025/07/001" className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"/></div>
            </div>
             <div className="mt-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Jenis Pembayaran</label>
                <div className="flex items-center space-x-4 mt-1">
                    <label className="flex items-center"><input type="radio" name="paymentType" value="credit" checked={paymentType === 'credit'} onChange={() => setPaymentType('credit')} className="h-4 w-4 text-green-600 border-gray-300"/> <span className="ml-2 text-sm">Kredit</span></label>
                    <label className="flex items-center"><input type="radio" name="paymentType" value="cash" checked={paymentType === 'cash'} onChange={() => setPaymentType('cash')} className="h-4 w-4 text-green-600 border-gray-300"/> <span className="ml-2 text-sm">Tunai</span></label>
                </div>
            </div>
            {paymentType === 'credit' && <div className="mt-4"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Piutang ke Akun</label><select value={receivableAccountId} onChange={e => setReceivableAccountId(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"><option>Pilih Akun Piutang</option>{receivableAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>}
            {paymentType === 'cash' && <div className="mt-4"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Setor Ke</label><select value={depositToAccountId} onChange={e => setDepositToAccountId(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"><option>Pilih Akun Kas/Bank</option>{cashAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>}
            <div className="mt-4">
                {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-center">
                        <input type="text" placeholder="Deskripsi" value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} className="col-span-6 p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"/>
                        <input type="number" placeholder="Qty" value={item.qty} onChange={e => handleItemChange(index, 'qty', Number(e.target.value))} className="col-span-2 p-2 border rounded-md text-center bg-white dark:bg-gray-700 dark:border-gray-600"/>
                        <input type="number" placeholder="Harga" value={item.price} onChange={e => handleItemChange(index, 'price', Number(e.target.value))} className="col-span-3 p-2 border rounded-md text-right bg-white dark:bg-gray-700 dark:border-gray-600"/>
                        <button onClick={() => removeItem(index)} className="col-span-1 text-red-500 hover:text-red-700"><Trash2 size={18}/></button>
                    </div>
                ))}
                <button onClick={addItem} className="text-green-600 dark:text-green-400 flex items-center mt-2 text-sm"><PlusCircle size={16} className="mr-1"/> Tambah Item</button>
            </div>
            <div className="mt-6 flex flex-col md:flex-row justify-between items-start">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Opsi PPN</label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                        <button onClick={() => setTaxOption('exclude')} className={`px-4 py-2 rounded-l-md border text-sm ${taxOption === 'exclude' ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-700 dark:border-gray-600'}`}>Exclude</button>
                        <button onClick={() => setTaxOption('include')} className={`px-4 py-2 border-t border-b text-sm ${taxOption === 'include' ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-700 dark:border-gray-600'}`}>Include</button>
                        <button onClick={() => setTaxOption('non_ppn')} className={`px-4 py-2 rounded-r-md border text-sm ${taxOption === 'non_ppn' ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-700 dark:border-gray-600'}`}>Non PPN</button>
                    </div>
                </div>
                <div className="w-full md:w-1/2 text-right space-y-1 text-sm text-gray-700 dark:text-gray-300 mt-4 md:mt-0">
                    <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(total - ppn)}</span></div>
                    <div className="flex justify-between"><span>PPN ({taxOption !== 'non_ppn' ? PPN_RATE * 100 : 0}%)</span><span>{formatCurrency(ppn)}</span></div>
                    <div className="flex justify-between font-bold text-base border-t pt-2 mt-2 dark:border-gray-600"><span>Total</span><span>{formatCurrency(total)}</span></div>
                </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3"><button type="button" onClick={closeModal} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg text-sm">Batal</button><button type="button" onClick={handleSubmit} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm">Simpan</button></div>
        </div>
    );
};
const PurchaseForm = ({ onSave, closeModal, suppliers, accounts, initialData, taxSettings, showNotification }) => {
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().slice(0, 10));
    const [ref, setRef] = useState(initialData?.ref || '');
    const [supplierId, setSupplierId] = useState(initialData?.supplierId || '');
    const [items, setItems] = useState(initialData?.items || [{ description: '', qty: 1, price: '' }]);
    const [taxOption, setTaxOption] = useState(initialData?.taxOption || 'exclude');
    const [paymentType, setPaymentType] = useState('credit');
    const [paymentFromAccountId, setPaymentFromAccountId] = useState('');
    const [payableAccountId, setPayableAccountId] = useState('');

    const cashAccounts = useMemo(() => accounts.filter(a => a.subCategory === 'Bank'), [accounts]);
    const payableAccounts = useMemo(() => accounts.filter(a => a.subCategory === 'Accounts Payable'), [accounts]);
    const PPN_RATE = taxSettings.ppnRate;
    const subtotal = useMemo(() => items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.price)), 0), [items]);
    const ppn = useMemo(() => { if (taxOption === 'non_ppn') return 0; if (taxOption === 'exclude') return subtotal * PPN_RATE; return subtotal - (subtotal / (1 + PPN_RATE)); }, [subtotal, taxOption, PPN_RATE]);
    const total = useMemo(() => { if (taxOption === 'non_ppn') return subtotal; if (taxOption === 'exclude') return subtotal + ppn; return subtotal; }, [subtotal, ppn, taxOption]);
    const handleItemChange = (index, field, value) => { const newItems = [...items]; newItems[index][field] = value; setItems(newItems); };
    const addItem = () => setItems([...items, { description: '', qty: 1, price: '' }]);
    const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

    const handleSubmit = () => {
        if (!supplierId || subtotal === 0 || !ref) { showNotification("Harap isi No. Bukti, Pemasok, dan detail transaksi.", 'error'); return; }
        if (paymentType === 'credit' && !payableAccountId) { showNotification("Harap pilih akun utang.", 'error'); return; }
        if (paymentType === 'cash' && !paymentFromAccountId) { showNotification("Harap pilih akun kas/bank untuk pembayaran.", 'error'); return; }
        const description = `Pembelian dari ${suppliers.find(s => s.id === supplierId)?.name}`;
        const purchaseAmount = total - ppn;
        const creditAccountId = paymentType === 'credit' ? payableAccountId : paymentFromAccountId;
        let transactions = [];
        if (taxOption === 'non_ppn') {
            transactions = [ { accountId: '5104', debit: total, credit: 0 }, { accountId: creditAccountId, debit: 0, credit: total } ];
        } else {
            transactions = [ { accountId: '5101', debit: purchaseAmount, credit: 0 }, { accountId: '1103', debit: ppn, credit: 0 }, { accountId: creditAccountId, debit: 0, credit: total } ];
        }
        onSave({ id: initialData?.id, date, description, ref, type: 'purchase', transactions, supplierId, items, taxOption });
        closeModal();
    };
    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Pemasok</label><select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"><option>Pilih Pemasok</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tanggal</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"/></div>
                <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">No. Bukti</label><input type="text" value={ref} onChange={e => setRef(e.target.value)} placeholder="e.g., TAGIHAN-123" className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"/></div>
            </div>
            <div className="mt-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Jenis Pembayaran</label>
                <div className="flex items-center space-x-4 mt-1">
                    <label className="flex items-center"><input type="radio" name="paymentType" value="credit" checked={paymentType === 'credit'} onChange={() => setPaymentType('credit')} className="h-4 w-4 text-green-600 border-gray-300"/> <span className="ml-2 text-sm">Kredit</span></label>
                    <label className="flex items-center"><input type="radio" name="paymentType" value="cash" checked={paymentType === 'cash'} onChange={() => setPaymentType('cash')} className="h-4 w-4 text-green-600 border-gray-300"/> <span className="ml-2 text-sm">Tunai</span></label>
                </div>
            </div>
            {paymentType === 'credit' && <div className="mt-4"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Utang ke Akun</label><select value={payableAccountId} onChange={e => setPayableAccountId(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"><option>Pilih Akun Utang</option>{payableAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>}
            {paymentType === 'cash' && <div className="mt-4"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bayar Dari</label><select value={paymentFromAccountId} onChange={e => setPaymentFromAccountId(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"><option>Pilih Akun Kas/Bank</option>{cashAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>}
            <div className="mt-4">
                 <div className="grid grid-cols-12 gap-2 mb-1 text-xs font-medium text-gray-500 dark:text-gray-400 px-2">
                    <div className="col-span-7">Deskripsi</div><div className="col-span-1 text-center">Qty</div><div className="col-span-3 text-right">Harga</div><div className="col-span-1"></div>
                </div>
                {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-center">
                        <input type="text" placeholder="Deskripsi" value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} className="col-span-7 p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"/>
                        <input type="number" placeholder="Qty" value={item.qty} onChange={e => handleItemChange(index, 'qty', Number(e.target.value))} className="col-span-1 p-2 border rounded-md text-center bg-white dark:bg-gray-700 dark:border-gray-600"/>
                        <input type="number" placeholder="Harga" value={item.price} onChange={e => handleItemChange(index, 'price', Number(e.target.value))} className="col-span-3 p-2 border rounded-md text-right bg-white dark:bg-gray-700 dark:border-gray-600"/>
                        <button onClick={() => removeItem(index)} className="col-span-1 text-red-500 hover:text-red-700"><Trash2 size={18}/></button>
                    </div>
                ))}
                <button onClick={addItem} className="text-green-600 dark:text-green-400 flex items-center mt-2 text-sm"><PlusCircle size={16} className="mr-1"/> Tambah Item</button>
            </div>
            <div className="mt-6 flex flex-col md:flex-row justify-between items-start">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Opsi PPN</label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                        <button onClick={() => setTaxOption('exclude')} className={`px-4 py-2 rounded-l-md border text-sm ${taxOption === 'exclude' ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-700 dark:border-gray-600'}`}>Exclude</button>
                        <button onClick={() => setTaxOption('include')} className={`px-4 py-2 border-t border-b text-sm ${taxOption === 'include' ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-700 dark:border-gray-600'}`}>Include</button>
                        <button onClick={() => setTaxOption('non_ppn')} className={`px-4 py-2 rounded-r-md border text-sm ${taxOption === 'non_ppn' ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-700 dark:border-gray-600'}`}>Non PPN</button>
                    </div>
                </div>
                <div className="w-full md:w-1/2 text-right space-y-1 text-sm text-gray-700 dark:text-gray-300 mt-4 md:mt-0">
                    <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(total - ppn)}</span></div>
                    <div className="flex justify-between"><span>PPN ({taxOption !== 'non_ppn' ? PPN_RATE * 100 : 0}%)</span><span>{formatCurrency(ppn)}</span></div>
                    <div className="flex justify-between font-bold text-base border-t pt-2 mt-2 dark:border-gray-600"><span>Total</span><span>{formatCurrency(total)}</span></div>
                </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3"><button type="button" onClick={closeModal} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg text-sm">Batal</button><button type="button" onClick={handleSubmit} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm">Simpan Pembelian</button></div>
        </div>
    );
};
const CashReceiptForm = ({ onSave, closeModal, accounts, initialData, showNotification }) => {
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().slice(0, 10));
    const [ref, setRef] = useState(initialData?.ref || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [amount, setAmount] = useState(initialData ? initialData.transactions.find(t=>t.debit > 0).debit : '');
    const [creditAccountId, setCreditAccountId] = useState(initialData ? initialData.transactions.find(t=>t.credit > 0).accountId : '');
    const [depositToAccountId, setDepositToAccountId] = useState(initialData ? initialData.transactions.find(t=>t.debit > 0).accountId : '');
    const cashAccounts = useMemo(() => accounts.filter(a => a.subCategory === 'Bank'), [accounts]);
    const handleSubmit = () => {
        if (!creditAccountId || !amount || !description || !depositToAccountId || !ref) { showNotification("Harap isi semua field, termasuk No. Bukti.", 'error'); return; }
        const newEntry = { id: initialData?.id, date, description, ref, type: 'cash_receipt', transactions: [ { accountId: depositToAccountId, debit: Number(amount), credit: 0 }, { accountId: creditAccountId, debit: 0, credit: Number(amount) } ], };
        onSave(newEntry); closeModal();
    };
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tanggal</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"/></div>
                <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">No. Bukti</label><input type="text" value={ref} onChange={e => setRef(e.target.value)} placeholder="e.g., BKM-001" className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"/></div>
            </div>
            <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Setor Ke</label><select value={depositToAccountId} onChange={e => setDepositToAccountId(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"><option>Pilih Akun Kas/Bank</option>{cashAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
            <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Keterangan</label><input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Contoh: Pelunasan faktur INV-001" className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"/></div>
            <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Jumlah</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"/></div>
            <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Kredit ke Akun</label><select value={creditAccountId} onChange={e => setCreditAccountId(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"><option>Pilih Akun</option>{accounts.filter(a => a.category !== 'Beban').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
            <div className="mt-6 flex justify-end space-x-3"><button type="button" onClick={closeModal} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg text-sm">Batal</button><button type="button" onClick={handleSubmit} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm">Simpan</button></div>
        </div>
    );
};
const CashPaymentForm = ({ onSave, closeModal, accounts, initialData, showNotification }) => {
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().slice(0, 10));
    const [ref, setRef] = useState(initialData?.ref || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [amount, setAmount] = useState(initialData ? initialData.transactions.find(t=>t.debit > 0).debit : '');
    const [debitAccountId, setDebitAccountId] = useState(initialData ? initialData.transactions.find(t=>t.debit > 0).accountId : '');
    const [paymentFromAccountId, setPaymentFromAccountId] = useState(initialData ? initialData.transactions.find(t=>t.credit > 0).accountId : '');
    const cashAccounts = useMemo(() => accounts.filter(a => a.subCategory === 'Bank'), [accounts]);
    const handleSubmit = () => {
        if (!debitAccountId || !amount || !description || !paymentFromAccountId || !ref) { showNotification("Harap isi semua field, termasuk No. Bukti.", 'error'); return; }
        const newEntry = { id: initialData?.id, date, description, ref, type: 'cash_payment', transactions: [ { accountId: debitAccountId, debit: Number(amount), credit: 0 }, { accountId: paymentFromAccountId, debit: 0, credit: Number(amount) } ], };
        onSave(newEntry); closeModal();
    };
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tanggal</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"/></div>
                <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">No. Bukti</label><input type="text" value={ref} onChange={e => setRef(e.target.value)} placeholder="e.g., BKK-001" className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"/></div>
            </div>
            <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bayar Dari</label><select value={paymentFromAccountId} onChange={e => setPaymentFromAccountId(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"><option>Pilih Akun Kas/Bank</option>{cashAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
            <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Keterangan</label><input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Contoh: Pembayaran tagihan listrik" className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"/></div>
            <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Jumlah</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"/></div>
            <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Debit ke Akun</label><select value={debitAccountId} onChange={e => setDebitAccountId(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"><option>Pilih Akun</option>{accounts.filter(a => a.category === 'Beban' || a.category === 'Liabilitas' || (a.category === 'Aset' && !a.name.toLowerCase().includes('kas'))).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
            <div className="mt-6 flex justify-end space-x-3"><button type="button" onClick={closeModal} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg text-sm">Batal</button><button type="button" onClick={handleSubmit} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm">Simpan</button></div>
        </div>
    );
};
const GeneralJournalForm = ({ onSave, closeModal, accounts, initialData, showNotification }) => {
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().slice(0, 10));
    const [ref, setRef] = useState(initialData?.ref || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [transactions, setTransactions] = useState(initialData?.transactions || [{ accountId: '', debit: '', credit: '' }, { accountId: '', debit: '', credit: '' }]);
    const { totalDebit, totalCredit } = useMemo(() => transactions.reduce((totals, t) => { totals.totalDebit += Number(t.debit) || 0; totals.totalCredit += Number(t.credit) || 0; return totals; }, { totalDebit: 0, totalCredit: 0 }), [transactions]);
    const handleTransactionChange = (index, field, value) => { const newTransactions = [...transactions]; newTransactions[index][field] = value; if (field === 'debit' && value !== '') newTransactions[index]['credit'] = ''; else if (field === 'credit' && value !== '') newTransactions[index]['debit'] = ''; setTransactions(newTransactions); };
    const addTransactionRow = () => setTransactions([...transactions, { accountId: '', debit: '', credit: '' }]);
    const removeTransactionRow = (index) => setTransactions(transactions.filter((_, i) => i !== index));
    const handleSubmit = () => {
        if (totalDebit === 0 || totalDebit !== totalCredit || !description.trim() || !ref.trim() || transactions.some(t => !t.accountId)) { showNotification('Jurnal tidak seimbang atau data tidak lengkap (termasuk No. Bukti).', 'error'); return; }
        const newEntry = { id: initialData?.id, date, description, ref, type: 'journal', transactions: transactions.filter(t => t.accountId).map(t => ({ ...t, debit: Number(t.debit), credit: Number(t.credit) })), };
        onSave(newEntry); closeModal();
    };
    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                <div className="md:col-span-1"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tanggal</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"/></div>
                <div className="md:col-span-2"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Deskripsi</label><input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Jurnal penyesuaian, dll." className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"/></div>
                <div className="md:col-span-2"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">No. Bukti</label><input type="text" value={ref} onChange={e => setRef(e.target.value)} placeholder="e.g., MEMO-001" className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"/></div>
            </div>
            {transactions.map((t, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-center">
                    <select value={t.accountId} onChange={e => handleTransactionChange(index, 'accountId', e.target.value)} className="col-span-6 p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"><option>Pilih Akun</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.id} - {a.name}</option>)}</select>
                    <input type="number" placeholder="Debit" value={t.debit} onChange={e => handleTransactionChange(index, 'debit', e.target.value)} className="col-span-2 p-2 border rounded-md text-right bg-white dark:bg-gray-700 dark:border-gray-600"/>
                    <input type="number" placeholder="Kredit" value={t.credit} onChange={e => handleTransactionChange(index, 'credit', e.target.value)} className="col-span-2 p-2 border rounded-md text-right bg-white dark:bg-gray-700 dark:border-gray-600"/>
                    <button onClick={() => removeTransactionRow(index)} className="col-span-1 text-red-500 hover:text-red-700"><Trash2 size={18}/></button>
                </div>
            ))}
            <button onClick={addTransactionRow} className="text-green-600 dark:text-green-400 flex items-center mt-2 text-sm"><PlusCircle size={16} className="mr-1"/> Tambah Baris</button>
            <div className="mt-6 flex justify-end">
                <div className="w-full md:w-1/2 text-right space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    <div className="flex justify-between"><span>Total Debit</span><span>{formatCurrency(totalDebit)}</span></div>
                    <div className="flex justify-between"><span>Total Kredit</span><span>{formatCurrency(totalCredit)}</span></div>
                    <div className={`flex justify-between font-bold text-base border-t pt-2 mt-2 dark:border-gray-600 ${totalDebit !== totalCredit ? 'text-red-500' : 'text-green-600'}`}><span>Selisih</span><span>{formatCurrency(totalDebit - totalCredit)}</span></div>
                </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3"><button type="button" onClick={closeModal} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg text-sm">Batal</button><button type="button" onClick={handleSubmit} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm" disabled={totalDebit !== totalCredit || totalDebit === 0}>Simpan Jurnal</button></div>
        </div>
    );
};

const TransactionModal = ({ type, isOpen, closeModal, onSave, ...props }) => {
    const forms = { sale: SalesForm, purchase: PurchaseForm, cash_receipt: CashReceiptForm, cash_payment: CashPaymentForm, journal: GeneralJournalForm };
    const titles = { sale: 'Faktur Penjualan', purchase: 'Pembelian', cash_receipt: 'Penerimaan Kas', cash_payment: 'Pengeluaran Kas', journal: 'Jurnal Umum' };
    const FormComponent = forms[type];
    if (!type || !FormComponent) return null;
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-30" onClose={closeModal}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black bg-opacity-30" /></Transition.Child>
                <div className="fixed inset-0 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4 text-center">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                        <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-gray-50 dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                            <Dialog.Title as="h3" className="text-xl font-bold leading-6 text-gray-900 dark:text-gray-100 flex justify-between items-center">{props.initialData ? 'Edit' : 'Buat'} {titles[type]}<button onClick={closeModal}><X size={20} className="text-gray-500 dark:text-gray-400"/></button></Dialog.Title>
                            <div className="mt-4"><FormComponent closeModal={closeModal} onSave={onSave} {...props} /></div>
                        </Dialog.Panel>
                    </Transition.Child>
                </div></div>
            </Dialog>
        </Transition>
    );
};

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-40" onClose={onClose}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black bg-opacity-40" /></Transition.Child>
                <div className="fixed inset-0 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4 text-center">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                        <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                            <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">{title}</Dialog.Title>
                            <div className="mt-2"><p className="text-sm text-gray-500 dark:text-gray-400">{message}</p></div>
                            <div className="mt-4 flex justify-end space-x-3">
                                <button type="button" onClick={onClose} className="inline-flex justify-center rounded-md border border-transparent bg-gray-200 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600">Batal</button>
                                <button type="button" onClick={onConfirm} className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Hapus</button>
                            </div>
                        </Dialog.Panel>
                    </Transition.Child>
                </div></div>
            </Dialog>
        </Transition>
    );
};

// --- PAGES & SUB-PAGES ---
const DashboardPage = ({ balances, journalEntries, dashboardSettings }) => {
    const totalSales = useMemo(() => journalEntries.filter(e => e.type === 'sale').reduce((sum, entry) => sum + (entry.transactions.find(t => t.accountId.startsWith('4'))?.credit || 0), 0), [journalEntries]);
    const totalCash = useMemo(() => dashboardSettings.cashAccountIds.reduce((sum, accId) => sum + (balances[accId]?.balance || 0), 0), [balances, dashboardSettings]);
    
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard title="Total Penjualan (Periode Berjalan)" value={formatCurrency(totalSales)} icon={<Receipt/>} color="#10B981" />
                <StatCard title="Total Kas & Bank" value={formatCurrency(totalCash)} icon={<Landmark/>} color="#3B82F6" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2"><RecentTransactions entries={journalEntries} /></div>
                <div className="space-y-6">
                     <div className="bg-white dark:bg-gray-800 p-6 shadow-sm rounded-lg">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Pengingat</h3>
                        <div className="space-y-4">
                            <ReminderCard title="Pembayaran PPN Masa Juli" dueDate="15 Agustus 2025" icon={<FileSignature size={20} className="text-orange-600"/>} color={{bg: "bg-orange-100 dark:bg-orange-900/50", text: "text-orange-700 dark:text-orange-400"}}/>
                            <ReminderCard title="Lapor PPh 21 Masa Juli" dueDate="20 Agustus 2025" icon={<Users size={20} className="text-blue-600"/>} color={{bg: "bg-blue-100 dark:bg-blue-900/50", text: "text-blue-700 dark:text-blue-400"}}/>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
const TransactionListPage = ({ journalEntries, onEdit, onDelete, companyProfile, pageTitle, accounts }) => {
    const [startDate, setStartDate] = useState('2025-07-01');
    const [endDate, setEndDate] = useState('2025-07-31');
    const findAccountName = (id) => accounts.find(a => a.id === id)?.name || 'Akun tidak ditemukan';
    const filteredEntries = useMemo(() => journalEntries.filter(e => e.date >= startDate && e.date <= endDate), [journalEntries, startDate, endDate]);
    const tableHeaders = ['No', 'Tanggal', 'Ref #', 'Deskripsi', 'Akun', 'Debit', 'Kredit'];
    const tableData = useMemo(() => {
        const data = [];
        filteredEntries.forEach((entry, index) => {
            entry.transactions.forEach((t, tIndex) => {
                data.push([
                    tIndex === 0 ? index + 1 : '',
                    tIndex === 0 ? formatDate(entry.date) : '',
                    tIndex === 0 ? entry.ref : '',
                    tIndex === 0 ? entry.description : '',
                    findAccountName(t.accountId),
                    t.debit > 0 ? formatCurrency(t.debit) : '',
                    t.credit > 0 ? formatCurrency(t.credit) : ''
                ]);
            });
        });
        return data;
    }, [filteredEntries, findAccountName]);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 shadow-sm rounded-lg">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{pageTitle}</h3>
                <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
                    <div className="flex items-center space-x-2"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Dari:</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-1 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-sm"/></div>
                    <div className="flex items-center space-x-2"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sampai:</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-1 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-sm"/></div>
                    <DownloadPDFButton title={pageTitle} period={`Periode ${formatDate(startDate)} - ${formatDate(endDate)}`} companyProfile={companyProfile} headers={tableHeaders} data={tableData} fileName={pageTitle.toLowerCase().replace(/ /g, '-')} startDate={startDate} endDate={endDate} orientation="l"/>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700"><tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">No</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tanggal</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Ref #</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-1/4">Deskripsi & Akun</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Debit</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Kredit</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Aksi</th>
                    </tr></thead>
                    <tbody className="bg-white dark:bg-gray-800">
                        {filteredEntries.map((entry, index) => (
                            <Fragment key={entry.id}>
                                {entry.transactions.map((t, tIndex) => (
                                    <tr key={`${entry.id}-${tIndex}`} className={`border-b border-gray-200 dark:border-gray-700 ${tIndex === entry.transactions.length - 1 ? 'border-b-2 border-gray-300 dark:border-gray-600' : ''}`}>
                                        {tIndex === 0 && (
                                            <>
                                                <td className="px-4 py-3 align-top whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200" rowSpan={entry.transactions.length}>{index + 1}</td>
                                                <td className="px-4 py-3 align-top whitespace-nowrap text-sm text-gray-500 dark:text-gray-400" rowSpan={entry.transactions.length}>{formatDate(entry.date)}</td>
                                                <td className="px-4 py-3 align-top whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-medium" rowSpan={entry.transactions.length}>{entry.ref}</td>
                                            </>
                                        )}
                                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                                            {tIndex === 0 && <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">{entry.description}</p>}
                                            <p className={`${t.credit > 0 ? 'pl-4' : ''}`}>{findAccountName(t.accountId)}</p>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200 text-right font-mono">{t.debit > 0 ? formatCurrency(t.debit) : ''}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200 text-right font-mono">{t.credit > 0 ? formatCurrency(t.credit) : ''}</td>
                                        {tIndex === 0 && (
                                            <td className="px-4 py-3 align-top text-right" rowSpan={entry.transactions.length}>
                                                <Menu as="div" className="relative inline-block text-left">
                                                    <Menu.Button className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"><MoreVertical size={16}/></Menu.Button>
                                                    <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                                                        <Menu.Items className="origin-top-right absolute right-0 mt-2 w-32 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 z-10">
                                                            <div className="py-1">
                                                                <Menu.Item><button onClick={() => onEdit(entry)} className="group flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"><Edit size={14} className="mr-2"/> Edit</button></Menu.Item>
                                                                <Menu.Item><button onClick={() => onDelete({id: entry.id, name: entry.ref, type: 'transaksi'})} className="group flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} className="mr-2"/> Hapus</button></Menu.Item>
                                                            </div>
                                                        </Menu.Items>
                                                    </Transition>
                                                </Menu>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
const LedgerPage = ({ accounts, entries, companyProfile }) => {
    const [selectedAccount, setSelectedAccount] = useState(null);
    const groupedAccounts = useMemo(() => accounts.reduce((acc, account) => { (acc[account.category] = acc[account.category] || []).push(account); return acc; }, {}), [accounts]);

    if (selectedAccount) {
        return <AccountLedgerDetail account={selectedAccount} entries={entries} onClose={() => setSelectedAccount(null)} companyProfile={companyProfile} />;
    }

    return (
        <div>
            <div className="bg-white dark:bg-gray-800 p-6 shadow-sm rounded-lg mb-6 flex justify-between items-center">
                <div><h2 className="text-2xl font-bold text-gray-700 dark:text-gray-200">Buku Besar</h2><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Pilih sebuah akun untuk melihat rincian transaksinya.</p></div>
            </div>
            <div className="space-y-4">
                {Object.entries(groupedAccounts).map(([category, accs]) => (
                    <div key={category}>
                        <h3 className="font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 p-2 rounded-t-md">{category}</h3>
                        <div className="border dark:border-gray-700 rounded-b-md grid grid-cols-1 md:grid-cols-2">
                            {accs.sort((a,b) => a.id.localeCompare(b.id)).map(account => (<button key={account.id} onClick={() => setSelectedAccount(account)} className="w-full text-left flex justify-between p-3 border-b dark:border-gray-700 md:border-r last:border-b-0 items-center bg-white dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"><div><span className="font-medium text-gray-800 dark:text-gray-200">{account.name}</span><span className="ml-2 text-sm text-gray-500 dark:text-gray-400">({account.id})</span></div></button>))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
const AccountLedgerDetail = ({ account, entries, onClose, companyProfile }) => {
    const [startDate, setStartDate] = useState('2025-07-01');
    const [endDate, setEndDate] = useState('2025-07-31');
    const [filterByDate, setFilterByDate] = useState(true);
    
    const { beginningBalance, ledgerData } = useMemo(() => {
        const isDebitNormal = account.category === 'Aset' || account.category === 'Beban';
        const allRelevantTransactions = entries
            .flatMap(entry => entry.transactions.filter(t => t.accountId === account.id).map(t => ({ ...t, date: entry.date, description: entry.description, ref: entry.ref })))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        
        let currentBalance = account.openingBalance || 0;
        const calculatedBeginningBalance = allRelevantTransactions
            .filter(t => filterByDate ? t.date < startDate : false)
            .reduce((balance, t) => balance + (isDebitNormal ? t.debit - t.credit : t.credit - t.debit), currentBalance);

        let runningBalance = calculatedBeginningBalance;
        const filteredLedger = allRelevantTransactions
            .filter(t => filterByDate ? (t.date >= startDate && t.date <= endDate) : true)
            .map(t => {
                runningBalance += isDebitNormal ? t.debit - t.credit : t.credit - t.debit;
                return { ...t, balance: runningBalance };
            });

        return { beginningBalance: filterByDate ? calculatedBeginningBalance : account.openingBalance, ledgerData: filteredLedger };
    }, [account, entries, startDate, endDate, filterByDate]);

    const tableHeaders = ['Tanggal', 'Keterangan', 'Ref #', 'Debit', 'Kredit', 'Saldo'];
    const tableData = [
        ['', 'Saldo Awal Periode', '', '', '', formatCurrency(beginningBalance)],
        ...ledgerData.map(item => [formatDate(item.date), item.description, item.ref, item.debit > 0 ? formatCurrency(item.debit) : '-', item.credit > 0 ? formatCurrency(item.credit) : '-', formatCurrency(item.balance)])
    ];

    return (
        <div className="bg-white dark:bg-gray-800 p-6 shadow-sm rounded-lg">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <div className="flex items-center">
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 mr-4"><ArrowLeft size={20} className="text-gray-800 dark:text-gray-200" /></button>
                    <div className="flex-grow"><h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Buku Besar: {account.name}</h2><p className="text-sm text-gray-500 dark:text-gray-400">#{account.id}</p></div>
                </div>
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                    <div className="flex items-center space-x-2">
                        <input id="filterDate" type="checkbox" checked={filterByDate} onChange={() => setFilterByDate(prev => !prev)} className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"/>
                        <label htmlFor="filterDate" className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter Berdasarkan Tanggal</label>
                    </div>
                    {filterByDate && (
                        <>
                        <div className="flex items-center space-x-2"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Dari:</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-1 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-sm"/></div>
                        <div className="flex items-center space-x-2"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sampai:</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-1 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-sm"/></div>
                        </>
                    )}
                    <DownloadPDFButton title={`Buku Besar: ${account.name} (${account.id})`} period={`Periode ${formatDate(startDate)} - ${formatDate(endDate)}`} companyProfile={companyProfile} headers={tableHeaders} data={tableData} fileName={`buku-besar-${account.id}`} startDate={startDate} endDate={endDate} />
                </div>
            </div>
            <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700"><tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tanggal</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Keterangan</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Ref #</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Debit</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Kredit</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Saldo</th>
                </tr></thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    <tr className="bg-gray-100 dark:bg-gray-700 font-semibold"><td colSpan="5" className="px-6 py-2 text-gray-800 dark:text-gray-200">Saldo Awal Periode</td><td className="px-6 py-2 text-right font-mono text-gray-800 dark:text-gray-200">{formatCurrency(beginningBalance)}</td></tr>
                    {ledgerData.map((item, index) => (<tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(item.date)}</td><td className="px-6 py-4 text-sm text-gray-800 dark:text-gray-200">{item.description}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400">{item.ref}</td>
                        <td className="px-6 py-4 text-right font-mono text-gray-800 dark:text-gray-200">{item.debit > 0 ? formatCurrency(item.debit) : '-'}</td><td className="px-6 py-4 text-right font-mono text-gray-800 dark:text-gray-200">{item.credit > 0 ? formatCurrency(item.credit) : '-'}</td><td className="px-6 py-4 text-right font-mono font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(item.balance)}</td>
                    </tr>))}
                </tbody>
            </table></div>
        </div>
    );
};
const ReportsPage = ({ accounts, journalEntries, companyProfile }) => {
    const [activeTab, setActiveTab] = useState('labaRugi');
    const [startDate, setStartDate] = useState('2025-07-01');
    const [endDate, setEndDate] = useState('2025-07-31');
    
    const { revenues, totalRevenue, costOfSales, totalCostOfSales, grossProfit, expenses, totalExpense, netIncome, labaRugiData } = useMemo(() => {
        const filteredEntries = journalEntries.filter(e => e.date >= startDate && e.date <= endDate);
        const balances = accounts.reduce((acc, account) => ({ ...acc, [account.id]: { ...account, balance: 0 } }), {});
        filteredEntries.forEach(entry => entry.transactions.forEach(t => { if (balances[t.accountId]) { const acc = balances[t.accountId]; if (acc.category === 'Pendapatan') balances[t.accountId].balance += t.credit - t.debit; else if (acc.category === 'Beban') balances[t.accountId].balance += t.debit - t.credit; } }));
        
        const revenues = Object.values(balances).filter(acc => acc.subCategory === 'Income' && acc.balance !== 0);
        const costOfSales = Object.values(balances).filter(acc => acc.subCategory === 'Cost of Sales' && acc.balance !== 0);
        const expenses = Object.values(balances).filter(acc => acc.subCategory === 'Expense' && acc.balance !== 0);

        const totalRevenue = revenues.reduce((sum, acc) => sum + acc.balance, 0);
        const totalCostOfSales = costOfSales.reduce((sum, acc) => sum + acc.balance, 0);
        const grossProfit = totalRevenue - totalCostOfSales;
        const totalExpense = expenses.reduce((sum, acc) => sum + acc.balance, 0);
        const netIncome = grossProfit - totalExpense;

        const labaRugiData = [
            [{ content: 'Pendapatan', colSpan: 2, styles: { fontStyle: 'bold' } }], ...revenues.map(acc => [acc.name, formatCurrency(acc.balance)]),
            [{ content: 'Total Pendapatan', styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalRevenue), styles: { fontStyle: 'bold' } }],
            [{ content: 'Harga Pokok Penjualan', colSpan: 2, styles: { fontStyle: 'bold' } }], ...costOfSales.map(acc => [acc.name, formatCurrency(acc.balance)]),
            [{ content: 'Total HPP', styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalCostOfSales), styles: { fontStyle: 'bold' } }],
            [{ content: 'Laba Kotor', styles: { fontStyle: 'bold' } }, { content: formatCurrency(grossProfit), styles: { fontStyle: 'bold' } }],
            [{ content: 'Beban Operasional', colSpan: 2, styles: { fontStyle: 'bold' } }], ...expenses.map(acc => [acc.name, formatCurrency(acc.balance)]),
            [{ content: 'Total Beban Operasional', styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalExpense), styles: { fontStyle: 'bold' } }],
            [{ content: 'Laba (Rugi) Bersih', styles: { fontStyle: 'bold' } }, { content: formatCurrency(netIncome), styles: { fontStyle: 'bold' } }]
        ];
        return { revenues, totalRevenue, costOfSales, totalCostOfSales, grossProfit, expenses, totalExpense, netIncome, labaRugiData };
    }, [accounts, journalEntries, startDate, endDate]);

    const { assets, totalAssets, liabilities, totalLiabilities, equity, totalEquity, neracaData } = useMemo(() => {
        const balances = accounts.reduce((acc, account) => ({ ...acc, [account.id]: { ...account, balance: account.openingBalance || 0 } }), {});
        const filteredEntries = journalEntries.filter(e => e.date <= endDate);
        filteredEntries.forEach(entry => entry.transactions.forEach(t => { if (balances[t.accountId]) { const acc = balances[t.accountId]; if (acc.category === 'Aset' || acc.category === 'Beban') balances[t.accountId].balance += t.debit - t.credit; else balances[t.accountId].balance += t.credit - t.debit; } }));
        const assets = Object.values(balances).filter(acc => acc.category === 'Aset');
        const totalAssets = assets.reduce((sum, acc) => sum + acc.balance, 0);
        const liabilities = Object.values(balances).filter(acc => acc.category === 'Liabilitas');
        const totalLiabilities = liabilities.reduce((sum, acc) => sum + acc.balance, 0);
        const equityAccounts = Object.values(balances).filter(acc => acc.category === 'Ekuitas');
        const equity = [...equityAccounts, { id: 'netIncome', name: 'Laba (Rugi) Periode Berjalan', balance: netIncome, category: 'Ekuitas' }];
        const totalEquity = equity.reduce((sum, acc) => sum + acc.balance, 0);
        const neracaData = [ [{ content: 'Aset', colSpan: 2, styles: { fontStyle: 'bold' } }], ...assets.map(acc => [acc.name, formatCurrency(acc.balance)]), [{ content: 'Total Aset', styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalAssets), styles: { fontStyle: 'bold' } }], [{ content: 'Liabilitas', colSpan: 2, styles: { fontStyle: 'bold' } }], ...liabilities.map(acc => [acc.name, formatCurrency(acc.balance)]), [{ content: 'Total Liabilitas', styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalLiabilities), styles: { fontStyle: 'bold' } }], [{ content: 'Ekuitas', colSpan: 2, styles: { fontStyle: 'bold' } }], ...equity.map(acc => [acc.name, formatCurrency(acc.balance)]), [{ content: 'Total Ekuitas', styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalEquity), styles: { fontStyle: 'bold' } }], [{ content: 'Total Liabilitas & Ekuitas', styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalLiabilities + totalEquity), styles: { fontStyle: 'bold' } }] ];
        return { assets, totalAssets, liabilities, totalLiabilities, equity, totalEquity, neracaData };
    }, [accounts, journalEntries, endDate, netIncome]);
    return (
        <div className="bg-white dark:bg-gray-800 p-6 shadow-sm rounded-lg">
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6 flex flex-col md:flex-row justify-between md:items-center print:hidden gap-4">
                <nav className="-mb-px flex space-x-8"><button onClick={() => setActiveTab('labaRugi')} className={`py-4 px-1 border-b-2 font-medium ${activeTab === 'labaRugi' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>Laba Rugi</button><button onClick={() => setActiveTab('neraca')} className={`py-4 px-1 border-b-2 font-medium ${activeTab === 'neraca' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>Neraca</button></nav>
                <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
                    <div className="flex items-center space-x-2"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Dari:</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-1 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-sm"/></div>
                    <div className="flex items-center space-x-2"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sampai:</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-1 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-sm"/></div>
                    <DownloadPDFButton title={activeTab === 'labaRugi' ? 'Laporan Laba Rugi' : 'Laporan Posisi Keuangan'} period={activeTab === 'labaRugi' ? `Untuk Periode ${formatDate(startDate)} - ${formatDate(endDate)}` : `Per Tanggal ${formatDate(endDate)}`} companyProfile={companyProfile} headers={['Keterangan', 'Jumlah']} data={activeTab === 'labaRugi' ? labaRugiData : neracaData} fileName={`laporan-${activeTab}`} startDate={startDate} endDate={endDate} />
                </div>
            </div>
            <div id="pdf-content-laporan">
                {activeTab === 'labaRugi' && (
                    <div className="max-w-4xl mx-auto text-gray-800 dark:text-gray-200 p-4">
                        <h2 className="text-xl font-bold text-center">Laporan Laba Rugi</h2><p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">Untuk Periode {formatDate(startDate)} - {formatDate(endDate)}</p>
                        <div className="space-y-4">
                            <div><h3 className="font-semibold border-b dark:border-gray-700 pb-1">Pendapatan</h3>{revenues.map(acc => <div key={acc.id} className="flex justify-between py-1"><span>{acc.name}</span><span className="font-mono">{formatCurrency(acc.balance)}</span></div>)}<div className="flex justify-between font-bold border-t dark:border-gray-700 mt-1 pt-1"><span>Total Pendapatan</span><span className="font-mono">{formatCurrency(totalRevenue)}</span></div></div>
                            <div><h3 className="font-semibold border-b dark:border-gray-700 pb-1">Harga Pokok Penjualan</h3>{costOfSales.map(acc => <div key={acc.id} className="flex justify-between py-1"><span>{acc.name}</span><span className="font-mono">{formatCurrency(acc.balance)}</span></div>)}<div className="flex justify-between font-bold border-t dark:border-gray-700 mt-1 pt-1"><span>Total HPP</span><span className="font-mono">{formatCurrency(totalCostOfSales)}</span></div></div>
                            <div className="flex justify-between font-bold text-lg p-2 rounded bg-gray-100 dark:bg-gray-700"><span>Laba Kotor</span><span className="font-mono">{formatCurrency(grossProfit)}</span></div>
                            <div><h3 className="font-semibold border-b dark:border-gray-700 pb-1">Beban Operasional</h3>{expenses.map(acc => <div key={acc.id} className="flex justify-between py-1"><span>{acc.name}</span><span className="font-mono">{formatCurrency(acc.balance)}</span></div>)}<div className="flex justify-between font-bold border-t dark:border-gray-700 mt-1 pt-1"><span>Total Beban Operasional</span><span className="font-mono">{formatCurrency(totalExpense)}</span></div></div>
                            <div className={`flex justify-between font-extrabold text-lg p-2 rounded ${netIncome >= 0 ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300'}`}><span>Laba (Rugi) Bersih</span><span className="font-mono">{formatCurrency(netIncome)}</span></div>
                        </div>
                    </div>
                )}
                {activeTab === 'neraca' && (
                    <div className="max-w-4xl mx-auto text-gray-800 dark:text-gray-200 p-4">
                        <h2 className="text-xl font-bold text-center">Laporan Posisi Keuangan (Neraca)</h2><p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">Per Tanggal {formatDate(endDate)}</p>
                        <div className="space-y-6">
                            <div><h3 className="text-lg font-semibold border-b-2 dark:border-gray-700 pb-2 mb-2">Aset</h3>{assets.map(acc => <div key={acc.id} className="flex justify-between py-1"><span>{acc.name}</span><span className="font-mono">{formatCurrency(acc.balance)}</span></div>)}<div className="flex justify-between font-extrabold text-lg border-t-2 dark:border-gray-700 mt-2 pt-2"><span>Total Aset</span><span className="font-mono">{formatCurrency(totalAssets)}</span></div></div>
                            <div><h3 className="text-lg font-semibold border-b-2 dark:border-gray-700 pb-2 mb-2">Liabilitas dan Ekuitas</h3>
                                <h4 className="font-medium mt-2 text-gray-600 dark:text-gray-400">Liabilitas</h4>{liabilities.map(acc => <div key={acc.id} className="flex justify-between py-1 ml-4"><span>{acc.name}</span><span className="font-mono">{formatCurrency(acc.balance)}</span></div>)}
                                <div className="flex justify-between font-bold border-t dark:border-gray-700 mt-1 pt-1 ml-4"><span>Total Liabilitas</span><span className="font-mono">{formatCurrency(totalLiabilities)}</span></div>
                                <h4 className="font-medium mt-4 text-gray-600 dark:text-gray-400">Ekuitas</h4>{equity.map(acc => <div key={acc.id} className="flex justify-between py-1 ml-4"><span>{acc.name}</span><span className="font-mono">{formatCurrency(acc.balance)}</span></div>)}
                                <div className="flex justify-between font-bold border-t dark:border-gray-700 mt-1 pt-1 ml-4"><span>Total Ekuitas</span><span className="font-mono">{formatCurrency(totalEquity)}</span></div>
                            </div>
                            <div className="flex justify-between font-extrabold text-lg border-t-2 dark:border-gray-700 mt-2 pt-2"><span>Total Liabilitas & Ekuitas</span><span className="font-mono">{formatCurrency(totalLiabilities + totalEquity)}</span></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
const SettingsPage = ({ accounts, onAccountUpdate, onAccountAdd, companyProfile, onProfileUpdate, clients, onClientUpdate, suppliers, onSupplierUpdate, taxSettings, onTaxUpdate, showNotification, balances, onDelete }) => {
    const [activeTab, setActiveTab] = useState('coa');
    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 shadow-sm rounded-lg">
                <div className="border-b border-gray-200 dark:border-gray-700 -mt-2"><nav className="-mb-px flex space-x-8 overflow-x-auto">
                    <button onClick={() => setActiveTab('coa')} className={`py-4 px-1 border-b-2 font-medium whitespace-nowrap ${activeTab === 'coa' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>COA & Saldo Awal</button>
                    <button onClick={() => setActiveTab('profile')} className={`py-4 px-1 border-b-2 font-medium whitespace-nowrap ${activeTab === 'profile' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>Profil Perusahaan</button>
                    <button onClick={() => setActiveTab('contacts')} className={`py-4 px-1 border-b-2 font-medium whitespace-nowrap ${activeTab === 'contacts' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>Manajemen Kontak</button>
                    <button onClick={() => setActiveTab('tax')} className={`py-4 px-1 border-b-2 font-medium whitespace-nowrap ${activeTab === 'tax' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>Pengaturan Pajak</button>
                </nav></div>
                <div className="mt-6">
                    {activeTab === 'coa' && <CoaOpeningBalance accounts={accounts} onAccountUpdate={onAccountUpdate} onAccountAdd={onAccountAdd} showNotification={showNotification} balances={balances} onDelete={onDelete} />}
                    {activeTab === 'profile' && <CompanyProfile profile={companyProfile} onProfileUpdate={onProfileUpdate} showNotification={showNotification} />}
                    {activeTab === 'contacts' && <ContactManagement clients={clients} onClientUpdate={onClientUpdate} suppliers={suppliers} onSupplierUpdate={onSupplierUpdate} showNotification={showNotification} onDelete={onDelete} />}
                    {activeTab === 'tax' && <TaxSettings settings={taxSettings} onTaxUpdate={onTaxUpdate} showNotification={showNotification} />}
                </div>
            </div>
        </div>
    );
};
const CoaOpeningBalance = ({ accounts, onAccountUpdate, onAccountAdd, showNotification, balances, onDelete }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newAccount, setNewAccount] = useState({ id: '', name: '', category: 'Aset', subCategory: accountClassifications['Aset'][0], openingBalance: 0, isDeletable: true });
    const [editingRow, setEditingRow] = useState(null);
    const { totalDebit, totalCredit, isBalanced } = useMemo(() => {
        const totals = accounts.reduce((acc, account) => { const balance = account.openingBalance || 0; if (account.category === 'Aset' || account.category === 'Beban') acc.debit += balance; else acc.credit += balance; return acc; }, { debit: 0, credit: 0 });
        return { totalDebit: totals.debit, totalCredit: totals.credit, isBalanced: Math.abs(totals.debit - totals.credit) < 0.01 };
    }, [accounts]);
    
    const handleCategoryChange = (e) => {
        const newCategory = e.target.value;
        setNewAccount({ ...newAccount, category: newCategory, subCategory: accountClassifications[newCategory][0] });
    };
    const handleAddAccount = () => {
        if (!newAccount.id || !newAccount.name || !newAccount.category) { showNotification("Nomor, Nama, dan Kategori Akun harus diisi.", 'error'); return; }
        if (accounts.some(acc => acc.id === newAccount.id)) { showNotification("Nomor Akun sudah ada.", 'error'); return; }
        onAccountAdd(newAccount);
        setNewAccount({ id: '', name: '', category: 'Aset', subCategory: accountClassifications['Aset'][0], openingBalance: 0, isDeletable: true });
        setIsAdding(false);
    };
    const startEditing = (acc) => setEditingRow({ ...acc });
    const cancelEditing = () => setEditingRow(null);
    const saveEditing = () => { onAccountUpdate(editingRow); setEditingRow(null); };
    return (
        <div className="text-gray-800 dark:text-gray-200">
            <div className="flex flex-wrap gap-2 justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Daftar Akun & Saldo Awal</h3>
                <button onClick={() => setIsAdding(!isAdding)} className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm flex items-center"><PlusCircle size={16} className="mr-2"/> {isAdding ? 'Batal' : 'Tambah Akun'}</button>
            </div>
            {!isBalanced && (
                <div className="bg-yellow-100 dark:bg-yellow-900/50 border-l-4 border-yellow-500 text-yellow-700 dark:text-yellow-300 p-4 mb-4 rounded-md" role="alert">
                    <div className="flex items-center"><AlertTriangle className="mr-2" size={20} /><p className="font-bold">Saldo Awal Tidak Seimbang!</p></div>
                    <p className="text-sm mt-1">Total Debit: {formatCurrency(totalDebit)} | Total Kredit: {formatCurrency(totalCredit)}</p>
                </div>
            )}
            {isAdding && (
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4 p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <input type="text" placeholder="No. Akun" value={newAccount.id} onChange={e => setNewAccount({...newAccount, id: e.target.value})} className="p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 md:col-span-1"/>
                    <input type="text" placeholder="Nama Akun" value={newAccount.name} onChange={e => setNewAccount({...newAccount, name: e.target.value})} className="p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 md:col-span-2"/>
                    <select value={newAccount.category} onChange={handleCategoryChange} className="p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600">
                        {Object.keys(accountClassifications).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <select value={newAccount.subCategory} onChange={e => setNewAccount({...newAccount, subCategory: e.target.value})} className="p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600">
                        {accountClassifications[newAccount.category].map(sub => <option key={sub} value={sub}>{sub}</option>)}
                    </select>
                    <button onClick={handleAddAccount} className="bg-green-600 text-white rounded-lg text-sm">Simpan Akun</button>
                </div>
            )}
            <div className="overflow-x-auto border dark:border-gray-700 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700"><tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ID</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nama Akun</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Kategori</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Saldo Awal</th><th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Saldo Saat Ini</th><th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Aksi</th>
                    </tr></thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {accounts.map(acc => (
                            <tr key={acc.id}>
                                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{acc.id}</td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200">{editingRow?.id === acc.id ? <input type="text" value={editingRow.name} onChange={e => setEditingRow({...editingRow, name: e.target.value})} className="w-full p-1 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"/> : acc.name}</td>
                                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{acc.subCategory}</td>
                                <td className="px-4 py-3 text-right font-mono">{editingRow?.id === acc.id ? <input type="number" value={editingRow.openingBalance} onChange={e => setEditingRow({...editingRow, openingBalance: Number(e.target.value)})} className="w-full p-1 border rounded-md text-right font-mono bg-white dark:bg-gray-700 dark:border-gray-600" /> : formatCurrency(acc.openingBalance)}</td>
                                <td className="px-4 py-3 text-right font-mono font-semibold text-gray-700 dark:text-gray-300">{balances[acc.id] ? formatCurrency(balances[acc.id].balance) : formatCurrency(0)}</td>
                                <td className="px-4 py-3 text-center">
                                    {editingRow?.id === acc.id ? ( <div className="flex justify-center space-x-2"><button onClick={saveEditing} className="text-green-600 hover:text-green-800"><Save size={16}/></button><button onClick={cancelEditing} className="text-gray-500 hover:text-gray-700"><X size={16}/></button></div> ) : (
                                        <Menu as="div" className="relative inline-block text-left">
                                            <Menu.Button className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"><MoreVertical size={16}/></Menu.Button>
                                            <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                                                <Menu.Items className="origin-top-right absolute right-0 mt-2 w-32 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 z-10">
                                                    <div className="py-1">
                                                        <Menu.Item><button onClick={() => startEditing(acc)} className="group flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"><Edit size={14} className="mr-2"/> Edit</button></Menu.Item>
                                                        {acc.isDeletable && <Menu.Item><button onClick={() => onDelete({id: acc.id, name: acc.name, type: 'akun'})} className="group flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} className="mr-2"/> Hapus</button></Menu.Item>}
                                                    </div>
                                                </Menu.Items>
                                            </Transition>
                                        </Menu>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
const CompanyProfile = ({ profile, onProfileUpdate, showNotification }) => {
    const [formData, setFormData] = useState(profile);
    useEffect(() => { setFormData(profile) }, [profile]);
    const handleChange = (e) => { setFormData({...formData, [e.target.name]: e.target.value }); };
    const handleSubmit = (e) => { e.preventDefault(); onProfileUpdate(formData); };
    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg text-gray-800 dark:text-gray-200">
            <div><label className="block text-sm font-medium">Nama Perusahaan</label><input type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"/></div>
            <div><label className="block text-sm font-medium">Alamat</label><input type="text" name="address" value={formData.address} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"/></div>
            <div><label className="block text-sm font-medium">Telepon</label><input type="text" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"/></div>
            <div><label className="block text-sm font-medium">Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"/></div>
            <div className="pt-2"><button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm">Simpan Perubahan</button></div>
        </form>
    );
};
const ContactManagement = ({ clients, onClientUpdate, suppliers, onSupplierUpdate, showNotification, onDelete }) => {
    const [contactTab, setContactTab] = useState('clients');
    const [modalOpen, setModalOpen] = useState(false);
    const [currentContact, setCurrentContact] = useState(null);
    const handleAdd = () => { setCurrentContact(null); setModalOpen(true); };
    const handleEdit = (contact) => { setCurrentContact(contact); setModalOpen(true); };
    const handleSave = (contact) => {
        const onUpdate = contactTab === 'clients' ? onClientUpdate : onSupplierUpdate;
        onUpdate(contact);
        setModalOpen(false);
    };
    return (
        <div>
            <div className="border-b border-gray-200 dark:border-gray-700"><nav className="-mb-px flex space-x-6">
                <button onClick={() => setContactTab('clients')} className={`py-2 px-1 border-b-2 font-medium text-sm ${contactTab === 'clients' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>Klien</button>
                <button onClick={() => setContactTab('suppliers')} className={`py-2 px-1 border-b-2 font-medium text-sm ${contactTab === 'suppliers' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>Pemasok</button>
            </nav></div>
            <div className="mt-4">
                {contactTab === 'clients' && <ContactList contacts={clients} type="Klien" onAdd={handleAdd} onEdit={handleEdit} onDelete={onDelete} />}
                {contactTab === 'suppliers' && <ContactList contacts={suppliers} type="Pemasok" onAdd={handleAdd} onEdit={handleEdit} onDelete={onDelete} />}
            </div>
            <ContactModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} contact={currentContact} type={contactTab === 'clients' ? 'Klien' : 'Pemasok'} />
        </div>
    );
};
const ContactList = ({ contacts, type, onAdd, onEdit, onDelete }) => {
    return (
        <div className="text-gray-800 dark:text-gray-200">
            <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold">Daftar {type}</h4>
                <button onClick={onAdd} className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm flex items-center"><PlusCircle size={16} className="mr-2"/> Tambah {type}</button>
            </div>
            <div className="flow-root"><ul className="-my-5 divide-y divide-gray-200 dark:divide-gray-700">
                {contacts.map(contact => (
                    <li key={contact.id} className="py-4"><div className="flex items-center space-x-4">
                        <div className="flex-shrink-0"><div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300">{contact.name.charAt(0)}</div></div>
                        <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{contact.name}</p><p className="text-sm text-gray-500 dark:text-gray-400 truncate">{contact.email || 'No email'}</p></div>
                        <div className="space-x-2">
                            <button onClick={() => onEdit(contact)} className="text-gray-400 hover:text-green-600"><Edit size={16}/></button>
                            <button onClick={() => onDelete({id: contact.id, name: contact.name, type: type.toLowerCase()})} className="text-gray-400 hover:text-red-600"><Trash2 size={16}/></button>
                        </div>
                    </div></li>
                ))}
            </ul></div>
        </div>
    );
};
const ContactModal = ({ isOpen, onClose, onSave, contact, type }) => {
    const [formData, setFormData] = useState({ name: '', email: '' });
    useEffect(() => { setFormData(contact || { name: '', email: '' }); }, [contact, isOpen]);
    const handleChange = (e) => setFormData({...formData, [e.target.name]: e.target.value});
    const handleSubmit = () => onSave({ ...formData, id: contact?.id });
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-30" onClose={onClose}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black bg-opacity-30" /></Transition.Child>
                <div className="fixed inset-0 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4 text-center">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                        <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-50 dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                            <Dialog.Title as="h3" className="text-xl font-bold leading-6 text-gray-900 dark:text-gray-100">{contact ? 'Edit' : 'Tambah'} {type}</Dialog.Title>
                            <div className="mt-4 space-y-4">
                                <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nama</label><input type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"/></div>
                                <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"/></div>
                            </div>
                            <div className="mt-6 flex justify-end space-x-3"><button type="button" onClick={onClose} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg text-sm">Batal</button><button type="button" onClick={handleSubmit} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm">Simpan</button></div>
                        </Dialog.Panel>
                    </Transition.Child>
                </div></div>
            </Dialog>
        </Transition>
    );
};
const TaxSettings = ({ settings, onTaxUpdate, showNotification }) => {
    const [rate, setRate] = useState(settings.ppnRate * 100);
    useEffect(() => { setRate(settings.ppnRate * 100) }, [settings]);
    const handleSubmit = (e) => { e.preventDefault(); onTaxUpdate({ ppnRate: rate / 100 }); };
    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg text-gray-800 dark:text-gray-200">
            <div>
                <label className="block text-sm font-medium">Tarif PPN</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><PercentCircle size={16} className="text-gray-400"/></div>
                    <input type="number" value={rate} onChange={e => setRate(e.target.value)} className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 pl-10 p-2" placeholder="11" />
                </div>
            </div>
            <div className="pt-2"><button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm">Simpan Perubahan</button></div>
        </form>
    );
};

// --- MAIN APP LAYOUT ---
export default function App() {
  const [chartOfAccounts, setChartOfAccounts] = useState([]);
  const [clients, setClients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [companyProfile, setCompanyProfile] = useState({ name: '', address: '', phone: '', email: '' });
  const [taxSettings, setTaxSettings] = useState({ ppnRate: 0.11 });
  const [dashboardSettings, setDashboardSettings] = useState({ cashAccountIds: ['1101-01', '1101-02', '1101B'] });
  
  const [theme, setTheme] = useState('light');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [pageState, setPageState] = useState({ page: 'dashboard', params: null });
  const [isLoading, setIsLoading] = useState(true);
  
  const [modalState, setModalState] = useState({ isOpen: false, type: null, initialData: null });
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Fetch all data from Supabase on initial load
  useEffect(() => {
    const loadAllData = async () => {
        setIsLoading(true);
        await Promise.all([
            fetchAccounts(),
            fetchClients(),
            fetchSuppliers(),
            fetchJournalEntries(),
            fetchCompanyProfile(),
            fetchTaxSettings()
        ]);
        setIsLoading(false);
    };
    loadAllData();
    
    // Load PDF generation scripts
    const loadScript = (src, id) => {
      return new Promise((resolve, reject) => { 
        if (document.getElementById(id)) { resolve(); return; } 
        const script = document.createElement('script'); 
        script.src = src; script.id = id; 
        script.onload = () => resolve(); 
        script.onerror = () => reject(new Error(`Script load error for ${src}`)); 
        document.head.appendChild(script); 
      });
    };
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf-script')
        .then(() => loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.23/jspdf.plugin.autotable.min.js', 'jspdf-autotable-script'))
        .catch(error => console.error("Failed to load PDF scripts:", error));
  }, []);

  const balances = useAccountBalances(chartOfAccounts, journalEntries);
  
  // --- Data Fetching Functions ---
  const fetchAccounts = async () => { const { data } = await supabase.from('chart_of_accounts').select('*').order('id'); if (data) setChartOfAccounts(data); };
  const fetchClients = async () => { const { data } = await supabase.from('clients').select('*').order('name'); if (data) setClients(data); };
  const fetchSuppliers = async () => { const { data } = await supabase.from('suppliers').select('*').order('name'); if (data) setSuppliers(data); };
  const fetchJournalEntries = async () => { const { data } = await supabase.from('journal_entries').select('*').order('date', { ascending: false }); if (data) setJournalEntries(data); };
  const fetchCompanyProfile = async () => { const { data } = await supabase.from('company_profile').select('*').limit(1).single(); if (data) setCompanyProfile(data); };
  const fetchTaxSettings = async () => { const { data } = await supabase.from('tax_settings').select('*').limit(1).single(); if (data) setTaxSettings(data); };

  // --- Notification ---
  const showNotification = (message, type = 'success') => { setNotification({ show: true, message, type }); setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000); };
  
  // --- CRUD Handlers ---
  const handleSaveTransaction = async (entry) => {
    const { error } = await supabase.from('journal_entries').upsert(entry);
    if (error) { showNotification(`Error: ${error.message}`, 'error'); } 
    else { showNotification(`Transaksi ${entry.ref} berhasil disimpan!`); await fetchJournalEntries(); }
  };
  
  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { id, type, name } = deleteTarget;
    let tableName = '';
    if (type === 'transaksi') tableName = 'journal_entries';
    else if (type === 'akun') tableName = 'chart_of_accounts';
    else if (type === 'klien') tableName = 'clients';
    else if (type === 'pemasok') tableName = 'suppliers';
    
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) { showNotification(`Error: ${error.message}`, 'error'); }
    else {
        showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} ${name} berhasil dihapus.`);
        if (type === 'transaksi') await fetchJournalEntries();
        else if (type === 'akun') await fetchAccounts();
        else if (type === 'klien') await fetchClients();
        else if (type === 'pemasok') await fetchSuppliers();
    }
    setDeleteTarget(null);
  };

  const handleAccountAdd = async (account) => {
    const { error } = await supabase.from('chart_of_accounts').insert(account);
    if (error) { showNotification(`Error: ${error.message}`, 'error'); }
    else { showNotification('Akun baru berhasil ditambahkan.'); await fetchAccounts(); }
  };
  
  const handleAccountUpdate = async (account) => {
    const { error } = await supabase.from('chart_of_accounts').update(account).eq('id', account.id);
    if (error) { showNotification(`Error: ${error.message}`, 'error'); }
    else { showNotification('Akun berhasil diperbarui.'); await fetchAccounts(); }
  };

  const handleContactUpdate = async (contact, type) => {
    const tableName = type === 'Klien' ? 'clients' : 'suppliers';
    const { error } = await supabase.from(tableName).upsert(contact);
     if (error) { showNotification(`Error: ${error.message}`, 'error'); }
    else { 
        showNotification(`${type} berhasil disimpan.`); 
        if(type === 'Klien') await fetchClients(); else await fetchSuppliers();
    }
  };

  const handleProfileUpdate = async (profile) => {
    const { error } = await supabase.from('company_profile').update(profile).eq('id', profile.id);
    if (error) { showNotification(`Error: ${error.message}`, 'error'); }
    else { showNotification('Profil perusahaan berhasil diperbarui.'); await fetchCompanyProfile(); }
  };

  const handleTaxUpdate = async (settings) => {
    const { error } = await supabase.from('tax_settings').update(settings).eq('id', 1); // Assuming ID is 1
    if (error) { showNotification(`Error: ${error.message}`, 'error'); }
    else { showNotification('Pengaturan pajak berhasil diperbarui.'); await fetchTaxSettings(); }
  };

  const openDeleteModal = (target) => setDeleteTarget(target);
  const openTransactionModal = (type, initialData = null) => setModalState({ isOpen: true, type, initialData });
  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const navigateTo = (page, params = null) => setPageState({ page, params });

  const mainNavItems = [ 
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }, 
      { id: 'transaksi', label: 'Semua Transaksi', icon: ArrowRightLeft },
      { id: 'ledger', label: 'Buku Besar', icon: BookOpen }, 
      { id: 'reports', label: 'Laporan', icon: FileText }, 
      { id: 'settings', label: 'Pengaturan', icon: Settings } 
  ];
  const transactionNavItems = [ { label: 'Faktur Penjualan', icon: Receipt, type: 'sale' }, { label: 'Pembelian', icon: ShoppingCart, type: 'purchase' }, { label: 'Penerimaan Kas', icon: Landmark, type: 'cash_receipt' }, { label: 'Pengeluaran Kas', icon: Banknote, type: 'cash_payment' }, { label: 'Jurnal Umum', icon: BookCopy, type: 'journal' } ];

  const renderPage = () => {
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-12 w-12 animate-spin text-green-600" />
            </div>
        );
    }
    switch (pageState.page) {
      case 'dashboard': return <DashboardPage balances={balances} journalEntries={journalEntries} dashboardSettings={dashboardSettings} />;
      case 'transaksi': return <TransactionListPage journalEntries={journalEntries} accounts={chartOfAccounts} onEdit={(entry) => openTransactionModal(entry.type, entry)} onDelete={openDeleteModal} companyProfile={companyProfile} pageTitle="Semua Transaksi" />;
      case 'reports': return <ReportsPage accounts={chartOfAccounts} journalEntries={journalEntries} companyProfile={companyProfile}/>;
      case 'ledger': return <LedgerPage accounts={chartOfAccounts} entries={journalEntries} companyProfile={companyProfile} />;
      case 'settings': return <SettingsPage accounts={chartOfAccounts} onAccountAdd={handleAccountAdd} onAccountUpdate={handleAccountUpdate} companyProfile={companyProfile} onProfileUpdate={handleProfileUpdate} clients={clients} onClientUpdate={(c) => handleContactUpdate(c, 'Klien')} suppliers={suppliers} onSupplierUpdate={(s) => handleContactUpdate(s, 'Pemasok')} taxSettings={taxSettings} onTaxUpdate={handleTaxUpdate} showNotification={showNotification} balances={balances} onDelete={openDeleteModal} />;
      default: return <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">Halaman <strong>{pageState.page}</strong>.</div>;
    }
  };

  return (
    <div className={`flex h-screen font-sans ${theme}`}>
      <Transition show={isSidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40 md:hidden" onClose={setSidebarOpen}>
            <Transition.Child as={Fragment} enter="transition-opacity ease-linear duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="transition-opacity ease-linear duration-300" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black bg-opacity-30" /></Transition.Child>
            <div className="fixed inset-0 flex">
                <Transition.Child as={Fragment} enter="transition ease-in-out duration-300 transform" enterFrom="-translate-x-full" enterTo="translate-x-0" leave="transition ease-in-out duration-300 transform" leaveFrom="translate-x-0" leaveTo="-translate-x-full">
                    <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                        <div className="flex-1 bg-white dark:bg-gray-900"><aside className="w-full flex flex-col">
                            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700"><span className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center"><Briefcase className="mr-3 text-green-600"/> Smart Count</span><button onClick={() => setSidebarOpen(false)}><X/></button></div>
                            <nav className="flex-1 px-4 py-6 space-y-2">{mainNavItems.map(item => <a key={item.id} href="#" onClick={(e) => { e.preventDefault(); navigateTo(item.id); setSidebarOpen(false); }} className={`flex items-center px-4 py-2.5 rounded-lg transition-colors text-sm ${pageState.page === item.id ? 'bg-green-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}><item.icon className="mr-3" size={20} />{item.label}</a>)}</nav>
                        </aside></div>
                    </Dialog.Panel>
                </Transition.Child>
            </div>
        </Dialog>
      </Transition>

      <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex-col hidden md:flex print:hidden shadow-sm">
        <div className="h-16 flex items-center justify-center text-2xl font-bold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700"><Briefcase className="mr-3 text-green-600"/> Smart Count</div>
        <nav className="flex-1 px-4 py-6 space-y-2">
            {mainNavItems.map(item => <a key={item.id} href="#" onClick={(e) => { e.preventDefault(); navigateTo(item.id); }} className={`flex items-center px-4 py-2.5 rounded-lg transition-colors text-sm ${pageState.page === item.id ? 'bg-green-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}><item.icon className="mr-3" size={20} />{item.label}</a>)}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 print:hidden">
            <div className="flex items-center">
                <button onClick={() => setSidebarOpen(true)} className="md:hidden mr-4 text-gray-600 dark:text-gray-300"><MenuIcon size={24}/></button>
                <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200 capitalize">{pageState.page.replace(/([A-Z])/g, ' $1')}</h1>
            </div>
            <div className="flex items-center space-x-4">
                <button onClick={toggleTheme} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"> {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />} </button>
                <Menu as="div" className="relative inline-block text-left">
                    <Menu.Button className="inline-flex justify-center w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-green-600 text-white text-sm font-medium hover:bg-green-700">Buat Transaksi <ChevronDown className="-mr-1 ml-2 h-5 w-5" /></Menu.Button>
                    <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                        <Menu.Items className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 z-30 focus:outline-none">
                            <div className="py-1">{transactionNavItems.map(item => ( <Menu.Item key={item.type}>{({ active }) => <button onClick={() => openTransactionModal(item.type)} className={`${active ? 'bg-gray-100 dark:bg-gray-600' : ''} group flex rounded-md items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200`}><item.icon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />{item.label}</button>}</Menu.Item> ))}</div>
                        </Menu.Items>
                    </Transition>
                </Menu>
            </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900/95 p-4 md:p-6">{renderPage()}</main>
      </div>
      
      <TransactionModal {...modalState} closeModal={() => setModalState({ isOpen: false, type: null, initialData: null })} onSave={handleSaveTransaction} clients={clients} suppliers={suppliers} accounts={chartOfAccounts} taxSettings={taxSettings} showNotification={showNotification} />
      <Notification message={notification.message} show={notification.show} type={notification.type} />
      <ConfirmationModal 
        isOpen={!!deleteTarget} 
        onClose={() => setDeleteTarget(null)} 
        onConfirm={handleDelete}
        title={`Konfirmasi Hapus ${deleteTarget?.type}`}
        message={`Apakah Anda yakin ingin menghapus ${deleteTarget?.type} "${deleteTarget?.name}"? Aksi ini tidak dapat dibatalkan.`}
      />
    </div>
  );
}
            setLoading(false);
        };
        getSession();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });
        return () => subscription?.unsubscribe();
    }, []);

    const value = { user, signOut: () => supabase?.auth.signOut() };
    return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

const useAuth = () => useContext(AuthContext);

// --- HALAMAN LOGIN & REGISTER ---
const AuthPage = () => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleAuthAction = async (e) => {
        e.preventDefault();
        setLoading(true); setError(''); setMessage('');
        if (!supabase) {
            setError("Koneksi ke database gagal. Periksa konfigurasi 'Secrets'.");
            setLoading(false); return;
        }
        try {
            if (isLoginView) {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { company_name: companyName } } });
                if (error) throw error;
                if (data.user) setMessage('Registrasi berhasil! Silakan cek email Anda untuk verifikasi.');
            }
        } catch (error) {
            setError(error.message || 'Terjadi kesalahan.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-6">
                <div className="text-center">
                    <Briefcase className="mx-auto h-12 w-auto text-green-600" />
                    <h2 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">{isLoginView ? 'Selamat Datang Kembali' : 'Buat Akun Baru'}</h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{isLoginView ? 'Masuk untuk melanjutkan ke Smart Count.' : 'Mulai kelola keuangan Anda dengan mudah.'}</p>
                </div>
                <form className="space-y-6" onSubmit={handleAuthAction}>
                    {!isLoginView && (
                        <div>
                            <label htmlFor="companyName" className="text-sm font-medium text-gray-700 dark:text-gray-300">Nama Perusahaan</label>
                            <input id="companyName" name="companyName" type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="mt-1 w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-green-500 focus:border-green-500" placeholder="PT. Usaha Jaya" />
                        </div>
                    )}
                    <div>
                        <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">Alamat Email</label>
                        <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-green-500 focus:border-green-500" placeholder="anda@email.com" />
                    </div>
                    <div>
                        <label htmlFor="password"className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                        <div className="relative mt-1">
                            <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-green-500 focus:border-green-500" placeholder="••••••••" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-500 dark:text-gray-400">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                        </div>
                    </div>
                    {error && <p className="text-sm text-red-600 bg-red-100 dark:bg-red-900/20 p-3 rounded-lg">{error}</p>}
                    {message && <p className="text-sm text-green-600 bg-green-100 dark:bg-green-900/20 p-3 rounded-lg">{message}</p>}
                    <div>
                        <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50">{loading ? <Loader2 className="animate-spin" /> : (isLoginView ? 'Masuk' : 'Daftar')}</button>
                    </div>
                </form>
                <p className="text-center text-sm text-gray-600 dark:text-gray-400">{isLoginView ? 'Belum punya akun?' : 'Sudah punya akun?'} <button onClick={() => { setIsLoginView(!isLoginView); setError(''); setMessage(''); }} className="font-medium text-green-600 hover:text-green-500 ml-1">{isLoginView ? 'Daftar sekarang' : 'Masuk di sini'}</button></p>
            </div>
        </div>
    );
};

// --- KOMPONEN UTAMA APLIKASI (setelah login) ---
const AppLayout = () => {
    // State aplikasi
    const { user, signOut } = useAuth();
    const [chartOfAccounts, setChartOfAccounts] = useState([]);
    const [clients, setClients] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [journalEntries, setJournalEntries] = useState([]);
    const [theme, setTheme] = useState('light');
    const [companyProfile, setCompanyProfile] = useState({ name: '', address: '', phone: '', email: '' });
    const [taxSettings, setTaxSettings] = useState({ ppnRate: 0.11 });
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [pageState, setPageState] = useState({ page: 'dashboard', params: null });
    const [modalState, setModalState] = useState({ isOpen: false, type: null, initialData: null });
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [loading, setLoading] = useState(true);

    // --- UTILITY & HOOKS ---
    const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

    const useAccountBalances = (accounts, entries) => useMemo(() => {
        if (!accounts || !entries) return {};
        const balances = accounts.reduce((acc, account) => ({ ...acc, [account.id]: { ...account, balance: Number(account.opening_balance) || 0 } }), {});
        entries.forEach(entry => {
            if (!entry.transactions) return;
            entry.transactions.forEach(t => {
                const accountUUID = t.account_id;
                if (balances[accountUUID]) {
                    const acc = balances[accountUUID];
                    if (acc.category === 'Aset' || acc.category === 'Beban') {
                        balances[accountUUID].balance += (Number(t.debit) || 0) - (Number(t.credit) || 0);
                    } else {
                        balances[accountUUID].balance += (Number(t.credit) || 0) - (Number(t.debit) || 0);
                    }
                }
            })
        });
        return balances;
    }, [accounts, entries]);

    const balances = useAccountBalances(chartOfAccounts, journalEntries);
    const dashboardSettings = { cashAccountIds: chartOfAccounts.filter(a => a.sub_category === 'Bank').map(a => a.id) };

    // --- PENGAMBILAN DATA DARI SUPABASE ---
    const fetchData = async () => {
        if (!user || !supabase) return;
        setLoading(true);
        try {
            const [profileRes, coaRes, contactsRes, entriesRes] = await Promise.all([
                supabase.from('profiles').select('company_name').eq('id', user.id).single(),
                supabase.from('chart_of_accounts').select('*').eq('user_id', user.id),
                supabase.from('contacts').select('*').eq('user_id', user.id),
                supabase.from('journal_entries').select('*, transactions:journal_transactions(*, account:chart_of_accounts(name, category, account_id))').eq('user_id', user.id).order('date', { ascending: false })
            ]);

            if (profileRes.error) throw profileRes.error;
            setCompanyProfile(prev => ({ ...prev, name: profileRes.data.company_name, email: user.email }));

            if (coaRes.error) throw coaRes.error;
            setChartOfAccounts(coaRes.data.sort((a, b) => a.account_id.localeCompare(b.account_id)));

            if (contactsRes.error) throw contactsRes.error;
            setClients(contactsRes.data.filter(c => c.type === 'client'));
            setSuppliers(contactsRes.data.filter(c => c.type === 'supplier'));

            if (entriesRes.error) throw entriesRes.error;
            setJournalEntries(entriesRes.data);

        } catch (error) {
            console.error("Error fetching data:", error);
            showNotification(`Gagal memuat data: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    // --- FUNGSI-FUNGSI APLIKASI ---
    const showNotification = (message, type = 'success') => { setNotification({ show: true, message, type }); setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000); };
    const navigateTo = (page, params = null) => setPageState({ page, params });
    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
    const openDeleteModal = (target) => setDeleteTarget(target);
    const openTransactionModal = (type, initialData = null) => setModalState({ isOpen: true, type, initialData });

    const handleSaveTransaction = async (entry) => {
        if (!supabase || !user) return;
        const { transactions, id, ...entryData } = entry;
        const isNewEntry = !id;

        try {
            let entryId = id;
            if (isNewEntry) {
                const { data: newEntry, error } = await supabase.from('journal_entries').insert({ ...entryData, user_id: user.id }).select('id').single();
                if (error) throw error;
                entryId = newEntry.id;
            } else {
                const { error } = await supabase.from('journal_entries').update(entryData).eq('id', entryId);
                if (error) throw error;
                const { error: deleteError } = await supabase.from('journal_transactions').delete().eq('entry_id', entryId);
                if (deleteError) throw deleteError;
            }

            const transactionsToInsert = transactions.map(t => ({
                entry_id: entryId,
                account_id: t.accountId, // Ini adalah UUID dari tabel chart_of_accounts
                debit: Number(t.debit) || 0,
                credit: Number(t.credit) || 0,
            }));

            const { error: transError } = await supabase.from('journal_transactions').insert(transactionsToInsert);
            if (transError) throw transError;

            showNotification(`Transaksi ${entry.ref} berhasil disimpan!`);
            fetchData(); // Refresh data
        } catch (error) {
            showNotification(`Gagal menyimpan transaksi: ${error.message}`, 'error');
            console.error("Save transaction error:", error);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget || !supabase) return;
        const { id, type, name } = deleteTarget;
        try {
            let error;
            switch (type) {
                case 'transaksi': ({ error } = await supabase.from('journal_entries').delete().eq('id', id)); break;
                case 'akun': ({ error } = await supabase.from('chart_of_accounts').delete().eq('id', id)); break;
                case 'klien':
                case 'pemasok': ({ error } = await supabase.from('contacts').delete().eq('id', id)); break;
                default: return;
            }
            if (error) throw error;
            showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} "${name}" berhasil dihapus.`);
            fetchData(); // Refresh data
        } catch (error) {
            showNotification(`Gagal menghapus: ${error.message}`, 'error');
        } finally {
            setDeleteTarget(null);
        }
    };

    // --- UI COMPONENTS ---
    const StatCard = React.memo(({ title, value, icon, color }) => ( <div className="bg-white dark:bg-gray-800 p-5 shadow-sm rounded-lg flex items-center space-x-4 border-l-4" style={{borderColor: color}}> <div className="text-3xl" style={{color}}>{icon}</div> <div> <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p> <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{value}</p> </div> </div> ));
    const Notification = React.memo(({ message, show }) => { if (!show) return null; return ( <div className="fixed top-5 right-5 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg z-50 animate-fade-in-out"> {message} </div> ); });
    const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-40" onClose={onClose}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black bg-opacity-40" /></Transition.Child>
                <div className="fixed inset-0 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4 text-center">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                        <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                            <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">{title}</Dialog.Title>
                            <div className="mt-2"><p className="text-sm text-gray-500 dark:text-gray-400">{message}</p></div>
                            <div className="mt-4 flex justify-end space-x-3">
                                <button type="button" onClick={onClose} className="inline-flex justify-center rounded-md border border-transparent bg-gray-200 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600">Batal</button>
                                <button type="button" onClick={onConfirm} className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Hapus</button>
                            </div>
                        </Dialog.Panel>
                    </Transition.Child>
                </div></div>
            </Dialog>
        </Transition>
    );
    
    // --- PAGES & MODALS ---
    const DashboardPage = ({ balances, journalEntries, dashboardSettings }) => {
        const totalSales = useMemo(() => {
            if (!journalEntries) return 0;
            return journalEntries.filter(e => e.type === 'sale').reduce((sum, entry) => {
                if(!entry.transactions) return sum;
                const revenueAccounts = ['Income', 'Other Income'];
                const saleAmount = entry.transactions
                    .filter(t => t.credit > 0 && t.account && revenueAccounts.includes(t.account.category))
                    .reduce((acc, curr) => acc + Number(curr.credit), 0);
                return sum + saleAmount;
            }, 0)
        }, [journalEntries]);
        
        const totalCash = useMemo(() => {
            if (!dashboardSettings?.cashAccountIds || Object.keys(balances).length === 0) return 0;
            return dashboardSettings.cashAccountIds.reduce((sum, accId) => sum + (balances[accId]?.balance || 0), 0)
        }, [balances, dashboardSettings]);
        
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <StatCard title="Total Penjualan" value={formatCurrency(totalSales)} icon={<Receipt/>} color="#10B981" />
                    <StatCard title="Total Kas & Bank" value={formatCurrency(totalCash)} icon={<Landmark/>} color="#3B82F6" />
                </div>
            </div>
        );
    };

    const TransactionListPage = () => {
        return <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">Halaman Semua Transaksi</div>;
    }

    const ReportsPage = () => {
        return <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">Halaman Laporan</div>;
    }

    const SettingsPage = () => {
        return <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">Halaman Pengaturan</div>;
    }

    // --- RENDER HALAMAN ---
    const mainNavItems = [ 
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }, 
        { id: 'transaksi', label: 'Semua Transaksi', icon: ArrowRightLeft },
        { id: 'reports', label: 'Laporan', icon: FileText }, 
        { id: 'settings', label: 'Pengaturan', icon: Settings } 
    ];

    const renderPage = () => {
        if (loading) {
            return <div className="flex justify-center items-center h-full"><Loader2 size={48} className="animate-spin text-green-600" /></div>;
        }
        switch (pageState.page) {
            case 'dashboard': return <DashboardPage balances={balances} journalEntries={journalEntries} dashboardSettings={dashboardSettings} />;
            case 'transaksi': return <TransactionListPage />;
            case 'reports': return <ReportsPage />;
            case 'settings': return <SettingsPage />;
            default: return <DashboardPage balances={balances} journalEntries={journalEntries} dashboardSettings={dashboardSettings} />;
        }
    };

    return (
        <div className={`flex h-screen font-sans ${theme}`}>
            <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex-col hidden md:flex print:hidden shadow-sm">
                <div className="h-16 flex items-center justify-center text-2xl font-bold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700"><Briefcase className="mr-3 text-green-600"/> Smart Count</div>
                <nav className="flex-1 px-4 py-6 space-y-2">
                    {mainNavItems.map(item => <a key={item.id} href="#" onClick={(e) => { e.preventDefault(); navigateTo(item.id); }} className={`flex items-center px-4 py-2.5 rounded-lg transition-colors text-sm ${pageState.page === item.id ? 'bg-green-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}><item.icon className="mr-3" size={20} />{item.label}</a>)}
                </nav>
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <button onClick={signOut} className="w-full flex items-center justify-center px-4 py-2.5 rounded-lg transition-colors text-sm text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20"><LogOut className="mr-3" size={20} />Logout</button>
                </div>
            </aside>
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 print:hidden">
                    <div className="flex items-center">
                        <button onClick={() => setSidebarOpen(true)} className="md:hidden mr-4 text-gray-600 dark:text-gray-300"><MenuIcon size={24}/></button>
                        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200 capitalize">{pageState.page}</h1>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button onClick={toggleTheme} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">{theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}</button>
                    </div>
                </header>
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900/95 p-4 md:p-6">{renderPage()}</main>
            </div>
            <Notification message={notification.message} show={notification.show} />
            <ConfirmationModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title={`Konfirmasi Hapus ${deleteTarget?.type}`} message={`Apakah Anda yakin ingin menghapus ${deleteTarget?.type} "${deleteTarget?.name}"? Aksi ini tidak dapat dibatalkan.`} />
        </div>
    );
};

// --- ROUTER UTAMA & PENYEDIA KONTEKS ---
const AppRouter = () => {
    const { user } = useAuth();
    return user ? <AppLayout /> : <AuthPage />;
};

export default function App() {
    return (
        <AuthProvider>
            <AppRouter />
        </AuthProvider>
    );
}
