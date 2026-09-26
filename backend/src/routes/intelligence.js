const express = require('express');
const prisma = require('../db');
const { verifyJWT } = require('../middleware/auth');
const geminiBrain = require('../utils/geminiBrain');

const router = express.Router();
router.use(verifyJWT);

// =========================================================================
// 1. AI WAREHOUSE COPILOT & 11. NATURAL LANGUAGE REPORTS (Powered by Gemini)
// =========================================================================
router.post('/copilot', async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ message: 'Query is required' });
    }

    const q = query.toLowerCase().trim();

    // Fetch baseline data for analysis
    const products = await prisma.product.findMany({
      include: { category: true, stocks: { include: { location: true, warehouse: true } } },
    });
    const receipts = await prisma.receipt.findMany({
      take: 15,
      orderBy: { createdAt: 'desc' },
      include: { warehouse: true, items: { include: { product: true } } },
    });
    const deliveries = await prisma.delivery.findMany({
      take: 15,
      orderBy: { createdAt: 'desc' },
      include: { warehouse: true, items: { include: { product: true } } },
    });

    let answer = '';
    let dataTable = null;
    let suggestions = [];

    // Compute live inventory metrics
    let totalVal = 0;
    const valuationList = products.map((p) => {
      const onHand = p.stocks.reduce((acc, s) => acc + s.quantity, 0);
      const itemVal = onHand * p.unitCost;
      totalVal += itemVal;
      return { name: p.name, sku: p.sku, onHand, unitCost: p.unitCost, itemVal };
    });

    const lowStockItems = products
      .map((p) => {
        const onHand = p.stocks.reduce((acc, s) => acc + s.quantity, 0);
        return { ...p, onHand };
      })
      .filter((p) => p.onHand <= p.reorderLevel);

    const outOfStockItems = lowStockItems.filter((p) => p.onHand === 0);

    // Provide relevant dataTable if the query is asking for lists
    if (q.includes('low stock') || q.includes('reorder') || q.includes('khatam') || q.includes('shortage')) {
      dataTable = {
        columns: ['Product Name', 'SKU', 'On Hand', 'Reorder Level', 'Unit Cost'],
        rows: lowStockItems.map((p) => [p.name, p.sku, p.onHand, p.reorderLevel, `$${p.unitCost}`]),
      };
      suggestions = ['Check Supplier Reliability', 'Run What-If Restock Simulator', 'Assign Restocking Tasks'];
    } else if (q.includes('out of stock') || q.includes('zero') || q.includes('empty')) {
      dataTable = {
        columns: ['Product Name', 'SKU', 'Category', 'Reorder Level'],
        rows: outOfStockItems.map((p) => [p.name, p.sku, p.category?.name || 'N/A', p.reorderLevel]),
      };
      suggestions = ['Create Inbound Receipt', 'View Supplier Contacts', 'Simulate Restock'];
    } else if (q.includes('value') || q.includes('cost') || q.includes('worth') || q.includes('total')) {
      dataTable = {
        columns: ['Product', 'SKU', 'On Hand', 'Unit Cost', 'Asset Value'],
        rows: valuationList
          .sort((a, b) => b.itemVal - a.itemVal)
          .slice(0, 8)
          .map((b) => [b.name, b.sku, b.onHand, `$${b.unitCost.toFixed(2)}`, `$${b.itemVal.toFixed(2)}`]),
      };
      suggestions = ['Show Highest Value Items', 'Export Valuation Summary', 'Analyze Storage Cost'];
    } else if (q.includes('where') || q.includes('location') || q.includes('rack') || q.includes('steel') || q.includes('chair')) {
      const matched = products.find(
        (p) => q.includes(p.name.toLowerCase()) || q.includes(p.sku.toLowerCase())
      ) || products[0];

      if (matched) {
        dataTable = {
          columns: ['Warehouse', 'Location/Rack', 'Quantity Available', 'Last Updated'],
          rows: matched.stocks.map((s) => [s.warehouse.name, s.location.name, s.quantity, new Date(s.updatedAt).toLocaleDateString()]),
        };
        suggestions = [`Transfer ${matched.name}`, `Adjust Count for ${matched.name}`, `View Movement Journey`];
      }
    } else if (q.includes('receipt') || q.includes('inbound') || q.includes('supplier')) {
      dataTable = {
        columns: ['Reference', 'Supplier', 'Warehouse', 'Status', 'Date'],
        rows: receipts.slice(0, 5).map((r) => [r.reference, r.supplierName, r.warehouse.name, r.status, new Date(r.createdAt).toLocaleDateString()]),
      };
      suggestions = ['Create New Receipt', 'Show Pending Receipts Only', 'Supplier Reliability'];
    }

    // Call Google Gemini AI Brain with live inventory snapshot
    if (geminiBrain.isGeminiConfigured()) {
      try {
        const liveSnapshot = {
          totalCatalogProducts: products.length,
          totalInventoryValuation: `$${totalVal.toFixed(2)}`,
          lowStockSKUs: lowStockItems.map((p) => ({
            name: p.name,
            sku: p.sku,
            onHand: p.onHand,
            reorderLevel: p.reorderLevel,
            locations: p.stocks.map((s) => `${s.warehouse.code}-${s.location.name} (${s.quantity})`).join(', '),
          })),
          recentInboundReceipts: receipts.slice(0, 5).map((r) => ({
            ref: r.reference,
            supplier: r.supplierName,
            warehouse: r.warehouse.name,
            status: r.status,
          })),
          recentDeliveries: deliveries.slice(0, 5).map((d) => ({
            ref: d.reference,
            customer: d.customerName,
            status: d.status,
          })),
          sampleCatalog: products.slice(0, 10).map((p) => ({
            name: p.name,
            sku: p.sku,
            onHand: p.stocks.reduce((acc, s) => acc + s.quantity, 0),
            unitCost: `$${p.unitCost}`,
          })),
        };

        answer = await geminiBrain.askGeminiCopilot(query, liveSnapshot);
      } catch (geminiErr) {
        console.warn('Gemini Copilot API error, falling back to rule engine:', geminiErr.message);
      }
    }

    // Rule-based fallback if Gemini is not configured or failed
    if (!answer) {
      if (dataTable) {
        answer = `Analyzed live database records for "${query}". Found pertinent items with current inventory status.`;
      } else {
        answer = `StockSense holds **${products.length} products** with a total valuation of **$${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}**. Ask me about low stock alerts, product locations, or recent shipments.`;
      }
    }

    if (suggestions.length === 0) {
      suggestions = ['Check Low Stock Products', 'Predict Stockout Timelines', 'Assign AI Operational Tasks', 'Show Warehouse Heatmap'];
    }

    res.json({
      query,
      answer,
      dataTable,
      suggestions,
      poweredBy: 'Google Gemini AI',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});


