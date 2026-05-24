// src/services/normalizeDiscount.js

/**
 * 할인 공연 목록 정제 함수
 * @param {Object} data - API 응답 데이터
 * @returns {Object} 정제된 할인 공연 목록
 */
export const normalizeDiscountList = (data) => {
  if (!data) {
    return {
      totalCount: 0,
      items: [],
    };
  }

  return {
    totalCount: data.totalCount ?? 0,
    items: (data.items ?? []).map(normalizeDiscountItem),
  };
};

/**
 * 할인 공연 단일 아이템 정제 함수
 * @param {Object} item - 할인 공연 아이템
 * @returns {Object} 정제된 할인 공연 아이템
 */
export const normalizeDiscountItem = (item) => {
  if (!item) {
    return null;
  }

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}.${month}.${day}`;
    } catch (e) {
      return dateString;
    }
  };

  const formatDateRange = (startDate, endDate) => {
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    if (start && end) {
      return `${start} ~ ${end}`;
    } else if (start) {
      return `${start} ~`;
    } else if (end) {
      return `~ ${end}`;
    }
    return '';
  };

  const normalizeImageUrl = (imageUrl, site) => {
    if (!imageUrl) return '';
    
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    if (site === 'TIMETICKET' || site === 'timeticket' || site?.toUpperCase() === 'TIMETICKET') {
      const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
      return `https://timeticket.co.kr${path}`;
    }
    
    return imageUrl;
  };

  const extractInterparkGoodsId = (imageUrl) => {
    if (!imageUrl) return null;
    
    const patterns = [
      /\/Play\/image\/[^\/]+\/\d+\/(\d+)_[^\/]+\.(gif|jpg|png|webp)/i,  // /Play/image/large/25/25009291_p.gif
      /\/goods\/(\d+)/i,  // /goods/25009291
      /(\d{8,})/
    ];
    
    for (const pattern of patterns) {
      const match = imageUrl.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  };

  const normalizeLink = (link, imageUrl, site) => {
    if (link && link.trim() !== '') {
      return link;
    }
    
    if (site === 'INTERPARK' || site === 'interpark' || site?.toUpperCase() === 'INTERPARK') {
      const goodsId = extractInterparkGoodsId(imageUrl);
      if (goodsId) {
        return `https://tickets.interpark.com/goods/${goodsId}`;
      }
    }
    
    return link || '';
  };

  const site = item.site ?? '';
  const imageUrl = normalizeImageUrl(item.imageUrl ?? '', site);
  const link = normalizeLink(item.link ?? '', imageUrl, site);

  return {
    site,
    title: item.title ?? '',
    venue: item.venue ?? '',
    imageUrl,
    saleType: item.saleType ?? '',
    discountPercent: item.discountPercent ?? '',
    discountPrice: item.discountPrice ?? '',
    startDate: formatDate(item.startDate),
    endDate: formatDate(item.endDate),
    dateRange: formatDateRange(item.startDate, item.endDate),
    link,
    discountEndDatetime: item.discountEndDatetime ?? null,
  };
};
