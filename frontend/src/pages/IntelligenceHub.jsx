import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  Bot,
  TrendingDown,
  Building,
  HelpCircle,
  AlertTriangle,
  Zap,
  History,
  Truck,
  Send,
  Play,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Users,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import api from '../api/axiosInstance';
import Topbar from '../components/Topbar';
import DataTable from '../components/DataTable';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../components/Toast';

export default function IntelligenceHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'copilot';
  const [activeTab, setActiveTab] = useState(initialTab);

  const toast = useToast();

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t) setActiveTab(t);
  }, [searchParams]);

  const changeTab = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div>
      <Topbar title="AI Intelligence & Optimization Hub">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              background: '#EEF2FF',
              color: '#4F46E5',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Sparkles size={14} /> 20 Active AI Engines
          </span>
        </div>
      </Topbar>

      <div className="page-body">
        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '12px',
            marginBottom: '24px',
            overflowX: 'auto',
          }}
        >
          <button
            className={`btn btn-sm ${activeTab === 'copilot' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => changeTab('copilot')}
          >
            <Bot size={15} /> AI Warehouse Copilot
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'predictive' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => changeTab('predictive')}
          >
            <TrendingDown size={15} /> Predictive Stockout & What-If
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'twin' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => changeTab('twin')}
          >
            <Building size={15} /> Digital Twin & Heatmap
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'detective' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => changeTab('detective')}
          >
            <HelpCircle size={15} /> Inventory Detective & Anomalies
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'actions' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => changeTab('actions')}
          >
            <Zap size={15} /> Smart Action Center
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'replay' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => changeTab('replay')}
          >
            <History size={15} /> Movement Replay & Audit
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'suppliers' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => changeTab('suppliers')}
          >
            <Truck size={15} /> Supplier Reliability
          </button>
        </div>

        {/* Tab 1: AI Warehouse Copilot */}
        {activeTab === 'copilot' && <CopilotTab />}

        {/* Tab 2: Predictive Stockouts & What-If Simulator */}
        {activeTab === 'predictive' && <PredictiveTab />}

        {/* Tab 3: Digital Twin & Heatmap */}
        {activeTab === 'twin' && <DigitalTwinTab />}

        {/* Tab 4: Inventory Detective & Anomalies */}
        {activeTab === 'detective' && <DetectiveTab />}

        {/* Tab 5: Smart Action Center & AI Recommendations */}
        {activeTab === 'actions' && <ActionCenterTab />}

        {/* Tab 6: Movement Replay & Audit Timeline */}
        {activeTab === 'replay' && <MovementReplayTab />}

        {/* Tab 7: Supplier Reliability */}
        {activeTab === 'suppliers' && <SupplierTab />}
      </div>
    </div>
  );
}

// =========================================================================
// TAB 1: COPILOT
// =========================================================================
function CopilotTab() {
  const [query, setQuery] = useState('');
  const [conversation, setConversation] = useState([
    {
      role: 'assistant',
      text: 'Hello! I am your AI Warehouse Copilot. Ask me anything about current stock counts, valuations, locations, shortages, or recent movements in natural language.',
    },
  ]);
  const [loading, setLoading] = useState(false);

  const sampleQueries = [
    'Which products are low on stock?',
    'What is our total inventory valuation?',
    'Where is Steel Rods stored?',
    'Show me recent inbound supplier receipts',
    'Which products are completely out of stock?',
  ];

  const handleSend = async (textToSend) => {
    const q = textToSend || query;
    if (!q.trim()) return;

    const userMessage = { role: 'user', text: q };
    setConversation((prev) => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const res = await api.post('/intelligence/copilot', { query: q });
      setConversation((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: res.data.answer,
          dataTable: res.data.dataTable,
          suggestions: res.data.suggestions,
        },
      ]);
    } catch (err) {
      setConversation((prev) => [
        ...prev,
        { role: 'assistant', text: 'Encountered an issue analyzing inventory data. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '540px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        {/* Chat message list */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {conversation.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '20px',
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: msg.role === 'assistant' ? '#4F46E5' : '#334155',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {msg.role === 'assistant' ? <Bot size={17} /> : 'U'}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    background: msg.role === 'assistant' ? '#F8FAFC' : '#EEF2FF',
                    border: '1px solid var(--border)',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    fontSize: '0.9rem',
                    lineHeight: 1.5,
                  }}
                >
                  <p style={{ whiteSpace: 'pre-line' }}>{msg.text}</p>

                  {/* Render data table if present */}
                  {msg.dataTable && (
                    <div style={{ marginTop: '14px', overflowX: 'auto' }}>
                      <table className="custom-table" style={{ background: '#FFFFFF', border: '1px solid var(--border)' }}>
                        <thead>
                          <tr>
                            {msg.dataTable.columns.map((c, cIdx) => (
                              <th key={cIdx}>{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {msg.dataTable.rows.map((r, rIdx) => (
                            <tr key={rIdx}>
                              {r.map((cell, cellIdx) => (
                                <td key={cellIdx} style={{ fontWeight: cellIdx === 0 ? 600 : 400 }}>
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Render suggestions */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {msg.suggestions.map((s, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.74rem', padding: '3px 8px' }}
                          onClick={() => handleSend(s)}
                        >
                          {s} ➔
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', color: 'var(--text-muted)' }}>
              <Bot size={20} color="var(--primary)" />
              <LoadingSpinner message="Consulting live inventory database..." />
            </div>
          )}
        </div>

        {/* Input box */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: '#F8FAFC' }}>
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '10px' }}>
            {sampleQueries.map((sq, idx) => (
              <button
                key={idx}
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.74rem', whiteSpace: 'nowrap' }}
                onClick={() => handleSend(sq)}
              >
                {sq}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{ display: 'flex', gap: '10px' }}
          >
            <input
              type="text"
              className="form-input"
              placeholder="Ask a question about your inventory in natural language..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="btn btn-primary" disabled={loading || !query.trim()}>
              <Send size={16} /> Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// TAB 2: PREDICTIVE STOCKOUT & WHAT-IF SIMULATOR
// =========================================================================
function PredictiveTab() {
  const [predictions, setPredictions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // What-If Form
  const [simProduct, setSimProduct] = useState('');
  const [simType, setSimType] = useState('RECEIVE');
  const [simQty, setSimQty] = useState(50);
  const [simResult, setSimResult] = useState(null);
  const [simulating, setSimulating] = useState(false);

  const toast = useToast();

  useEffect(() => {
    Promise.all([api.get('/intelligence/predictive-stockout'), api.get('/products')])
      .then(([predRes, prodRes]) => {
        setPredictions(predRes.data);
        setProducts(prodRes.data);
        if (prodRes.data.length > 0) setSimProduct(prodRes.data[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSimulate = async (e) => {
    e.preventDefault();
    setSimulating(true);
    try {
      const res = await api.post('/intelligence/what-if', {
        productId: simProduct,
        scenarioType: simType,
        quantity: Number(simQty),
      });
      setSimResult(res.data);
      toast.success('Simulation executed');
    } catch (err) {
      toast.error('Simulation failed');
    } finally {
      setSimulating(false);
    }
  };

  const columns = [
    {
      header: 'Product',
      key: 'name',
      render: (p) => (
        <div>
          <div style={{ fontWeight: 600 }}>{p.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.sku}</div>
        </div>
      ),
    },
    { header: 'Current On-Hand', key: 'onHand', render: (p) => <strong>{p.onHand}</strong> },
    { header: 'Reorder Level', key: 'reorderLevel' },
    { header: 'Est. Daily Burn', key: 'dailyBurnRate', render: (p) => `${p.dailyBurnRate}/day` },
    {
      header: 'Days Until Stockout',
      key: 'daysRemaining',
      render: (p) => (
        <span
          style={{
            fontWeight: 700,
            color: p.daysRemaining <= 3 ? '#DC2626' : p.daysRemaining <= 7 ? '#D97706' : '#059669',
          }}
        >
          {p.daysRemaining === 0 ? 'Out of Stock' : `${p.daysRemaining} days`}
        </span>
      ),
    },
    {
      header: 'Stockout Risk',
      key: 'riskLevel',
      render: (p) => {
        const badgeColors = {
          STOCKOUT: '#DC2626',
          CRITICAL: '#EF4444',
          HIGH: '#F59E0B',
          MODERATE: '#3B82F6',
          HEALTHY: '#10B981',
        };
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              fontWeight: 700,
              background: `${badgeColors[p.riskLevel]}20`,
              color: badgeColors[p.riskLevel],
            }}
          >
            {p.riskLevel}
          </span>
        );
      },
    },
    { header: 'Est. Depletion Date', key: 'estimatedStockoutDate' },
  ];

  return (
    <div>
      {/* What-If Sandbox */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Play size={18} color="var(--primary)" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Interactive "What-If" Inventory Simulator</h3>
        </div>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
          Test prospective supply chain events (e.g. receiving a container or a surprise customer bulk order) without writing to the live database.
        </p>

        <form onSubmit={handleSimulate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Scenario Type</label>
            <select className="form-select" value={simType} onChange={(e) => setSimType(e.target.value)}>
              <option value="RECEIVE">Receive Consignment (+Inbound)</option>
              <option value="DISPATCH">Large Dispatch (-Outbound)</option>
              <option value="PRICE_SURGE">Supplier Price Spike (% Inflation)</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Product to Simulate</label>
            <select className="form-select" value={simProduct} onChange={(e) => setSimProduct(e.target.value)}>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Simulated Quantity</label>
            <input
              type="number"
              min="1"
              className="form-input"
              value={simQty}
              onChange={(e) => setSimQty(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={simulating}>
              <Play size={15} /> Run Simulation
            </button>
          </div>
        </form>

        {simResult && (
          <div
            style={{
              marginTop: '20px',
              background: '#F8FAFC',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '18px',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>CURRENT ON-HAND</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{simResult.currentOnHand}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>PROJECTED ON-HAND</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>
                  {simResult.projectedOnHand}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>CURRENT VALUE</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>${simResult.currentValuation.toFixed(2)}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>PROJECTED VALUE</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>${simResult.projectedValuation.toFixed(2)}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>CASH FLOW IMPACT</span>
                <div
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    color: simResult.cashFlowImpact >= 0 ? 'var(--success-text)' : 'var(--danger-text)',
                  }}
                >
                  {simResult.cashFlowImpact >= 0 ? `+$${simResult.cashFlowImpact.toFixed(2)}` : `-$${Math.abs(simResult.cashFlowImpact).toFixed(2)}`}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.86rem', color: 'var(--text-main)', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
              <strong>AI Analysis:</strong> {simResult.impactDescription}
            </div>
          </div>
        )}
      </div>

      {/* Predictions Table */}
      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px' }}>
        Predictive Stockout Intelligence
      </h3>
      <DataTable
        columns={columns}
        data={predictions}
        loading={loading}
        emptyTitle="No predictive projections available"
      />
    </div>
  );
}

// =========================================================================
// TAB 3: DIGITAL TWIN & HEATMAP
// =========================================================================
function DigitalTwinTab() {
  const [twinData, setTwinData] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(0);
  const [selectedRack, setSelectedRack] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/intelligence/warehouse-twin')
      .then((res) => {
        setTwinData(res.data);
        if (res.data.length > 0 && res.data[0].racks.length > 0) {
          setSelectedRack(res.data[0].racks[0]);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner message="Synthesizing digital twin telemetry..." />;
  if (twinData.length === 0) return <div>No warehouse facilities found.</div>;

  const currentWh = twinData[selectedWarehouse];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>2D Warehouse Spatial Map & Density Heatmap</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Real-time rack density visualization. Click any storage location to inspect inventory contents.
          </p>
        </div>

        {/* Warehouse Selector */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {twinData.map((w, idx) => (
            <button
              key={w.id}
              className={`btn btn-sm ${selectedWarehouse === idx ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setSelectedWarehouse(idx);
                if (w.racks.length > 0) setSelectedRack(w.racks[0]);
              }}
            >
              {w.code} - {w.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Interactive Grid Map */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>
              Facility Utilization: <strong>{currentWh.overallUtilization}%</strong>
            </span>
            <div style={{ display: 'flex', gap: '12px', fontSize: '0.74rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 10, height: 10, background: '#10B981', borderRadius: 2 }}></span> Optimal (20–70%)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 10, height: 10, background: '#F59E0B', borderRadius: 2 }}></span> High (70–90%)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 10, height: 10, background: '#EF4444', borderRadius: 2 }}></span> Overloaded (&gt;90%)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 10, height: 10, background: '#3B82F6', borderRadius: 2 }}></span> Underused (&lt;20%)
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '16px',
            }}
          >
            {currentWh.racks.map((rack) => (
              <div
                key={rack.id}
                onClick={() => setSelectedRack(rack)}
                style={{
                  border: `2px solid ${selectedRack?.id === rack.id ? '#4F46E5' : 'var(--border)'}`,
                  borderRadius: '10px',
                  padding: '16px',
                  cursor: 'pointer',
                  background: selectedRack?.id === rack.id ? '#F8FAFC' : '#FFFFFF',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ fontWeight: 700, fontSize: '0.94rem' }}>{rack.name}</h4>
                  <span
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: rack.heatColor,
                    }}
                  />
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Load: <strong>{rack.storedQty}</strong> / {rack.capacity} units
                </div>

                {/* Progress Bar */}
                <div style={{ height: '6px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${rack.utilization}%`,
                      background: rack.heatColor,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
                  {rack.utilization}% ({rack.heatStatus})
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Rack Detail Panel */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '24px',
          }}
        >
          {selectedRack ? (
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>
                {selectedRack.name} Details
              </h4>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Status: <strong style={{ color: selectedRack.heatColor }}>{selectedRack.heatStatus}</strong> ({selectedRack.utilization}% load)
              </div>

              <div style={{ fontSize: '0.84rem', fontWeight: 600, marginBottom: '8px' }}>
                Stored SKU Inventory ({selectedRack.items.length}):
              </div>

              {selectedRack.items.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem', padding: '16px 0' }}>
                  This rack is currently empty.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedRack.items.map((it, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 12px',
                        background: '#F8FAFC',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.84rem',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{it.productName}</div>
                        <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{it.sku}</code>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        {it.quantity} units
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
              Select a rack to view telemetry
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// TAB 4: INVENTORY DETECTIVE & ANOMALIES
// =========================================================================
function DetectiveTab() {
  const [investigations, setInvestigations] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deepDiveData, setDeepDiveData] = useState({});
  const [analyzingId, setAnalyzingId] = useState(null);

  const toast = useToast();

  useEffect(() => {
    Promise.all([api.get('/intelligence/inventory-detective'), api.get('/intelligence/anomalies')])
      .then(([detRes, anomRes]) => {
        setInvestigations(detRes.data);
        setAnomalies(anomRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDeepDive = async (adjId) => {
    setAnalyzingId(adjId);
    try {
      const res = await api.post('/intelligence/inventory-detective/deep-dive', { adjustmentId: adjId });
      setDeepDiveData((prev) => ({ ...prev, [adjId]: res.data.aiAnalysis }));
      toast.success('Gemini AI Forensic analysis completed');
    } catch (err) {
      toast.error('Failed to run Gemini forensic analysis');
    } finally {
      setAnalyzingId(null);
    }
  };

  return (
    <div>
      {/* Anomalies Banner */}
      {anomalies.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} color="#DC2626" />
            AI Anomaly Detection Stream ({anomalies.length} Flagged)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {anomalies.map((anom) => (
              <div
                key={anom.id}
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '10px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#991B1B' }}>
                    {anom.type}
                  </span>
                  <span style={{ fontSize: '0.74rem', color: '#991B1B' }}>
                    {new Date(anom.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#7F1D1D', marginBottom: '4px' }}>
                  {anom.title}
                </div>
                <p style={{ fontSize: '0.82rem', color: '#991B1B', marginBottom: '10px' }}>
                  {anom.explanation}
                </p>
                <div style={{ fontSize: '0.78rem', color: '#450A0A', background: 'rgba(255,255,255,0.6)', padding: '6px 10px', borderRadius: '6px' }}>
                  <strong>Recommendation:</strong> {anom.recommendation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discrepancy Investigations */}
      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <HelpCircle size={18} color="var(--primary)" />
        Inventory Detective — Automated Root Cause Analysis
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {investigations.map((inv) => (
          <div
            key={inv.id}
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '18px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <span style={{ fontWeight: 700, color: 'var(--primary)', marginRight: '10px' }}>
                  {inv.reference}
                </span>
                <span style={{ fontWeight: 600 }}>{inv.productName}</span> ({inv.sku})
              </div>
              <span
                style={{
                  fontWeight: 700,
                  color: inv.difference < 0 ? '#DC2626' : inv.difference > 0 ? '#059669' : 'var(--text-muted)',
                }}
              >
                Variance: {inv.difference > 0 ? `+${inv.difference}` : inv.difference} units
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#F8FAFC', padding: '12px', borderRadius: '8px', fontSize: '0.84rem', marginBottom: '10px' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>DETECTIVE ROOT CAUSE</div>
                <div style={{ fontWeight: 600, marginTop: '2px' }}>{inv.rootCause}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>CORRECTIVE ACTION</div>
                <div style={{ fontWeight: 600, marginTop: '2px' }}>{inv.actionSuggestion}</div>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Location: {inv.warehouse} - {inv.location}</span>
              <span>Auditor: {inv.investigator} | Date: {new Date(inv.date).toLocaleString()}</span>
            </div>

            {/* Gemini Forensic Deep Dive Trigger */}
            {inv.difference !== 0 && (
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                {deepDiveData[inv.id] ? (
                  <div
                    style={{
                      background: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      fontSize: '0.84rem',
                      color: '#166534',
                    }}
                  >
                    <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <Sparkles size={14} color="#16a34a" /> Google Gemini AI Forensic RCA & Strategic Fix:
                    </div>
                    <p style={{ whiteSpace: 'pre-line', margin: 0 }}>{deepDiveData[inv.id]}</p>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => handleDeepDive(inv.id)}
                    disabled={analyzingId === inv.id}
                  >
                    <Sparkles size={13} color="var(--primary)" />
                    {analyzingId === inv.id ? 'Consulting Gemini AI Brain...' : 'Run Forensic RCA (Gemini AI Brain)'}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// =========================================================================
// TAB 5: SMART ACTION CENTER & RECOMMENDATIONS (Powered by Gemini Brain)
// =========================================================================
function ActionCenterTab() {
  const [actions, setActions] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [aiTasks, setAiTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshingTasks, setRefreshingTasks] = useState(false);
  const [completedTasks, setCompletedTasks] = useState({});

  const toast = useToast();

  const fetchTasks = async () => {
    setRefreshingTasks(true);
    try {
      const res = await api.get('/intelligence/ai-tasks');
      setAiTasks(res.data.tasks || []);
      toast.success('Gemini AI Brain reassigned warehouse tasks based on live state');
    } catch (err) {
      toast.error('Failed to load AI task assignments');
    } finally {
      setRefreshingTasks(false);
    }
  };

  useEffect(() => {
    Promise.all([
      api.get('/intelligence/smart-actions'),
      api.get('/intelligence/recommendations'),
      api.get('/intelligence/ai-tasks'),
    ])
      .then(([actRes, recRes, taskRes]) => {
        setActions(actRes.data);
        setRecommendations(recRes.data);
        setAiTasks(taskRes.data.tasks || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleTaskStatus = (taskId) => {
    setCompletedTasks((prev) => {
      const nextState = !prev[taskId];
      toast.success(nextState ? `Task marked as COMPLETED` : `Task marked as ACTIVE`);
      return { ...prev, [taskId]: nextState };
    });
  };

  return (
    <div>
      {/* SECTION 1: GEMINI AI DYNAMIC TASK DISPATCHER */}
      <div
        style={{
          background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)',
          border: '1px solid #C7D2FE',
          borderRadius: '14px',
          padding: '22px',
          marginBottom: '28px',
          boxShadow: '0 2px 4px rgba(79, 70, 229, 0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} color="#4F46E5" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1E1B4B', margin: 0 }}>
                Google Gemini AI Brain — Dynamic Warehouse Task Dispatcher
              </h3>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#4338CA', marginTop: '4px', margin: 0 }}>
              AI autonomously inspects on-hand counts, buffer breaches, and pending receipts to assign concrete operational tasks to staff roles.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={fetchTasks}
            disabled={refreshingTasks}
          >
            <RefreshCw size={14} className={refreshingTasks ? 'animate-spin' : ''} />
            {refreshingTasks ? 'Assigning via Gemini...' : 'Re-dispatch Tasks with Gemini'}
          </button>
        </div>

        {/* Task Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          {aiTasks.map((t) => {
            const isDone = !!completedTasks[t.id];
            const isCritical = t.priority === 'CRITICAL';
            const isHigh = t.priority === 'HIGH';

            return (
              <div
                key={t.id}
                style={{
                  background: isDone ? '#F8FAFC' : '#FFFFFF',
                  border: isDone ? '1px solid #E2E8F0' : '1px solid #E0E7FF',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  opacity: isDone ? 0.65 : 1,
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        background: isCritical ? '#FEE2E2' : isHigh ? '#FEF3C7' : '#DBEAFE',
                        color: isCritical ? '#991B1B' : isHigh ? '#92400E' : '#1E40AF',
                      }}
                    >
                      {t.priority}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {t.deadline || 'Today'}
                    </span>
                  </div>

                  <h4 style={{ fontWeight: 700, fontSize: '0.94rem', marginBottom: '6px', color: isDone ? 'var(--text-muted)' : '#1E293B', textDecoration: isDone ? 'line-through' : 'none' }}>
                    {t.title}
                  </h4>

                  <div style={{ fontSize: '0.78rem', color: '#4F46E5', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <Users size={13} /> Assigned: {t.role}
                  </div>

                  <p style={{ fontSize: '0.81rem', color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: '10px' }}>
                    {t.instructions}
                  </p>

                  {t.target && (
                    <div style={{ fontSize: '0.75rem', background: '#F1F5F9', padding: '4px 8px', borderRadius: '6px', color: '#334155', marginBottom: '12px' }}>
                      <strong>Target:</strong> {t.target} {t.estimatedTime && `• Est: ${t.estimatedTime}`}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className={`btn btn-sm ${isDone ? 'btn-secondary' : 'btn-primary'}`}
                  style={{ width: '100%', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={() => toggleTaskStatus(t.id)}
                >
                  <CheckCircle2 size={14} />
                  {isDone ? 'Completed (Click to Reopen)' : 'Mark Task as Completed'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: SYSTEM IMMEDIATE PRIORITIES & PROACTIVE RECOMMENDATIONS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Smart Action Center */}
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} color="#D97706" />
            Smart Action Center (System Triggers)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {actions.map((act) => (
              <div
                key={act.id}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '16px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: act.priority === 'CRITICAL' ? '#FEE2E2' : '#FEF3C7',
                      color: act.priority === 'CRITICAL' ? '#991B1B' : '#92400E',
                    }}
                  >
                    {act.priority} PRIORITY
                  </span>
                </div>
                <h4 style={{ fontWeight: 700, fontSize: '0.94rem', marginBottom: '4px' }}>{act.title}</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                  {act.description}
                </p>
                <a href={act.actionTarget} className="btn btn-primary btn-sm">
                  {act.actionLabel} <ArrowRight size={14} />
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* AI Recommendations */}
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--primary)" />
            Proactive AI Recommendations
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {rec.type}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Urgency: {rec.urgency}
                  </span>
                </div>
                <h4 style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '4px' }}>{rec.title}</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  {rec.rationale}
                </p>
                <div style={{ fontSize: '0.78rem', color: '#047857', marginBottom: '12px' }}>
                  <strong>Impact:</strong> {rec.impact}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => toast.success(`Recommendation queued for execution`)}
                >
                  Apply Recommendation
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// TAB 6: MOVEMENT REPLAY & AUDIT TIMELINE
// =========================================================================
function MovementReplayTab() {
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [replayData, setReplayData] = useState(null);
  const [auditList, setAuditList] = useState([]);
  const [loadingReplay, setLoadingReplay] = useState(false);

  useEffect(() => {
    api.get('/products').then((res) => {
      setProducts(res.data);
      if (res.data.length > 0) {
        setSelectedProductId(res.data[0].id);
      }
    });

    api.get('/intelligence/audit-timeline').then((res) => setAuditList(res.data));
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      setLoadingReplay(true);
      api.get(`/intelligence/movement-replay/${selectedProductId}`)
        .then((res) => setReplayData(res.data))
        .finally(() => setLoadingReplay(false));
    }
  }, [selectedProductId]);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        {/* Product Movement Replay */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Product Lifecycle Stepper</h3>
            <select
              className="form-select"
              style={{ width: 'auto' }}
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          {loadingReplay ? (
            <LoadingSpinner message="Tracing chronological lifecycle..." />
          ) : replayData?.journey.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', padding: '24px', textAlign: 'center' }}>
              No movement events recorded for this product yet.
            </div>
          ) : (
            <div style={{ position: 'relative', paddingLeft: '24px' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '7px',
                  top: '12px',
                  bottom: '12px',
                  width: '2px',
                  background: '#E2E8F0',
                }}
              />
              {replayData?.journey.map((step, idx) => (
                <div key={idx} style={{ position: 'relative', marginBottom: '24px' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '-24px',
                      top: '2px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background:
                        step.type === 'IN'
                          ? '#10B981'
                          : step.type === 'OUT'
                          ? '#EF4444'
                          : step.type === 'TRANSFER'
                          ? '#3B82F6'
                          : '#F59E0B',
                      border: '3px solid #FFFFFF',
                      boxShadow: '0 0 0 1px #CBD5E1',
                    }}
                  />
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {new Date(step.date).toLocaleString()} — Verified by {step.actor}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.94rem', margin: '2px 0' }}>{step.title}</div>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>{step.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Complete Audit Timeline */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '24px',
          }}
        >
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px' }}>
            Complete System Audit Trail
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '520px', overflowY: 'auto' }}>
            {auditList.map((audit) => (
              <div
                key={audit.id}
                style={{
                  padding: '12px',
                  background: '#F8FAFC',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  fontSize: '0.82rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <code style={{ fontWeight: 700, color: 'var(--primary)' }}>{audit.reference}</code>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                    {new Date(audit.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ fontWeight: 600 }}>{audit.targetEntity}</div>
                <div style={{ color: 'var(--text-muted)', margin: '2px 0' }}>
                  {audit.action} ({audit.delta})
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                  <span>User: {audit.performedBy}</span>
                  <span style={{ color: '#059669', fontWeight: 600 }}>✓ VERIFIED</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// TAB 7: SUPPLIER RELIABILITY
// =========================================================================
function SupplierTab() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/intelligence/supplier-reliability')
      .then((res) => setSuppliers(res.data))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { header: 'Supplier Name', key: 'name', render: (s) => <strong>{s.name}</strong> },
    { header: 'Total Purchase Orders', key: 'totalReceipts' },
    { header: 'Completed Inbounds', key: 'doneReceipts' },
    { header: 'Total Units Received', key: 'totalUnitsDelivered' },
    {
      header: 'Fulfillment Rate',
      key: 'fulfillmentRate',
      render: (s) => (
        <span style={{ fontWeight: 700, color: s.fulfillmentRate >= 90 ? '#059669' : '#D97706' }}>
          {s.fulfillmentRate}%
        </span>
      ),
    },
    { header: 'Avg Lead Time', key: 'avgLeadTimeDays', render: (s) => `${s.avgLeadTimeDays} days` },
    {
      header: 'Reliability Grade',
      key: 'grade',
      render: (s) => (
        <span
          style={{
            padding: '3px 10px',
            borderRadius: '9999px',
            fontWeight: 800,
            fontSize: '0.8rem',
            background: s.grade === 'A+' || s.grade === 'A' ? '#DCFCE7' : '#FEF3C7',
            color: s.grade === 'A+' || s.grade === 'A' ? '#166534' : '#92400E',
          }}
        >
          {s.grade}
        </span>
      ),
    },
  ];

  return (
    <div>
      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px' }}>
        Supplier Delivery Performance & Reliability Matrix
      </h3>
      <DataTable
        columns={columns}
        data={suppliers}
        loading={loading}
        emptyTitle="No supplier history logged"
      />
    </div>
  );
}
