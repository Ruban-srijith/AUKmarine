const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const productRoutes = require('./productRoutes');
const categoryRoutes = require('./categoryRoutes');
const brandRoutes = require('./brandRoutes');
const supplierRoutes = require('./supplierRoutes');
const customerRoutes = require('./customerRoutes');
const salesRoutes = require('./salesRoutes');
const purchaseRoutes = require('./purchaseRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const notificationRoutes = require('./notificationRoutes');
const settingsRoutes = require('./settingsRoutes');
const userRoutes = require('./userRoutes');

// Mount Sub-routers
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/brands', brandRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/customers', customerRoutes);
router.use('/sales', salesRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/settings', settingsRoutes);
router.use('/users', userRoutes);

module.exports = router;
