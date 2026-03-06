import React from 'react';

const WhatsAppOrderButton = () => {
  const handleWhatsAppOrder = () => {
    // Logic to construct WhatsApp message with order details
    const message = "مرحباً، أود تسجيل طلب لـ..."; // Replace with actual order details
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <button onClick={handleWhatsAppOrder}>
      اطلب عبر واتساب
    </button>
  );
};

export default WhatsAppOrderButton;
