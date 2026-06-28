const prisma = require('../utils/prisma');
const logger = require('../utils/logger');
const fs = require('fs');
const csv = require('csv-parser');

// Get all products with pagination, search, and filters
const getProducts = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      category = '', 
      brand = '', 
      supplier = '', 
      status = '',
      alert = '' // low, out, expired, expiring_7, expiring_15, expiring_30, expiring_60
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query conditions
    const where = {};

    // Global text search (Name, Code, Barcode, Description)
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { barcode: { contains: search } },
        { description: { contains: search } }
      ];
    }

    if (category) where.categoryId = category;
    if (brand) where.brandId = brand;
    if (supplier) where.supplierId = supplier;
    if (status) where.status = status;

    // Filter by stock alerts
    const now = new Date();
    if (alert === 'low') {
      where.quantity = {
        gt: 0,
        lte: prisma.product.fields.minQuantity // quantity <= minQuantity
      };
    } else if (alert === 'out') {
      where.quantity = 0;
    } else if (alert === 'expired') {
      where.expiryDate = { lt: now };
    } else if (alert === 'expiring_7') {
      const targetDate = new Date();
      targetDate.setDate(now.getDate() + 7);
      where.expiryDate = { gte: now, lte: targetDate };
    } else if (alert === 'expiring_15') {
      const targetDate = new Date();
      targetDate.setDate(now.getDate() + 15);
      where.expiryDate = { gte: now, lte: targetDate };
    } else if (alert === 'expiring_30') {
      const targetDate = new Date();
      targetDate.setDate(now.getDate() + 30);
      where.expiryDate = { gte: now, lte: targetDate };
    } else if (alert === 'expiring_60') {
      const targetDate = new Date();
      targetDate.setDate(now.getDate() + 60);
      where.expiryDate = { gte: now, lte: targetDate };
    } else if (alert === 'expiry') {
      where.expiryDate = { not: null };
    }

    // Workaround for comparing fields directly in Prisma (quantity <= minQuantity)
    // If Prisma doesn't natively support field-to-field comparison in all databases without raw query,
    // we fetch products and filter in JS if they specify 'low' alert, or query via raw SQL.
    // For standard compliance, let's fetch matching items.
    let products;
    let totalItems;

    if (alert === 'low') {
      // Fetch all candidate active items and filter in JS
      const candidates = await prisma.product.findMany({
        where: {
          status: 'Active',
          categoryId: category || undefined,
          brandId: brand || undefined,
          supplierId: supplier || undefined,
          OR: search ? [
            { name: { contains: search } },
            { code: { contains: search } },
            { barcode: { contains: search } }
          ] : undefined
        },
        include: { category: true, brand: true, supplier: true }
      });

      const filtered = candidates.filter(p => p.quantity <= p.minQuantity && p.quantity > 0);

      // Relevance ranking for low-stock filtered results
      if (search) {
        const q = search.toLowerCase();
        filtered.sort((a, b) => {
          const scoreItem = (p) => {
            const n = (p.name || '').toLowerCase();
            const c = (p.code || '').toLowerCase();
            if (n === q || c === q) return 0;          // exact match
            if (n.startsWith(q) || c.startsWith(q)) return 1; // prefix match
            if (n.includes(q) || c.includes(q)) return 2;     // contains in name/code
            return 3;                                          // match in other fields
          };
          return scoreItem(a) - scoreItem(b);
        });
      } else {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
      }

      totalItems = filtered.length;
      products = filtered.slice(skip, skip + limitNum);
    } else if (search) {
      // Fetch ALL matches (no pagination yet) so we can rank by relevance
      const allMatches = await prisma.product.findMany({
        where,
        include: { category: true, brand: true, supplier: true }
      });

      // Score each product by how closely its name/code matches the query
      const q = search.toLowerCase();
      const scoreItem = (p) => {
        const n = (p.name || '').toLowerCase();
        const c = (p.code || '').toLowerCase();
        if (n === q || c === q) return 0;           // exact match — top priority
        if (n.startsWith(q) || c.startsWith(q)) return 1;  // starts with query
        if (n.includes(q) || c.includes(q)) return 2;      // contains in name/code
        return 3;                                            // match in barcode/description
      };

      allMatches.sort((a, b) => {
        const diff = scoreItem(a) - scoreItem(b);
        if (diff !== 0) return diff;
        // Tie-break: alphabetical by name
        return a.name.localeCompare(b.name);
      });

      totalItems = allMatches.length;
      products = allMatches.slice(skip, skip + limitNum);
    } else {
      totalItems = await prisma.product.count({ where });
      products = await prisma.product.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          category: true,
          brand: true,
          supplier: true
        },
        orderBy: { name: 'asc' }
      });
    }

    res.status(200).json({
      success: true,
      products,
      pagination: {
        totalItems,
        currentPage: pageNum,
        totalPages: Math.ceil(totalItems / limitNum),
        limit: limitNum
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get product details by ID
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true, brand: true, supplier: true }
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({ success: true, product });
  } catch (error) {
    next(error);
  }
};

