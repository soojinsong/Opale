import React, { useState } from 'react';
import styles from './OtherMessage.module.css';
import ReportModal from '../common/ReportModal';

const OtherMessage = ({ messageId, senderId, text, time, nickname, showNickname, hiddenByReport }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState(null); // 'MESSAGE' | 'USER' | null

  const openReport = (target) => {
    setReportTarget(target);
    setMenuOpen(false);
  };

  return (
    <div className={styles.message}>
      <div className={styles.messageContent}>
        {showNickname && nickname && (
          <span className={styles.nickname}>{nickname}</span>
        )}
        <div className={styles.bubbleRow}>
          <span className={`${styles.messageText} ${hiddenByReport ? styles.hiddenMessageText : ''}`}>
            {hiddenByReport ? '신고 처리된 메시지입니다.' : text}
          </span>

          {!hiddenByReport && messageId && senderId && (
            <div className={styles.menuWrapper}>
              <button
                type="button"
                className={styles.menuButton}
                onClick={() => setMenuOpen((open) => !open)}
                aria-label="메시지 옵션"
              >
                ⋮
              </button>

              {menuOpen && (
                <>
                  <div className={styles.menuBackdrop} onClick={() => setMenuOpen(false)} />
                  <div className={styles.menuDropdown}>
                    <button type="button" onClick={() => openReport('MESSAGE')}>메시지 신고</button>
                    <button type="button" onClick={() => openReport('USER')}>사용자 신고</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        <span className={styles.messageTime}>{time}</span>
      </div>

      {reportTarget && (
        <ReportModal
          targetType={reportTarget === 'MESSAGE' ? 'CHAT_MESSAGE' : 'USER'}
          targetId={reportTarget === 'MESSAGE' ? messageId : senderId}
          targetUserId={senderId}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  );
};

export default OtherMessage;
