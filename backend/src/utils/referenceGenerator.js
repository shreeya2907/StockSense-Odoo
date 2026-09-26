const prisma = require('../db');

/**
 * Atomically generates next sequential reference code: <WAREHOUSE_CODE>/<OP>/<001>
 * e.g., WH1/IN/001, WH1/OUT/001, WH1/INT/001, WH1/ADJ/001
 */
async function generateReference(warehouseCode, opType, tx = null) {
  const client = tx || prisma;
  const key = `${warehouseCode}_${opType}`;

  // Upsert counter atomically
  const counter = await client.counter.upsert({
    where: { key },
    update: { seq: { increment: 1 } },
    create: { key, seq: 1 },
  });

  const paddedSeq = String(counter.seq).padStart(3, '0');
  return `${warehouseCode}/${opType}/${paddedSeq}`;
}

module.exports = { generateReference };
