import { useEffect, useMemo, useState } from "react";
import { Wallet, LayoutDashboard, ReceiptText, CreditCard, Plus, Trash2, Check, CircleAlert, TrendingUp, TrendingDown, CalendarDays, X, House, Droplets, Zap, ShoppingBasket } from "lucide-react";

const KEY = "me-ajuda-data-v1";
const money = value => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const monthKey = date => String(date || today()).slice(0, 7);
const addMonths = (month, count) => { const [y, m] = month.split("-").map(Number); const d = new Date(y, m - 1 + count, 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };
const monthLabel = month => { const [y,m] = month.split("-").map(Number); return new Date(y,m-1,1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }); };
const invoiceMonthFor = (date, closing) => { const month = monthKey(date); return Number(date.slice(8,10)) > Number(closing) ? addMonths(month, 1) : month; };
const invoiceKey = (cardId, month) => `${cardId}:${month}`;
const today = () => {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
const initial = {
  transactions: [
    { id: 1, title: "Salário", amount: 2800, type: "income", category: "Salário", date: today(), method: "Conta" },
    { id: 2, title: "Mercado", amount: 235.7, type: "expense", category: "Alimentação", date: today(), method: "Débito" },
    { id: 3, title: "Streaming", amount: 39.9, type: "expense", category: "Assinaturas", date: today(), method: "Crédito" }
  ],
  bills: [
    { id: 4, title: "Internet", amount: 99.9, due: today(), paid: false },
    { id: 5, title: "Energia", amount: 145, due: today(), paid: true }
  ],
  cards: [{ id: 6, name: "Meu cartão", limit: 1500, closing: "10", due: "17" }],
  houseExpenses: []
};

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!saved || typeof saved !== "object") return initial;
    return {
      transactions: Array.isArray(saved.transactions) ? saved.transactions : [],
      bills: Array.isArray(saved.bills) ? saved.bills : [],
      cards: Array.isArray(saved.cards) ? saved.cards : [],
      houseExpenses: Array.isArray(saved.houseExpenses) ? saved.houseExpenses : [],
      paidInvoices: saved.paidInvoices && typeof saved.paidInvoices === "object" ? saved.paidInvoices : {},
    };
  } catch { return initial; }
}

