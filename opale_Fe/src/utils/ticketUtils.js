const TICKET_STORAGE_KEY_PREFIX = 'myTickets_';

const getCurrentUserId = () => {
  try {
    const userRaw = localStorage.getItem('user');
    if (userRaw) {
      const user = JSON.parse(userRaw);
      return user?.userId || user?.id || null;
    }
  } catch (error) {
    console.error('사용자 정보 파싱 실패:', error);
  }
  return null;
};

const getTicketStorageKey = (userId = null) => {
  const targetUserId = userId || getCurrentUserId();
  if (!targetUserId) {
    return `${TICKET_STORAGE_KEY_PREFIX}guest`;
  }
  return `${TICKET_STORAGE_KEY_PREFIX}${targetUserId}`;
};

export const initializeUserTickets = (userId = null) => {
  try {
    const storageKey = getTicketStorageKey(userId);
    localStorage.setItem(storageKey, JSON.stringify([]));
    window.dispatchEvent(new Event('ticketUpdated'));
    return true;
  } catch (error) {
    console.error('티켓 데이터 초기화 실패:', error);
    return false;
  }
};

export const hasUserTickets = (userId = null) => {
  try {
    const storageKey = getTicketStorageKey(userId);
    const tickets = localStorage.getItem(storageKey);
    if (!tickets) return false;
    const parsedTickets = JSON.parse(tickets);
    return Array.isArray(parsedTickets) && parsedTickets.length > 0;
  } catch (error) {
    return false;
  }
};

export const clearPreviousUserTickets = (currentUserId) => {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(TICKET_STORAGE_KEY_PREFIX)) {
        const currentUserKey = getTicketStorageKey(currentUserId);
        if (key !== currentUserKey) {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    return true;
  } catch (error) {
    console.error('이전 사용자 티켓 데이터 정리 실패:', error);
    return false;
  }
};

export const getTickets = () => {
  try {
    const storageKey = getTicketStorageKey();
    const savedTickets = localStorage.getItem(storageKey);
    return savedTickets ? JSON.parse(savedTickets) : [];
  } catch (error) {
    console.error('티켓 데이터 로드 실패:', error);
    return [];
  }
};

export const saveTickets = (tickets) => {
  try {
    const storageKey = getTicketStorageKey();
    localStorage.setItem(storageKey, JSON.stringify(tickets));
    window.dispatchEvent(new Event('ticketUpdated'));
    return true;
  } catch (error) {
    console.error('티켓 데이터 저장 실패:', error);
    return false;
  }
};

export const addTicket = (ticket) => {
  const tickets = getTickets();
  const newTicket = {
    id: ticket.id || Date.now(),
    ...ticket,
    registeredDate: ticket.registeredDate || new Date().toISOString().split('T')[0]
  };
  const updatedTickets = [newTicket, ...tickets];
  saveTickets(updatedTickets);
  return newTicket;
};

export const updateTicket = (ticketId, updatedData) => {
  const tickets = getTickets();
  const updatedTickets = tickets.map(ticket =>
    ticket.id === ticketId
      ? { ...ticket, ...updatedData }
      : ticket
  );
  saveTickets(updatedTickets);
  return updatedTickets.find(t => t.id === ticketId);
};

export const deleteTicket = (ticketId) => {
  const tickets = getTickets();
  const updatedTickets = tickets.filter(ticket => ticket.id !== ticketId);
  saveTickets(updatedTickets);
  return true;
};

export const isTicketWatched = (ticket) => {
  if (!ticket.performanceDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const ticketDate = new Date(ticket.performanceDate);
  ticketDate.setHours(0, 0, 0, 0);

  return ticketDate < today;
};

export const getBookedTickets = () => {
  const tickets = getTickets();
  return tickets.filter(ticket => !isTicketWatched(ticket));
};

export const getWatchedTickets = () => {
  const tickets = getTickets();
  return tickets.filter(ticket => isTicketWatched(ticket));
};

export const getTicketsByPerformanceId = (performanceId) => {
  const tickets = getTickets();
  return tickets.filter(ticket =>
    ticket.performanceId === performanceId ||
    ticket.performanceName?.includes(performanceId)
  );
};

export const getTicketsByPerformanceName = (performanceName) => {
  const tickets = getTickets();
  if (!performanceName) return [];
  return tickets.filter(ticket =>
    ticket.performanceName &&
    ticket.performanceName.includes(performanceName)
  );
};
