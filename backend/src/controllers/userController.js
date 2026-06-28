const prisma = require('../utils/prisma');
const bcrypt = require('bcryptjs');

// Get all users (Owner only)
const getUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      },
      orderBy: { name: 'asc' }
    });
    res.status(200).json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

// Update user details or role (Owner/Manager authorized, with guards)
const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, name } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent Owner from changing their own role (accidental lockout)
    if (user.id === req.user.id && role && role !== 'Owner') {
      return res.status(400).json({ success: false, message: 'You cannot change your own Owner role.' });
    }

    // Manager role restrictions
    if (req.user.role !== 'Owner') {
      // If the targeted user is an Owner, Managers cannot modify them
      if (user.role === 'Owner') {
        return res.status(403).json({ success: false, message: 'Managers cannot modify Owner accounts.' });
      }
      // Managers cannot promote any user to Owner
      if (role === 'Owner') {
        return res.status(403).json({ success: false, message: 'Managers cannot assign the Owner role.' });
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { 
        role: role || undefined,
        name: name || undefined
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_USER_ROLE',
        details: `Updated details/role of user ${updated.email} to ${updated.role}`
      }
    });

    res.status(200).json({ success: true, message: 'User updated successfully', user: updated });
  } catch (error) {
    next(error);
  }
};

// Delete user account (Owner only)
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'Owner') {
      return res.status(403).json({ success: false, message: 'Only Owners are authorized to delete user accounts.' });
    }

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }

    await prisma.user.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE_USER',
        details: `Deleted user account: ${user.email}`
      }
    });

    res.status(200).json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// Fetch system audit trails (Owner only)
const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: {
          select: { name: true, email: true, role: true }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 100 // Limit to latest 100 entries
    });

    res.status(200).json({ success: true, logs });
  } catch (error) {
    next(error);
  }
};

// Create a new user manually (Owner/Manager authorized, with guards)
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and role are required.'
      });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered.'
      });
    }

    // Manager role restrictions: cannot create Owner accounts
    if (role === 'Owner' && req.user.role !== 'Owner') {
      return res.status(403).json({ success: false, message: 'Only Owners can create other Owner accounts.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        role
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_USER',
        details: `Manually created user account: ${user.email} with role ${user.role}`
      }
    });

    res.status(201).json({ success: true, message: 'User created successfully.', user });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUserRole,
  deleteUser,
  getAuditLogs
};
