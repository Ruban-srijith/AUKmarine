const prisma = require('../utils/prisma');

// Get company settings
const getSettings = async (req, res, next) => {
  try {
    let settings = await prisma.setting.findFirst();
    
    // If no settings exist yet, create default
    if (!settings) {
      settings = await prisma.setting.create({
        data: {
          companyName: 'Marine ERP Logistics',
          currency: 'INR',
          taxRate: 18.0,
          invoiceTemplate: 'Standard'
        }
      });
    }

    res.status(200).json({ success: true, settings });
  } catch (error) {
    next(error);
  }
};

// Update company settings (Owner only)
const updateSettings = async (req, res, next) => {
  try {
    const updateData = req.body;
    let settings = await prisma.setting.findFirst();

    if (updateData.taxRate !== undefined) {
      updateData.taxRate = parseFloat(updateData.taxRate);
    }

    if (!settings) {
      settings = await prisma.setting.create({
        data: {
          companyName: updateData.companyName || 'Marine ERP Logistics',
          logoUrl: updateData.logoUrl,
          gstNumber: updateData.gstNumber,
          address: updateData.address,
          email: updateData.email,
          phone: updateData.phone,
          currency: updateData.currency || 'INR',
          taxRate: updateData.taxRate || 18.0,
          invoiceTemplate: updateData.invoiceTemplate || 'Standard'
        }
      });
    } else {
      settings = await prisma.setting.update({
        where: { id: settings.id },
        data: updateData
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_SETTINGS',
        details: `Updated company settings for: ${settings.companyName}`
      }
    });

    res.status(200).json({ success: true, message: 'Settings updated successfully', settings });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings
};
