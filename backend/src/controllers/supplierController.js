const prisma = require('../utils/prisma');

// Get all suppliers
const getSuppliers = async (req, res, next) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: {
        _count: {
          select: { purchases: true, products: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.status(200).json({ success: true, suppliers });
  } catch (error) {
    next(error);
  }
};

// Get supplier by ID
const getSupplierById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: { 
        purchases: {
          orderBy: { date: 'desc' }
        },
        products: true
      }
    });

    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    res.status(200).json({ success: true, supplier });
  } catch (error) {
    next(error);
  }
};

// Create a supplier
const createSupplier = async (req, res, next) => {
  try {
    const { name, phone, email, address, gstNumber, notes, outstandingBalance } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Supplier name is required.' });
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        phone,
        email,
        address,
        gstNumber,
        notes,
        outstandingBalance: parseFloat(outstandingBalance || 0)
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_SUPPLIER',
        details: `Created supplier: ${supplier.name}`
      }
    });

    res.status(201).json({ success: true, message: 'Supplier created successfully', supplier });
  } catch (error) {
    next(error);
  }
};

// Update a supplier
const updateSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    if (updateData.outstandingBalance !== undefined) {
      updateData.outstandingBalance = parseFloat(updateData.outstandingBalance);
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: updateData
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_SUPPLIER',
        details: `Updated supplier: ${supplier.name}`
      }
    });

    res.status(200).json({ success: true, message: 'Supplier updated successfully', supplier });
  } catch (error) {
    next(error);
  }
};

// Delete a supplier (Owner only)
const deleteSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.supplier.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    await prisma.supplier.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE_SUPPLIER',
        details: `Deleted supplier: ${existing.name}`
      }
    });

    res.status(200).json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier
};
