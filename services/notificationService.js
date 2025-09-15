const axios = require('axios');

// Send SMS notification
exports.sendSMS = async (phone, message) => {
  try {
    // This would integrate with an SMS gateway service
    console.log(`SMS to ${phone}: ${message}`);
    return { success: true };
  } catch (error) {
    console.error('SMS sending error:', error.message);
    return { success: false, error: error.message };
  }
};

// Send Telegram notification
exports.sendTelegramMessage = async (chatId, message) => {
  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      }
    );
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Telegram message sending error:', error.message);
    return { success: false, error: error.message };
  }
};

// Send booking confirmation
exports.sendBookingConfirmation = async (booking, user) => {
  try {
    const message = `
🎉 Your booking has been confirmed!

Massager: ${booking.massager.name}
Date: ${new Date(booking.date).toLocaleDateString()}
Time: ${booking.startTime} - ${booking.endTime}
Location: ${booking.location}
Amount: ${booking.totalAmount} ETB

Thank you for choosing Dimple!
    `;
    
    // Send SMS
    await this.sendSMS(user.phone, message);
    
    // Send Telegram message if user has Telegram chat ID
    if (user.telegramChatId) {
      await this.sendTelegramMessage(user.telegramChatId, message);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Booking confirmation error:', error.message);
    return { success: false, error: error.message };
  }
};

// Send payment confirmation
exports.sendPaymentConfirmation = async (payment, user) => {
  try {
    const message = `
💳 Payment confirmed!

Amount: ${payment.amount} ETB
Transaction ID: ${payment.transactionId}
Date: ${new Date(payment.createdAt).toLocaleDateString()}

Thank you for your payment!
    `;
    
    // Send SMS
    await this.sendSMS(user.phone, message);
    
    // Send Telegram message if user has Telegram chat ID
    if (user.telegramChatId) {
      await this.sendTelegramMessage(user.telegramChatId, message);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Payment confirmation error:', error.message);
    return { success: false, error: error.message };
  }
};