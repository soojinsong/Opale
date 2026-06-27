import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ChatbotPage.module.css';
import { streamChatbotMessage } from '../../api/chatbotApi';
import defaultPoster from '../../assets/poster/wicked.gif';

const INITIAL_MESSAGE = {
  type: 'bot',
  text: '안녕하세요! 공연에 대해 무엇이든 물어보세요.\n예) "혜화에서 하는 연극 추천해줘", "데이트할 때 좋은 뮤지컬"',
  performances: [],
};

const ChatbotPage = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamingPerformances, setStreamingPerformances] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    setMessages(prev => [...prev, { type: 'user', text: trimmed, performances: [] }]);
    setInput('');
    setIsStreaming(true);
    setStreamingText('');
    setStreamingPerformances([]);

    let accText = '';
    let accPerformances = [];

    await streamChatbotMessage(trimmed, {
      onChunk: (chunk) => {
        accText += chunk;
        setStreamingText(accText);
      },
      onPerformances: (performances) => {
        accPerformances = performances;
        setStreamingPerformances(performances);
      },
      onDone: () => {
        setMessages(prev => [...prev, {
          type: 'bot',
          text: accText,
          performances: accPerformances,
        }]);
        setIsStreaming(false);
        setStreamingText('');
        setStreamingPerformances([]);
      },
      onError: () => {
        setMessages(prev => [...prev, {
          type: 'bot',
          text: '죄송합니다. 오류가 발생했어요. 잠시 후 다시 시도해주세요.',
          performances: [],
        }]);
        setIsStreaming(false);
        setStreamingText('');
        setStreamingPerformances([]);
      },
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>←</button>
        <span className={styles.headerTitle}>공연 챗봇</span>
      </div>

      <div className={styles.chatArea}>
        {messages.map((msg, idx) => (
          <div key={idx} className={msg.type === 'user' ? styles.messageUser : styles.messageBot}>
            {msg.type === 'bot' && (
              <div className={styles.botAvatar}>🎭</div>
            )}
            <div className={styles.messageContent}>
              <div className={msg.type === 'user' ? styles.bubbleUser : styles.bubbleBot}>
                {msg.text.split('\n').map((line, i) => (
                  <span key={i}>{line}{i < msg.text.split('\n').length - 1 && <br />}</span>
                ))}
              </div>
              {msg.performances.length > 0 && (
                <div className={styles.performanceList}>
                  {msg.performances.map((p) => (
                    <div
                      key={p.performanceId}
                      className={styles.performanceCard}
                      onClick={() => navigate(`/culture/${p.performanceId}`)}
                    >
                      <img
                        src={p.poster || defaultPoster}
                        alt={p.title}
                        className={styles.poster}
                        onError={e => { e.target.src = defaultPoster; }}
                      />
                      <div className={styles.cardInfo}>
                        <p className={styles.cardTitle}>{p.title}</p>
                        <p className={styles.cardSub}>{p.genrenm}</p>
                        <p className={styles.cardSub}>{p.placeName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isStreaming && (
          <div className={styles.messageBot}>
            <div className={styles.botAvatar}>🎭</div>
            <div className={styles.messageContent}>
              <div className={styles.bubbleBot}>
                {streamingText || <span className={styles.typing}><span /><span /><span /></span>}
              </div>
              {streamingPerformances.length > 0 && (
                <div className={styles.performanceList}>
                  {streamingPerformances.map((p) => (
                    <div
                      key={p.performanceId}
                      className={styles.performanceCard}
                      onClick={() => navigate(`/culture/${p.performanceId}`)}
                    >
                      <img
                        src={p.poster || defaultPoster}
                        alt={p.title}
                        className={styles.poster}
                        onError={e => { e.target.src = defaultPoster; }}
                      />
                      <div className={styles.cardInfo}>
                        <p className={styles.cardTitle}>{p.title}</p>
                        <p className={styles.cardSub}>{p.genrenm}</p>
                        <p className={styles.cardSub}>{p.placeName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputBar}>
        <input
          ref={inputRef}
          className={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="공연에 대해 무엇이든 물어보세요"
          disabled={isStreaming}
        />
        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={isStreaming || !input.trim()}
        >
          전송
        </button>
      </div>
    </div>
  );
};

export default ChatbotPage;
