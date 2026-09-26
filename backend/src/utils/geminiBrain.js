const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const apiKey = process.env.GEMINI_API_KEY;
let aiClient = null;

if (apiKey && apiKey !== 'your_gemini_api_key_here') {
  try {
    aiClient = new GoogleGenAI({ apiKey });
    console.log('StockSense Gemini AI Brain initialized with active API key.');
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI client:', err);
  }
} else {
  console.warn('GEMINI_API_KEY is not set or using placeholder.');
}

/**
 * Executes a Gemini prompt with automatic model fallback for 100% uptime & reliability
 */
async function callGemini(contents, systemInstruction = '') {
  if (!aiClient) {
    throw new Error('Gemini API client is not configured.');
  }

  // Valid active Gemini models in priority order
  const candidateModels = [
    'gemini-flash-latest',
    'gemini-3.8-flash',
    'gemini-3.5-flash-lite',
  ];

  let lastError = null;

  for (const model of candidateModels) {
    try {
      const config = {};
      if (systemInstruction) {
        config.systemInstruction = systemInstruction;
      }

      const response = await aiClient.models.generateContent({
        model,
        contents,
        config,
      });

      if (response && response.text) {
        return response.text.trim();
      }
    } catch (err) {
      lastError = err;
      console.warn(`Gemini model ${model} attempt failed: ${err.message || err}. Trying next fallback...`);
    }
  }

  throw lastError || new Error('All Gemini model fallbacks failed.');
}

/**
 * Human-like, empathetic, and operational System Persona for StockSense AI
 */
const WAREHOUSE_BRAIN_SYSTEM = `
You are StockSense AI — an experienced, deeply knowledgeable, and empathetic Senior Warehouse Operations Director and Supply Chain Partner.
You are pair-managing this inventory system alongside the user (Warehouse Staff, Inventory Managers, and Business Owners).
You have real-time access to the live database, on-hand balances, warehouse locations, reorder thresholds, and stock movements.

Core Directives for Human-Like Interaction:
1. SPEAK NATURALLY & PERSONABLY:
   - Talk like a trusted, intelligent human colleague. Be warm, conversational, encouraging, and clear.
   - Start with natural context (e.g., "I just reviewed our warehouse floor right now...", "Here is exactly how our inventory stands:", "Good question! Let's take a look at the data:").
   - Avoid sounding robotic, cold, or mechanical.
2. REASON DEEPLY & CONTEXTUALLY:
   - Don't just list numbers; explain *what they mean* for the warehouse operations.
   - If an item is out of stock or low, highlight the operational impact (e.g. shipment bottleneck, safety hazard, customer delivery risk).
   - If stock is healthy, reassure the user and suggest optimizations.
3. GROUNDED IN ACTUAL LIVE DATA:
   - Always base your answers on the provided live warehouse context.
   - Mention exact product names, SKUs, quantities, and specific warehouse locations (e.g., "Main Warehouse - Rack A").
   - If a product is not in the warehouse, state that clearly and offer to help add it or track it.
4. MULTILINGUAL & CULTURAL FLUENCY:
   - Understand English, Hindi, and Hinglish queries effortlessly (e.g., "kaunsa product khatam ho raha hai?", "washing machine kahan hai?", "steel rods kitne bache hain?").
   - Reply in natural, friendly English with cultural warmth and Hinglish understanding.
5. PROACTIVE & ACTIONABLE:
   - Always conclude with 1 to 3 concrete, practical recommendations (e.g. "Recommended Next Steps: 1. Create a purchase receipt for 50 units... 2. Transfer 15 units to Rack B...").
6. VISUAL CLARITY:
   - Use structured bullet points, short clean paragraphs, and bold text on numbers, locations, and SKUs so it's effortless to scan on mobile or desktop.
`;

/**
 * 1. AI Warehouse Copilot with Multi-Turn Conversational Context & Live DB Snapshot
 */
async function askGeminiCopilot(userQuery, inventoryContext, conversationHistory = []) {
  // Build recent dialogue context if history is provided
  let historyPrompt = '';
  if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    const recent = conversationHistory.slice(-6); // last 6 turns
    historyPrompt = `\nRECENT CONVERSATION HISTORY:\n` +
      recent.map(m => `${m.role === 'user' ? 'User' : 'Assistant (You)'}: ${m.text}`).join('\n') + '\n';
  }

  const prompt = `
${historyPrompt}
LIVE WAREHOUSE REAL-TIME CONTEXT:
- Total Catalog Products: ${inventoryContext.totalCatalogProducts}
- Total Inventory Asset Valuation: ${inventoryContext.totalInventoryValuation}
- Active Warehouses & Storage Racks: ${JSON.stringify(inventoryContext.warehousesSummary || [], null, 2)}
- Complete Product Catalog Status:
${JSON.stringify(inventoryContext.allProducts || inventoryContext.sampleCatalog || [], null, 2)}
- Critical Low & Out of Stock Alerts:
${JSON.stringify(inventoryContext.lowStockSKUs || [], null, 2)}
- Recent Inbound Shipments (Receipts):
${JSON.stringify(inventoryContext.recentInboundReceipts || [], null, 2)}
- Recent Outbound Customer Deliveries:
${JSON.stringify(inventoryContext.recentDeliveries || [], null, 2)}

USER QUESTION:
"${userQuery}"

Provide a warm, human-like, data-grounded, and thoroughly reasonable response to the user's question. Explain the current status, cite exact numbers and locations, and advise on next operational steps.
`;

  return await callGemini(prompt, WAREHOUSE_BRAIN_SYSTEM);
}

