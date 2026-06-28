const prisma = require('../utils/prisma');
const logger = require('../utils/logger');

// Get list of sales
const getSales = async (req, res, next) => {
  try {
    const { customer = '', search = '' } = req.query;
    const where = {};

    if (customer) {
      where.customerId = customer;
    }

    if (search) {
      where.invoiceNumber = { contains: search };
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        customer: true,
        saleItems: {
          include: { product: true }
        }
      },
      orderBy: { date: 'desc' }
    });

    res.status(200).json({ success: true, sales });
  } catch (error) {
    next(error);
  }
};

// Get details of a single sale invoice
const getSaleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        saleItems: {
          include: {
            product: true
          }
        }
      }
    });

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    res.status(200).json({ success: true, sale });
  } catch (error) {
    next(error);
  }
};

// Create a Sale (POS Billing checkout)
const createSale = async (req, res, next) => {
  try {
    const { customerId, discount = 0, paymentMethod = 'Cash', items = [] } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart items cannot be empty.' });
    }

    // Begin database transaction
    const sale = await prisma.$transaction(async (tx) => {
      let subTotal = 0;
      let totalGst = 0;
      let totalProfit = 0;
      const saleItemsToCreate = [];
      const stockUpdates = [];
      const inventoryLogs = [];
      const notificationAlerts = [];

      for (const item of items) {
        const { productId, quantity, discount: itemDiscount = 0 } = item;
        const parsedItemDiscount = parseFloat(itemDiscount);
        const safeItemDiscount = isNaN(parsedItemDiscount) ? 0 : Math.max(0, parsedItemDiscount);
        const qty = parseInt(quantity);

        if (qty <= 0) {
          throw new Error('Quantity must be greater than zero.');
        }

        // Fetch product
        const product = await tx.product.findUnique({
          where: { id: productId }
        });

        if (!product) {
          throw new Error(`Product not found for ID: ${productId}`);
        }

        if (product.status !== 'Active') {
          throw new Error(`Product "${product.name}" is marked as Inactive and cannot be sold.`);
        }

        if (product.quantity < qty) {
          throw new Error(`Insufficient stock for "${product.name}". Available: ${product.quantity}, Requested: ${qty}`);
        }

        // Calculations
        // Base rate is the selling price
        const itemRate = product.sellingPrice;
        // Discounted price of a single unit
        const unitDiscountedPrice = itemRate - safeItemDiscount;
        
        // Product price excluding GST
        // Assuming sellingPrice already includes tax in consumer-facing setup or calculating on top.
        // Let's calculate GST on top of the discounted selling price (standard practice for ERPs)
        const baseCost = unitDiscountedPrice * qty;
        const gstAmount = baseCost * (product.gstPercent / 100);
        const itemTotal = baseCost + gstAmount;

        // Profit = (sellingPriceWithoutTax - purchasePrice) * qty
        const itemProfit = (unitDiscountedPrice - product.purchasePrice) * qty;

        subTotal += baseCost;
        totalGst += gstAmount;
        totalProfit += itemProfit;

        saleItemsToCreate.push({
          productId,
          quantity: qty,
          rate: itemRate,
          discount: safeItemDiscount,
          gstPercent: product.gstPercent,
          totalCost: itemTotal,
          profit: itemProfit
        });

        // Queue stock updates
        const updatedQty = product.quantity - qty;
        stockUpdates.push(
          tx.product.update({
            where: { id: productId },
            data: { quantity: updatedQty }
          })
        );

        // Queue inventory logs
        inventoryLogs.push({
          productId,
          type: 'Out',
          quantity: qty,
          date: new Date()
        });

        // Low stock checker
        if (updatedQty <= product.minQuantity) {
          const alertType = updatedQty === 0 ? 'Out of Stock' : 'Low Stock Warning';
          const title = updatedQty === 0 ? 'Out of Stock Alert' : 'Low Stock Alert';
          const msg = updatedQty === 0 
            ? `Product "${product.name}" has run out of stock.`
            : `Product "${product.name}" is low in stock (${updatedQty} left). Minimum threshold is ${product.minQuantity}.`;
            
          notificationAlerts.push({
            title,
            message: msg,
            type: 'LowStock'
          });
        }
      }

      // Final calculations after factoring general invoice-level discount
      const parsedInvoiceDiscount = parseFloat(discount);
      const invoiceDiscount = isNaN(parsedInvoiceDiscount) ? 0 : Math.max(0, parsedInvoiceDiscount);
      const totalAmountBeforeDisc = subTotal + totalGst;
      const finalTotalAmount = Math.max(0, totalAmountBeforeDisc - invoiceDiscount);
      // Reduce profit by invoice level discount
      const finalProfit = totalProfit - invoiceDiscount;

      // Handle Customer updates if customerId is present
      let customer = null;
      if (customerId) {
        customer = await tx.customer.findUnique({ where: { id: customerId } });
        if (!customer) {
          throw new Error('Selected customer not found.');
        }

        // Check credit limits if using Credit payment method
        if (paymentMethod === 'Credit') {
          const newOutstanding = customer.outstandingBalance + finalTotalAmount;
          if (customer.creditLimit > 0 && newOutstanding > customer.creditLimit) {
            throw new Error(`Transaction violates customer credit limit. Limit: ${customer.creditLimit}, Current Outstanding: ${customer.outstandingBalance}, Invoice Amount: ${finalTotalAmount}`);
          }

          // Update customer ledger
          await tx.customer.update({
            where: { id: customerId },
            data: { 
              outstandingBalance: newOutstanding,
              loyaltyPoints: customer.loyaltyPoints + Math.floor(finalTotalAmount / 10) // 1 point per $10 spent
            }
          });
        } else {
          // Cash/Card/UPI sale
          await tx.customer.update({
            where: { id: customerId },
            data: {
              loyaltyPoints: customer.loyaltyPoints + Math.floor(finalTotalAmount / 10)
            }
          });
        }
      }

      // Generate invoice number: INV-YYYYMMDD-XXXX
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const countToday = await tx.sale.count({
        where: {
          invoiceNumber: { startsWith: `INV-${todayStr}` }
        }
      });
      const invoiceNumber = `INV-${todayStr}-${String(countToday + 1).padStart(4, '0')}`;

      // Execute stock updates
      await Promise.all(stockUpdates);

      // Create Sale invoice
      const newSale = await tx.sale.create({
        data: {
          invoiceNumber,
          customerId: customerId || null,
          discount: invoiceDiscount,
          gstAmount: totalGst,
          totalAmount: finalTotalAmount,
          profit: finalProfit,
          paymentMethod,
          date: new Date(),
          saleItems: {
            create: saleItemsToCreate
          }
        },
        include: {
          customer: true,
          saleItems: {
            include: { product: true }
          }
        }
      });

      // Update inventory logs with the reference sale invoice id
      const logsToCreate = inventoryLogs.map(log => ({
        ...log,
        referenceId: newSale.id
      }));

      await tx.inventoryLog.createMany({ data: logsToCreate });

      // Save stock notifications
      if (notificationAlerts.length > 0) {
        await tx.notification.createMany({ data: notificationAlerts });
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'CREATE_SALE',
          details: `Processed invoice ${newSale.invoiceNumber}. Total: ${newSale.totalAmount}. Profit: ${newSale.profit}`
        }
      });

      return newSale;
    });

    res.status(201).json({
      success: true,
      message: 'Sale finalized successfully',
      sale
    });
  } catch (error) {
    logger.error('POS Checkout transaction error: %s', error.message);
    res.status(400).json({
      success: false,
      message: error.message || 'Error occurred during checkout'
    });
  }
};

module.exports = {
  getSales,
  getSaleById,
  createSale
};
