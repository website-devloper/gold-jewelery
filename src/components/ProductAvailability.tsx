'use client';

import React from 'react';
import { Product, ProductVariant } from '@/lib/firestore/products';

interface ProductAvailabilityProps {
  product: Product;
  selectedVariant?: ProductVariant;
}

const ProductAvailability: React.FC<ProductAvailabilityProps> = ({ product, selectedVariant }) => {
  const getStockStatus = () => {
    if (product.variants && product.variants.length > 0) {
      if (selectedVariant) {
        if (selectedVariant.stock > 10) return { status: 'in_stock', text: 'متوفر', color: 'text-green-600' };
        if (selectedVariant.stock > 0) return { status: 'low_stock', text: 'كمية قليلة', color: 'text-yellow-600' };
        return { status: 'out_of_stock', text: 'نفذت الكمية', color: 'text-red-600' };
      }
      const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
      if (totalStock > 10) return { status: 'in_stock', text: 'متوفر', color: 'text-green-600' };
      if (totalStock > 0) return { status: 'low_stock', text: 'كمية قليلة', color: 'text-yellow-600' };
      return { status: 'out_of_stock', text: 'نفذت الكمية', color: 'text-red-600' };
    }
    return { status: 'in_stock', text: 'متوفر', color: 'text-green-600' };
  };

  const stockInfo = getStockStatus();
  const stockCount = selectedVariant
    ? selectedVariant.stock
    : (product.variants && product.variants.length > 0
      ? product.variants.reduce((sum, v) => sum + v.stock, 0)
      : null);

  return (
    <div className="flex items-center gap-2">
      <span className={`font-medium ${stockInfo.color}`}>
        {stockInfo.text}
      </span>
      {stockCount !== null && stockInfo.status !== 'out_of_stock' && (
        <span className="text-sm text-gray-500">
          ({stockCount} متاح)
        </span>
      )}
    </div>
  );
};

export default ProductAvailability;

