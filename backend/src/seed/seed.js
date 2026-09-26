require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../db');

async function seed() {
  console.log('Seeding StockSense database...');

  try {
    // Clean up in reverse dependency order
    await prisma.stockMovement.deleteMany({});
    await prisma.receiptItem.deleteMany({});
    await prisma.receipt.deleteMany({});
    await prisma.deliveryItem.deleteMany({});
    await prisma.delivery.deleteMany({});
    await prisma.transferItem.deleteMany({});
    await prisma.transfer.deleteMany({});
    await prisma.adjustment.deleteMany({});
    await prisma.stock.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.location.deleteMany({});
    await prisma.warehouse.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.counter.deleteMany({});

    console.log('Database wiped for clean idempotent seeding.');

    // 1. Create Default Manager User (Siya Bhosle)
    const managerPassword = 'Password@123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(managerPassword, salt);

    const user = await prisma.user.create({
      data: {
        loginId: 'siyabhosale',
        email: 'siya.bhosale19@gmail.com',
        name: 'Siya Bhosle',
        role: 'MANAGER',
        passwordHash,
      },
    });

    console.log(`Default Manager created: loginId = siyabhosale | email = siya.bhosale19@gmail.com | role = MANAGER`);

    // 2. Create Warehouses
    const wh1 = await prisma.warehouse.create({
      data: {
        code: 'WH1',
        name: 'Main Warehouse',
      },
    });

    const wh2 = await prisma.warehouse.create({
      data: {
        code: 'WH2',
        name: 'Secondary Warehouse',
      },
    });

    // 3. Create Locations
    const locRackA = await prisma.location.create({
      data: { warehouseId: wh1.id, name: 'Rack A' },
    });
    const locRackB = await prisma.location.create({
      data: { warehouseId: wh1.id, name: 'Rack B' },
    });
    const locDispatch = await prisma.location.create({
      data: { warehouseId: wh1.id, name: 'Dispatch Area' },
    });
    const locProdFloor = await prisma.location.create({
      data: { warehouseId: wh2.id, name: 'Production Floor' },
    });

    // 4. Create Categories
    const catRaw = await prisma.category.create({ data: { name: 'Raw Materials' } });
    const catFurn = await prisma.category.create({ data: { name: 'Furniture' } });
    const catElec = await prisma.category.create({ data: { name: 'Electronics' } });
    const catSafe = await prisma.category.create({ data: { name: 'Safety Equipment' } });
    const catPack = await prisma.category.create({ data: { name: 'Packaging' } });

    // 5. Create Products & initial stock
    // Exactly matches Section Q Hackathon Demo Flow:
    // "Steel Rods at stock = 50"
    const pSteel = await prisma.product.create({
      data: {
        name: 'Steel Rods',
        sku: 'RAW-STL-001',
        categoryId: catRaw.id,
        uom: 'Bags',
        reorderLevel: 40,
        unitCost: 25.5,
        defaultWarehouseId: wh1.id,
        defaultLocationId: locRackA.id,
      },
    });

    const pChairs = await prisma.product.create({
      data: {
        name: 'Office Chairs',
        sku: 'FUR-CHR-002',
        categoryId: catFurn.id,
        uom: 'Units',
        reorderLevel: 15,
        unitCost: 120.0,
        defaultWarehouseId: wh1.id,
        defaultLocationId: locRackB.id,
      },
    });

    const pLaptop = await prisma.product.create({
      data: {
        name: 'Laptop Dell 15',
        sku: 'ELC-LAP-003',
        categoryId: catElec.id,
        uom: 'Units',
        reorderLevel: 10,
        unitCost: 850.0,
        defaultWarehouseId: wh1.id,
        defaultLocationId: locRackB.id,
      },
    });

    const pPrinter = await prisma.product.create({
      data: {
        name: 'LaserJet Printer',
        sku: 'ELC-PRN-004',
        categoryId: catElec.id,
        uom: 'Units',
        reorderLevel: 8,
        unitCost: 320.0,
        defaultWarehouseId: wh1.id,
        defaultLocationId: locRackB.id,
      },
    });

    const pCopper = await prisma.product.create({
      data: {
        name: 'Copper Wire Spool',
        sku: 'RAW-CPR-005',
        categoryId: catRaw.id,
        uom: 'Rolls',
        reorderLevel: 25,
        unitCost: 65.0,
        defaultWarehouseId: wh1.id,
        defaultLocationId: locRackA.id,
      },
    });

    // Low stock demo product: stock 5 <= reorderLevel 20
    const pHelmet = await prisma.product.create({
      data: {
        name: 'Safety Helmet',
        sku: 'SAF-HLM-006',
        categoryId: catSafe.id,
        uom: 'Units',
        reorderLevel: 20,
        unitCost: 18.0,
        defaultWarehouseId: wh1.id,
        defaultLocationId: locRackA.id,
      },
    });

    const pDesk = await prisma.product.create({
      data: {
        name: 'Wooden Desk',
        sku: 'FUR-DSK-007',
        categoryId: catFurn.id,
        uom: 'Units',
        reorderLevel: 5,
        unitCost: 210.0,
        defaultWarehouseId: wh1.id,
        defaultLocationId: locRackB.id,
      },
    });

    // Out of stock demo product: stock = 0
    const pBoxes = await prisma.product.create({
      data: {
        name: 'Packaging Boxes',
        sku: 'PCK-BOX-008',
        categoryId: catPack.id,
        uom: 'Bundles',
        reorderLevel: 30,
        unitCost: 12.0,
        defaultWarehouseId: wh1.id,
        defaultLocationId: locDispatch.id,
      },
    });

    // 6. Seed Stocks (Single source of truth)
    // Steel Rods = 50 (at WH1 Rack A)
    await prisma.stock.create({
      data: { productId: pSteel.id, warehouseId: wh1.id, locationId: locRackA.id, quantity: 50 },
    });
    // Office Chairs = 35 (at WH1 Rack B)
    await prisma.stock.create({
      data: { productId: pChairs.id, warehouseId: wh1.id, locationId: locRackB.id, quantity: 35 },
    });
    // Laptop = 18
    await prisma.stock.create({
      data: { productId: pLaptop.id, warehouseId: wh1.id, locationId: locRackB.id, quantity: 18 },
    });
    // Printer = 12
    await prisma.stock.create({
      data: { productId: pPrinter.id, warehouseId: wh1.id, locationId: locRackB.id, quantity: 12 },
    });
    // Copper Wire = 45
    await prisma.stock.create({
      data: { productId: pCopper.id, warehouseId: wh1.id, locationId: locRackA.id, quantity: 45 },
    });
    // Safety Helmet = 5 (LOW STOCK DEMO: 5 <= 20)
    await prisma.stock.create({
      data: { productId: pHelmet.id, warehouseId: wh1.id, locationId: locRackA.id, quantity: 5 },
    });
    // Wooden Desk = 14
    await prisma.stock.create({
      data: { productId: pDesk.id, warehouseId: wh1.id, locationId: locRackB.id, quantity: 14 },
    });
    // Packaging Boxes = 0 (OUT OF STOCK DEMO)
    await prisma.stock.create({
      data: { productId: pBoxes.id, warehouseId: wh1.id, locationId: locDispatch.id, quantity: 0 },
    });

    // 7. Seed Initial Done Ledger Movements & Operations to populate History
    await prisma.counter.createMany({
      data: [
        { key: 'WH1_IN', seq: 1 },
        { key: 'WH1_OUT', seq: 1 },
        { key: 'WH1_INT', seq: 1 },
        { key: 'WH1_ADJ', seq: 1 },
        { key: 'WH2_IN', seq: 0 },
        { key: 'WH2_OUT', seq: 0 },
        { key: 'WH2_INT', seq: 0 },
        { key: 'WH2_ADJ', seq: 0 },
      ],
    });

    // Sample Receipt WH1/IN/001 (already Done)
    const rec1 = await prisma.receipt.create({
      data: {
        reference: 'WH1/IN/001',
        supplierName: 'Apex Industrial Supplies',
        warehouseId: wh1.id,
        status: 'DONE',
        createdBy: user.id,
        validatedAt: new Date(Date.now() - 86400000 * 2),
        items: {
          create: [
            { productId: pSteel.id, locationId: locRackA.id, quantity: 50 },
            { productId: pChairs.id, locationId: locRackB.id, quantity: 35 },
          ],
        },
      },
    });

    await prisma.stockMovement.createMany({
      data: [
        {
          reference: 'WH1/IN/001',
          productId: pSteel.id,
          movementType: 'IN',
          quantity: 50,
          toLocationId: locRackA.id,
          warehouseId: wh1.id,
          userId: user.id,
          date: new Date(Date.now() - 86400000 * 2),
        },
        {
          reference: 'WH1/IN/001',
          productId: pChairs.id,
          movementType: 'IN',
          quantity: 35,
          toLocationId: locRackB.id,
          warehouseId: wh1.id,
          userId: user.id,
          date: new Date(Date.now() - 86400000 * 2),
        },
      ],
    });

    // Sample Delivery WH1/OUT/001 (already Done)
    const del1 = await prisma.delivery.create({
      data: {
        reference: 'WH1/OUT/001',
        customerName: 'TechCorp Solutions Ltd',
        warehouseId: wh1.id,
        status: 'DONE',
        createdBy: user.id,
        validatedAt: new Date(Date.now() - 86400000),
        items: {
          create: [{ productId: pLaptop.id, locationId: locRackB.id, quantity: 2 }],
        },
      },
    });

    await prisma.stockMovement.create({
      data: {
        reference: 'WH1/OUT/001',
        productId: pLaptop.id,
        movementType: 'OUT',
        quantity: -2,
        fromLocationId: locRackB.id,
        warehouseId: wh1.id,
        userId: user.id,
        date: new Date(Date.now() - 86400000),
      },
    });

    // Sample Internal Transfer WH1/INT/001
    const tr1 = await prisma.transfer.create({
      data: {
        reference: 'WH1/INT/001',
        sourceWarehouseId: wh1.id,
        sourceLocationId: locRackA.id,
        destWarehouseId: wh1.id,
        destLocationId: locRackB.id,
        status: 'DONE',
        createdBy: user.id,
        validatedAt: new Date(Date.now() - 43200000),
        items: {
          create: [{ productId: pCopper.id, quantity: 5 }],
        },
      },
    });

    await prisma.stockMovement.create({
      data: {
        reference: 'WH1/INT/001',
        productId: pCopper.id,
        movementType: 'TRANSFER',
        quantity: 5,
        fromLocationId: locRackA.id,
        toLocationId: locRackB.id,
        warehouseId: wh1.id,
        userId: user.id,
        date: new Date(Date.now() - 43200000),
      },
    });

    // Sample Adjustment WH1/ADJ/001
    const adj1 = await prisma.adjustment.create({
      data: {
        reference: 'WH1/ADJ/001',
        productId: pHelmet.id,
        warehouseId: wh1.id,
        locationId: locRackA.id,
        systemQuantity: 8,
        countedQuantity: 5,
        difference: -3,
        reason: 'DAMAGED',
        status: 'DONE',
        createdBy: user.id,
        validatedAt: new Date(Date.now() - 21600000),
      },
    });

    await prisma.stockMovement.create({
      data: {
        reference: 'WH1/ADJ/001',
        productId: pHelmet.id,
        movementType: 'ADJUSTMENT',
        quantity: -3,
        fromLocationId: locRackA.id,
        warehouseId: wh1.id,
        userId: user.id,
        date: new Date(Date.now() - 21600000),
      },
    });

    // A sample DRAFT receipt so Dashboard shows pendingReceipts > 0
    await prisma.receipt.create({
      data: {
        reference: 'WH1/IN/002',
        supplierName: 'Global Packaging Hub',
        warehouseId: wh1.id,
        status: 'DRAFT',
        createdBy: user.id,
        items: {
          create: [{ productId: pBoxes.id, locationId: locDispatch.id, quantity: 100 }],
        },
      },
    });

    console.log('Seeding completed successfully!');
    console.log('--- DEMO CREDENTIALS ---');
    console.log('Login ID: demo01');
    console.log('Password: Password@123');
    console.log('Steel Rods starting stock = 50 (Ready for Demo Step 4: +100)');
    console.log('Safety Helmet = 5 (Reorder level 20 -> Low Stock demo)');
    console.log('Packaging Boxes = 0 (Out of stock demo)');
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