// Create a new product
const createProduct = async (req, res, next) => {
  try {
    const {
      name, code, barcode, categoryId, brandId, description,
      purchasePrice, sellingPrice, gstPercent, quantity, minQuantity,
      supplierId, batchNumber, manufacturingDate, expiryDate, imageUrl
    } = req.body;

    if (!name || !code || !categoryId || !brandId || purchasePrice === undefined || sellingPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, code, category, brand, purchase price, and selling price are required.'
      });
    }

    // Check for unique code/barcode
    const existingCode = await prisma.product.findUnique({ where: { code } });
    if (existingCode) {
      return res.status(400).json({ success: false, message: `Product code "${code}" already exists.` });
    }

    if (barcode) {
      const existingBarcode = await prisma.product.findUnique({ where: { barcode } });
      if (existingBarcode) {
        return res.status(400).json({ success: false, message: `Barcode "${barcode}" already exists.` });
      }
    }

    const newQty = parseInt(quantity || 0);

    const product = await prisma.product.create({
      data: {
        name,
        code,
        barcode: barcode || null,
        categoryId,
        brandId,
        description,
        purchasePrice: parseFloat(purchasePrice),
        sellingPrice: parseFloat(sellingPrice),
        gstPercent: parseFloat(gstPercent || 18),
        quantity: newQty,
        minQuantity: parseInt(minQuantity || 5),
        supplierId: supplierId || null,
        batchNumber,
        manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        imageUrl: imageUrl || null
      }
    });

    // Create Initial Inventory Log
    if (newQty > 0) {
      await prisma.inventoryLog.create({
        data: {
          productId: product.id,
          type: 'In',
          quantity: newQty,
          referenceId: 'INITIAL_STOCK',
          date: new Date()
        }
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_PRODUCT',
        details: `Created product: ${product.name} (Code: ${product.code}) with qty ${newQty}`
      }
    });

    res.status(201).json({ success: true, message: 'Product created successfully', product });
  } catch (error) {
    next(error);
  }
};

// Edit/Update product details
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const currentProduct = await prisma.product.findUnique({ where: { id } });
    if (!currentProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Validate code and barcode uniqueness if changing
    if (updateData.code && updateData.code !== currentProduct.code) {
      const existing = await prisma.product.findUnique({ where: { code: updateData.code } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Product code already in use.' });
      }
    }

    if (updateData.barcode && updateData.barcode !== currentProduct.barcode) {
      const existing = await prisma.product.findUnique({ where: { barcode: updateData.barcode } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Barcode already in use.' });
      }
    }

    // Parse floats/ints
    if (updateData.purchasePrice !== undefined) updateData.purchasePrice = parseFloat(updateData.purchasePrice);
    if (updateData.sellingPrice !== undefined) updateData.sellingPrice = parseFloat(updateData.sellingPrice);
    if (updateData.gstPercent !== undefined) updateData.gstPercent = parseFloat(updateData.gstPercent);
    if (updateData.quantity !== undefined) updateData.quantity = parseInt(updateData.quantity);
    if (updateData.minQuantity !== undefined) updateData.minQuantity = parseInt(updateData.minQuantity);
    if (updateData.manufacturingDate) updateData.manufacturingDate = new Date(updateData.manufacturingDate);
    if (updateData.expiryDate) updateData.expiryDate = new Date(updateData.expiryDate);

    const oldQty = currentProduct.quantity;
    const newQty = updateData.quantity !== undefined ? updateData.quantity : oldQty;

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData
    });

    // Create adjustment log if quantity changed
    if (newQty !== oldQty) {
      const qtyDiff = newQty - oldQty;
      await prisma.inventoryLog.create({
        data: {
          productId: id,
          type: qtyDiff > 0 ? 'In' : 'Out',
          quantity: Math.abs(qtyDiff),
          referenceId: 'MANUAL_ADJUSTMENT',
          date: new Date()
        }
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_PRODUCT',
        details: `Updated product: ${updatedProduct.name} (Code: ${updatedProduct.code})`
      }
    });

    res.status(200).json({ success: true, message: 'Product updated successfully', product: updatedProduct });
  } catch (error) {
    next(error);
  }
};

// Delete product (Owner only)
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await prisma.product.delete({ where: { id } });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE_PRODUCT',
        details: `Deleted product: ${product.name} (Code: ${product.code})`
      }
    });

    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Get product stock movement history
const getStockHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const logs = await prisma.inventoryLog.findMany({
      where: { productId: id },
      orderBy: { date: 'desc' }
    });
    res.status(200).json({ success: true, logs });
  } catch (error) {
    next(error);
  }
};

