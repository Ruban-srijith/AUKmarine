const prisma = require('../utils/prisma');

// Get all brands
const getBrands = async (req, res, next) => {
  try {
    const brands = await prisma.brand.findMany({
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.status(200).json({ success: true, brands });
  } catch (error) {
    next(error);
  }
};

// Create brand
const createBrand = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Brand name is required' });
    }

    const existing = await prisma.brand.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Brand already exists' });
    }

    const brand = await prisma.brand.create({
      data: { name, description }
    });

    res.status(201).json({ success: true, message: 'Brand created successfully', brand });
  } catch (error) {
    next(error);
  }
};

// Update brand
const updateBrand = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const existing = await prisma.brand.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    const brand = await prisma.brand.update({
      where: { id },
      data: { name, description }
    });

    res.status(200).json({ success: true, message: 'Brand updated successfully', brand });
  } catch (error) {
    next(error);
  }
};

// Delete brand
const deleteBrand = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.brand.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    await prisma.brand.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Brand deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand
};
