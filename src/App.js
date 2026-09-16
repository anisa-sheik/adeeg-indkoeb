import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, query, orderBy, getDoc, writeBatch, getDocs, limit } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB5maoonF8cWoO-sDCfrzj0N5k7zXIaZ9s",
  authDomain: "adeeg-e2635.firebaseapp.com",
  projectId: "adeeg-e2635",
  storageBucket: "adeeg-e2635.appspot.com",
  messagingSenderId: "549413168791",
  appId: "1:549413168791:web:f800089d7f8f5368a66bd2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CATEGORIES = {
  dagligvarer: { label: '🛒 Dagligvarer', color: '#ffffff' },
  groent: { label: '🥬 Grønt & Frugt', color: '#e8f5e9' },
  koed: { label: '🍖 Kød & Mejeri', color: '#ffebee' },
  husholdning: { label: '🧼 Husholdning', color: '#e3f2fd' }
};

function App() {
  const [activeTab, setActiveTab] = useState('list');
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('stk');
  const [category, setCategory] = useState('dagligvarer');
  const [monthlyBudget, setMonthlyBudget] = useState(1000);

  const date = new Date();
  const dagensDato = new Intl.DateTimeFormat('da-DK', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);

  useEffect(() => {
    const qItems = query(collection(db, 'shoppingList'), orderBy('createdAt', 'desc'));
    const unsubscribeItems = onSnapshot(qItems, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });

    const qHistory = query(collection(db, 'history'), orderBy('archivedAt', 'desc'), limit(30));
    const unsubscribeHistory = onSnapshot(qHistory, (snapshot) => {
      setHistory(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });

    const fetchBudget = async () => {
      const budgetRef = doc(db, 'settings', 'budget');
      const docSnap = await getDoc(budgetRef);
      if (docSnap.exists()) setMonthlyBudget(Number(docSnap.data().monthlyBudget) || 0);
    };
    fetchBudget();

    return () => { unsubscribeItems(); unsubscribeHistory(); };
  }, []);

  const totalSpent = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const timeLeft = Number(monthlyBudget) - totalSpent;

  const addItem = async (e) => {
    e.preventDefault();
    if (name && price) {
      await addDoc(collection(db, 'shoppingList'), { 
        name, price: Number(price), quantity, unit, category, completed: false, createdAt: new Date()
      });
      setName(''); setPrice(''); setQuantity('1');
      setActiveTab('list');
    }
  };

  const archiveList = async () => {
    const completedItems = items.filter(i => i.completed);
    if (completedItems.length === 0) return alert("Marker venligst købte varer først.");
    
    if (window.confirm(`Gem ${completedItems.length} varer i historikken?`)) {
      const batch = writeBatch(db);
      completedItems.forEach((item) => {
        const historyRef = doc(collection(db, 'history'));
        batch.set(historyRef, { 
          ...item, 
          archivedAt: new Date() // Her gemmes datoen for købet
        });
        batch.delete(doc(db, 'shoppingList', item.id));
      });
      await batch.commit();
      setActiveTab('history');
    }
  };

  const formatHistoryDate = (timestamp) => {
    if (!timestamp) return "";
    const d = timestamp.toDate();
    return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Adeeg Indkøb 🍅</h1>
        <p style={styles.dateDisplay}>{dagensDato}</p>
      </div>

      <div style={styles.content}>
        {activeTab === 'list' && (
          <>
            <div style={{...styles.budgetBox, backgroundColor: timeLeft < 0 ? '#ff4d4d' : '#1a73e8'}}>
              <div>
                <label style={styles.labelWhite}>MÅNEDLIGT BUDGET</label>
                <input type="number" value={monthlyBudget} onChange={(e) => setMonthlyBudget(e.target.value)} style={styles.budgetInput} />
              </div>
              <div style={{textAlign: 'right'}}>
                <label style={styles.labelWhite}>TILBAGE</label>
                <div style={styles.totalAmount}>{timeLeft} kr.</div>
              </div>
            </div>

            <div style={styles.listHeader}>
              <h3 style={styles.sectionTitle}>Din Liste ({items.length})</h3>
              <button onClick={archiveList} style={styles.clearAllBtn}>Ryd & Gem</button>
            </div>

            {items.map(item => (
              <div key={item.id} style={{...styles.itemCard, backgroundColor: CATEGORIES[item.category]?.color, opacity: item.completed ? 0.6 : 1}}>
                <button onClick={() => updateDoc(doc(db, 'shoppingList', item.id), { completed: !item.completed })} style={{...styles.checkBtn, color: item.completed ? '#34a853' : '#ccc'}}>
                  {item.completed ? '●' : '○'}
                </button>
                <div style={{flex: 1, textDecoration: item.completed ? 'line-through' : 'none'}}>
                  <div style={styles.catLabel}>{CATEGORIES[item.category]?.label}</div>
                  <div style={{fontWeight: 'bold', fontSize: '18px'}}>{item.name}</div>
                  <div style={{fontSize: '13px'}}>{item.quantity} {item.unit} — {item.price} kr.</div>
                </div>
                <button onClick={() => deleteDoc(doc(db, 'shoppingList', item.id))} style={styles.deleteBtn}>✕</button>
              </div>
            ))}
          </>
        )}

        {activeTab === 'add' && (
          <div style={styles.tabContent}>
            <h2 style={styles.sectionTitle}>Tilføj ny vare</h2>
            <form onSubmit={addItem} style={styles.form}>
              <label style={styles.inputLabel}>Varenavn</label>
              <input style={styles.input} placeholder="f.eks. Brød" value={name} onChange={(e) => setName(e.target.value)} />
              <label style={styles.inputLabel}>Kategori</label>
              <select style={styles.input} value={category} onChange={(e) => setCategory(e.target.value)}>
                {Object.keys(CATEGORIES).map(k => <option key={k} value={k}>{CATEGORIES[k].label}</option>)}
              </select>
              <div style={styles.mobileRow}>
                <div style={{flex: 1}}><label style={styles.inputLabel}>Antal</label><input style={styles.input} type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
                <div style={{flex: 1}}><label style={styles.inputLabel}>Enhed</label><select style={styles.input} value={unit} onChange={(e) => setUnit(e.target.value)}><option value="stk">stk</option><option value="kg">kg</option><option value="pk">pk</option><option value="L">L</option></select></div>
              </div>
              <label style={styles.inputLabel}>Pris i alt</label>
              <input style={styles.input} type="number" placeholder="0" value={price} onChange={(e) => setPrice(e.target.value)} />
              <button type="submit" style={styles.mainButton}>Tilføj nu</button>
            </form>
          </div>
        )}

        {activeTab === 'history' && (
          <div style={styles.tabContent}>
            <h2 style={styles.sectionTitle}>Historik</h2>
            {history.map(h => (
              <div key={h.id} style={styles.historyCard}>
                <div style={{display: 'flex', flexDirection: 'column'}}>
                  <span style={{fontSize: '10px', color: '#1a73e8', fontWeight: 'bold'}}>{formatHistoryDate(h.archivedAt)}</span>
                  <span style={{fontWeight: '500'}}>{h.name}</span>
                </div>
                <span style={{fontWeight: 'bold', color: '#444'}}>{h.price} kr.</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.tabBar}>
        <button onClick={() => setActiveTab('list')} style={{...styles.tabItem, color: activeTab === 'list' ? '#1a73e8' : '#999'}}>
          <span>🛒</span><label style={{fontSize: '10px', cursor: 'pointer'}}>Liste</label>
        </button>
        <button onClick={() => setActiveTab('add')} style={{...styles.tabItem, color: activeTab === 'add' ? '#1a73e8' : '#999'}}>
          <span style={{fontSize: '28px', marginTop: '-5px'}}>➕</span><label style={{fontSize: '10px', cursor: 'pointer'}}>Tilføj</label>
        </button>
        <button onClick={() => setActiveTab('history')} style={{...styles.tabItem, color: activeTab === 'history' ? '#1a73e8' : '#999'}}>
          <span>📜</span><label style={{fontSize: '10px', cursor: 'pointer'}}>Historik</label>
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { backgroundColor: '#f7f9fc', minHeight: '100vh', paddingBottom: '90px', fontFamily: '-apple-system, sans-serif' },
  header: { backgroundColor: 'white', padding: '20px 15px 10px', textAlign: 'center', borderBottom: '1px solid #eee' },
  title: { color: '#1a73e8', margin: '0', fontSize: '22px', fontWeight: 'bold' },
  dateDisplay: { color: '#888', fontSize: '12px', marginTop: '4px' },
  content: { padding: '15px', maxWidth: '500px', margin: '0 auto' },
  tabContent: { backgroundColor: 'white', padding: '20px', borderRadius: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
  budgetBox: { color: 'white', padding: '15px', borderRadius: '18px', display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' },
  labelWhite: { fontSize: '10px', fontWeight: 'bold', opacity: 0.8, display: 'block' },
  budgetInput: { background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: '18px', fontWeight: 'bold', padding: '5px', borderRadius: '5px', width: '70px', outline: 'none' },
  totalAmount: { fontWeight: 'bold', fontSize: '24px' },
  listHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  sectionTitle: { fontSize: '18px', color: '#333', margin: '0 0 15px 0' },
  clearAllBtn: { backgroundColor: '#fff', color: '#1a73e8', border: '1px solid #1a73e8', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' },
  itemCard: { display: 'flex', gap: '12px', padding: '15px', marginBottom: '10px', borderRadius: '18px', alignItems: 'center', border: '1px solid #f0f0f0' },
  checkBtn: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' },
  catLabel: { fontSize: '9px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase' },
  deleteBtn: { backgroundColor: 'transparent', color: '#ff4d4d', border: 'none', fontSize: '18px' },
  inputLabel: { fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '12px', borderRadius: '10px', border: '1px solid #eee', fontSize: '16px', backgroundColor: '#f9f9f9', width: '100%', boxSizing: 'border-box' },
  mobileRow: { display: 'flex', gap: '10px' },
  mainButton: { padding: '16px', backgroundColor: '#34a853', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 'bold', fontSize: '16px', marginTop: '10px' },
  historyCard: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f0f0f0', alignItems: 'center' },
  tabBar: { position: 'fixed', bottom: 0, left: 0, right: 0, height: '75px', backgroundColor: 'white', display: 'flex', justifyContent: 'space-around', alignItems: 'center', borderTop: '1px solid #eee', paddingBottom: '15px' },
  tabItem: { background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', fontSize: '22px' }
};

export default App;