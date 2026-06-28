const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Clean existing records
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.inventoryLog.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.setting.deleteMany();

  // 2. Create Default Users
  const salt = await bcrypt.genSalt(10);
  const ownerPassword = await bcrypt.hash('owner123', salt);
  const managerPassword = await bcrypt.hash('manager123', salt);
  const staffPassword = await bcrypt.hash('staff123', salt);

  const owner = await prisma.user.create({
    data: {
      name: 'Captain Ruby (Owner)',
      email: 'owner@marine.com',
      passwordHash: ownerPassword,
      role: 'Owner',
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: 'John Doe (Manager)',
      email: 'manager@marine.com',
      passwordHash: managerPassword,
      role: 'Manager',
    },
  });

  const staff = await prisma.user.create({
    data: {
      name: 'Sarah Connor (Staff)',
      email: 'staff@marine.com',
      passwordHash: staffPassword,
      role: 'Staff',
    },
  });

  console.log('Created Users:', { owner: owner.email, manager: manager.email, staff: staff.email });

  // 3. Create Default Categories & Brands
  const catEngine = await prisma.category.create({ data: { name: 'Engine Parts', description: 'Marine engines, filters, and gaskets' } });
  const catSafety = await prisma.category.create({ data: { name: 'Safety Equipment', description: 'Life jackets, flares, and fire extinguishers' } });
  const catNav = await prisma.category.create({ data: { name: 'Navigation Gear', description: 'GPS, radars, compasses, and sonars' } });
  const catGeneral = await prisma.category.create({ data: { name: 'General Hardware', description: 'Anchors, ropes, chains, and shackles' } });

  const brandYamaha = await prisma.brand.create({ data: { name: 'Yamaha Outboards' } });
  const brandGarmin = await prisma.brand.create({ data: { name: 'Garmin Marine' } });
  const brandVolvo = await prisma.brand.create({ data: { name: 'Volvo Penta' } });
  const brandGeneric = await prisma.brand.create({ data: { name: 'Generic Marine' } });

  // 4. Create Suppliers
  const supOcean = await prisma.supplier.create({
    data: {
      name: 'Oceanic Spares Corp',
      phone: '+1 800 555 0199',
      email: 'sales@oceanicspares.com',
      address: '45 Harbor Way, Port City',
      gstNumber: '27AAAAA1111A1Z1',
      notes: 'Main engine parts supplier. Offers 30-day payment terms.',
      outstandingBalance: 12500.0,
    },
  });

  const supSafety = await prisma.supplier.create({
    data: {
      name: 'Marine Safety First Ltd',
      phone: '+1 800 555 0244',
      email: 'orders@safetyfirst.com',
      address: '10 Industrial Quay, Sector 4',
      gstNumber: '27BBBBB2222B2Z2',
      notes: 'Flares and life raft inspection contractor.',
      outstandingBalance: 0.0,
    },
  });

  // 5. Create Customers
  const custBlue = await prisma.customer.create({
    data: {
      name: 'Blue Horizon Yacht Charter',
      phone: '9876543210',
      email: 'charters@bluehorizon.com',
      address: 'Marina Bay Dock 12',
      gstNumber: '27CCCCC3333C3Z3',
      creditLimit: 50000.0,
      outstandingBalance: 8200.0,
      loyaltyPoints: 340,
    },
  });

  const custCaptain = await prisma.customer.create({
    data: {
      name: 'Captain Richard Vance',
      phone: '9876543211',
      email: 'richard@vanceboats.com',
      address: 'Private Anchor Cove',
      gstNumber: '',
      creditLimit: 10000.0,
      outstandingBalance: 1500.0,
      loyaltyPoints: 120,
    },
  });

  const custWalkin = await prisma.customer.create({
    data: {
      name: 'Walk-In Customer',
      phone: '0000000000',
      email: 'walkin@marine.com',
      address: 'Counter Sales',
      creditLimit: 0.0,
      outstandingBalance: 0.0,
      loyaltyPoints: 10,
    },
  });

  // 6. Create Products
  const now = new Date();
  
  // Expired product
  const dateExpired = new Date();
  dateExpired.setDate(now.getDate() - 10);

  // Expiring in 5 days
  const dateExpiring5 = new Date();
  dateExpiring5.setDate(now.getDate() + 5);

  // Expiring in 15 days
  const dateExpiring15 = new Date();
  dateExpiring15.setDate(now.getDate() + 15);

  // Expiring in 45 days
  const dateExpiring45 = new Date();
  dateExpiring45.setDate(now.getDate() + 45);

  const prodEngineOil = await prisma.product.create({
    data: {
      name: 'Yamalube Outboard Engine Oil 10W-30',
      code: 'YML-10W30-4L',
      barcode: '035762118331',
      categoryId: catEngine.id,
      brandId: brandYamaha.id,
      description: 'High-performance marine engine oil for 4-stroke outboard engines.',
      purchasePrice: 28.50,
      sellingPrice: 45.00,
      gstPercent: 18.0,
      quantity: 50,
      minQuantity: 10,
      supplierId: supOcean.id,
      batchNumber: 'BATCH-2026-A',
      expiryDate: dateExpiring45,
      status: 'Active',
    },
  });

  const prodFilter = await prisma.product.create({
    data: {
      name: 'Volvo Fuel Filter Insert',
      code: 'VP-21136952',
      barcode: '733285702209',
      categoryId: catEngine.id,
      brandId: brandVolvo.id,
      description: 'Primary fuel water separator insert for D4/D6 engines.',
      purchasePrice: 18.00,
      sellingPrice: 32.50,
      gstPercent: 18.0,
      quantity: 8, // Low Stock (min is 12)
      minQuantity: 12,
      supplierId: supOcean.id,
      batchNumber: 'BATCH-FF-09',
      status: 'Active',
    },
  });

  const prodGPS = await prisma.product.create({
    data: {
      name: 'Garmin GPSMAP 923xsv',
      code: 'GAR-GPS-923',
      barcode: '753759247348',
      categoryId: catNav.id,
      brandId: brandGarmin.id,
      description: '9-inch chartplotter with sonar capabilities.',
      purchasePrice: 950.00,
      sellingPrice: 1399.00,
      gstPercent: 18.0,
      quantity: 4,
      minQuantity: 2,
      supplierId: supOcean.id,
      batchNumber: 'BATCH-GPS-112',
      status: 'Active',
    },
  });

  const prodVest = await prisma.product.create({
    data: {
      name: 'Inflatable Life Jacket 150N',
      code: 'SAF-VEST-150',
      barcode: '501234567890',
      categoryId: catSafety.id,
      brandId: brandGeneric.id,
      description: 'Automatic CO2 inflation life jacket with harness.',
      purchasePrice: 55.00,
      sellingPrice: 89.00,
      gstPercent: 12.0,
      quantity: 3, // Low Stock (min is 8)
      minQuantity: 8,
      supplierId: supSafety.id,
      batchNumber: 'LJ-2024-B4',
      expiryDate: dateExpiring15, // Expiring soon (15 days)
      status: 'Active',
    },
  });

  const prodFlares = await prisma.product.create({
    data: {
      name: 'Red Handheld Flare Pack x4',
      code: 'SAF-FLARE-RED',
      barcode: '501234567999',
      categoryId: catSafety.id,
      brandId: brandGeneric.id,
      description: 'Pack of 4 short-range distress signaling flares.',
      purchasePrice: 22.00,
      sellingPrice: 38.00,
      gstPercent: 18.0,
      quantity: 15,
      minQuantity: 5,
      supplierId: supSafety.id,
      batchNumber: 'FL-2022-X',
      expiryDate: dateExpired, // Already expired
      status: 'Active',
    },
  });

  const prodFireExt = await prisma.product.create({
    data: {
      name: 'Dry Powder Fire Extinguisher 2kg',
      code: 'SAF-FIRE-2KG',
      barcode: '501234567111',
      categoryId: catSafety.id,
      brandId: brandGeneric.id,
      description: 'A, B, C class dry powder extinguisher with pressure gauge.',
      purchasePrice: 15.00,
      sellingPrice: 27.00,
      gstPercent: 12.0,
      quantity: 12,
      minQuantity: 5,
      supplierId: supSafety.id,
      batchNumber: 'FE-2025-C1',
      expiryDate: dateExpiring5, // Expiring very soon (5 days)
      status: 'Active',
    },
  });

  const prodAnchor = await prisma.product.create({
    data: {
      name: 'Bruce Style Claw Anchor 10kg',
      code: 'HD-ANCH-10KG',
      barcode: '400123456789',
      categoryId: catGeneral.id,
      brandId: brandGeneric.id,
      description: 'Galvanized steel claw anchor for sand and mud bottom.',
      purchasePrice: 45.00,
      sellingPrice: 79.00,
      gstPercent: 18.0,
      quantity: 6,
      minQuantity: 3,
      supplierId: supOcean.id,
      status: 'Active',
    },
  });

  console.log('Seeded Products');

  // 7. Create Default Settings
  const settings = await prisma.setting.create({
    data: {
      companyName: 'AUK marine',
      logoUrl: '',
      gstNumber: '27DDDDD4444D4Z4',
      address: 'Slipway 4, Port City Yacht Marina, Port City',
      email: 'support@anchorsails.com',
      phone: '+1 800 555 0100',
      currency: 'INR',
      taxRate: 18.0,
      invoiceTemplate: 'Standard',
    },
  });

  console.log('Seeded Company Settings');

  // 8. Create Purchase Records
  const purchase1 = await prisma.purchase.create({
    data: {
      invoiceNumber: 'PO-2026-0001',
      supplierId: supOcean.id,
      tax: 171.0,
      totalAmount: 1121.0,
      paymentStatus: 'Paid',
      date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      purchaseItems: {
        create: [
          {
            productId: prodEngineOil.id,
            quantity: 20,
            costPrice: 28.50,
            taxPercent: 18.0,
            totalCost: 570.0,
          },
          {
            productId: prodFilter.id,
            quantity: 10,
            costPrice: 18.00,
            taxPercent: 18.0,
            totalCost: 180.0,
          },
          {
            productId: prodAnchor.id,
            quantity: 4,
            costPrice: 45.00,
            taxPercent: 18.0,
            totalCost: 180.0,
          }
        ]
      }
    }
  });

  const purchase2 = await prisma.purchase.create({
    data: {
      invoiceNumber: 'PO-2026-0002',
      supplierId: supOcean.id,
      tax: 171.0,
      totalAmount: 2071.0,
      paymentStatus: 'Pending',
      date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      purchaseItems: {
        create: [
          {
            productId: prodGPS.id,
            quantity: 2,
            costPrice: 950.00,
            taxPercent: 18.0,
            totalCost: 1900.0,
          }
        ]
      }
    }
  });

  console.log('Seeded Purchases');

  // 9. Create Sales & POS Records
  // Sale 1: Month ago, to customer Blue Horizon
  const sale1 = await prisma.sale.create({
    data: {
      invoiceNumber: 'INV-2026-0001',
      customerId: custBlue.id,
      discount: 10.0,
      gstAmount: 205.2,
      totalAmount: 1335.2,
      profit: 345.0,
      paymentMethod: 'UPI',
      date: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
      saleItems: {
        create: [
          {
            productId: prodEngineOil.id,
            quantity: 10,
            rate: 45.00,
            discount: 5.0,
            gstPercent: 18.0,
            totalCost: 400.0,
            profit: 115.0,
          },
          {
            productId: prodGPS.id,
            quantity: 1,
            rate: 1399.00,
            discount: 5.0,
            gstPercent: 18.0,
            totalCost: 1394.0,
            profit: 444.0,
          }
        ]
      }
    }
  });

  // Sale 2: Walkin counter sale, 2 days ago
  const sale2 = await prisma.sale.create({
    data: {
      invoiceNumber: 'INV-2026-0002',
      customerId: custWalkin.id,
      discount: 0.0,
      gstAmount: 29.7,
      totalAmount: 194.7,
      profit: 58.0,
      paymentMethod: 'Cash',
      date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      saleItems: {
        create: [
          {
            productId: prodFilter.id,
            quantity: 2,
            rate: 32.50,
            discount: 0.0,
            gstPercent: 18.0,
            totalCost: 65.0,
            profit: 29.0,
          },
          {
            productId: prodVest.id,
            quantity: 1,
            rate: 89.00,
            discount: 0.0,
            gstPercent: 12.0,
            totalCost: 89.0,
            profit: 34.0,
          }
        ]
      }
    }
  });

  // Sale 3: Today's sale
  const sale3 = await prisma.sale.create({
    data: {
      invoiceNumber: 'INV-2026-0003',
      customerId: custCaptain.id,
      discount: 15.0,
      gstAmount: 120.6,
      totalAmount: 795.6,
      profit: 202.0,
      paymentMethod: 'Card',
      date: now,
      saleItems: {
        create: [
          {
            productId: prodEngineOil.id,
            quantity: 4,
            rate: 45.00,
            discount: 15.0,
            gstPercent: 18.0,
            totalCost: 165.0,
            profit: 51.0,
          },
          {
            productId: prodAnchor.id,
            quantity: 1,
            rate: 79.00,
            discount: 0.0,
            gstPercent: 18.0,
            totalCost: 79.0,
            profit: 34.0,
          },
          {
            productId: prodFireExt.id,
            quantity: 2,
            rate: 27.00,
            discount: 0.0,
            gstPercent: 12.0,
            totalCost: 54.0,
            profit: 24.0,
          }
        ]
      }
    }
  });

  console.log('Seeded Sales');

  // 10. Inventory Logs
  await prisma.inventoryLog.createMany({
    data: [
      { productId: prodEngineOil.id, type: 'In', quantity: 50, referenceId: purchase1.id },
      { productId: prodFilter.id, type: 'In', quantity: 10, referenceId: purchase1.id },
      { productId: prodAnchor.id, type: 'In', quantity: 4, referenceId: purchase1.id },
      { productId: prodEngineOil.id, type: 'Out', quantity: 10, referenceId: sale1.id },
      { productId: prodGPS.id, type: 'Out', quantity: 1, referenceId: sale1.id },
      { productId: prodFilter.id, type: 'Out', quantity: 2, referenceId: sale2.id },
      { productId: prodVest.id, type: 'Out', quantity: 1, referenceId: sale2.id },
      { productId: prodEngineOil.id, type: 'Out', quantity: 4, referenceId: sale3.id },
      { productId: prodAnchor.id, type: 'Out', quantity: 1, referenceId: sale3.id },
      { productId: prodFireExt.id, type: 'Out', quantity: 2, referenceId: sale3.id },
    ]
  });

  // 11. Create Notifications
  await prisma.notification.createMany({
    data: [
      { title: 'Low Stock Alert', message: `Product "${prodFilter.name}" is low in stock. Current quantity: ${prodFilter.quantity}. Min limit: ${prodFilter.minQuantity}`, type: 'LowStock' },
      { title: 'Low Stock Alert', message: `Product "${prodVest.name}" is low in stock. Current quantity: ${prodVest.quantity}. Min limit: ${prodVest.minQuantity}`, type: 'LowStock' },
      { title: 'Product Expired', message: `Product "${prodFlares.name}" expired on ${dateExpired.toDateString()}`, type: 'Expiry' },
      { title: 'Product Expiring Soon', message: `Product "${prodFireExt.name}" is expiring in 5 days (${dateExpiring5.toDateString()})`, type: 'Expiry' },
      { title: 'Product Expiring Soon', message: `Product "${prodVest.name}" is expiring in 15 days (${dateExpiring15.toDateString()})`, type: 'Expiry' },
      { title: 'Outstanding Dues Warning', message: `Customer "${custBlue.name}" has exceeded 8,000 USD outstanding balance.`, type: 'PaymentAlert' },
    ]
  });

  // 12. Create Audit Logs
  await prisma.auditLog.createMany({
    data: [
      { userId: owner.id, action: 'CREATE_USER', details: `Created manager user: ${manager.email}` },
      { userId: owner.id, action: 'CREATE_USER', details: `Created staff user: ${staff.email}` },
      { userId: owner.id, action: 'UPDATE_SETTINGS', details: 'Configured initial company parameters and taxes.' },
      { userId: manager.id, action: 'CREATE_PRODUCT', details: 'Added Yamalube Engine Oil and Garmin GPS to products.' },
      { userId: staff.id, action: 'CREATE_SALE', details: `Generated invoice: ${sale3.invoiceNumber} for Captain Richard Vance` }
    ]
  });

  console.log('Database Seeding Completed Successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