/**
 * 2. AI Detective Root Cause Analysis (Explaining Stock Discrepancies)
 */
async function analyzeDiscrepancyAI(adjustmentData) {
  const prompt = `
A stock adjustment variance was physically discovered on the warehouse floor:
- Reference: ${adjustmentData.reference}
- Product: ${adjustmentData.productName} (SKU: ${adjustmentData.sku})
- Storage Location: ${adjustmentData.warehouse} — ${adjustmentData.location}
- System Recorded Quantity: ${adjustmentData.systemQuantity}
- Physical Counted Quantity: ${adjustmentData.countedQuantity}
- Variance / Difference: ${adjustmentData.difference} units
- Reason Categorized: ${adjustmentData.reason}

As Senior Operations Lead, write a thoughtful 3-sentence Human Root Cause Analysis explaining likely operational causes (e.g. misplacement, unrecorded dispatch, bin counting error) and recommend 1 immediate corrective action for the floor team.
`;

  return await callGemini(prompt, WAREHOUSE_BRAIN_SYSTEM);
}

/**
 * 3. AI Daily Executive Briefing
 */
async function generateDailyBriefAI(metricsContext) {
  const prompt = `
DAILY WAREHOUSE AUDIT & OPERATIONAL METRICS:
${JSON.stringify(metricsContext, null, 2)}

As Senior Operations Director, provide a warm, motivating morning briefing for the inventory management team:
1. An Executive Summary (3 conversational sentences summarizing warehouse health, valuation, and immediate bottlenecks).
2. Priority Action Items for Today (3 clear bullet points with specific SKU/rack focus).
3. A brief motivational note for the warehouse floor team.
`;

  return await callGemini(prompt, WAREHOUSE_BRAIN_SYSTEM);
}

/**
 * 4. AI Dynamic Task Assignment Engine
 */
async function assignWarehouseTasksAI(liveContext) {
  const prompt = `
CURRENT WAREHOUSE LIVE STATUS & ALERTS:
${JSON.stringify(liveContext, null, 2)}

Review the live warehouse state above (low-stock SKUs, pending receipts, pending deliveries, storage imbalances). Assign 3 to 5 realistic, high-priority operational tasks to specific warehouse team members.

Respond with ONLY a valid JSON array of objects with the following schema:
[
  {
    "id": "TASK-1",
    "role": "Procurement Specialist | Forklift Operator | Inventory Auditor | Receiving Clerk | Warehouse Supervisor",
    "priority": "CRITICAL | HIGH | MEDIUM",
    "title": "Short title describing the task",
    "target": "SKU name or location reference",
    "instructions": "Clear, friendly, step-by-step instructions for the assigned role",
    "estimatedTime": "e.g. 30 mins, 1 hour",
    "deadline": "e.g. End of shift, Immediate"
  }
]
`;

  try {
    const rawText = await callGemini(prompt, WAREHOUSE_BRAIN_SYSTEM);
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    console.warn('Failed to parse Gemini task assignment JSON, using fallback generator:', err.message);
  }

  // Fallback operational task generator
  return [
    {
      id: 'TASK-FB-1',
      role: 'Procurement Specialist',
      priority: 'CRITICAL',
      title: 'Issue Replenishment PO for Low Stock Items',
      target: 'Critical Stock Items',
      instructions: 'Review low stock warnings in StockSense and dispatch purchase orders to registered suppliers.',
      estimatedTime: '45 mins',
      deadline: 'Immediate',
    },
    {
      id: 'TASK-FB-2',
      role: 'Receiving Clerk',
      priority: 'HIGH',
      title: 'Inbound Verification at Inbound Dock',
      target: 'Main Warehouse Dock',
      instructions: 'Inspect incoming supplier shipments, match bills of lading, and validate in StockSense Receipts.',
      estimatedTime: '30 mins',
      deadline: 'Within 2 hours',
    },
    {
      id: 'TASK-FB-3',
      role: 'Inventory Auditor',
      priority: 'MEDIUM',
      title: 'Cycle Count Audit on Discrepancy Bins',
      target: 'Variance Locations',
      instructions: 'Perform blind physical recounts on recent adjustment items using Barcode Scanner.',
      estimatedTime: '1 hour',
      deadline: 'End of Shift',
    },
  ];
}

module.exports = {
  callGemini,
  askGeminiCopilot,
  analyzeDiscrepancyAI,
  generateDailyBriefAI,
  assignWarehouseTasksAI,
  isGeminiConfigured: () => !!aiClient,
};
