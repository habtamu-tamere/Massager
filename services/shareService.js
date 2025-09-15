const axios = require('axios');

// Share to Telegram
exports.shareToTelegram = async (message, chatId = null) => {
  try {
    // If no specific chat ID is provided, share to the Dimple channel
    const targetChatId = chatId || process.env.TELEGRAM_CHANNEL_ID;
    
    const response = await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: targetChatId,
        text: message,
        parse_mode: 'HTML'
      }
    );
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Telegram sharing error:', error.message);
    return { success: false, error: error.message };
  }
};

// Generate shareable links
exports.generateShareLinks = (booking, platform) => {
  const message = `I just booked a massage session with ${booking.massager.name} on Dimple!`;
  const encodedMessage = encodeURIComponent(message);
  
  const links = {
    telegram: `https://t.me/share/url?url=https://dimple.com&text=${encodedMessage}`,
    whatsapp: `https://wa.me/?text=${encodedMessage}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=https://dimple.com&quote=${encodedMessage}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedMessage}`
  };
  
  return platform ? links[platform] : links;
};

// Share booking to social media
exports.shareBooking = async (booking, platforms) => {
  try {
    const results = {};
    const message = `I just booked a massage session with ${booking.massager.name} on Dimple!`;
    
    for (const platform of platforms) {
      if (platform === 'telegram') {
        results.telegram = await this.shareToTelegram(message);
      } else {
        // For other platforms, return the share link
        results[platform] = this.generateShareLinks(booking, platform);
      }
    }
    
    return { success: true, results };
  } catch (error) {
    console.error('Booking sharing error:', error.message);
    return { success: false, error: error.message };
  }
};