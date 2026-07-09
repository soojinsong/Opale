import React from 'react';
import styles from './MyMessage.module.css';

const MyMessage = ({ text, time, hiddenByReport }) => {
  return (
    <div className={styles.message}>
      <div className={styles.messageContent}>
        <span className={`${styles.messageText} ${hiddenByReport ? styles.hiddenMessageText : ''}`}>
          {hiddenByReport ? '신고 처리된 메시지입니다.' : text}
        </span>
        <span className={styles.messageTime}>{time}</span>
      </div>
    </div>
  );
};

export default MyMessage;
