const prisma = require('../utils/prisma');

// Fetch dashboard card summaries & graphs
const getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Today's Sales & Profit
    const todaySalesData = await prisma.sale.findMany({
      where: { date: { gte: todayStart } },
      select: { totalAmount: true, profit: true }
    });

    const todaySales = todaySalesData.reduce((sum, item) => sum + item.totalAmount, 0);
    const todayProfit = todaySalesData.reduce((sum, item) => sum + item.profit, 0);

    // 2. Monthly Sales & Profit
    const monthlySalesData = await prisma.sale.findMany({
      where: { date: { gte: startOfMonth } },
      select: { totalAmount: true, profit: true }
    });

    const monthlySales = monthlySalesData.reduce((sum, item) => sum + item.totalAmount, 0);
    const monthlyProfit = monthlySalesData.reduce((sum, item) => sum + item.profit, 0);

    // 3. Stock Valuation & Low Stock Count (Optimized SQLite aggregation query)
    const valuation = await prisma.$queryRaw`
      SELECT 
        COALESCE(SUM(quantity * purchasePrice), 0) as inventoryValue,
        COALESCE(SUM(quantity * sellingPrice), 0) as retailValue,
        COUNT(CASE WHEN quantity > 0 AND quantity <= minQuantity THEN 1 END) as lowStockCount
      FROM "Product"
      WHERE status = 'Active'
    `;
    const currentInventoryValue = Number(valuation[0]?.inventoryValue || 0);
    const lockedInStockValue = Number(valuation[0]?.retailValue || 0);
    const lowStockCount = Number(valuation[0]?.lowStockCount || 0);

    // 4. Alert Counts (Optimized DB counts)
    const outOfStockCount = await prisma.product.count({
      where: { status: 'Active', quantity: 0 }
    });

    const expiredCount = await prisma.product.count({
      where: {
        status: 'Active',
        expiryDate: { lt: now }
      }
    });

    const targetDate = new Date();
    targetDate.setDate(now.getDate() + 30);
    const expiringSoonCount = await prisma.product.count({
      where: {
        status: 'Active',
        expiryDate: { gte: now, lte: targetDate }
      }
    });

    // 5. Top Selling Products
    const saleItems = await prisma.saleItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, totalCost: true, profit: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5
    });

    // 5. Top Selling Products
    const topSellingProductIds = saleItems.map(item => item.productId);
    const topProductsInfo = await prisma.product.findMany({
      where: { id: { in: topSellingProductIds } },
      select: { id: true, name: true, code: true }
    });
    const topProductsMap = new Map(topProductsInfo.map(p => [p.id, p]));

    const topSellingProducts = saleItems.map(item => {
      const prod = topProductsMap.get(item.productId);
      return {
        name: prod?.name || 'Unknown Product',
        code: prod?.code || 'N/A',
        quantity: item._sum.quantity,
        totalRevenue: item._sum.totalCost,
        profit: item._sum.profit
      };
    });

    // 6. Top Customers
    const topCustomersRaw = await prisma.sale.groupBy({
      by: ['customerId'],
      _sum: { totalAmount: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: 5
    });

    const topCustomerIds = topCustomersRaw.map(item => item.customerId).filter(Boolean);
    const topCustInfo = await prisma.customer.findMany({
      where: { id: { in: topCustomerIds } },
      select: { id: true, name: true, phone: true }
    });
    const topCustMap = new Map(topCustInfo.map(c => [c.id, c]));

    const topCustomers = topCustomersRaw
      .filter(item => item.customerId)
      .map(item => {
        const cust = topCustMap.get(item.customerId);
        return {
          name: cust?.name || 'Walk-In Customer',
          phone: cust?.phone || 'N/A',
          totalSpent: item._sum.totalAmount
        };
      });

    // 7. Recent Transactions (Sales & Purchases)
    const recentSales = await prisma.sale.findMany({
      take: 5,
      orderBy: { date: 'desc' },
      include: { customer: true }
    });

    const recentPurchases = await prisma.purchase.findMany({
      take: 5,
      orderBy: { date: 'desc' },
      include: { supplier: true }
    });

    res.status(200).json({
      success: true,
      stats: {
        todaySales,
        todayProfit,
        monthlySales,
        monthlyProfit,
        currentInventoryValue,
        lockedInStockValue,
        alerts: {
          lowStock: lowStockCount,
          outOfStock: outOfStockCount,
          expired: expiredCount,
          expiringSoon: expiringSoonCount
        },
        topSellingProducts,
        topCustomers,
        recentSales,
        recentPurchases
      }
    });
  } catch (error) {
    next(error);
  }
};