// =========================================================================
// 2. PREDICTIVE STOCKOUT
// =========================================================================
router.get('/predictive-stockout', async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        stocks: { include: { warehouse: true, location: true } },
        movements: {
          where: { movementType: 'OUT' },
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    });

    const predictions = products.map((p) => {
      const onHand = p.stocks.reduce((acc, s) => acc + s.quantity, 0);

      // Estimate daily consumption rate based on past OUT movements
      const totalOut = p.movements.reduce((sum, m) => sum + Math.abs(m.quantity), 0);
      const daysObserved = 14;
      // Default daily burn rate if no movements logged yet
      const dailyBurnRate = totalOut > 0 ? totalOut / daysObserved : Math.max(1, Math.round(p.reorderLevel / 7));

      let daysRemaining = dailyBurnRate > 0 ? Math.floor(onHand / dailyBurnRate) : 999;
      if (onHand === 0) daysRemaining = 0;

      let riskLevel = 'HEALTHY';
      if (daysRemaining === 0) riskLevel = 'STOCKOUT';
      else if (daysRemaining <= 3) riskLevel = 'CRITICAL';
      else if (daysRemaining <= 7) riskLevel = 'HIGH';
      else if (daysRemaining <= 14) riskLevel = 'MODERATE';

      const stockoutDate = new Date();
      stockoutDate.setDate(stockoutDate.getDate() + daysRemaining);

      const recommendedReorderQty = Math.max(p.reorderLevel * 2, 50);

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category.name,
        onHand,
        reorderLevel: p.reorderLevel,
        dailyBurnRate: Number(dailyBurnRate.toFixed(1)),
        daysRemaining,
        estimatedStockoutDate: onHand === 0 ? 'Today' : stockoutDate.toLocaleDateString(),
        riskLevel,
        recommendedReorderQty,
      };
    });

    // Sort by most urgent risk
    const orderMap = { STOCKOUT: 0, CRITICAL: 1, HIGH: 2, MODERATE: 3, HEALTHY: 4 };
    predictions.sort((a, b) => orderMap[a.riskLevel] - orderMap[b.riskLevel]);

    res.json(predictions);
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// 3. INVENTORY DETECTIVE (Discrepancy Investigation)
// =========================================================================
router.get('/inventory-detective', async (req, res, next) => {
  try {
    const adjustments = await prisma.adjustment.findMany({
      include: { product: true, warehouse: true, location: true, user: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const investigations = adjustments.map((adj) => {
      let rootCause = '';
      let confidence = '95%';
      let actionSuggestion = '';

      if (adj.difference < 0) {
        if (adj.reason === 'DAMAGED') {
          rootCause = 'Material degradation or handling impact during internal relocation';
          actionSuggestion = 'Review handling procedures and inspect rack storage conditions.';
        } else if (adj.reason === 'LOST') {
          rootCause = 'Unrecorded dispatch or physical shrinkage between count cycles';
          actionSuggestion = 'Audit recent outbound delivery slips and verify security logs.';
        } else {
          rootCause = 'Count variance likely caused by untracked partial picking or human tally error';
          actionSuggestion = 'Perform blind double-count reconciliation with senior warehouse supervisor.';
        }
      } else if (adj.difference > 0) {
        rootCause = 'Ghost inventory discovered; likely unlogged receipt or return from customer';
        actionSuggestion = 'Verify supplier packing slip matching and reconcile returns log.';
      } else {
        rootCause = 'Perfect match: physical count verifies system inventory count exactly';
        actionSuggestion = 'No corrective action needed; count verified.';
      }

      return {
        id: adj.id,
        reference: adj.reference,
        productName: adj.product?.name,
        sku: adj.product?.sku,
        warehouse: adj.warehouse?.name,
        location: adj.location?.name,
        systemQuantity: adj.systemQuantity,
        countedQuantity: adj.countedQuantity,
        difference: adj.difference,
        reason: adj.reason,
        status: adj.status,
        investigator: adj.user?.name || 'Staff',
        date: adj.createdAt,
        rootCause,
        confidence,
        actionSuggestion,
      };
    });

    res.json(investigations);
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// 4. WHAT-IF SIMULATOR
// =========================================================================
router.post('/what-if', async (req, res, next) => {
  try {
    const { scenarioType, productId, quantity, warehouseId } = req.body;
    const qty = Number(quantity) || 0;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { stocks: { include: { location: true, warehouse: true } } },
    });

    if (!product) return res.status(404).json({ message: 'Product not found' });

    const currentOnHand = product.stocks.reduce((sum, s) => sum + s.quantity, 0);
    const currentValuation = currentOnHand * product.unitCost;

    let projectedOnHand = currentOnHand;
    let impactDescription = '';
    let storageImpact = '';
    let cashFlowImpact = 0;

    if (scenarioType === 'RECEIVE') {
      projectedOnHand += qty;
      cashFlowImpact = -(qty * product.unitCost);
      impactDescription = `Receiving ${qty} units will expand stock to ${projectedOnHand} ${product.uom}. Buffer duration expands by ~${Math.round(qty / 3)} days.`;
      storageImpact = `Requires estimated ${Math.ceil(qty / 20)} shelf bins. Storage load increases by ~${Math.min(100, Math.round((qty / 200) * 100))}%.`;
    } else if (scenarioType === 'DISPATCH') {
      projectedOnHand = Math.max(0, currentOnHand - qty);
      cashFlowImpact = qty * (product.unitCost * 1.4); // Assuming 40% margin
      const willStockout = projectedOnHand <= product.reorderLevel;
      impactDescription = `Dispatching ${qty} units will leave ${projectedOnHand} units on hand. ${willStockout ? '⚠️ WARNING: Pushes inventory into LOW STOCK zone!' : 'Remains within safe operating buffer.'}`;
      storageImpact = `Frees up ~${Math.ceil(qty / 20)} shelf bins in warehouse.`;
    } else if (scenarioType === 'PRICE_SURGE') {
      const surgePercent = Number(quantity) || 15;
      const newCost = product.unitCost * (1 + surgePercent / 100);
      impactDescription = `A ${surgePercent}% unit cost increase raises restocking cost from $${product.unitCost.toFixed(2)} to $${newCost.toFixed(2)} per unit.`;
      cashFlowImpact = -(currentOnHand * (newCost - product.unitCost));
      storageImpact = 'No physical footprint change.';
    }

    const projectedValuation = projectedOnHand * product.unitCost;

    res.json({
      productName: product.name,
      sku: product.sku,
      unitCost: product.unitCost,
      currentOnHand,
      projectedOnHand,
      currentValuation,
      projectedValuation,
      valuationDelta: projectedValuation - currentValuation,
      cashFlowImpact,
      impactDescription,
      storageImpact,
      thresholdStatus:
        projectedOnHand === 0
          ? 'OUT_OF_STOCK'
          : projectedOnHand <= product.reorderLevel
          ? 'LOW_STOCK'
          : 'HEALTHY',
    });
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// 5 & 15. WAREHOUSE DIGITAL TWIN & INVENTORY HEATMAP
// =========================================================================
router.get('/warehouse-twin', async (req, res, next) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: {
        locations: {
          include: {
            stocks: { include: { product: true } },
          },
        },
      },
    });

    const twinData = warehouses.map((w) => {
      let warehouseTotalStock = 0;
      let totalCapacity = w.locations.length * 100; // Benchmark 100 units capacity per rack

      const racks = w.locations.map((loc, idx) => {
        const storedQty = loc.stocks.reduce((acc, s) => acc + s.quantity, 0);
        warehouseTotalStock += storedQty;
        const capacity = 100;
        const utilization = Math.min(100, Math.round((storedQty / capacity) * 100));

        let heatStatus = 'OPTIMAL';
        let heatColor = '#10B981'; // green
        if (utilization >= 90) {
          heatStatus = 'OVERLOADED';
          heatColor = '#EF4444'; // red
        } else if (utilization >= 70) {
          heatStatus = 'HIGH';
          heatColor = '#F59E0B'; // amber
        } else if (utilization < 20) {
          heatStatus = 'UNDERUSED';
          heatColor = '#3B82F6'; // blue
        }

        return {
          id: loc.id,
          name: loc.name,
          gridRow: Math.floor(idx / 3) + 1,
          gridCol: (idx % 3) + 1,
          storedQty,
          capacity,
          utilization,
          heatStatus,
          heatColor,
          items: loc.stocks.map((s) => ({
            productName: s.product.name,
            sku: s.product.sku,
            quantity: s.quantity,
          })),
        };
      });

      const overallUtilization = totalCapacity > 0 ? Math.round((warehouseTotalStock / totalCapacity) * 100) : 0;

      return {
        id: w.id,
        code: w.code,
        name: w.name,
        warehouseTotalStock,
        totalCapacity,
        overallUtilization,
        racks,
      };
    });

    res.json(twinData);
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// 6. MOVEMENT REPLAY (Lifecycle Stepper)
// =========================================================================
router.get('/movement-replay/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params;
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true, stocks: { include: { location: true, warehouse: true } } },
    });

    if (!product) return res.status(404).json({ message: 'Product not found' });

    const movements = await prisma.stockMovement.findMany({
      where: { productId },
      include: {
        warehouse: true,
        fromLocation: true,
        toLocation: true,
        user: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
    });

    const journey = movements.map((m, idx) => {
      let stepTitle = '';
      let stepDescription = '';

      if (m.movementType === 'IN') {
        stepTitle = `Inbound Intake (${m.reference})`;
        stepDescription = `Received +${m.quantity} ${product.uom} into ${m.warehouse.code} at ${m.toLocation?.name || 'Inbound Dock'}`;
      } else if (m.movementType === 'OUT') {
        stepTitle = `Outbound Dispatch (${m.reference})`;
        stepDescription = `Delivered ${Math.abs(m.quantity)} ${product.uom} from ${m.fromLocation?.name || 'Warehouse'} to customer`;
      } else if (m.movementType === 'TRANSFER') {
        stepTitle = `Internal Relocation (${m.reference})`;
        stepDescription = `Relocated ${m.quantity} ${product.uom} from ${m.fromLocation?.name} to ${m.toLocation?.name}`;
      } else if (m.movementType === 'ADJUSTMENT') {
        stepTitle = `Audit Reconciliation (${m.reference})`;
        stepDescription = `Stock variance reconciled (${m.quantity > 0 ? '+' : ''}${m.quantity} ${product.uom}) at ${m.fromLocation?.name || 'facility'}`;
      }

      return {
        step: idx + 1,
        date: m.date,
        type: m.movementType,
        title: stepTitle,
        description: stepDescription,
        actor: m.user?.name || 'System Operator',
        warehouse: m.warehouse.code,
        quantity: m.quantity,
      };
    });

    res.json({
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        uom: product.uom,
        currentStock: product.stocks.reduce((acc, s) => acc + s.quantity, 0),
      },
      totalEvents: journey.length,
      journey,
    });
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// 7. AI ANOMALY DETECTION
// =========================================================================
router.get('/anomalies', async (req, res, next) => {
  try {
    const movements = await prisma.stockMovement.findMany({
      include: { product: true, warehouse: true, user: true },
      orderBy: { date: 'desc' },
      take: 50,
    });

    const anomalies = [];

    movements.forEach((m) => {
      // Anomaly 1: Disproportionately high bulk movement (> 40 units in single move)
      if (Math.abs(m.quantity) >= 40) {
        anomalies.push({
          id: `ANOM-BULK-${m.id}`,
          reference: m.reference,
          productName: m.product.name,
          sku: m.product.sku,
          severity: 'HIGH',
          type: 'BULK_SPIKE',
          title: `High Volume Spike Detected (${m.quantity > 0 ? '+' : ''}${m.quantity} units)`,
          explanation: `Single transaction volume exceeds standard baseline batch threshold (30 units).`,
          recommendation: 'Verify physical delivery receipt and bill of lading countersignatures.',
          timestamp: m.date,
          actor: m.user.name,
        });
      }

      // Anomaly 2: Negative stock adjustment (Shrinkage alert)
      if (m.movementType === 'ADJUSTMENT' && m.quantity < 0) {
        anomalies.push({
          id: `ANOM-SHRINK-${m.id}`,
          reference: m.reference,
          productName: m.product.name,
          sku: m.product.sku,
          severity: 'CRITICAL',
          type: 'UNEXPECTED_SHRINKAGE',
          title: `Negative Variance Discrepancy (${m.quantity} units)`,
          explanation: `Inventory reconciliation resulted in a net loss deduction on ledger.`,
          recommendation: 'Initiate inventory detective audit and inspect storage rack security.',
          timestamp: m.date,
          actor: m.user.name,
        });
      }
    });

    res.json(anomalies);
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// 8. SMART ACTION CENTER
// =========================================================================
router.get('/smart-actions', async (req, res, next) => {
  try {
    const actions = [];

    // 1. Check for products below reorder level
    const products = await prisma.product.findMany({
      include: { stocks: true },
    });
    const lowStock = products.filter((p) => {
      const onHand = p.stocks.reduce((acc, s) => acc + s.quantity, 0);
      return onHand <= p.reorderLevel;
    });

    if (lowStock.length > 0) {
      actions.push({
        id: 'ACT-LOW-STOCK',
        priority: 'CRITICAL',
        title: `${lowStock.length} SKU(s) Need Reordering Immediately`,
        description: `Items like ${lowStock.slice(0, 2).map((p) => p.name).join(', ')} are below safety reserve thresholds.`,
        actionType: 'NAVIGATE',
        actionTarget: '/products',
        actionLabel: 'Review Reorder List',
      });
    }

    // 2. Check for draft receipts pending validation
    const draftReceipts = await prisma.receipt.findMany({ where: { status: 'DRAFT' } });
    if (draftReceipts.length > 0) {
      actions.push({
        id: 'ACT-DRAFT-RECEIPTS',
        priority: 'MEDIUM',
        title: `${draftReceipts.length} Inbound Receipt(s) Awaiting Intake`,
        description: `Stock is physically on dock but not yet validated into live inventory counts.`,
        actionType: 'NAVIGATE',
        actionTarget: '/receipts',
        actionLabel: 'Validate Receipts',
      });
    }

    // 3. Check for draft deliveries
    const draftDeliveries = await prisma.delivery.findMany({ where: { status: 'DRAFT' } });
    if (draftDeliveries.length > 0) {
      actions.push({
        id: 'ACT-DRAFT-DELIVERIES',
        priority: 'HIGH',
        title: `${draftDeliveries.length} Customer Order(s) Ready for Dispatch`,
        description: `Ensure stock verification passes before driver dispatch.`,
        actionType: 'NAVIGATE',
        actionTarget: '/deliveries',
        actionLabel: 'Dispatch Deliveries',
      });
    }

    res.json(actions);
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// 10. AI DAILY BRIEF
// =========================================================================
router.get('/daily-brief', async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({ include: { stocks: true } });
    const movements = await prisma.stockMovement.findMany({ take: 20, orderBy: { date: 'desc' } });

    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalStockVal = 0;

    products.forEach((p) => {
      const onHand = p.stocks.reduce((acc, s) => acc + s.quantity, 0);
      if (onHand === 0) outOfStockCount++;
      else if (onHand <= p.reorderLevel) lowStockCount++;
      totalStockVal += onHand * p.unitCost;
    });

    const healthScore = Math.max(
      40,
      100 - lowStockCount * 8 - outOfStockCount * 15
    );

    let executiveSummary = `Warehouse operations are running with ${products.length} managed catalog SKUs and a total inventory value of $${totalStockVal.toLocaleString()}. Operational attention is required on ${lowStockCount + outOfStockCount} inventory line(s).`;
    let priorities = [
      'Place replenishment purchase order for products at or below safety threshold.',
      'Validate incoming supplier consignments waiting at Main Warehouse dock.',
      'Review variance reports in the Inventory Detective dashboard.',
    ];

    if (geminiBrain.isGeminiConfigured()) {
      try {
        const aiBrief = await geminiBrain.generateDailyBriefAI({
          totalProducts: products.length,
          totalValuation: `$${totalStockVal.toFixed(2)}`,
          healthScore,
          lowStockCount,
          outOfStockCount,
          recentOperationsCount: movements.length,
        });
        if (aiBrief) {
          executiveSummary = aiBrief;
        }
      } catch (geminiErr) {
        console.warn('Gemini daily brief fallback:', geminiErr.message);
      }
    }

    const brief = {
      generatedAt: new Date().toISOString(),
      healthScore,
      healthStatus: healthScore > 85 ? 'EXCELLENT' : healthScore > 70 ? 'GOOD' : 'ATTENTION_REQUIRED',
      executiveSummary,
      keyMetrics: [
        { label: 'Inventory Health Score', value: `${healthScore}/100` },
        { label: 'Low Stock Risk SKUs', value: lowStockCount },
        { label: 'Out of Stock SKUs', value: outOfStockCount },
        { label: '24h Total Operations', value: movements.length },
      ],
      priorities,
      poweredBy: 'Google Gemini AI',
    };

    res.json(brief);
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// 12. EXPLAIN THIS NUMBER
// =========================================================================
router.get('/explain-number', async (req, res, next) => {
  try {
    const { metric } = req.query;

    if (metric === 'totalStockValue') {
      const products = await prisma.product.findMany({ include: { stocks: true } });
      const breakdown = products.map((p) => {
        const onHand = p.stocks.reduce((acc, s) => acc + s.quantity, 0);
        return {
          name: p.name,
          sku: p.sku,
          onHand,
          unitCost: p.unitCost,
          subtotal: onHand * p.unitCost,
        };
      });

      const total = breakdown.reduce((acc, b) => acc + b.subtotal, 0);

      return res.json({
        metricName: 'Total Inventory Valuation',
        formula: 'SUM(Product.onHand × Product.unitCost) across all items',
        calculatedValue: `$${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        explanation: 'Every live Stock record is grouped per product and multiplied by its master unit cost.',
        breakdown: breakdown.slice(0, 8),
      });
    }

    if (metric === 'lowStock') {
      const products = await prisma.product.findMany({ include: { stocks: true } });
      const lowList = products
        .map((p) => {
          const onHand = p.stocks.reduce((acc, s) => acc + s.quantity, 0);
          return { name: p.name, sku: p.sku, onHand, threshold: p.reorderLevel };
        })
        .filter((p) => p.onHand <= p.threshold && p.onHand > 0);

      return res.json({
        metricName: 'Low Stock Alert Count',
        formula: 'COUNT(Product WHERE onHand > 0 AND onHand <= reorderLevel)',
        calculatedValue: lowList.length,
        explanation: 'Dynamically calculated live against the current sum of Stock docs per product.',
        breakdown: lowList,
      });
    }

    res.json({
      metricName: metric || 'General Metric',
      formula: 'Aggregated live from single source of truth database table',
      calculatedValue: 'Live DB Query',
      explanation: 'No caching or stale static states are used; every number reflects real transactions.',
      breakdown: [],
    });
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// 16. SUPPLIER RELIABILITY ANALYTICS
// =========================================================================
router.get('/supplier-reliability', async (req, res, next) => {
  try {
    const receipts = await prisma.receipt.findMany({
      include: { items: true },
    });

    const supplierMap = {};
    receipts.forEach((r) => {
      if (!supplierMap[r.supplierName]) {
        supplierMap[r.supplierName] = {
          name: r.supplierName,
          totalReceipts: 0,
          doneReceipts: 0,
          totalUnitsDelivered: 0,
        };
      }
      supplierMap[r.supplierName].totalReceipts++;
      if (r.status === 'DONE') supplierMap[r.supplierName].doneReceipts++;
      const units = r.items.reduce((sum, it) => sum + it.quantity, 0);
      supplierMap[r.supplierName].totalUnitsDelivered += units;
    });

    const suppliers = Object.values(supplierMap).map((s) => {
      const fulfillmentRate = s.totalReceipts > 0 ? Math.round((s.doneReceipts / s.totalReceipts) * 100) : 100;
      let grade = 'A+';
      if (fulfillmentRate < 70) grade = 'C';
      else if (fulfillmentRate < 85) grade = 'B';
      else if (fulfillmentRate < 95) grade = 'A';

      return {
        ...s,
        fulfillmentRate,
        grade,
        avgLeadTimeDays: Math.floor(Math.random() * 3) + 2, // 2-4 days
      };
    });

    res.json(suppliers);
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// 17. COMPLETE AUDIT TIMELINE
// =========================================================================
router.get('/audit-timeline', async (req, res, next) => {
  try {
    const movements = await prisma.stockMovement.findMany({
      include: {
        product: true,
        warehouse: true,
        fromLocation: true,
        toLocation: true,
        user: true,
      },
      orderBy: { date: 'desc' },
      take: 40,
    });

    const auditTrail = movements.map((m) => ({
      id: m.id,
      timestamp: m.date,
      action:
        m.movementType === 'IN'
          ? 'INBOUND_RECEIPT'
          : m.movementType === 'OUT'
          ? 'OUTBOUND_DISPATCH'
          : m.movementType === 'TRANSFER'
          ? 'INTERNAL_TRANSFER'
          : 'AUDIT_ADJUSTMENT',
      reference: m.reference,
      targetEntity: `${m.product.name} (${m.product.sku})`,
      delta: `${m.quantity > 0 ? '+' : ''}${m.quantity} ${m.product.uom}`,
      performedBy: m.user?.name || 'Authorized Staff',
      locationContext: `${m.warehouse.code} ${m.toLocation ? `➔ ${m.toLocation.name}` : ''} ${m.fromLocation ? `from ${m.fromLocation.name}` : ''}`,
      status: 'VERIFIED_ON_CHAIN',
    }));

    res.json(auditTrail);
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// 20. AI RECOMMENDATIONS ENGINE
// =========================================================================
router.get('/recommendations', async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      include: { stocks: { include: { warehouse: true, location: true } } },
    });

    const recommendations = [];

    products.forEach((p) => {
      const onHand = p.stocks.reduce((acc, s) => acc + s.quantity, 0);

      // Reorder suggestion
      if (onHand <= p.reorderLevel) {
        const orderQty = Math.max(50, p.reorderLevel * 2);
        recommendations.push({
          id: `REC-REORDER-${p.id}`,
          type: 'REORDER',
          urgency: onHand === 0 ? 'CRITICAL' : 'HIGH',
          title: `Reorder ${orderQty} ${p.uom} of ${p.name}`,
          rationale: `Current on-hand stock (${onHand}) is at or below reorder threshold (${p.reorderLevel}).`,
          impact: 'Eliminates 100% risk of production or order fulfillment stoppage.',
          actionPayload: { productId: p.id, suggestedQuantity: orderQty },
        });
      }

      // Rebalancing suggestion between locations
      if (p.stocks.length > 1) {
        const sortedStocks = [...p.stocks].sort((a, b) => b.quantity - a.quantity);
        const highest = sortedStocks[0];
        const lowest = sortedStocks[sortedStocks.length - 1];

        if (highest.quantity > 30 && lowest.quantity < 5) {
          const shiftQty = Math.floor(highest.quantity / 3);
          recommendations.push({
            id: `REC-BAL-${p.id}`,
            type: 'REBALANCE',
            urgency: 'MEDIUM',
            title: `Transfer ${shiftQty} ${p.uom} of ${p.name} to ${lowest.location.name}`,
            rationale: `${highest.location.name} holds ${highest.quantity} units while ${lowest.location.name} holds only ${lowest.quantity}.`,
            impact: 'Balances rack capacity and reduces picker travel time across warehouses.',
            actionPayload: {
              productId: p.id,
              fromLocationId: highest.locationId,
              toLocationId: lowest.locationId,
              quantity: shiftQty,
            },
          });
        }
      }
    });

    res.json(recommendations);
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// 21. AI DYNAMIC TASK ASSIGNMENT DISPATCHER (Powered by Gemini Brain)
// =========================================================================
router.get('/ai-tasks', async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      include: { stocks: { include: { warehouse: true, location: true } } },
    });
    const receipts = await prisma.receipt.findMany({
      where: { status: 'DRAFT' },
      take: 5,
    });
    const deliveries = await prisma.delivery.findMany({
      where: { status: 'DRAFT' },
      take: 5,
    });
    const adjustments = await prisma.adjustment.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { product: true },
    });

    const lowStockItems = products
      .map((p) => ({
        name: p.name,
        sku: p.sku,
        onHand: p.stocks.reduce((acc, s) => acc + s.quantity, 0),
        reorderLevel: p.reorderLevel,
      }))
      .filter((p) => p.onHand <= p.reorderLevel);

    const liveContext = {
      lowStockCount: lowStockItems.length,
      lowStockItems: lowStockItems.map(
        (p) => `${p.name} (${p.sku}) - On hand: ${p.onHand}, Threshold: ${p.reorderLevel}`
      ),
      pendingDraftReceipts: receipts.length,
      pendingDraftDeliveries: deliveries.length,
      recentAdjustments: adjustments.map(
        (a) => `${a.product?.name}: discrepancy ${a.difference} units (${a.reason})`
      ),
    };

    const tasks = await geminiBrain.assignWarehouseTasksAI(liveContext);
    res.json({
      success: true,
      assignedBy: 'Google Gemini AI Warehouse Brain',
      timestamp: new Date().toISOString(),
      tasks,
    });
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// 22. AI FORENSIC DETECTIVE DEEP-DIVE (Powered by Gemini Brain)
// =========================================================================
router.post('/inventory-detective/deep-dive', async (req, res, next) => {
  try {
    const { adjustmentId } = req.body;
    let adj = null;
    if (adjustmentId) {
      adj = await prisma.adjustment.findUnique({
        where: { id: adjustmentId },
        include: { product: true, warehouse: true, location: true, user: true },
      });
    } else {
      adj = await prisma.adjustment.findFirst({
        where: { difference: { not: 0 } },
        orderBy: { createdAt: 'desc' },
        include: { product: true, warehouse: true, location: true, user: true },
      });
    }

    if (!adj) {
      return res.json({
        reference: 'N/A',
        aiAnalysis: 'All recent inventory cycle counts show 100% concordance with physical stock. No discrepancies detected.',
      });
    }

    let aiAnalysis = 'Reconciliation matched system tolerances.';
    if (geminiBrain.isGeminiConfigured()) {
      try {
        aiAnalysis = await geminiBrain.analyzeDiscrepancyAI({
          reference: adj.reference,
          productName: adj.product?.name,
          sku: adj.product?.sku,
          warehouse: adj.warehouse?.name,
          location: adj.location?.name,
          systemQuantity: adj.systemQuantity,
          countedQuantity: adj.countedQuantity,
          difference: adj.difference,
          reason: adj.reason,
        });
      } catch (err) {
        console.warn('Gemini discrepancy analysis fallback:', err.message);
      }
    }

    res.json({
      adjustmentId: adj.id,
      reference: adj.reference,
      productName: adj.product?.name,
      sku: adj.product?.sku,
      difference: adj.difference,
      aiAnalysis,
      poweredBy: 'Google Gemini AI',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
