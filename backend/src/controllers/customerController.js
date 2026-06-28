const prisma = require('../utils/prisma');

// Get all customers
const getCustomers = async (req, res, next) => {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        _count: {
          select: { sales: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.status(200).json({ success: true, customers });
  } catch (error) {
    next(error);
  }
};

// Get customer by ID
const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        sales: {
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.status(200).json({ success: true, customer });
  } catch (error) {
    next(error);
  }
};

// Create customer
const createCustomer = async (req, res, next) => {
  try {
    const { name, phone, email, address, gstNumber, creditLimit, outstandingBalance } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone number are required.' });
    }

    // Check unique phone number
    const existing = await prisma.customer.findUnique({ where: { phone } });
    if (existing) {
      return res.status(400).json({ success: false, message: `Phone number ${phone} is already registered to a customer.` });
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        email,
        address,
        gstNumber,
        creditLimit: parseFloat(creditLimit || 0),
        outstandingBalance: parseFloat(outstandingBalance || 0),
        loyaltyPoints: 0
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_CUSTOMER',
        details: `Created customer: ${customer.name} (Phone: ${customer.phone})`
      }
    });

    res.status(201).json({ success: true, message: 'Customer created successfully', customer });
  } catch (error) {
    next(error);
  }
};

// Update customer
const updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (updateData.phone && updateData.phone !== existing.phone) {
      const existingPhone = await prisma.customer.findUnique({ where: { phone: updateData.phone } });
      if (existingPhone) {
        return res.status(400).json({ success: false, message: 'Phone number already registered to another customer.' });
      }
    }

    if (updateData.creditLimit !== undefined) updateData.creditLimit = parseFloat(updateData.creditLimit);
    if (updateData.outstandingBalance !== undefined) updateData.outstandingBalance = parseFloat(updateData.outstandingBalance);
    if (updateData.loyaltyPoints !== undefined) updateData.loyaltyPoints = parseInt(updateData.loyaltyPoints);

    const customer = await prisma.customer.update({
      where: { id },
      data: updateData
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_CUSTOMER',
        details: `Updated customer: ${customer.name}`
      }
    });

    res.status(200).json({ success: true, message: 'Customer updated successfully', customer });
  } catch (error) {
    next(error);
  }
};

// Delete customer (Owner only)
const deleteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.customer.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    await prisma.customer.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE_CUSTOMER',
        details: `Deleted customer: ${existing.name}`
      }
    });

    res.status(200).json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer
};
