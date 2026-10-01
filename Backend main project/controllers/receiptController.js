// @desc    Simulate receipt scanning & extraction of line items
// @route   POST /api/receipts/scan
// @access  Private
const scanReceipt = async (req, res) => {
  try {
    const { imageUrl, storeName, totalAmount } = req.body;

    // Simulated OCR receipt extraction logic
    const extractedData = {
      store: storeName || 'Supermarket Fresh Mart',
      date: new Date().toISOString(),
      suggestedCategory: 'Groceries',
      suggestedTitle: storeName ? `Shopping at ${storeName}` : 'Grocery Purchase',
      totalAmount: totalAmount || 42.50,
      detectedItems: [
        { name: 'Organic Milk 1L', price: 3.50 },
        { name: 'Whole Wheat Bread', price: 2.80 },
        { name: 'Fresh Apples 1kg', price: 4.20 },
        { name: 'Household Essentials', price: 32.00 }
      ],
      confidence: 0.95
    };

    res.status(200).json({
      success: true,
      message: 'Receipt scanned and parsed successfully',
      data: extractedData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { scanReceipt };
