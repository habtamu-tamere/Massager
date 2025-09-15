const axios = require('axios');
const crypto = require('crypto');

// Telebirr API configuration
const TELEBIRR_CONFIG = {
  baseURL: process.env.TELEBIRR_API_URL,
  appId: process.env.TELEBIRR_APP_ID,
  appKey: process.env.TELEBIRR_APP_KEY,
  publicKey: process.env.TELEBIRR_PUBLIC_KEY,
  timeout: 30000
};

// Generate Telebirr signature
const generateSignature = (data) => {
  const sortedData = Object.keys(data).sort().reduce((acc, key) => {
    acc[key] = data[key];
    return acc;
  }, {});
  
  const signString = Object.values(sortedData).join('');
  return crypto.createHash('sha256').update(signString).digest('hex');
};

// Encrypt data with Telebirr public key
const encryptData = (data) => {
  const buffer = Buffer.from(JSON.stringify(data));
  const encrypted = crypto.publicEncrypt({
    key: TELEBIRR_CONFIG.publicKey,
    padding: crypto.constants.RSA_PKCS1_PADDING
  }, buffer);
  
  return encrypted.toString('base64');
};

// Initialize payment with Telebirr
exports.initiatePayment = async (paymentData) => {
  try {
    const requestData = {
      appId: TELEBIRR_CONFIG.appId,
      appKey: TELEBIRR_CONFIG.appKey,
      amount: paymentData.amount.toString(),
      clientPhone: paymentData.clientPhone,
      clientName: paymentData.clientName,
      orderId: paymentData.bookingId,
      description: paymentData.description,
      timestamp: Date.now().toString(),
      callbackUrl: `${process.env.BASE_URL}/api/payments/telebirr/verify`
    };

    // Generate signature
    requestData.sign = generateSignature(requestData);

    // Encrypt request data
    const encryptedData = encryptData(requestData);

    // Make API request to Telebirr
    const response = await axios.post(`${TELEBIRR_CONFIG.baseURL}/payment/initiate`, {
      data: encryptedData
    }, {
      timeout: TELEBIRR_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.code === '200') {
      return {
        success: true,
        paymentUrl: response.data.data.paymentUrl,
        transactionId: response.data.data.transactionId
      };
    } else {
      throw new Error(`Telebirr API error: ${response.data.message}`);
    }
  } catch (error) {
    console.error('Telebirr payment initiation error:', error.message);
    throw new Error('Failed to initiate payment with Telebirr');
  }
};

// Verify payment with Telebirr
exports.verifyPayment = async (transactionId) => {
  try {
    const requestData = {
      appId: TELEBIRR_CONFIG.appId,
      transactionId,
      timestamp: Date.now().toString()
    };

    // Generate signature
    requestData.sign = generateSignature(requestData);

    // Make API request to Telebirr
    const response = await axios.post(`${TELEBIRR_CONFIG.baseURL}/payment/verify`, requestData, {
      timeout: TELEBIRR_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.code === '200') {
      return {
        success: true,
        status: 'success',
        data: response.data.data
      };
    } else {
      return {
        success: false,
        status: 'failed',
        message: response.data.message
      };
    }
  } catch (error) {
    console.error('Telebirr payment verification error:', error.message);
    return {
      success: false,
      status: 'error',
      message: 'Payment verification failed'
    };
  }
};

// Process refund with Telebirr
exports.processRefund = async (refundData) => {
  try {
    const requestData = {
      appId: TELEBIRR_CONFIG.appId,
      transactionId: refundData.transactionId,
      refundAmount: refundData.amount.toString(),
      reason: refundData.reason,
      timestamp: Date.now().toString()
    };

    // Generate signature
    requestData.sign = generateSignature(requestData);

    // Make API request to Telebirr
    const response = await axios.post(`${TELEBIRR_CONFIG.baseURL}/payment/refund`, requestData, {
      timeout: TELEBIRR_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.code === '200') {
      return {
        success: true,
        status: 'success',
        data: response.data.data
      };
    } else {
      return {
        success: false,
        status: 'failed',
        message: response.data.message
      };
    }
  } catch (error) {
    console.error('Telebirr refund error:', error.message);
    return {
      success: false,
      status: 'error',
      message: 'Refund processing failed'
    };
  }
};