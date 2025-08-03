import React, { useState, useMemo, Fragment, useEffect, useRef, createContext, useContext } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Dialog, Transition, Menu } from '@headlessui/react';
import { 
    LayoutDashboard, BookOpen, FileText, Settings, X, PlusCircle, Trash2, Briefcase,
    Edit, Save, FileSignature, ChevronDown, ArrowLeft, LogOut,
    Receipt, ShoppingCart, Landmark, Banknote, BookCopy, MoreVertical, ArrowRightLeft, Download, Sun, Moon,
    Users, PercentCircle, AlertTriangle, Menu as MenuIcon, UploadCloud, Info, Loader2, Eye, EyeOff
} from 'lucide-react';

// --- 1. KLIEN SUPABASE ---
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

let supabase;
if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
    console.error("Supabase URL and Anon Key are required. Please set them in the 'Secrets' tab or your .env.local file.");
}

// --- 2. KONTEKS AUTENTIKASI ---
const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            return;
        }
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
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
