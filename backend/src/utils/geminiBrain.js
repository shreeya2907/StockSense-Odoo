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
 * Executes a Gemini prompt with automatic model fallback for 100% reliability
 */
async function callGemini(contents, systemInstruction = '') {
  if (!aiClient) {
    throw new Error('Gemini API client is not configured.');
  }

  const candidateModels = [
    'gemini-3.5-flash-lite',
    'gemini-flash-latest',
    'gemini-3.8-flash',
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
 * System prompt defining StockSense AI Warehouse Brain
 */
const WAREHOUSE_BRAIN_SYSTEM = `
You are the AI Warehouse Brain and Senior Inventory Strategist of StockSense (Real-Time Inventory, Simplified).
You have access to live database context including on-hand stock counts, reorder thresholds, warehouse locations, and recent transactions.
Your role:
1. Provide concise, professional, data-backed operational answers for Inventory Managers and Warehouse Staff.
2. Highlight stockout risks, safety buffer breaches, and urgent reorders.
3. Suggest precise actions (e.g. transfer quantities between racks, exact reorder units).
4. Be crisp, actionable, and warehouse-ready. Use bullet points or bold numbers where appropriate.
`;

/**
 * 1. AI Warehouse Copilot with live DB context
 */
async function askGeminiCopilot(userQuery, inventoryContext) {
  const prompt = `
CURRENT WAREHOUSE LIVE DATA CONTEXT:
${JSON.stringify(inventoryContext, null, 2)}

USER QUESTION:
"${userQuery}"

Answer the user's question accurately based on the live inventory data provided above. If specific products or quantities are involved, mention their exact names, SKUs, and on-hand quantities. Suggest next best operational steps.
`;

  return await callGemini(prompt, WAREHOUSE_BRAIN_SYSTEM);
}

/**
 * 2. AI Detective Root Cause Analysis
 */
async function analyzeDiscrepancyAI(adjustmentData) {
  const prompt = `
A stock adjustment variance was reported in the warehouse:
- Reference: ${adjustmentData.reference}
- Product: ${adjustmentData.productName} (SKU: ${adjustmentData.sku})
- Location: ${adjustmentData.warehouse} - ${adjustmentData.location}
- System Quantity Recorded: ${adjustmentData.systemQuantity}
- Physical Counted Quantity: ${adjustmentData.countedQuantity}
- Variance: ${adjustmentData.difference} units
- Reason Categorized: ${adjustmentData.reason}

Provide a 2-sentence Root Cause Analysis (RCA) and 1 specific corrective warehouse action.
`;

  return await callGemini(prompt, WAREHOUSE_BRAIN_SYSTEM);
}

/**
 * 3. AI Daily Executive Briefing
 */
async function generateDailyBriefAI(metricsContext) {
  const prompt = `
DAILY WAREHOUSE AUDIT METRICS:
${JSON.stringify(metricsContext, null, 2)}

Generate a crisp 3-sentence executive summary and 3 bulleted priority actions for the Inventory Manager today.
`;

  return await callGemini(prompt, WAREHOUSE_BRAIN_SYSTEM);
}

/**
 * 4. AI Dynamic Task Assignment Engine
 */
async function assignWarehouseTasksAI(liveContext) {
  const prompt = `
CURRENT WAREHOUSE LIVE STATUS:
${JSON.stringify(liveContext, null, 2)}

Based on the live warehouse state above (low-stock SKUs, pending receipts, pending deliveries, storage imbalances), assign 3 to 5 concrete operational tasks to specific warehouse staff roles.

Respond with ONLY a valid JSON array of objects with the following schema:
[
  {
    "id": "TASK-1",
    "role": "Procurement Specialist | Forklift Operator | Inventory Auditor | Receiving Clerk | Warehouse Supervisor",
    "priority": "CRITICAL | HIGH | MEDIUM",
    "title": "Short title describing the task",
    "target": "SKU name or location reference",
    "instructions": "Clear step-by-step instructions for the assigned role",
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

