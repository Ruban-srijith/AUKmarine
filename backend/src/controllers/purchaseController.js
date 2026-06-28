const prisma = require('../utils/prisma');
const logger = require('../utils/logger');

// Get purchase history
const getPurchases = async (req, res, next) => {
  try {
    const { supplier = '', search = '' } = req.query;
    const where = {};

    if (supplier) {
      where.supplierId = supplier;
    }

    if (search) {
      where.invoiceNumber = { contains: search };
    }

    const purchases = await prisma.purchase.findMany({
      where,
      include: {
        supplier: true,
        purchaseItems: {
          include: { product: true }
        },
        updatedBy: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { date: 'desc' }
    });

    res.status(200).json({ success: true, purchases });
  } catch (error) {
    next(error);
  }
};

// Get single purchase invoice details
const getPurchaseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        purchaseItems: {
          include: { product: true }
        },
        updatedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase entry not found.' });
    }

    res.status(200).json({ success: true, purchase });
  } catch (error) {
    next(error);
  }
};

// Create a Purchase Entry (Stock Inward)
const createPurchase = async (req, res, next) => {
  try {
    const { invoiceNumber, supplierId, tax = 0, totalAmount, paymentStatus = 'Pending', amountPaid = 0, items = [] } = req.body;
    let parsedAmountPaid = parseFloat(amountPaid || 0);
    if (paymentStatus === 'Paid') {
      parsedAmountPaid = parseFloat(totalAmount);
    } else if (paymentStatus === 'Pending') {
      parsedAmountPaid = 0;
    }

    if (!invoiceNumber || !supplierId || !totalAmount || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invoice number, Supplier ID, Total amount, and items are required.'
      });
    }

    // Check unique purchase invoice
    const existingInvoice = await prisma.purchase.findUnique({ where: { invoiceNumber } });
    if (existingInvoice) {
      return res.status(400).json({ success: false, message: `Purchase invoice "${invoiceNumber}" has already been entered.` });
    }

    // Begin database transaction
    const purchase = await prisma.$transaction(async (tx) => {
      const purchaseItemsToCreate = [];
      const stockUpdates = [];
      const inventoryLogs = [];

      for (const item of items) {
        const { productId, quantity, costPrice, taxPercent = 18 } = item;
        const qty = parseInt(quantity);
        const cost = parseFloat(costPrice);

        if (qty <= 0) {
          throw new Error('Quantity must be greater than zero.');
        }

        // Fetch product
        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product) {
          throw new Error(`Product not found for ID: ${productId}`);
        }

        // Calculate item total cost (cost excluding tax + tax)
        const baseCost = cost * qty;
        const gstAmount = baseCost * (parseFloat(taxPercent) / 100);
        const itemTotal = baseCost + gstAmount;

        purchaseItemsToCreate.push({
          productId,
          quantity: qty,
          costPrice: cost,
          taxPercent: parseFloat(taxPercent),
          totalCost: itemTotal
        });

        // Queue stock increase
        const updatedQty = product.quantity + qty;
        stockUpdates.push(
          tx.product.update({
            where: { id: productId },
            data: { 
              quantity: updatedQty,
              purchasePrice: cost // Update average/latest purchase cost of product!
            }
          })
        );

        // Queue stock movement logs
        inventoryLogs.push({
          productId,
          type: 'In',
          quantity: qty,
          date: new Date()
        });
      }

      // Check supplier and update outstanding balance if not fully paid
      const supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
      if (!supplier) {
        throw new Error('Selected supplier not found.');
      }

      const unpaidAmount = parseFloat(totalAmount) - parsedAmountPaid;
      await tx.supplier.update({
        where: { id: supplierId },
        data: {
          outstandingBalance: supplier.outstandingBalance + unpaidAmount
        }
      });

      // Execute stock updates
      await Promise.all(stockUpdates);

      // Create Purchase Invoice
      const newPurchase = await tx.purchase.create({
        data: {
          invoiceNumber,
          supplierId,
          tax: parseFloat(tax),
          totalAmount: parseFloat(totalAmount),
          amountPaid: parsedAmountPaid,
          paymentStatus,
          date: new Date(),
          updatedById: req.user.id,
          purchaseItems: {
            create: purchaseItemsToCreate
          }
        },
        include: {
          supplier: true,
          purchaseItems: {
            include: { product: true }
          },
          updatedBy: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      // Update inventory logs with purchase id reference
      const logsToCreate = inventoryLogs.map(log => ({
        ...log,
        referenceId: newPurchase.id
      }));

      await tx.inventoryLog.createMany({ data: logsToCreate });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'CREATE_PURCHASE',
          details: `Logged supplier purchase invoice ${newPurchase.invoiceNumber}. Total: ${newPurchase.totalAmount}`
        }
      });

      return newPurchase;
    });

    res.status(201).json({
      success: true,
      message: 'Purchase recorded and stock updated.',
      purchase
    });
  } catch (error) {
    logger.error('Purchase stock-inward error: %s', error.message);
    res.status(400).json({
      success: false,
      message: error.message || 'Error occurred recording purchase.'
    });
  }
};

const updatePurchaseStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { paymentStatus, amountPaid } = req.body;

    if (!['Paid', 'Pending', 'Partial'].includes(paymentStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid payment status.' });
    }

    const updatedPurchase = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: { id },
        include: { supplier: true }
      });

      if (!purchase) {
        throw new Error('Purchase entry not found.');
      }

      const oldStatus = purchase.paymentStatus;
      const newStatus = paymentStatus;
      const oldAmountPaid = purchase.amountPaid;

      let newAmountPaid = oldAmountPaid;
      if (newStatus === 'Paid') {
        newAmountPaid = purchase.totalAmount;
      } else if (newStatus === 'Pending') {
        newAmountPaid = 0;
      } else if (newStatus === 'Partial' && amountPaid !== undefined) {
        newAmountPaid = parseFloat(amountPaid);
      }

      if (oldStatus === newStatus && oldAmountPaid === newAmountPaid) {
        return purchase;
      }

      const oldUnpaid = purchase.totalAmount - oldAmountPaid;
      const newUnpaid = purchase.totalAmount - newAmountPaid;
      const balanceAdjustment = newUnpaid - oldUnpaid;

      if (balanceAdjustment !== 0) {
        await tx.supplier.update({
          where: { id: purchase.supplierId },
          data: {
            outstandingBalance: {
              increment: balanceAdjustment
            }
          }
        });
      }

      const updated = await tx.purchase.update({
        where: { id },
        data: { 
          paymentStatus: newStatus,
          amountPaid: newAmountPaid,
          updatedById: req.user.id
        },
        include: { 
          supplier: true,
          updatedBy: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'UPDATE_PURCHASE_STATUS',
          details: `Updated purchase status of ${purchase.invoiceNumber} from ${oldStatus} to ${newStatus}. Paid amount updated from ${oldAmountPaid} to ${newAmountPaid}. Supplier balance adjusted by ${balanceAdjustment}.`
        }
      });

      return updated;
    });

    res.status(200).json({
      success: true,
      message: `Purchase status updated to ${paymentStatus}.`,
      purchase: updatedPurchase
    });
  } catch (error) {
    logger.error('Error updating purchase status: %s', error.message);
    res.status(400).json({
      success: false,
      message: error.message || 'Error updating purchase status.'
    });
  }
};

module.exports = {
  getPurchases,
  getPurchaseById,
  createPurchase,
  updatePurchaseStatus
};