// Advanced Stock and Profit Analytics
const getFullAnalytics = async (req, res, next) => {
  try {
    const now = new Date();
    
    // 1. Stock turnover, Dead stock valuation, Fast/Slow moving
    const products = await prisma.product.findMany({
      include: {
        category: true,
        brand: true,
        saleItems: {
          select: { quantity: true, totalCost: true, profit: true }
        }
      }
    });

    let deadStockValue = 0;
    const fastMoving = [];
    const slowMoving = [];

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(now.getDate() - 90);

    // Single query for 90-day sales grouping
    const salesLast90 = await prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        createdAt: { gte: ninetyDaysAgo }
      },
      _sum: { quantity: true }
    });

    const salesMap = new Map(salesLast90.map(item => [item.productId, item._sum.quantity || 0]));

    for (const prod of products) {
      const unitsSoldLast90 = salesMap.get(prod.id) || 0;

      // Dead stock: has quantity in stock, but has 0 sales in past 90 days
      if (prod.quantity > 0 && unitsSoldLast90 === 0) {
        deadStockValue += (prod.quantity * prod.purchasePrice);
        slowMoving.push({ id: prod.id, name: prod.name, code: prod.code, quantity: prod.quantity, sales: 0 });
      } else if (unitsSoldLast90 >= 10) {
        fastMoving.push({ id: prod.id, name: prod.name, code: prod.code, quantity: prod.quantity, sales: unitsSoldLast90 });
      } else {
        slowMoving.push({ id: prod.id, name: prod.name, code: prod.code, quantity: prod.quantity, sales: unitsSoldLast90 });
      }
    }

    // Sort fast/slow moving
    fastMoving.sort((a, b) => b.sales - a.sales);
    slowMoving.sort((a, b) => a.sales - b.sales);

    // 2. Charts data: Monthly profit & sales trends (last 6 months)
    const salesHistoryMonthly = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      const monthName = date.toLocaleString('default', { month: 'short' });

      const monthSales = await prisma.sale.aggregate({
        where: { date: { gte: start, lte: end } },
        _sum: { totalAmount: true, profit: true }
      });

      salesHistoryMonthly.push({
        month: monthName,
        sales: monthSales._sum.totalAmount || 0,
        profit: monthSales._sum.profit || 0
      });
    }

    // 3. Category distribution (Pie Chart)
    const categories = await prisma.category.findMany({
      include: {
        products: {
          select: {
            saleItems: { select: { totalCost: true } }
          }
        }
      }
    });

    const categorySales = categories.map(cat => {
      let revenue = 0;
      cat.products.forEach(p => {
        p.saleItems.forEach(item => {
          revenue += item.totalCost;
        });
      });
      return {
        name: cat.name,
        value: revenue
      };
    }).filter(c => c.value > 0);

    // 4. Product Profitability breakdown
    const productProfitsRaw = await prisma.saleItem.groupBy({
      by: ['productId'],
      _sum: { profit: true, totalCost: true },
      orderBy: {
        _sum: {
          profit: 'desc'
        }
      },
      take: 10
    });

    const productIds = productProfitsRaw.map(item => item.productId);
    const productsInfo = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true }
    });
    const productInfoMap = new Map(productsInfo.map(p => [p.id, p.name]));

    const productProfits = productProfitsRaw.map(item => ({
      name: productInfoMap.get(item.productId) || 'Unknown Product',
      profit: item._sum.profit || 0,
      revenue: item._sum.totalCost || 0
    }));

    // 5. Customer outstanding balance and outstanding supplier balance
    const outstandingCustomers = await prisma.customer.findMany({
      where: { outstandingBalance: { gt: 0 } },
      select: { name: true, outstandingBalance: true },
      orderBy: { outstandingBalance: 'desc' },
      take: 5
    });

    const outstandingSuppliers = await prisma.supplier.findMany({
      where: { outstandingBalance: { gt: 0 } },
      select: { name: true, outstandingBalance: true },
      orderBy: { outstandingBalance: 'desc' },
      take: 5
    });

    res.status(200).json({
      success: true,
      analytics: {
        deadStockValue,
        fastMoving: fastMoving.slice(0, 5),
        slowMoving: slowMoving.slice(0, 5),
        salesHistoryMonthly,
        categorySales,
        productProfits,
        outstandingCustomers,
        outstandingSuppliers
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getFullAnalytics
};