export default function App() {
  const [data, setData] = useState(loadData);
  const [tab, setTab] = useState("home");
  const [modal, setModal] = useState("");
  const [form, setForm] = useState({ title: "", amount: "", type: "expense", category: "Alimentação", date: today(), method: "Conta", cardId: "", installments: "1" });
  const [billForm, setBillForm] = useState({ title: "", amount: "", due: today() });
  const [cardForm, setCardForm] = useState({ name: "", limit: "", closing: "10", due: "17" });
  const [houseForm, setHouseForm] = useState({ title: "", amount: "", category: "Mercado", date: today(), notes: "" });
  const [backupMessage, setBackupMessage] = useState("");

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(data)); setBackupMessage(""); }
    catch { setBackupMessage("Não foi possível salvar. Exporte um backup e libere espaço no dispositivo."); }
  }, [data]);

  function exportBackup() {
    const payload = { app: "Me ajuda!", version: 1, exportedAt: new Date().toISOString(), data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `me-ajuda-backup-${today()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setBackupMessage("Backup exportado. Guarde esse arquivo em um local seguro.");
  }

  function importBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const imported = parsed.data || parsed;
        if (!Array.isArray(imported.transactions) || !Array.isArray(imported.bills) || !Array.isArray(imported.cards)) throw new Error("invalid");
        if (!window.confirm("Importar este backup substituirá os dados atuais. Deseja continuar?")) return;
        setData({ transactions: imported.transactions, bills: imported.bills, cards: imported.cards, houseExpenses: Array.isArray(imported.houseExpenses) ? imported.houseExpenses : [], paidInvoices: imported.paidInvoices || {} });
        setBackupMessage("Backup restaurado com sucesso.");
      } catch { setBackupMessage("Arquivo inválido. Selecione um backup exportado pelo Me ajuda!."); }
      finally { event.target.value = ""; }
    };
    reader.readAsText(file);
  }

  const monthTransactions = useMemo(() => data.transactions.filter(t => t.date?.slice(0, 7) === today().slice(0, 7)), [data.transactions]);
  const income = monthTransactions.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expenses = monthTransactions.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const balance = income - expenses;
  const pending = data.bills.filter(b => !b.paid).reduce((s, b) => s + Number(b.amount), 0);
  const spentOnCards = monthTransactions.filter(t => t.type === "expense" && t.method === "Crédito").reduce((s, t) => s + Number(t.amount), 0);
  const cardTransactions = data.transactions.filter(t => t.type === "expense" && t.method === "Crédito" && t.cardId);
  const legacyCreditCount = data.transactions.filter(t => t.type === "expense" && t.method === "Crédito" && !t.cardId).length;
  const cardOutstanding = card => cardTransactions.filter(t => String(t.cardId) === String(card.id) && !data.paidInvoices?.[invoiceKey(card.id, t.invoiceMonth || monthKey(t.date))]).reduce((sum,t) => sum + Number(t.amount), 0);
  const invoiceItems = (card, month) => cardTransactions.filter(t => String(t.cardId) === String(card.id) && (t.invoiceMonth || monthKey(t.date)) === month);
  const invoiceTotal = (card, month) => invoiceItems(card, month).reduce((sum,t) => sum + Number(t.amount), 0);
  const monthHouseExpenses = data.houseExpenses.filter(item => item.date?.slice(0, 7) === today().slice(0, 7));
  const houseTotal = monthHouseExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const houseByCategory = monthHouseExpenses.reduce((groups, item) => { groups[item.category] = (groups[item.category] || 0) + Number(item.amount); return groups; }, {});

  function addTransaction(e) {
    e.preventDefault();
    if (!form.title.trim() || Number(form.amount) <= 0) return;
    if (form.method === "Crédito") {
      const card = data.cards.find(c => String(c.id) === String(form.cardId));
      if (!card) { window.alert("Selecione o cartão usado nesta compra."); return; }
      const count = Math.max(1, Math.min(48, Number(form.installments) || 1));
      const total = Math.round(Number(form.amount) * 100);
      const base = Math.floor(total / count);
      const remainder = total - base * count;
      const purchaseId = Date.now();
      const rows = Array.from({ length: count }, (_, index) => {
        const invoiceMonth = addMonths(invoiceMonthFor(form.date, card.closing), index);
        return { id: purchaseId + index, purchaseId, title: form.title, amount: (base + (index < remainder ? 1 : 0)) / 100, type: "expense", category: form.category, date: `${invoiceMonth}-01`, purchaseDate: form.date, method: "Crédito", cardId: card.id, invoiceMonth, installmentNumber: index + 1, installments: count };
      });
      const committed = cardOutstanding(card);
      if (committed + Number(form.amount) > Number(card.limit)) {
        const proceed = window.confirm(`Esta compra compromete ${money(Number(form.amount))} e ultrapassa o limite disponível de ${money(Math.max(0, Number(card.limit) - committed))}. Deseja registrar mesmo assim?`);
        if (!proceed) return;
      }
      setData(d => {
        const paidInvoices = { ...(d.paidInvoices || {}) };
        rows.forEach(row => { delete paidInvoices[invoiceKey(card.id, row.invoiceMonth)]; });
        return { ...d, transactions: [...rows, ...d.transactions], paidInvoices };
      });
    } else {
      setData(d => ({ ...d, transactions: [{ ...form, id: Date.now(), amount: Number(form.amount) }, ...d.transactions] }));
    }
    setForm({ title: "", amount: "", type: "expense", category: "Alimentação", date: today(), method: "Conta", cardId: "", installments: "1" });
    setModal("");
  }
  function addBill(e) {
    e.preventDefault();
    if (!billForm.title.trim() || Number(billForm.amount) <= 0) return;
    setData(d => ({ ...d, bills: [{ ...billForm, id: Date.now(), amount: Number(billForm.amount), paid: false }, ...d.bills] }));
    setBillForm({ title: "", amount: "", due: today() }); setModal("");
  }
  function addHouseExpense(e) {
    e.preventDefault();
    if (!houseForm.title.trim() || Number(houseForm.amount) <= 0) return;
    const id = Date.now();
    const amount = Number(houseForm.amount);
    const houseItem = { ...houseForm, id, amount };
    const transaction = { id, title: houseForm.title, amount, type: "expense", category: houseForm.category, date: houseForm.date, method: "Conta", houseExpense: true };
    setData(d => ({ ...d, houseExpenses: [houseItem, ...d.houseExpenses], transactions: [transaction, ...d.transactions] }));
    setHouseForm({ title: "", amount: "", category: "Mercado", date: today(), notes: "" });
    setModal("");
  }
  function addCard(e) {
    e.preventDefault();
    if (!cardForm.name.trim() || Number(cardForm.limit) <= 0) return;
    setData(d => ({ ...d, cards: [...d.cards, { ...cardForm, id: Date.now(), limit: Number(cardForm.limit) }] }));
    setCardForm({ name: "", limit: "", closing: "10", due: "17" }); setModal("");
  }
  const remove = (collection, id) => setData(d => {
    const target = d[collection].find(item => item.id === id);
    const next = { ...d, [collection]: d[collection].filter(item => item.id !== id) };
    if (collection === "houseExpenses") next.transactions = d.transactions.filter(item => item.id !== id);
    if (collection === "transactions") {
      const purchaseId = target?.purchaseId;
      next.transactions = d.transactions.filter(item => purchaseId ? item.purchaseId !== purchaseId : item.id !== id);
      next.houseExpenses = d.houseExpenses.filter(item => item.id !== id);
    }
    if (collection === "cards") next.transactions = d.transactions.map(item => String(item.cardId) === String(id) ? { ...item, cardId: null } : item);
    return next;
  });
  const toggleBill = id => setData(d => ({ ...d, bills: d.bills.map(b => b.id === id ? { ...b, paid: !b.paid } : b) }));
  const toggleInvoice = (cardId, month) => setData(d => { const key = invoiceKey(cardId, month); const paidInvoices = { ...(d.paidInvoices || {}) }; if (paidInvoices[key]) delete paidInvoices[key]; else paidInvoices[key] = new Date().toISOString(); return { ...d, paidInvoices }; });

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-icon"><Wallet size={21}/></div><div><strong>Me ajuda!</strong><span>seu dinheiro, no controle</span></div></div>
      <div className="month-pill"><CalendarDays size={15}/>{new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</div>
    </header>

    <main>
      {tab === "home" && <section>
        <div className="welcome"><div><p className="eyebrow">VISÃO GERAL</p><h1>Vamos cuidar do seu dinheiro. 💜</h1><p className="muted">Um passo de cada vez. Sem culpa, só clareza.</p></div></div>
        <div className="balance-card">
          <div className="balance-head"><span>Saldo do mês</span><span className="live-dot">● atualizado</span></div>
          <h2>{money(balance)}</h2>
          <div className="balance-foot"><span><TrendingUp size={16}/> Entradas {money(income)}</span><span><TrendingDown size={16}/> Saídas {money(expenses)}</span></div>
        </div>
        <div className="stat-grid">
          <div className="stat-card"><div className="stat-icon green"><TrendingUp size={18}/></div><span>Entradas</span><strong>{money(income)}</strong></div>
          <div className="stat-card"><div className="stat-icon rose"><TrendingDown size={18}/></div><span>Despesas</span><strong>{money(expenses)}</strong></div>
          <div className="stat-card"><div className="stat-icon lilac"><CircleAlert size={18}/></div><span>Contas pendentes</span><strong>{money(pending)}</strong></div>
          <div className="stat-card"><div className="stat-icon peach"><CreditCard size={18}/></div><span>Gastos no crédito</span><strong>{money(spentOnCards)}</strong></div>
        </div>
        <div className="stat-card house-highlight" onClick={() => setTab("house")} role="button" tabIndex={0}><div className="stat-icon lilac"><House size={18}/></div><span>Gastos da casa neste mês</span><strong>{money(houseTotal)}</strong><small>Ver controle da casa →</small></div>
        <div className="section-heading"><div><p className="eyebrow">ACOMPANHAMENTO</p><h3>Seus últimos lançamentos</h3></div><button className="text-btn" onClick={() => setTab("transactions")}>Ver todos</button></div>
        <TransactionList items={data.transactions.slice(0, 5)} remove={id => remove("transactions", id)}/>
        <div className="tip"><span>✨</span><p><strong>Dica gentil:</strong> anote até os pequenos gastos. Eles também contam a história do seu dinheiro.</p></div>
        <div className="backup-panel">
          <div><strong>Seus dados ficam neste dispositivo</strong><p>Faça backups regularmente para não perder seus registros se trocar de celular ou limpar os dados do navegador.</p></div>
          <div className="backup-actions"><button className="secondary-btn" onClick={exportBackup}>Exportar backup</button><label className="secondary-btn file-btn">Restaurar backup<input type="file" accept="application/json,.json" onChange={importBackup}/></label></div>
          {backupMessage && <small className="backup-message" role="status">{backupMessage}</small>}
        </div>
      </section>}

      {tab === "transactions" && <section>
        <PageTitle eyebrow="MOVIMENTAÇÕES" title="Entradas e despesas" subtitle="Tudo o que entra e sai, em um só lugar."/>
        <button className="primary-btn full" onClick={() => setModal("transaction")}><Plus size={18}/> Novo lançamento</button>
        <div className="list-card"><TransactionList items={data.transactions} remove={id => remove("transactions", id)}/></div>
      </section>}

      {tab === "bills" && <section>
        <PageTitle eyebrow="ORGANIZAÇÃO" title="Contas a pagar" subtitle="Acompanhe vencimentos e marque o que já foi pago."/>
        <button className="primary-btn full" onClick={() => setModal("bill")}><Plus size={18}/> Adicionar conta</button>
        <div className="bill-summary"><span>Em aberto</span><strong>{money(pending)}</strong><small>{data.bills.filter(b => !b.paid).length} conta(s) pendente(s)</small></div>
        <div className="list-card">{data.bills.length === 0 ? <Empty text="Nenhuma conta cadastrada ainda."/> : data.bills.map(b => <div className="bill-row" key={b.id}><button className={`check-btn ${b.paid ? "checked" : ""}`} onClick={() => toggleBill(b.id)} aria-label="Alternar pagamento">{b.paid && <Check size={16}/>}</button><div className="item-main"><strong className={b.paid ? "done" : ""}>{b.title}</strong><small>Vencimento: {new Date(`${b.due}T12:00:00`).toLocaleDateString("pt-BR")}</small></div><div className="item-end"><strong>{money(b.amount)}</strong><small className={b.paid ? "paid" : "waiting"}>{b.paid ? "Paga" : "Pendente"}</small></div><button className="icon-btn" onClick={() => remove("bills", b.id)} aria-label="Excluir conta"><Trash2 size={16}/></button></div>)}</div>
      </section>}

      {tab === "house" && <section>
        <PageTitle eyebrow="ORÇAMENTO DOMÉSTICO" title="Gastos da casa" subtitle="Separe as despesas do lar do restante da sua vida financeira."/>
        <div className="house-total-card"><div><span>Total da casa neste mês</span><strong>{money(houseTotal)}</strong><small>{monthHouseExpenses.length} lançamento(s) neste mês</small></div><div className="house-total-icon"><House size={25}/></div></div>
        <button className="primary-btn full" onClick={() => setModal("houseExpense")}><Plus size={18}/> Adicionar gasto da casa</button>
        <div className="section-heading"><div><p className="eyebrow">RESUMO</p><h3>Por categoria</h3></div></div>
        <div className="list-card house-category-list">{Object.keys(houseByCategory).length === 0 ? <Empty text="Seus gastos por categoria aparecerão aqui."/> : Object.entries(houseByCategory).sort((a,b) => b[1]-a[1]).map(([category, amount]) => <div className="house-category-row" key={category}><div><span className="category-dot"/><strong>{category}</strong></div><strong>{money(amount)}</strong></div>)}</div>
        <div className="section-heading house-list-heading"><div><p className="eyebrow">HISTÓRICO</p><h3>Despesas registradas</h3></div></div>
        <div className="list-card">{data.houseExpenses.length === 0 ? <Empty text="Nenhum gasto da casa cadastrado ainda."/> : data.houseExpenses.slice().sort((a,b) => b.date.localeCompare(a.date)).map(item => <div className="transaction-row" key={item.id}><div className="transaction-icon expense"><House size={17}/></div><div className="item-main"><strong>{item.title}</strong><small>{item.category} · {new Date(`${item.date}T12:00:00`).toLocaleDateString("pt-BR")}{item.notes ? ` · ${item.notes}` : ""}</small></div><div className="item-end"><strong className="negative">− {money(item.amount)}</strong></div><button className="icon-btn" onClick={() => remove("houseExpenses", item.id)} aria-label="Excluir gasto da casa"><Trash2 size={16}/></button></div>)}</div>
        <p className="small-note">Os gastos da casa também entram automaticamente nas despesas gerais do mês. O lançamento é vinculado aos dois controles, então ele não é contado duas vezes; ao excluir em uma área, também é removido da outra.</p>
      </section>}

      {tab === "cards" && <section>
        <PageTitle eyebrow="CRÉDITO" title="Meus cartões" subtitle="Compras, parcelas, faturas e limite disponível por cartão."/>
        <button className="primary-btn full" onClick={() => setModal("card")}><Plus size={18}/> Adicionar cartão</button>
        {legacyCreditCount > 0 && <div className="tip"><span>ℹ️</span><p><strong>{legacyCreditCount} lançamento(s) antigos no crédito</strong> não têm cartão associado. Eles continuam no histórico, mas não entram no cálculo individual dos limites. Edite ou recadastre essas compras para vinculá-las.</p></div>}
        {data.cards.length === 0 ? <Empty text="Cadastre seu primeiro cartão para acompanhar as compras e faturas."/> : data.cards.map(card => {
          const used = cardOutstanding(card);
          const available = Number(card.limit) - used;
          const pct = Math.min(100, card.limit ? used / card.limit * 100 : 0);
          const currentMonth = monthKey(today());
          const months = Array.from({length: 4}, (_,i) => addMonths(currentMonth,i));
          return <div className="card-management" key={card.id}>
            <div className="credit-card"><div className="credit-top"><span>ME AJUDA! · CRÉDITO</span><CreditCard size={22}/></div><h3>{card.name}</h3><p>Limite total</p><strong className="limit">{money(card.limit)}</strong><div className="progress"><i style={{ width: `${pct}%` }}/></div><div className="credit-bottom"><span>Comprometido: {money(used)}</span><span>Disponível: {money(available)}</span></div><div className="card-dates"><span>Fecha dia {card.closing}</span><span>Vence dia {card.due}</span></div><button className="remove-card" onClick={() => { if (window.confirm(`Remover ${card.name}? As compras vinculadas continuarão no histórico, mas perderão o vínculo com o cartão.`)) remove("cards", card.id); }}><Trash2 size={14}/> Remover cartão</button></div>
            <div className="section-heading"><div><p className="eyebrow">FATURAS</p><h3>{card.name}</h3></div></div>
            <div className="list-card invoice-list">{months.map(month => { const items = invoiceItems(card, month); const total = invoiceTotal(card, month); const paid = Boolean(data.paidInvoices?.[invoiceKey(card.id, month)]); return <div className="invoice-block" key={month}><div className="invoice-head"><div><strong>{monthLabel(month)}</strong><small>Vencimento aproximado: dia {card.due}</small></div><div className="item-end"><strong>{money(total)}</strong><small className={paid ? "paid" : total > 0 ? "waiting" : "muted"}>{paid ? "Paga" : total > 0 ? "Em aberto" : "Sem compras"}</small></div></div>{items.length > 0 && <div className="invoice-items">{items.map(item => <div className="invoice-item" key={item.id}><span>{item.title} <small>{item.installmentNumber}/{item.installments}</small></span><strong>{money(item.amount)}</strong></div>)}</div>}{total > 0 && <button className="secondary-btn invoice-pay" onClick={() => toggleInvoice(card.id, month)}>{paid ? "Reabrir fatura" : "Marcar fatura como paga"}</button>}</div>; })}</div>
          </div>;
        })}
        <p className="small-note">A compra é atribuída à fatura conforme o dia de fechamento. Compras após o fechamento entram na fatura seguinte. O limite considera parcelas ainda não pagas; marcar uma fatura como paga libera esse valor.</p>
      </section>}
    </main>

    <nav className="bottom-nav">
      <NavButton active={tab === "home"} icon={<LayoutDashboard size={19}/>} label="Início" onClick={() => setTab("home")}/>
      <NavButton active={tab === "transactions"} icon={<ReceiptText size={19}/>} label="Lançamentos" onClick={() => setTab("transactions")}/>
      <NavButton active={tab === "bills"} icon={<CalendarDays size={19}/>} label="Contas" onClick={() => setTab("bills")}/>
      <NavButton active={tab === "cards"} icon={<CreditCard size={19}/>} label="Cartões" onClick={() => setTab("cards")}/>
      <NavButton active={tab === "house"} icon={<House size={19}/>} label="Casa" onClick={() => setTab("house")}/>
    </nav>

    {modal && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(""); }}><div className="modal"><div className="modal-head"><div><p className="eyebrow">NOVO CADASTRO</p><h3>{modal === "transaction" ? "Adicionar lançamento" : modal === "bill" ? "Adicionar conta" : modal === "houseExpense" ? "Novo gasto da casa" : "Adicionar cartão"}</h3></div><button className="icon-btn" onClick={() => setModal("")}><X size={20}/></button></div>
      {modal === "transaction" && <form onSubmit={addTransaction}><label>Descrição<input required value={form.title} onChange={e => setForm({...form, title:e.target.value})} placeholder="Ex.: almoço, salário..."/></label><label>Valor {form.method === "Crédito" ? "total da compra (R$)" : "(R$)"}<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm({...form, amount:e.target.value})} placeholder="0,00"/></label><label>Tipo<select value={form.type} onChange={e => setForm({...form, type:e.target.value, method:e.target.value === "income" ? "Conta" : form.method})}><option value="expense">Despesa</option><option value="income">Entrada</option></select></label><label>Categoria<select value={form.category} onChange={e => setForm({...form, category:e.target.value})}>{["Alimentação","Moradia","Transporte","Saúde","Lazer","Compras","Assinaturas","Salário","Outros"].map(c => <option key={c}>{c}</option>)}</select></label><label>Data da compra<input type="date" value={form.date} onChange={e => setForm({...form,date:e.target.value})}/></label><label>Forma de pagamento<select value={form.method} onChange={e => setForm({...form, method:e.target.value})}>{["Conta","Dinheiro","Débito","Crédito","Pix"].map(c => <option key={c}>{c}</option>)}</select></label>{form.method === "Crédito" && form.type === "expense" && <><label>Cartão utilizado<select required value={form.cardId} onChange={e => setForm({...form,cardId:e.target.value})}><option value="">Selecione um cartão</option>{data.cards.map(card => <option key={card.id} value={card.id}>{card.name} · disponível {money(Number(card.limit)-cardOutstanding(card))}</option>)}</select></label><label>Quantidade de parcelas<select value={form.installments} onChange={e => setForm({...form,installments:e.target.value})}>{Array.from({length:48},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}x {form.amount ? `de ${money(Number(form.amount)/n)}` : ""}</option>)}</select></label><small className="small-note">As parcelas serão distribuídas automaticamente nas faturas futuras.</small></>}<button className="primary-btn full" type="submit">Salvar lançamento</button></form>}
      {modal === "bill" && <form onSubmit={addBill}><label>Nome da conta<input required value={billForm.title} onChange={e => setBillForm({...billForm,title:e.target.value})} placeholder="Ex.: aluguel, internet..."/></label><label>Valor (R$)<input required type="number" min="0.01" step="0.01" value={billForm.amount} onChange={e => setBillForm({...billForm,amount:e.target.value})} placeholder="0,00"/></label><label>Vencimento<input required type="date" value={billForm.due} onChange={e => setBillForm({...billForm,due:e.target.value})}/></label><button className="primary-btn full" type="submit">Salvar conta</button></form>}
      {modal === "houseExpense" && <form onSubmit={addHouseExpense}><label>O que você pagou?<input required value={houseForm.title} onChange={e => setHouseForm({...houseForm,title:e.target.value})} placeholder="Ex.: compra do mês, conta de água..."/></label><label>Valor (R$)<input required type="number" min="0.01" step="0.01" value={houseForm.amount} onChange={e => setHouseForm({...houseForm,amount:e.target.value})} placeholder="0,00"/></label><label>Categoria<select value={houseForm.category} onChange={e => setHouseForm({...houseForm,category:e.target.value})}>{["Mercado","Aluguel/Financiamento","Energia","Água","Gás","Internet/Telefone","Limpeza","Manutenção","Móveis e utensílios","Outros"].map(c => <option key={c}>{c}</option>)}</select></label><label>Data do pagamento<input type="date" value={houseForm.date} onChange={e => setHouseForm({...houseForm,date:e.target.value})}/></label><label>Observação (opcional)<input value={houseForm.notes} onChange={e => setHouseForm({...houseForm,notes:e.target.value})} placeholder="Ex.: compra dividida com alguém"/></label><button className="primary-btn full" type="submit">Salvar gasto da casa</button></form>}
      {modal === "card" && <form onSubmit={addCard}><label>Nome do cartão<input required value={cardForm.name} onChange={e => setCardForm({...cardForm,name:e.target.value})} placeholder="Ex.: Nubank"/></label><label>Limite total (R$)<input required type="number" min="0.01" step="0.01" value={cardForm.limit} onChange={e => setCardForm({...cardForm,limit:e.target.value})} placeholder="0,00"/></label><div className="two-fields"><label>Dia de fechamento<input type="number" min="1" max="31" value={cardForm.closing} onChange={e => setCardForm({...cardForm,closing:e.target.value})}/></label><label>Dia de vencimento<input type="number" min="1" max="31" value={cardForm.due} onChange={e => setCardForm({...cardForm,due:e.target.value})}/></label></div><button className="primary-btn full" type="submit">Salvar cartão</button></form>}
    </div></div>}
  </div>;
}

function PageTitle({ eyebrow, title, subtitle }) { return <div className="page-title"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted">{subtitle}</p></div>; }
function NavButton({ active, icon, label, onClick }) { return <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick}>{icon}<span>{label}</span></button>; }
function Empty({ text }) { return <div className="empty">{text}</div>; }
function TransactionList({ items, remove }) {
  if (!items.length) return <Empty text="Nenhum lançamento por aqui ainda."/>;
  return items.map(t => <div className="transaction-row" key={t.id}><div className={`transaction-icon ${t.type}`}><Wallet size={17}/></div><div className="item-main"><strong>{t.title}</strong><small>{t.category} · {new Date(`${t.date}T12:00:00`).toLocaleDateString("pt-BR")} · {t.method}</small></div><div className="item-end"><strong className={t.type === "income" ? "positive" : "negative"}>{t.type === "income" ? "+" : "−"} {money(t.amount)}</strong></div><button className="icon-btn" onClick={() => remove(t.id)} aria-label="Excluir lançamento"><Trash2 size={16}/></button></div>);
}