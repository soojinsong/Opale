import React, { useState, useEffect } from 'react';
import { getTicketDetailList, getTicketReviews } from '../../api/reservationApi';
import { normalizeTicketDetailList, categorizeTickets } from '../../services/normalizeTicketDetailList';
import { normalizeTicketReviews } from '../../services/normalizeTicketReviews';
import styles from './TicketSelectModal.module.css';

const TicketSelectModal = ({ isOpen, onClose, onSelectTicket, filterPerformanceId = null, filterPlaceId = null }) => {
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadTicketsWithoutReview = async () => {
      if (!isOpen) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await getTicketDetailList(1, 100);
        const normalized = normalizeTicketDetailList(response);
        
        const { watched } = categorizeTickets(normalized.tickets);
        
        let filteredByIds = watched;
        if (filterPerformanceId) {
          const filterIdStr = String(filterPerformanceId);
          filteredByIds = filteredByIds.filter(ticket => {
            const ticketPerformanceId = ticket.performanceId;
            if (!ticketPerformanceId) {
              return false;
            }
            const ticketIdStr = String(ticketPerformanceId);
            const matches = ticketIdStr === filterIdStr;
            
            if (!matches) {
              console.log(`[TicketSelectModal] 티켓 ${ticket.ticketId} 필터링 제외: performanceId 불일치`, {
                ticketPerformanceId: ticketIdStr,
                filterPerformanceId: filterIdStr
              });
            }
            
            return matches;
          });
        }
        if (filterPlaceId) {
          const filterIdStr = String(filterPlaceId);
          filteredByIds = filteredByIds.filter(ticket => {
            const ticketPlaceId = ticket.placeId;
            if (!ticketPlaceId) {
              return false;
            }
            const ticketIdStr = String(ticketPlaceId);
            return ticketIdStr === filterIdStr;
          });
        }
        
        const ticketsWithoutReview = [];
        
        for (const ticket of filteredByIds) {
          try {
            const ticketId = ticket.ticketId || ticket.id;
            if (!ticketId) continue;

            const reviewsResponse = await getTicketReviews(ticketId);
            const normalizedReviews = normalizeTicketReviews(reviewsResponse);
            
            let shouldInclude = false;
            
            if (filterPerformanceId) {
              shouldInclude = !normalizedReviews.hasPerformanceReview;
            } else if (filterPlaceId) {
              shouldInclude = !normalizedReviews.hasPlaceReview;
            } else {
              shouldInclude = !normalizedReviews.hasPerformanceReview || !normalizedReviews.hasPlaceReview;
            }
            
            if (shouldInclude) {
              ticketsWithoutReview.push({
                ...ticket,
                ticketId: ticketId,
                performanceId: ticket.performanceId || null,
                placeId: ticket.placeId || null
              });
            }
          } catch (err) {
            console.log(`티켓 ${ticket.ticketId || ticket.id} 리뷰 확인 실패 (리뷰 없음으로 간주):`, err);
            
            let shouldIncludeOnError = true;
            
            if (filterPerformanceId) {
              const ticketPerformanceId = ticket.performanceId;
              if (!ticketPerformanceId || String(ticketPerformanceId) !== String(filterPerformanceId)) {
                shouldIncludeOnError = false;
              }
            }
            
            if (filterPlaceId) {
              const ticketPlaceId = ticket.placeId;
              if (!ticketPlaceId || String(ticketPlaceId) !== String(filterPlaceId)) {
                shouldIncludeOnError = false;
              }
            }
            
            if (shouldIncludeOnError) {
              ticketsWithoutReview.push({
                ...ticket,
                ticketId: ticket.ticketId || ticket.id,
                performanceId: ticket.performanceId || null,
                placeId: ticket.placeId || null
              });
            }
          }
        }
        
        setFilteredTickets(ticketsWithoutReview);
        setTickets(ticketsWithoutReview);
      } catch (err) {
        console.error('티켓 목록 조회 실패:', err);
        setError('티켓 목록을 불러오는데 실패했습니다.');
        setFilteredTickets([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadTicketsWithoutReview();
  }, [isOpen, filterPerformanceId, filterPlaceId]);

  const handleSelectTicket = (ticket) => {
    const ticketData = {
      id: ticket.ticketId || ticket.id,
      ticketId: ticket.ticketId || ticket.id,
      performanceName: ticket.performanceName || '',
      performanceDate: ticket.performanceDate || '',
      performanceTime: ticket.performanceTime || '',
      seatFront: ticket.seatFront || '',
      seatNumber: ticket.seatNumber || '',
      placeName: ticket.placeName || '',
      ticketImageUrl: ticket.ticketImageUrl || null,
      performanceId: ticket.performanceId || null,
      placeId: ticket.placeId || null
    };
    
    onSelectTicket(ticketData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>등록한 예매 내역에서 선택</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.content}>
          {isLoading ? (
            <div className={styles.loading}>
              <p>티켓 목록을 불러오는 중...</p>
            </div>
          ) : error ? (
            <div className={styles.error}>
              <p>{error}</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className={styles.empty}>
              <p>리뷰를 작성하지 않은 티켓이 없습니다.</p>
            </div>
          ) : (
            <div className={styles.ticketList}>
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.ticketId || ticket.id}
                  className={styles.ticketItem}
                  onClick={() => handleSelectTicket(ticket)}
                >
                  <div className={styles.ticketInfo}>
                    <div className={styles.performanceName}>
                      {ticket.performanceName || '공연명 없음'}
                    </div>
                    <div className={styles.ticketDetails}>
                      {ticket.performanceDate && (
                        <span className={styles.detailItem}>
                          {ticket.performanceDate}
                          {ticket.performanceTime && ` ${ticket.performanceTime}`}
                        </span>
                      )}
                      {(ticket.seatFront || ticket.seatNumber) && (
                        <span className={styles.detailItem}>
                          {ticket.seatFront && ticket.seatNumber 
                            ? `${ticket.seatFront}-${ticket.seatNumber}번`
                            : ticket.seatFront || ticket.seatNumber ? `${ticket.seatFront || ''}${ticket.seatNumber ? `${ticket.seatNumber}번` : ''}`.trim()
                            : ''}
                        </span>
                      )}
                      {ticket.placeName && (
                        <span className={styles.detailItem}>{ticket.placeName}</span>
                      )}
                    </div>
                  </div>
                  <div className={styles.selectArrow}>→</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketSelectModal;