// Bulk upload products via CSV
const bulkUploadCSV = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a CSV file.' });
    }

    const results = [];
    const filePath = req.file.path;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          let successCount = 0;
          let failCount = 0;
          const errors = [];

          // Standardize CSV column mappings
          for (let i = 0; i < results.length; i++) {
            const row = results[i];
            const name = row.name || row.Name || row.productName || row.ProductName;
            const code = row.code || row.Code || row.productCode || row.ProductCode;
            const barcode = row.barcode || row.Barcode || '';
            const categoryName = row.category || row.Category || 'General Hardware';
            const brandName = row.brand || row.Brand || 'Generic Marine';
            const description = row.description || row.Description || '';
            const purchasePrice = parseFloat(row.purchasePrice || row.PurchasePrice || 0);
            const sellingPrice = parseFloat(row.sellingPrice || row.SellingPrice || 0);
            const gstPercent = parseFloat(row.gstPercent || row.GSTPercent || row.gst || row.GST || 18);
            const quantity = parseInt(row.quantity || row.Quantity || row.qty || row.Qty || 0);
            const minQuantity = parseInt(row.minQuantity || row.MinQuantity || 5);
            const batchNumber = row.batchNumber || row.BatchNumber || row.batch || row.Batch || '';
            const expiryStr = row.expiryDate || row.ExpiryDate || row.expiry || row.Expiry || '';

            if (!name || !code) {
              failCount++;
              errors.push(`Row ${i + 1}: Name and Code are required.`);
              continue;
            }

            // Find or create Category
            let category = await prisma.category.findUnique({ where: { name: categoryName } });
            if (!category) {
              category = await prisma.category.create({ data: { name: categoryName } });
            }

            // Find or create Brand
            let brand = await prisma.brand.findUnique({ where: { name: brandName } });
            if (!brand) {
              brand = await prisma.brand.create({ data: { name: brandName } });
            }

            const expiryDate = expiryStr ? new Date(expiryStr) : null;

            // Check if product code already exists
            const existing = await prisma.product.findUnique({ where: { code } });

            if (existing) {
              // Update quantity
              const oldQty = existing.quantity;
              const newQty = oldQty + quantity;

              await prisma.product.update({
                where: { id: existing.id },
                data: {
                  quantity: newQty,
                  purchasePrice: purchasePrice || existing.purchasePrice,
                  sellingPrice: sellingPrice || existing.sellingPrice,
                }
              });

              if (quantity > 0) {
                await prisma.inventoryLog.create({
                  data: {
                    productId: existing.id,
                    type: 'In',
                    quantity,
                    referenceId: 'BULK_CSV_IMPORT_UPDATE',
                    date: new Date()
                  }
                });
              }
            } else {
              // Create new
              const product = await prisma.product.create({
                data: {
                  name,
                  code,
                  barcode: barcode || null,
                  categoryId: category.id,
                  brandId: brand.id,
                  description,
                  purchasePrice,
                  sellingPrice,
                  gstPercent,
                  quantity,
                  minQuantity,
                  batchNumber: batchNumber || null,
                  expiryDate
                }
              });

              if (quantity > 0) {
                await prisma.inventoryLog.create({
                  data: {
                    productId: product.id,
                    type: 'In',
                    quantity,
                    referenceId: 'BULK_CSV_IMPORT_NEW',
                    date: new Date()
                  }
                });
              }
            }

            successCount++;
          }

          // Clean up temp upload file
          fs.unlinkSync(filePath);

          await prisma.auditLog.create({
            data: {
              userId: req.user.id,
              action: 'BULK_UPLOAD',
              details: `Uploaded CSV file. Success: ${successCount}, Failed: ${failCount}`
            }
          });

          res.status(200).json({
            success: true,
            message: `CSV Import completed. ${successCount} products imported/updated. ${failCount} rows failed.`,
            errors
          });
        } catch (dbError) {
          logger.error('CSV db error: %o', dbError);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          res.status(500).json({ success: false, message: 'Database error importing CSV.', error: dbError.message });
        }
      });
  } catch (error) {
    next(error);
  }
};

// Export Products to CSV format
const exportCSV = async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      include: { category: true, brand: true, supplier: true }
    });

    let csvContent = 'Product Name,Product Code,Barcode,Category,Brand,Purchase Price,Selling Price,GST %,Quantity,Min Qty,Supplier,Expiry Date\n';

    products.forEach((p) => {
      const expiry = p.expiryDate ? p.expiryDate.toISOString().split('T')[0] : 'N/A';
      const category = p.category ? p.category.name : '';
      const brand = p.brand ? p.brand.name : '';
      const supplier = p.supplier ? p.supplier.name : '';

      // Escape quotes in name/description
      const name = p.name.replace(/"/g, '""');

      csvContent += `"${name}","${p.code}","${p.barcode || ''}","${category}","${brand}",${p.purchasePrice},${p.sellingPrice},${p.gstPercent},${p.quantity},${p.minQuantity},"${supplier}","${expiry}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=products_export.csv');
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getStockHistory,
  bulkUploadCSV,
  exportCSV
};
